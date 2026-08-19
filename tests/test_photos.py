"""
Photo Upload, Duplicate Detection, and Storage Tests
"""

import io
import pytest
from PIL import Image


def create_dummy_image_bytes(color=(255, 0, 0), size=(600, 400)) -> bytes:
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_photo_upload_and_duplicate_detection(client):
    # 1. Signup photographer
    signup_res = client.post(
        "/api/v1/auth/signup",
        json={
            "email": "uploader@studio.com",
            "password": "Password123!",
            "studio_name": "Lens Studio",
        }
    )
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Event
    event_res = client.post(
        "/api/v1/events",
        headers=headers,
        json={"name": "Photo Test Event"}
    )
    event_id = event_res.json()["id"]

    # 3. Upload photo
    img_bytes = create_dummy_image_bytes(color=(0, 128, 255))
    files = [("files", ("test_image_1.jpg", img_bytes, "image/jpeg"))]

    upload_res = client.post(
        f"/api/v1/events/{event_id}/photos",
        headers=headers,
        files=files
    )
    assert upload_res.status_code == 201
    upload_data = upload_res.json()
    assert upload_data["uploaded_count"] == 1
    assert upload_data["duplicates_count"] == 0
    photo_id = upload_data["photos"][0]["id"]

    # 4. Upload SAME photo again (Duplicate Detection test)
    duplicate_files = [("files", ("test_image_1_copy.jpg", img_bytes, "image/jpeg"))]
    dup_res = client.post(
        f"/api/v1/events/{event_id}/photos",
        headers=headers,
        files=duplicate_files
    )
    assert dup_res.status_code == 201
    dup_data = dup_res.json()
    assert dup_data["uploaded_count"] == 0
    assert dup_data["duplicates_count"] == 1
    assert dup_data["photos"][0]["id"] == photo_id
    assert dup_data["photos"][0]["status"] == "DUPLICATE"

    # 5. List photos
    list_res = client.get(f"/api/v1/events/{event_id}/photos", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1
