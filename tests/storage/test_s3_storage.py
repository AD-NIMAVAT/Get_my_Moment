"""
Get My Moment — Dual-Driver Storage Architecture & S3 Adapter Test Suite (P1-BATCH-01)
Validates local vs S3 driver parity, key scoping, encryption, presigned URLs, and failure isolation.
"""

import os
import io
import pytest
from unittest.mock import MagicMock
from PIL import Image
from fastapi import HTTPException
from apps.api.config import settings
from apps.api.services.storage import StorageService, LocalStorageService, get_storage_service
from apps.api.services.s3_storage import S3StorageService


def _create_sample_jpeg_bytes() -> bytes:
    """Helper to generate a valid RGB JPEG in memory."""
    buf = io.BytesIO()
    img = Image.new("RGB", (400, 300), color=(180, 50, 50))
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_1_default_storage_driver_is_local():
    """1. The default storage driver must strictly remain 'local'."""
    assert settings.STORAGE_DRIVER == "local"
    svc = get_storage_service()
    assert isinstance(svc, LocalStorageService)


def test_2_invalid_storage_driver_fails_safely(monkeypatch):
    """2. Unknown STORAGE_DRIVER setting must raise an explicit ValueError."""
    monkeypatch.setattr(settings, "STORAGE_DRIVER", "azure_blob_unsupported")
    with pytest.raises(ValueError, match="Unsupported STORAGE_DRIVER"):
        get_storage_service()


def test_3_s3_key_deterministic_and_tenant_scoped():
    """3. S3 object keys must be strictly partitioned by studio_id and event_id."""
    s3_svc = S3StorageService(bucket_name="test-bucket", boto3_client=MagicMock())

    # Studio + Event + Folder
    key1 = s3_svc._build_key(
        category="originals",
        event_id="evt-123",
        file_name="photo-456.jpg",
        studio_id="std-789",
        folder_id="fld-001"
    )
    assert key1 == "studios/std-789/events/evt-123/originals/fld-001/photo-456.jpg"

    # Event only
    key2 = s3_svc._build_key(
        category="originals",
        event_id="evt-123",
        file_name="photo-456.jpg"
    )
    assert key2 == "events/evt-123/originals/photo-456.jpg"


def test_4_s3_key_traversal_protection():
    """4. Malicious key traversal attempts with '..' or leading '/' must be rejected."""
    s3_svc = S3StorageService(bucket_name="test-bucket", boto3_client=MagicMock())

    with pytest.raises(HTTPException) as exc1:
        s3_svc._build_key(category="originals", event_id="../evt-evil", file_name="photo.jpg")
    assert exc1.value.status_code == 400

    with pytest.raises(HTTPException) as exc2:
        s3_svc._build_key(category="originals", event_id="evt-123", file_name="/absolute/photo.jpg")
    assert exc2.value.status_code == 400


def test_5_s3_save_original_enforces_sse_s3_encryption():
    """5. S3 uploads must enforce SSE-S3 AES-256 server-side encryption."""
    mock_boto = MagicMock()
    s3_svc = S3StorageService(bucket_name="test-bucket", boto3_client=mock_boto)

    jpeg_bytes = _create_sample_jpeg_bytes()
    file_id, key, size, sha256_hash = s3_svc.save_original(
        event_id="evt-123",
        file_bytes=jpeg_bytes,
        original_filename="sample.jpg",
        studio_id="std-456"
    )

    assert file_id is not None
    assert key.startswith("studios/std-456/events/evt-123/originals/")
    assert size == len(jpeg_bytes)
    assert len(sha256_hash) == 64

    # Assert put_object was called with SSE-S3
    mock_boto.put_object.assert_called_once()
    call_kwargs = mock_boto.put_object.call_args[1]
    assert call_kwargs["Bucket"] == "test-bucket"
    assert call_kwargs["ServerSideEncryption"] == "AES256"
    assert call_kwargs["ContentType"] == "image/jpeg"
    assert call_kwargs["Metadata"]["sha256"] == sha256_hash


