"""
P26: Automated End-to-End Lifecycle & Resilience Test Suite
Simulates the complete real-world journey:
1. Photographer registers studio and logs in.
2. Creates an event with custom slug.
3. Uploads raw event photos (with deduplication).
4. Resolves event by public QR access token.
5. Guest registers with Name & Mobile.
6. Guest verifies OTP and records biometric face-search consent.
7. Guest uploads selfie and receives matched photo gallery.
8. Guest downloads original full-resolution photo.
9. Photographer checks guest leads and deletes event with full cascade cleanup.
"""

import io
import pytest
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient
from apps.api.models import Photographer, Event, Photo, Face, FaceEmbedding, Guest, Consent, GuestSearch


def _create_synthetic_face_image(r: int = 240, g: int = 190, b: int = 160) -> bytes:
    """Helper to generate a clean synthetic portrait image for testing."""
    img = Image.new("RGB", (400, 400), color=(240, 240, 240))
    d = ImageDraw.Draw(img)
    # Face skin ellipse
    d.ellipse([100, 80, 300, 320], fill=(r, g, b))
    # Eyes
    d.ellipse([140, 150, 180, 180], fill=(50, 30, 20))
    d.ellipse([220, 150, 260, 180], fill=(50, 30, 20))
    # Mouth
    d.arc([160, 220, 240, 270], start=0, end=180, fill=(180, 50, 50), width=4)

    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_complete_end_to_end_lifecycle(client: TestClient, db_session):
    # Step 1: Photographer Signup
    signup_res = client.post("/api/v1/auth/signup", json={
        "email": "e2e_photog@studio.com",
        "password": "MasterPassword2026!",
        "full_name": "E2E Lead Photographer",
        "studio_name": "E2E Master Studio"
    })
    assert signup_res.status_code == 201
    auth_token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {auth_token}"}

    # Step 2: Create Event
    event_res = client.post("/api/v1/events", headers=headers, json={
        "name": "E2E Gala Evening",
        "slug": "e2e-gala-evening"
    })
    assert event_res.status_code == 201
    event_data = event_res.json()
    event_id = event_data["id"]
    access_token = event_data["access_token"]

    # Step 3: Batch Upload Photos
    photo1_bytes = _create_synthetic_face_image(240, 190, 160)
    photo2_bytes = _create_synthetic_face_image(210, 160, 130)

    upload_res = client.post(
        f"/api/v1/events/{event_id}/photos",
        headers=headers,
        files=[
            ("files", ("gala_01.jpg", photo1_bytes, "image/jpeg")),
            ("files", ("gala_02.jpg", photo2_bytes, "image/jpeg")),
        ]
    )
    assert upload_res.status_code == 201
    upload_data = upload_res.json()
    assert upload_data["uploaded_count"] == 2
    photo1_id = upload_data["photos"][0]["id"]

    # Verify duplicate detection
    dup_res = client.post(
        f"/api/v1/events/{event_id}/photos",
        headers=headers,
        files=[("files", ("gala_01_dup.jpg", photo1_bytes, "image/jpeg"))]
    )
    assert dup_res.status_code == 201
    assert dup_res.json()["duplicates_count"] == 1

    # Step 4: Guest Scans QR (Public token resolution)
    pub_res = client.get(f"/api/v1/events/public/by-token/{access_token}")
    assert pub_res.status_code == 200
    assert pub_res.json()["name"] == "E2E Gala Evening"
    assert pub_res.json()["studio_name"] == "E2E Master Studio"

    # Step 5: Guest Registers
    guest_res = client.post(f"/api/v1/events/{event_id}/guests/register", json={
        "name": "Alice Guest",
        "mobile": "+19876543210"
    })
    assert guest_res.status_code == 201
    guest_id = guest_res.json()["guest_id"]

    # Step 6: Guest OTP Verification & Biometric Consent
    otp_res = client.post(f"/api/v1/guests/{guest_id}/otp/verify", json={"guest_id": guest_id, "otp_code": "123456"})
    assert otp_res.status_code == 200
    assert otp_res.json()["verified"] is True

    consent_res = client.post(f"/api/v1/guests/{guest_id}/consent", json={
        "guest_id": guest_id,
        "face_search_consent": True,
        "marketing_consent": True
    })
    assert consent_res.status_code == 201
    assert consent_res.json()["face_search_consent"] is True

    # Step 7: Guest Takes Selfie & Searches
    selfie_bytes = photo1_bytes  # Matching photo 1
    search_res = client.post(
        f"/api/v1/events/{event_id}/guests/{guest_id}/search",
        files={"selfie": ("guest_selfie.jpg", selfie_bytes, "image/jpeg")}
    )
    assert search_res.status_code == 200
    search_data = search_res.json()
    assert search_data["matched_count"] >= 1
    matched_photo = search_data["matched_photos"][0]
    assert matched_photo["id"] == photo1_id

    # Step 8: Download Matched Photo with Valid Guest Capability Token
    download_res = client.get(f"/api/v1/photos/{photo1_id}/download?token={access_token}")
    assert download_res.status_code == 200
    assert len(download_res.content) == len(photo1_bytes)

    # Step 9: Photographer Checks Leads
    leads_res = client.get(f"/api/v1/events/{event_id}/leads", headers=headers)
    assert leads_res.status_code == 200
    leads = leads_res.json()
    assert len(leads) == 1
    assert leads[0]["name"] == "Alice Guest"
    assert leads[0]["marketing_consent"] is True

    # Step 10: Event Deletion and Cascade Cleanup
    delete_res = client.delete(f"/api/v1/events/{event_id}", headers=headers)
    assert delete_res.status_code == 204

    # Verify event is deleted (soft-deleted in recycle bin)
    assert db_session.query(Event).filter(Event.id == event_id, Event.is_deleted == False).first() is None
    assert db_session.query(Photo).filter(Photo.event_id == event_id, Photo.is_deleted == False).first() is None
