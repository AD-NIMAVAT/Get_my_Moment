"""
Storage Service Abstraction and Local Storage Engine
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
from apps.api.config import settings
from packages.shared.constants import THUMBNAIL_SIZES


class StorageService:
    """Abstract interface for file storage drivers."""
    
    def save_original(self, event_id: str, file_bytes: bytes, original_filename: str) -> Tuple[str, str, int, str]:
        raise NotImplementedError

    def generate_thumbnails(self, event_id: str, file_id: str, original_path: str) -> Tuple[str, Optional[str]]:
        raise NotImplementedError

    def save_face_crop(self, event_id: str, face_id: str, crop_bytes: bytes) -> Optional[str]:
        raise NotImplementedError

    def save_temp_file(self, event_id: str, file_bytes: bytes, suffix: str = ".jpg") -> str:
        raise NotImplementedError

    def delete_file(self, file_path: str) -> bool:
        raise NotImplementedError

    def get_absolute_path(self, relative_path: str) -> str:
        raise NotImplementedError


class LocalStorageService(StorageService):
    """Local filesystem storage driver with path traversal protections."""

    def __init__(self, root_dir: str = settings.STORAGE_LOCAL_ROOT):
        self.root_dir = os.path.abspath(root_dir)
        os.makedirs(self.root_dir, exist_ok=True)

    def _ensure_event_directories(self, event_id: str):
        """Ensure all required event subdirectories exist."""
        base_event_dir = os.path.join(self.root_dir, "events", event_id)
        for folder in ["originals", "thumbnails", "processed", "faces", "temp"]:
            os.makedirs(os.path.join(base_event_dir, folder), exist_ok=True)
        return base_event_dir

    def _safe_resolve(self, relative_path: str) -> str:
        """Resolve path and guard against directory traversal attacks."""
        resolved = os.path.abspath(os.path.join(self.root_dir, relative_path.lstrip("/\\")))
        if not resolved.startswith(self.root_dir):
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
    def validate_image(file_bytes: bytes) -> Tuple[str, int, int]:
        """Validate magic bytes, dimensions, and file size with anti-decompression bomb protection."""
        # 1. Size limit
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if len(file_bytes) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Uploaded file exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB."
            )

        # 2. Decompression Bomb Protection (Max 80MP)
        Image.MAX_IMAGE_PIXELS = 80_000_000

        try:
            # First pass: verify structural container & markers
            with Image.open(io.BytesIO(file_bytes)) as img:
                img.verify()

            # Second pass: fully load and decode pixels to ensure no truncation or partial upload
            with Image.open(io.BytesIO(file_bytes)) as img:
                img.load()
                img_format = (img.format or "JPEG").lower()
                width, height = img.size

                # 3. Sanity check dimensions (max 12000x12000 px)
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

    def save_original(self, event_id: str, file_bytes: bytes, original_filename: str) -> Tuple[str, str, int, str]:
        """
        Saves original immutable file with safe UUID internal name.
        Returns: (file_id, relative_path, file_size, sha256_hash)
        """
        self._ensure_event_directories(event_id)
        img_format, width, height = self.validate_image(file_bytes)
        sha256_hash = self.calculate_sha256(file_bytes)

        file_id = str(uuid.uuid4())
        ext = "jpg" if img_format in ["jpeg", "jpg"] else img_format
        safe_name = f"{file_id}.{ext}"

        rel_path = os.path.join("events", event_id, "originals", safe_name).replace("\\", "/")
        abs_path = self._safe_resolve(rel_path)

        with open(abs_path, "wb") as f:
            f.write(file_bytes)

        return file_id, rel_path, len(file_bytes), sha256_hash

    def generate_thumbnails(self, event_id: str, file_id: str, original_path: str) -> Tuple[str, Optional[str]]:
        """
        Generates web-optimized small (400px) and medium (1200px) JPEG thumbnails.
        Returns: (small_thumb_rel_path, medium_thumb_rel_path)
        """
        self._ensure_event_directories(event_id)
        abs_orig_path = self._safe_resolve(original_path)

        small_name = f"{file_id}_small.jpg"
        med_name = f"{file_id}_medium.jpg"

        small_rel_path = os.path.join("events", event_id, "thumbnails", small_name).replace("\\", "/")
        med_rel_path = os.path.join("events", event_id, "thumbnails", med_name).replace("\\", "/")

        abs_small = self._safe_resolve(small_rel_path)
        abs_med = self._safe_resolve(med_rel_path)

        with Image.open(abs_orig_path) as img:
            # Auto-orient based on EXIF tag
            img = ImageOps.exif_transpose(img)
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")

            # Medium preview thumbnail
            med_img = img.copy()
            med_img.thumbnail(THUMBNAIL_SIZES["medium"], Image.Resampling.LANCZOS)
            med_img.save(abs_med, "JPEG", quality=85, optimize=True)

            # Small gallery thumbnail
            small_img = img.copy()
            small_img.thumbnail(THUMBNAIL_SIZES["small"], Image.Resampling.LANCZOS)
            small_img.save(abs_small, "JPEG", quality=80, optimize=True)

        return small_rel_path, med_rel_path

    def save_face_crop(self, event_id: str, face_id: str, crop_bytes: bytes) -> Optional[str]:
        """Saves optional debug face crop only if FACE_DEBUG_CROPS_ENABLED is True."""
        if not settings.FACE_DEBUG_CROPS_ENABLED:
            return None

        self._ensure_event_directories(event_id)
        rel_path = os.path.join("events", event_id, "faces", f"{face_id}.jpg").replace("\\", "/")
        abs_path = self._safe_resolve(rel_path)

        with open(abs_path, "wb") as f:
            f.write(crop_bytes)

        return rel_path

    def save_temp_file(self, event_id: str, file_bytes: bytes, suffix: str = ".jpg") -> str:
        """Saves transient selfie file in temp directory for processing."""
        self._ensure_event_directories(event_id)
        temp_id = str(uuid.uuid4())
        rel_path = os.path.join("events", event_id, "temp", f"{temp_id}{suffix}").replace("\\", "/")
        abs_path = self._safe_resolve(rel_path)

        with open(abs_path, "wb") as f:
            f.write(file_bytes)

        return rel_path

    def delete_file(self, relative_path: str) -> bool:
        """Deletes file safely if it exists."""
        try:
            abs_path = self._safe_resolve(relative_path)
            if os.path.exists(abs_path):
                os.remove(abs_path)
                return True
        except Exception:
            pass
def get_storage_service() -> StorageService:
    """Storage driver factory supporting local filesystem and cloud S3/R2 object storage."""
    driver = getattr(settings, "STORAGE_DRIVER", "local").lower()
    if driver == "s3":
        try:
            from apps.api.services.s3_storage import S3StorageService
            return S3StorageService()
        except Exception as e:
            import logging
            logging.getLogger("getmymoment").warning(f"Failed to initialize S3 storage, falling back to local: {e}")
    return LocalStorageService()


# Global storage service instance
storage_service = get_storage_service()
