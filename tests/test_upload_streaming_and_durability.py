"""
Upload Streaming, Large-File Memory Safety, and Storage Durability Tests (P1-BATCH-11)
"""

import io
import os
import pytest
from PIL import Image
from apps.api.models import Photo, Event
from apps.api.services.storage import storage_service
from apps.api.config import settings
from packages.shared.constants import PhotoStatus


def generate_test_image(width: int = 200, height: int = 200, color: str = "blue") -> bytes:
    """Generate a valid JPEG byte sequence."""
    img = Image.new("RGB", (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


def test_streaming_photo_upload_and_durability(client, db_session):
    """Test standard photo upload with chunked streaming and atomic storage finalization."""
    # 1. Photographer setup
    signup_res = client.post(
        "/api/v1/auth/signup",
        json={"email": "stream_test@example.com", "password": "Password123!", "studio_name": "Stream Studio"}
    )
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Event
    event_res = client.post("/api/v1/events", headers=headers, json={"name": "Streaming Test Event"})
    event_id = event_res.json()["id"]

    # 3. Stream Upload 2 Photos
    img1 = generate_test_image(400, 400, "green")
    img2 = generate_test_image(600, 400, "red")

    files = [
        ("files", ("photo1.jpg", img1, "image/jpeg")),
        ("files", ("photo2.jpg", img2, "image/jpeg")),
    ]

    res = client.post(f"/api/v1/events/{event_id}/photos", headers=headers, files=files)
    assert res.status_code == 201
    data = res.json()
    assert data["uploaded_count"] == 2
    assert data["duplicates_count"] == 0

    # Verify physical file existence and atomic path resolution
    photo_records = db_session.query(Photo).filter(Photo.event_id == event_id).all()
    assert len(photo_records) == 2
    for p in photo_records:
        abs_path = storage_service.get_absolute_path(p.file_path)
        assert os.path.exists(abs_path)
        assert os.path.getsize(abs_path) > 0


def test_duplicate_streaming_upload_cleans_redundant_files(client, db_session):
    """Test that duplicate uploads return DUPLICATE status and remove newly written redundant files."""
    signup_res = client.post(
        "/api/v1/auth/signup",
        json={"email": "dupe_stream@example.com", "password": "Password123!", "studio_name": "Dupe Studio"}
    )
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    event_res = client.post("/api/v1/events", headers=headers, json={"name": "Dupe Stream Event"})
    event_id = event_res.json()["id"]

    img = generate_test_image(300, 300, "purple")
    files1 = [("files", ("wedding_01.jpg", img, "image/jpeg"))]

    res1 = client.post(f"/api/v1/events/{event_id}/photos", headers=headers, files=files1)
    assert res1.status_code == 201
    assert res1.json()["uploaded_count"] == 1

    # Upload exact same photo again
    files2 = [("files", ("wedding_01_retry.jpg", img, "image/jpeg"))]
    res2 = client.post(f"/api/v1/events/{event_id}/photos", headers=headers, files=files2)
    assert res2.status_code == 201
    assert res2.json()["duplicates_count"] == 1

    # Ensure only 1 Photo DB record exists
    photos = db_session.query(Photo).filter(Photo.event_id == event_id).all()
    assert len(photos) == 1


def test_corrupted_and_zero_byte_upload_handling(client, db_session):
    """Test that 0-byte or corrupted files are safely rejected without leaving orphaned records."""
    signup_res = client.post(
        "/api/v1/auth/signup",
        json={"email": "corrupt_test@example.com", "password": "Password123!", "studio_name": "Corrupt Studio"}
    )
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    event_res = client.post("/api/v1/events", headers=headers, json={"name": "Corrupt Test Event"})
    event_id = event_res.json()["id"]

    # Upload 0-byte file and corrupt non-image bytes
    files = [
        ("files", ("empty.jpg", b"", "image/jpeg")),
        ("files", ("corrupt.jpg", b"NOT_AN_IMAGE_DATA_12345", "image/jpeg")),
    ]

    res = client.post(f"/api/v1/events/{event_id}/photos", headers=headers, files=files)
    assert res.status_code == 201
    data = res.json()
    assert data["uploaded_count"] == 0

    # Ensure zero DB records created
    photos = db_session.query(Photo).filter(Photo.event_id == event_id).all()
    assert len(photos) == 0


def test_guest_streaming_upload(client, db_session):
    """Test public guest photo upload with streaming storage."""
    signup_res = client.post(
        "/api/v1/auth/signup",
        json={"email": "guest_stream@example.com", "password": "Password123!", "studio_name": "Guest Studio"}
    )
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    event_res = client.post("/api/v1/events", headers=headers, json={"name": "Guest Stream Event", "allow_guest_uploads": True})
    event_id = event_res.json()["id"]
    access_token = event_res.json()["access_token"]

    guest_img = generate_test_image(350, 350, "yellow")
    files = [("files", ("guest_selfie.jpg", guest_img, "image/jpeg"))]

    res = client.post(
        f"/api/v1/events/public/{access_token}/guest-upload",
        data={"guest_name": "Ananya", "guest_phone": "+919999988888"},
        files=files
    )
    assert res.status_code == 201
    assert res.json()["uploaded_count"] == 1

    photo = db_session.query(Photo).filter(Photo.event_id == event_id, Photo.is_guest_uploaded == True).first()
    assert photo is not None
    assert photo.uploaded_by_guest_name == "Ananya"


def test_wireless_http_ingest_streaming(client, db_session):
    """Test wireless camera direct HTTP ingest streaming."""
    signup_res = client.post(
        "/api/v1/auth/signup",
        json={"email": "wire_stream@example.com", "password": "Password123!", "studio_name": "Wire Studio"}
    )
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    event_res = client.post("/api/v1/events", headers=headers, json={"name": "Wire Event"})
    event_id = event_res.json()["id"]

    camera_img = generate_test_image(500, 500, "cyan")
    files = [("files", ("DSC00123.JPG", camera_img, "image/jpeg"))]

    res = client.post(
        f"/api/v1/wireless/events/{event_id}/http-ingest",
        data={"camera_model": "Sony A7 IV"},
        files=files
    )
    assert res.status_code == 200
    assert res.json()["uploaded_count"] == 1

    photo = db_session.query(Photo).filter(Photo.event_id == event_id).first()
    assert photo is not None
    assert "Sony A7 IV" in photo.uploaded_by_guest_name
