"""
Storage Service Abstraction and Local Storage Engine
Supports Studio-scoped, Event-scoped, and Folder-scoped UUID storage hierarchy
"""

import os
import hashlib
import uuid
import shutil
from typing import Tuple, Optional
from pathlib import Path
from PIL import Image, ImageOps
import io
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from apps.api.config import settings
from packages.shared.constants import THUMBNAIL_SIZES


class StorageService:
    """Abstract interface for file storage drivers."""
    
    def save_original(self, event_id: str, file_bytes: bytes, original_filename: str, studio_id: Optional[str] = None, folder_id: Optional[str] = None) -> Tuple[str, str, int, str]:
        raise NotImplementedError

    def generate_thumbnails(self, event_id: str, file_id: str, original_path: str, studio_id: Optional[str] = None, folder_id: Optional[str] = None) -> Tuple[str, Optional[str]]:
        raise NotImplementedError

    def save_face_crop(self, event_id: str, face_id: str, crop_bytes: bytes) -> Optional[str]:
        raise NotImplementedError

    def save_temp_file(self, event_id: str, file_bytes: bytes, suffix: str = ".jpg") -> str:
        raise NotImplementedError

    def delete_file(self, file_path: str) -> bool:
        raise NotImplementedError

    def get_absolute_path(self, relative_path: str) -> str:
        raise NotImplementedError

    def get_file_bytes(self, file_path: str) -> bytes:
        raise NotImplementedError

    def object_exists(self, file_path: str) -> bool:
        raise NotImplementedError

    def get_presigned_url(self, file_path: str, expires_in: Optional[int] = None) -> str:
        raise NotImplementedError

    def materialize_to_temp_file(self, file_path: str) -> str:
        raise NotImplementedError


