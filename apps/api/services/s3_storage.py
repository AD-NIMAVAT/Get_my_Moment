"""
Get My Moment — Production AWS S3 Object Storage Driver (P1-BATCH-01)
Supports AWS S3, Cloudflare R2, MinIO, and S3-compatible cloud object stores.
Provides full behavioral parity with LocalStorageService.
"""

import os
import io
import uuid
import hashlib
import tempfile
import logging
from typing import Tuple, Optional, Dict, Any
from pathlib import Path
from PIL import Image, ImageOps
from fastapi import HTTPException, status
from apps.api.config import settings
from apps.api.services.storage import StorageService
from packages.shared.constants import THUMBNAIL_SIZES

logger = logging.getLogger(__name__)


class S3StorageService(StorageService):
    """
    Production-grade AWS S3 Object Storage Driver.
    Features:
    - Multi-tenant Studio & Event scoped object key prefixes.
    - SSE-S3 AES-256 Server-Side Encryption on all uploads.
    - Standard AWS credential chain (EC2 IAM Instance Profile / Role).
    - Presigned URL generation with bounded, configurable TTL.
    - Temporary local materialization for OpenCV/YuNet AI worker inference.
    - Path traversal and cross-tenant key injection defense.
    """

    def __init__(
        self,
        bucket_name: Optional[str] = None,
        region: Optional[str] = None,
        endpoint_url: Optional[str] = None,
        boto3_client=None,
    ):
        self.bucket_name = bucket_name or getattr(settings, "S3_BUCKET_NAME", "getmymoment-photos-prod")
        self.region = region or getattr(settings, "S3_REGION", "ap-south-1")
        self.endpoint_url = endpoint_url or getattr(settings, "S3_ENDPOINT_URL", None)
        self.presigned_expiry = getattr(settings, "S3_PRESIGNED_EXPIRY_SECONDS", 900)
        self._s3_client = boto3_client

    def _get_client(self):
        """Lazy load and configure boto3 S3 client using standard AWS credential chain."""
        if self._s3_client is None:
            try:
                import boto3
                from botocore.config import Config

                config = Config(
                    region_name=self.region,
                    signature_version="s3v4",
                    retries={"max_attempts": 3, "mode": "standard"},
                    connect_timeout=5,
                    read_timeout=15,
                )

                kwargs: Dict[str, Any] = {"config": config}
                if self.endpoint_url:
                    kwargs["endpoint_url"] = self.endpoint_url

                # Optional static keys for local testing; in production EC2 IAM role is used
                access_key = getattr(settings, "S3_ACCESS_KEY_ID", None)
                secret_key = getattr(settings, "S3_SECRET_ACCESS_KEY", None)
                if access_key and secret_key:
                    kwargs["aws_access_key_id"] = access_key
                    kwargs["aws_secret_access_key"] = secret_key

                self._s3_client = boto3.client("s3", **kwargs)
            except ImportError:
                raise RuntimeError(
                    "boto3 package is required for S3StorageService. Install with: pip install boto3"
                )
            except Exception as e:
                logger.error(f"Failed to initialize S3 client: {e}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Cloud object storage service is currently unavailable."
                )
        return self._s3_client

    @staticmethod
    def calculate_sha256(file_bytes: bytes) -> str:
        """Compute SHA-256 checksum of file bytes."""
        hasher = hashlib.sha256()
        hasher.update(file_bytes)
        return hasher.hexdigest()

    @staticmethod
    def validate_image(file_bytes: bytes) -> Tuple[str, int, int]:
        """Validate magic bytes, dimensions, and decompression bomb protection."""
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

    def _build_key(
        self,
        category: str,
        event_id: str,
        file_name: str,
        studio_id: Optional[str] = None,
        folder_id: Optional[str] = None,
    ) -> str:
        """
        Build deterministic, tenant-isolated S3 object key.
        Format: studios/{studio_id}/events/{event_id}/{category}/[{folder_id}/]{file_name}
        """
        # Guard against key traversal
        for part in [event_id, file_name, studio_id, folder_id, category]:
            if part and (".." in part or part.startswith("/")):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Security Violation: Invalid character sequence in storage key."
                )

        if studio_id:
            if folder_id:
                return f"studios/{studio_id}/events/{event_id}/{category}/{folder_id}/{file_name}"
            return f"studios/{studio_id}/events/{event_id}/{category}/{file_name}"
        else:
            if folder_id:
                return f"events/{event_id}/{category}/{folder_id}/{file_name}"
            return f"events/{event_id}/{category}/{file_name}"

    def save_original(
        self,
        event_id: str,
        file_bytes: bytes,
        original_filename: str,
        studio_id: Optional[str] = None,
        folder_id: Optional[str] = None,
    ) -> Tuple[str, str, int, str]:
        """
        Uploads original image to S3 with SSE-S3 encryption and deterministic UUID key.
        Returns: (file_id, s3_key, file_size_bytes, sha256_hash)
        """
        img_format, width, height = self.validate_image(file_bytes)
        sha256_hash = self.calculate_sha256(file_bytes)

        file_id = str(uuid.uuid4())
        ext = "jpg" if img_format in ["jpeg", "jpg"] else img_format
        safe_filename = f"{file_id}.{ext}"

        key = self._build_key(
            category="originals",
            event_id=event_id,
            file_name=safe_filename,
            studio_id=studio_id,
            folder_id=folder_id,
        )

        content_type = f"image/{ext}" if ext != "jpg" else "image/jpeg"

        try:
            client = self._get_client()
            client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=file_bytes,
                ContentType=content_type,
                ServerSideEncryption="AES256",
                Metadata={
                    "event_id": event_id,
                    "sha256": sha256_hash,
                    "width": str(width),
                    "height": str(height),
                },
            )
            return file_id, key, len(file_bytes), sha256_hash
        except Exception as e:
            logger.error(f"S3 put_object failed for key '{key}': {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to persist file in cloud object storage."
            )

    def generate_thumbnails(
        self,
        event_id: str,
        file_id: str,
        original_path: str,
        studio_id: Optional[str] = None,
        folder_id: Optional[str] = None,
    ) -> Tuple[str, Optional[str]]:
        """
        Downloads original from S3, generates small (400px) & medium (1200px) JPEG thumbnails,
        and uploads them with SSE-S3 encryption.
        Returns: (small_thumb_key, medium_thumb_key)
        """
        file_bytes = self.get_file_bytes(original_path)

        small_filename = f"{file_id}_small.jpg"
        med_filename = f"{file_id}_medium.jpg"

        small_key = self._build_key(
            category="thumbnails",
            event_id=event_id,
            file_name=small_filename,
            studio_id=studio_id,
            folder_id=folder_id,
        )
        med_key = self._build_key(
            category="thumbnails",
            event_id=event_id,
            file_name=med_filename,
            studio_id=studio_id,
            folder_id=folder_id,
        )

        with Image.open(io.BytesIO(file_bytes)) as img:
            img = ImageOps.exif_transpose(img)
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")

            # Medium preview
            med_img = img.copy()
            med_img.thumbnail(THUMBNAIL_SIZES["medium"], Image.Resampling.LANCZOS)
            med_buf = io.BytesIO()
            med_img.save(med_buf, "JPEG", quality=85, optimize=True)

            # Small grid thumb
            small_img = img.copy()
            small_img.thumbnail(THUMBNAIL_SIZES["small"], Image.Resampling.LANCZOS)
            small_buf = io.BytesIO()
            small_img.save(small_buf, "JPEG", quality=80, optimize=True)

        client = self._get_client()
        client.put_object(
            Bucket=self.bucket_name,
            Key=med_key,
            Body=med_buf.getvalue(),
            ContentType="image/jpeg",
            ServerSideEncryption="AES256",
        )
        client.put_object(
            Bucket=self.bucket_name,
            Key=small_key,
            Body=small_buf.getvalue(),
            ContentType="image/jpeg",
            ServerSideEncryption="AES256",
        )

        return small_key, med_key

    def save_face_crop(self, event_id: str, face_id: str, crop_bytes: bytes) -> Optional[str]:
        if not settings.FACE_DEBUG_CROPS_ENABLED:
            return None

        key = self._build_key(
            category="faces",
            event_id=event_id,
            file_name=f"{face_id}.jpg",
        )
        client = self._get_client()
        client.put_object(
            Bucket=self.bucket_name,
            Key=key,
            Body=crop_bytes,
            ContentType="image/jpeg",
            ServerSideEncryption="AES256",
        )
        return key

    def save_temp_file(self, event_id: str, file_bytes: bytes, suffix: str = ".jpg") -> str:
        file_id = str(uuid.uuid4())
        key = self._build_key(
            category="temp",
            event_id=event_id,
            file_name=f"{file_id}{suffix}",
        )
        client = self._get_client()
        client.put_object(
            Bucket=self.bucket_name,
            Key=key,
            Body=file_bytes,
            ContentType="application/octet-stream",
            ServerSideEncryption="AES256",
        )
        return key

    def get_file_bytes(self, file_path: str) -> bytes:
        """Download raw object bytes from S3."""
        try:
            client = self._get_client()
            response = client.get_object(Bucket=self.bucket_name, Key=file_path)
            return response["Body"].read()
        except Exception as e:
            logger.error(f"S3 get_object failed for key '{file_path}': {e}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Requested object not found in cloud storage."
            )

    def object_exists(self, file_path: str) -> bool:
        """Check if object exists in S3 via HeadObject."""
        try:
            client = self._get_client()
            client.head_object(Bucket=self.bucket_name, Key=file_path)
            return True
        except Exception:
            return False

    def delete_file(self, file_path: str) -> bool:
        """Delete object from S3."""
        try:
            client = self._get_client()
            client.delete_object(Bucket=self.bucket_name, Key=file_path)
            return True
        except Exception as e:
            logger.warning(f"S3 delete_object failed for key '{file_path}': {e}")
            return False

    def get_presigned_url(self, file_path: str, expires_in: Optional[int] = None) -> str:
        """
        Generate time-bounded presigned GET URL for authorized media access.
        Expires in bounded TTL (default 15 minutes).
        """
        ttl = expires_in or self.presigned_expiry
        ttl = max(60, min(ttl, 3600))  # Bound between 1 min and 1 hour

        client = self._get_client()
        return client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket_name, "Key": file_path},
            ExpiresIn=ttl,
        )

    def materialize_to_temp_file(self, file_path: str) -> str:
        """
        Downloads S3 object into an isolated local temp file for OpenCV / AI processing.
        Caller is responsible for removing the temporary file when finished.
        """
        file_bytes = self.get_file_bytes(file_path)
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg", prefix="gmm_ai_")
        temp_file.write(file_bytes)
        temp_file.close()
        return temp_file.name

    def get_absolute_path(self, relative_path: str) -> str:
        """
        Raises explicit error if absolute filesystem path is requested from pure S3 driver.
        AI worker should call materialize_to_temp_file() when STORAGE_DRIVER == 's3'.
        """
        raise NotImplementedError(
            "S3StorageService does not provide local filesystem paths. "
            "Use get_file_bytes() or materialize_to_temp_file() instead."
        )