def test_6_s3_generate_thumbnails():
    """6. S3 thumbnail generation downloads original and uploads small and medium thumbs."""
    mock_boto = MagicMock()
    jpeg_bytes = _create_sample_jpeg_bytes()

    # Mock get_object response
    mock_response = {"Body": io.BytesIO(jpeg_bytes)}
    mock_boto.get_object.return_value = mock_response

    s3_svc = S3StorageService(bucket_name="test-bucket", boto3_client=mock_boto)

    small_key, med_key = s3_svc.generate_thumbnails(
        event_id="evt-123",
        file_id="photo-999",
        original_path="studios/std-1/events/evt-123/originals/photo-999.jpg",
        studio_id="std-1"
    )

    assert small_key == "studios/std-1/events/evt-123/thumbnails/photo-999_small.jpg"
    assert med_key == "studios/std-1/events/evt-123/thumbnails/photo-999_medium.jpg"
    assert mock_boto.put_object.call_count == 2


def test_7_s3_presigned_url_generation():
    """7. S3 presigned URLs generate bounded time-to-live capability links."""
    mock_boto = MagicMock()
    mock_boto.generate_presigned_url.return_value = "https://test-bucket.s3.amazonaws.com/item.jpg?AWSAccessKeyId=XXX"

    s3_svc = S3StorageService(bucket_name="test-bucket", boto3_client=mock_boto)
    url = s3_svc.get_presigned_url("events/evt-1/originals/photo-1.jpg", expires_in=600)

    assert "https://" in url
    mock_boto.generate_presigned_url.assert_called_once_with(
        "get_object",
        Params={"Bucket": "test-bucket", "Key": "events/evt-1/originals/photo-1.jpg"},
        ExpiresIn=600
    )


def test_8_s3_materialize_to_temp_file():
    """8. S3 driver can download objects to local temporary files for AI inference."""
    mock_boto = MagicMock()
    jpeg_bytes = _create_sample_jpeg_bytes()
    mock_boto.get_object.return_value = {"Body": io.BytesIO(jpeg_bytes)}

    s3_svc = S3StorageService(bucket_name="test-bucket", boto3_client=mock_boto)
    temp_path = s3_svc.materialize_to_temp_file("events/evt-1/originals/photo-1.jpg")

    assert os.path.exists(temp_path)
    with open(temp_path, "rb") as f:
        assert f.read() == jpeg_bytes

    # Clean up
    os.remove(temp_path)
    assert not os.path.exists(temp_path)


def test_9_s3_delete_file_and_object_exists():
    """9. S3 object existence checks and deletion execute without exceptions."""
    mock_boto = MagicMock()
    mock_boto.head_object.return_value = {"ContentLength": 1024}
    mock_boto.delete_object.return_value = {}

    s3_svc = S3StorageService(bucket_name="test-bucket", boto3_client=mock_boto)

    assert s3_svc.object_exists("events/evt-1/originals/photo-1.jpg") is True
    assert s3_svc.delete_file("events/evt-1/originals/photo-1.jpg") is True


def test_10_s3_missing_object_raises_404():
    """10. Missing objects in S3 raise HTTP 404 Not Found."""
    mock_boto = MagicMock()
    mock_boto.get_object.side_effect = Exception("NoSuchKey")

    s3_svc = S3StorageService(bucket_name="test-bucket", boto3_client=mock_boto)

    with pytest.raises(HTTPException) as exc:
        s3_svc.get_file_bytes("events/evt-1/originals/non_existent.jpg")
    assert exc.value.status_code == 404


def test_11_local_storage_parity_methods(tmp_path):
    """11. LocalStorageService implements all new interface methods with full backward compatibility."""
    local_svc = LocalStorageService(root_dir=str(tmp_path))
    jpeg_bytes = _create_sample_jpeg_bytes()

    file_id, rel_path, size, sha256_hash = local_svc.save_original(
        event_id="evt-local",
        file_bytes=jpeg_bytes,
        original_filename="sample.jpg"
    )

    assert local_svc.object_exists(rel_path) is True
    assert local_svc.get_file_bytes(rel_path) == jpeg_bytes
    assert local_svc.get_presigned_url(rel_path).startswith("/api/v1/storage/")
    assert os.path.exists(local_svc.materialize_to_temp_file(rel_path))