class LocalStorageService(StorageService):
    """Local filesystem storage driver with multi-tenant path isolation and path traversal protections."""

    def __init__(self, root_dir: str = settings.STORAGE_LOCAL_ROOT):
        self.root_dir = os.path.abspath(root_dir)
        os.makedirs(self.root_dir, exist_ok=True)

    def _ensure_directories(self, studio_id: Optional[str], event_id: str, folder_id: Optional[str] = None):
        """Ensure all required studio/event/folder subdirectories exist."""
        if studio_id:
            base_dir = os.path.join(self.root_dir, "studios", studio_id, "events", event_id)
        else:
            base_dir = os.path.join(self.root_dir, "events", event_id)

        for sub in ["originals", "thumbnails", "processed", "faces", "temp", "exports"]:
            if folder_id and sub in ["originals", "thumbnails"]:
                os.makedirs(os.path.join(base_dir, sub, folder_id), exist_ok=True)
            else:
                os.makedirs(os.path.join(base_dir, sub), exist_ok=True)
        return base_dir

    def _safe_resolve(self, relative_path: str) -> str:
        """Resolve path and guard against directory traversal attacks."""
        norm_path = relative_path.replace("\\", "/").lstrip("/")
        resolved = os.path.abspath(os.path.join(self.root_dir, norm_path))
        if not (resolved == self.root_dir or resolved.startswith(self.root_dir + os.sep)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Security Violation: Invalid file path traversal attempt."
            )
        return resolved

    def get_absolute_path(self, relative_path: str) -> str:
        return self._safe_resolve(relative_path)

    @staticmethod
    def calculate_sha256(file_bytes: bytes) -> str:
        """Calculate SHA-256 checksum of raw bytes."""
        hasher = hashlib.sha256()
        hasher.update(file_bytes)
        return hasher.hexdigest()

    @staticmethod
    def validate_image_file(file_path: str) -> Tuple[str, int, int]:
        """Validate magic bytes, dimensions, and file format directly from file path without loading whole file into memory."""
        Image.MAX_IMAGE_PIXELS = 80_000_000

        try:
            with Image.open(file_path) as img:
                img.verify()

            with Image.open(file_path) as img:
                img_format = (img.format or "JPEG").lower()
                width, height = img.size

                if width > 12000 or height > 12000:
                    raise ValueError(f"Image dimensions ({width}x{height}) exceed maximum allowed dimensions of 12000x12000px.")

                if img_format in ["mpo", "jpg"]:
                    img_format = "jpeg"
                if img_format not in ["jpeg", "png", "webp", "heic", "tiff"]:
                    raise ValueError(f"Unsupported image format: {img_format}")

                return img_format, width, height
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid, incomplete, or corrupted image file: {str(e)}"
            )

    @staticmethod
    def validate_image(file_bytes: bytes) -> Tuple[str, int, int]:
        """Validate magic bytes, dimensions, and file size with anti-decompression bomb protection."""
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if len(file_bytes) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Uploaded file exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB."
            )

        Image.MAX_IMAGE_PIXELS = 80_000_000

        try:
            with Image.open(io.BytesIO(file_bytes)) as img:
                img.verify()

            with Image.open(io.BytesIO(file_bytes)) as img:
                img.load()
                img_format = (img.format or "JPEG").lower()
                width, height = img.size

                if width > 12000 or height > 12000:
                    raise ValueError(f"Image dimensions ({width}x{height}) exceed maximum allowed dimensions of 12000x12000px.")

                if img_format in ["mpo", "jpg"]:
                    img_format = "jpeg"
                if img_format not in ["jpeg", "png", "webp", "heic", "tiff"]:
                    raise ValueError(f"Unsupported image format: {img_format}")

                return img_format, width, height
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid, incomplete, or corrupted image file: {str(e)}"
            )

    async def save_original_stream(
        self,
        event_id: str,
        upload_file,
        original_filename: str,
        studio_id: Optional[str] = None,
        folder_id: Optional[str] = None,
        chunk_size: Optional[int] = None,
    ) -> Tuple[str, str, int, str, int, int, str]:
        """
        Streams UploadFile directly to an isolated temporary file in chunks, calculates SHA-256 incrementally,
        enforces max upload size, verifies image integrity, and atomically moves to final immutable path.
        Returns: (file_id, relative_path, file_size, sha256_hash, width, height, img_format)
        """
        self._ensure_directories(studio_id, event_id, folder_id)
        if chunk_size is None:
            chunk_size = settings.UPLOAD_STREAM_CHUNK_SIZE_KB * 1024

        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        file_id = str(uuid.uuid4())

        if studio_id:
            base_dir = os.path.join(self.root_dir, "studios", studio_id, "events", event_id)
        else:
            base_dir = os.path.join(self.root_dir, "events", event_id)

        temp_dir = os.path.join(base_dir, "temp")
        os.makedirs(temp_dir, exist_ok=True)
        temp_abs_path = os.path.join(temp_dir, f"{file_id}.tmp")

        hasher = hashlib.sha256()
        bytes_written = 0

        try:
            with open(temp_abs_path, "wb") as out_f:
                while True:
                    chunk = await upload_file.read(chunk_size)
                    if not chunk:
                        break
                    bytes_written += len(chunk)
                    if bytes_written > max_bytes:
                        raise HTTPException(
                            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail=f"Uploaded file exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB."
                        )
                    hasher.update(chunk)
                    out_f.write(chunk)
                out_f.flush()
                try:
                    os.fsync(out_f.fileno())
                except (OSError, AttributeError):
                    pass

            if bytes_written == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Uploaded file is empty (0 bytes)."
                )

            # Validate image from temporary file on disk (Memory-Safe)
            img_format, width, height = self.validate_image_file(temp_abs_path)
            sha256_hash = hasher.hexdigest()

            ext = "jpg" if img_format in ["jpeg", "jpg"] else img_format
            safe_name = f"{file_id}.{ext}"

            if studio_id:
                if folder_id:
                    rel_path = os.path.join("studios", studio_id, "events", event_id, "originals", folder_id, safe_name)
                else:
                    rel_path = os.path.join("studios", studio_id, "events", event_id, "originals", safe_name)
            else:
                rel_path = os.path.join("events", event_id, "originals", safe_name)

            rel_path = rel_path.replace("\\", "/")
            final_abs_path = self._safe_resolve(rel_path)

            # Atomic rename (same filesystem guarantee)
            os.replace(temp_abs_path, final_abs_path)

            return file_id, rel_path, bytes_written, sha256_hash, width, height, img_format

        except Exception:
            if os.path.exists(temp_abs_path):
                try:
                    os.remove(temp_abs_path)
                except Exception:
                    pass
            raise

    def save_original(
        self,
        event_id: str,
        file_bytes: bytes,
        original_filename: str,
        studio_id: Optional[str] = None,
        folder_id: Optional[str] = None
    ) -> Tuple[str, str, int, str]:
        """
        Saves original immutable file with safe UUID internal name and atomic rename.
        Returns: (file_id, relative_path, file_size, sha256_hash)
        """
        self._ensure_directories(studio_id, event_id, folder_id)
        img_format, width, height = self.validate_image(file_bytes)
        sha256_hash = self.calculate_sha256(file_bytes)

        file_id = str(uuid.uuid4())
        ext = "jpg" if img_format in ["jpeg", "jpg"] else img_format
        safe_name = f"{file_id}.{ext}"

        if studio_id:
            if folder_id:
                rel_path = os.path.join("studios", studio_id, "events", event_id, "originals", folder_id, safe_name)
            else:
                rel_path = os.path.join("studios", studio_id, "events", event_id, "originals", safe_name)
        else:
            rel_path = os.path.join("events", event_id, "originals", safe_name)

        rel_path = rel_path.replace("\\", "/")
        abs_path = self._safe_resolve(rel_path)

        # Write to temporary file first, then atomic rename
        temp_path = abs_path + f".tmp.{uuid.uuid4().hex}"
        try:
            with open(temp_path, "wb") as f:
                f.write(file_bytes)
                f.flush()
                try:
                    os.fsync(f.fileno())
                except (OSError, AttributeError):
                    pass
            os.replace(temp_path, abs_path)
        except Exception:
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception:
                    pass
            raise

        return file_id, rel_path, len(file_bytes), sha256_hash

    def generate_thumbnails(
        self,
        event_id: str,
        file_id: str,
        original_path: str,
        studio_id: Optional[str] = None,
        folder_id: Optional[str] = None
    ) -> Tuple[str, Optional[str]]:
        """
        Generates web-optimized small (400px) and medium (1200px) JPEG thumbnails.
        Returns: (small_thumb_rel_path, medium_thumb_rel_path)
        """
        self._ensure_directories(studio_id, event_id, folder_id)
        abs_orig_path = self._safe_resolve(original_path)

        small_name = f"{file_id}_small.jpg"
        med_name = f"{file_id}_medium.jpg"

        if studio_id:
            if folder_id:
                small_rel_path = os.path.join("studios", studio_id, "events", event_id, "thumbnails", folder_id, small_name)
                med_rel_path = os.path.join("studios", studio_id, "events", event_id, "thumbnails", folder_id, med_name)
            else:
                small_rel_path = os.path.join("studios", studio_id, "events", event_id, "thumbnails", small_name)
                med_rel_path = os.path.join("studios", studio_id, "events", event_id, "thumbnails", med_name)
        else:
            small_rel_path = os.path.join("events", event_id, "thumbnails", small_name)
            med_rel_path = os.path.join("events", event_id, "thumbnails", med_name)

        small_rel_path = small_rel_path.replace("\\", "/")
        med_rel_path = med_rel_path.replace("\\", "/")

        abs_small = self._safe_resolve(small_rel_path)
        abs_med = self._safe_resolve(med_rel_path)

        with Image.open(abs_orig_path) as img:
            img = ImageOps.exif_transpose(img)
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")

            med_img = img.copy()
            med_img.thumbnail(THUMBNAIL_SIZES["medium"], Image.Resampling.LANCZOS)
            med_img.save(abs_med, "JPEG", quality=85, optimize=True)

            small_img = img.copy()
            small_img.thumbnail(THUMBNAIL_SIZES["small"], Image.Resampling.LANCZOS)
            small_img.save(abs_small, "JPEG", quality=80, optimize=True)

        return small_rel_path, med_rel_path

    def save_face_crop(self, event_id: str, face_id: str, crop_bytes: bytes) -> Optional[str]:
        if not settings.FACE_DEBUG_CROPS_ENABLED:
            return None

        self._ensure_directories(None, event_id)
        rel_path = os.path.join("events", event_id, "faces", f"{face_id}.jpg").replace("\\", "/")
        abs_path = self._safe_resolve(rel_path)

        with open(abs_path, "wb") as f:
            f.write(crop_bytes)

        return rel_path

    def save_temp_file(self, event_id: str, file_bytes: bytes, suffix: str = ".jpg") -> str:
        self._ensure_directories(None, event_id)
        file_id = str(uuid.uuid4())
        rel_path = os.path.join("events", event_id, "temp", f"{file_id}{suffix}").replace("\\", "/")
        abs_path = self._safe_resolve(rel_path)

        with open(abs_path, "wb") as f:
            f.write(file_bytes)

        return rel_path

    def delete_file(self, file_path: str) -> bool:
        try:
            abs_path = self._safe_resolve(file_path)
            if os.path.exists(abs_path):
                os.remove(abs_path)
                return True
        except Exception:
            pass
        return False

    def get_file_bytes(self, file_path: str) -> bytes:
        abs_path = self._safe_resolve(file_path)
        if not os.path.exists(abs_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found in local storage."
            )
        with open(abs_path, "rb") as f:
            return f.read()

    def object_exists(self, file_path: str) -> bool:
        try:
            abs_path = self._safe_resolve(file_path)
            return os.path.exists(abs_path)
        except Exception:
            return False

    def get_presigned_url(self, file_path: str, expires_in: Optional[int] = None) -> str:
        """For local storage driver, returns relative web asset path."""
        norm_path = file_path.replace("\\", "/").lstrip("/")
        return f"/api/v1/storage/{norm_path}"

    def materialize_to_temp_file(self, file_path: str) -> str:
        """For local storage, the file is already on local disk; returns absolute path."""
        return self._safe_resolve(file_path)


