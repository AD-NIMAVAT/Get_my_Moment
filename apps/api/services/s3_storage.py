"""
P29: S3 / Cloudflare R2 Cloud Object Storage Driver
Supports AWS S3, Cloudflare R2, MinIO, and any S3-compatible cloud object store.
"""

import os
import io
import uuid
import hashlib
from typing import Tuple, Optional
from PIL import Image, ImageOps
from fastapi import HTTPException, status
from apps.api.config import settings
from apps.api.services.storage import StorageService
from packages.shared.constants import THUMBNAIL_SIZES


class S3StorageService(StorageService):
    """
    S3 / Cloudflare R2 Object Storage Driver.
    Stores photos in structured bucket prefixes:
    `events/{event_id}/originals/{file_id}.jpg`
    `events/{event_id}/thumbnails/{file_id}_small.jpg`
    """

    def __init__(self):
        self.bucket_name = getattr(settings, "S3_BUCKET_NAME", "getmymoment-photos")
        self.region = getattr(settings, "S3_REGION", "us-east-1")
        self.endpoint_url = getattr(settings, "S3_ENDPOINT_URL", None)
        self._s3_client = None

    def _get_client(self):
        """Lazy load boto3 S3 client."""
        if self._s3_client is None:
            try:
                import boto3
                self._s3_client = boto3.client(
                    "s3",
                    region_name=self.region,
                    endpoint_url=self.endpoint_url,
                    aws_access_key_id=getattr(settings, "S3_ACCESS_KEY_ID", None),
                    aws_secret_access_key=getattr(settings, "S3_SECRET_ACCESS_KEY", None),
                )
            except ImportError:
                raise RuntimeError("boto3 is required for S3StorageService. Install with: pip install boto3")
        return self._s3_client

    def calculate_sha256(self, file_bytes: bytes) -> str:
        return hashlib.sha256(file_bytes).hexdigest()

    def validate_image(self, file_bytes: bytes) -> Tuple[str, int, int]:
        try:
            with Image.open(io.BytesIO(file_bytes)) as img:
                img_format = (img.format or "").lower()
                width, height = img.size
                if img_format not in ["jpeg", "jpg", "png", "webp"]:
                    raise ValueError(f"Unsupported format: {img_format}")
                return img_format, width, height
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid or corrupted image: {str(e)}"
            )

    def save_original(self, event_id: str, file_bytes: bytes, original_filename: str) -> Tuple[str, str, int, str]:
        img_format, width, height = self.validate_image(file_bytes)
        sha256_hash = self.calculate_sha256(file_bytes)

        file_id = str(uuid.uuid4())
        ext = "jpg" if img_format in ["jpeg", "jpg"] else img_format
        key = f"events/{event_id}/originals/{file_id}.{ext}"

        client = self._get_client()
        client.put_object(
            Bucket=self.bucket_name,
            Key=key,
            Body=file_bytes,
            ContentType=f"image/{ext}",
        )

        return file_id, key, len(file_bytes), sha256_hash

    def generate_thumbnails(self, event_id: str, file_id: str, original_path: str) -> Tuple[str, Optional[str]]:
        client = self._get_client()
        response = client.get_object(Bucket=self.bucket_name, Key=original_path)
        file_bytes = response["Body"].read()

        small_key = f"events/{event_id}/thumbnails/{file_id}_small.jpg"
        med_key = f"events/{event_id}/thumbnails/{file_id}_medium.jpg"

        with Image.open(io.BytesIO(file_bytes)) as img:
            img = ImageOps.exif_transpose(img)
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")

            # Medium preview
            med_img = img.copy()
            med_img.thumbnail(THUMBNAIL_SIZES["medium"], Image.Resampling.BILINEAR)
            med_buf = io.BytesIO()
            med_img.save(med_buf, "JPEG", quality=85, optimize=True)
            client.put_object(Bucket=self.bucket_name, Key=med_key, Body=med_buf.getvalue(), ContentType="image/jpeg")

            # Small gallery thumb
            small_img = img.copy()
            small_img.thumbnail(THUMBNAIL_SIZES["small"], Image.Resampling.BILINEAR)
            small_buf = io.BytesIO()
            small_img.save(small_buf, "JPEG", quality=80, optimize=True)
            client.put_object(Bucket=self.bucket_name, Key=small_key, Body=small_buf.getvalue(), ContentType="image/jpeg")

        return small_key, med_key

    def delete_file(self, file_path: str) -> bool:
        client = self._get_client()
        client.delete_object(Bucket=self.bucket_name, Key=file_path)
        return True

    def get_presigned_url(self, file_path: str, expires_in: int = 3600) -> str:
        """Generate presigned download URL for S3 asset."""
        client = self._get_client()
        return client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket_name, "Key": file_path},
            ExpiresIn=expires_in,
        )