def get_storage_service() -> StorageService:
    """
    Factory function for storage service instantiation based on STORAGE_DRIVER.
    Defaults to LocalStorageService.
    """
    driver = getattr(settings, "STORAGE_DRIVER", "local").lower()
    if driver == "local":
        return LocalStorageService()
    elif driver == "s3":
        from apps.api.services.s3_storage import S3StorageService
        return S3StorageService()
    else:
        raise ValueError(f"Unsupported STORAGE_DRIVER: '{driver}'. Supported values: 'local', 's3'.")


def get_or_create_uncategorized_folder(db: Session, studio_id: str, event_id: str):
    """
    Ensures every event has a protected system 'Uncategorized' folder.
    Used as fallback for legacy photos, deleted folders, and unassigned camera ingest.
    """
    from apps.api.models.folder import Folder, FolderType

    folder = db.query(Folder).filter(
        Folder.event_id == event_id,
        Folder.folder_type == FolderType.UNCATEGORIZED
    ).first()

    if not folder:
        folder = Folder(
            id=str(uuid.uuid4()),
            studio_id=studio_id,
            event_id=event_id,
            name="Uncategorized",
            slug="uncategorized",
            folder_type=FolderType.UNCATEGORIZED,
            icon="Folder",
            color="#6B6B6B",
            order_index=999,
            is_locked=False,
            allow_guest_view=True,
            is_system=True,
        )
        db.add(folder)
        db.commit()
        db.refresh(folder)

    return folder


def reconcile_folder_counters(db: Session, event_id: str, folder_id: Optional[str] = None):
    """
    Reconciles photo_count and total_size_bytes for folders in an event using a single GROUP BY query.
    Prevents N+1 query overhead.
    """
    from apps.api.models.folder import Folder
    from apps.api.models.photo import Photo

    query = db.query(
        Photo.folder_id,
        func.count(Photo.id).label("cnt"),
        func.sum(Photo.file_size).label("sz")
    ).filter(
        Photo.event_id == event_id,
        Photo.is_deleted == False
    )

    if folder_id:
        query = query.filter(Photo.folder_id == folder_id)

    stats = query.group_by(Photo.folder_id).all()
    stats_map = {row.folder_id: (row.cnt or 0, row.sz or 0) for row in stats}

    folders_query = db.query(Folder).filter(Folder.event_id == event_id)
    if folder_id:
        folders_query = folders_query.filter(Folder.id == folder_id)

    for f in folders_query.all():
        cnt, sz = stats_map.get(f.id, (0, 0))
        f.photo_count = cnt
        f.total_size_bytes = sz

    db.commit()


storage_service = LocalStorageService()
