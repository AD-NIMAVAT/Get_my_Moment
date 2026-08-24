"""
Controlled End-to-End Real-World Acceptance Test (P1-BATCH-14)
Executes non-destructive synthetic acceptance flow across Photographer, Ingest, AI, Guest, Face Matching, Selection & Wireless.
"""

import io
import os
import pytest
from datetime import datetime
from PIL import Image, ImageDraw
from apps.api.models import Photo, Event, Face, FaceEmbedding, Photographer
from packages.shared.constants import PhotoStatus


def generate_synthetic_image(color="blue", size=(300, 300)) -> bytes:
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def create_dummy_face_image() -> bytes:
    img = Image.new("RGB", (300, 300), color=(240, 220, 200))
    draw = ImageDraw.Draw(img)
    draw.ellipse((80, 100, 110, 130), fill=(50, 50, 50))
    draw.ellipse((190, 100, 220, 130), fill=(50, 50, 50))
    draw.polygon([(150, 130), (140, 170), (160, 170)], fill=(180, 120, 100))
    draw.rectangle((120, 200, 180, 220), fill=(180, 50, 50))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_full_controlled_realworld_acceptance_flow(client, db_session):
    """
    Complete end-to-end acceptance flow:
    1. Photographer Signup & Event Creation
    2. Streaming Photo Upload & Pipeline Execution
    3. Photographer Gallery Fetch
    4. Guest Public Lookup & Face Matching
    5. Selection Portal Token Creation & Photo Selection
    6. Wireless FTP Camera Ingest Status Check
    """
    # 1. Photographer Signup
    email = f"acceptance_pilot_{int(datetime.utcnow().timestamp())}@example.com"
    signup_res = client.post(
        "/api/v1/auth/signup",
        json={
            "email": email,
            "password": "PilotPassword123!",
            "studio_name": "Pilot Acceptance Studio",
            "phone": "+919876543210"
        }
    )
    assert signup_res.status_code == 201
    auth_data = signup_res.json()
    token = auth_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Event
    event_res = client.post(
        "/api/v1/events",
        headers=headers,
        json={
            "name": "Royal Wedding Acceptance Event",
            "event_date": "2026-10-15",
            "allow_guest_uploads": True,
            "allow_downloads": True
        }
    )
    assert event_res.status_code == 201
    event_data = event_res.json()
    event_id = event_data["id"]
    access_token = event_data["access_token"]

    # 3. Photographer Streaming Photo Upload (2 Synthetic Photos)
    img1 = generate_synthetic_image(color="navy")
    img2 = generate_synthetic_image(color="darkgreen")
    files = [
        ("files", ("ceremony_01.jpg", img1, "image/jpeg")),
        ("files", ("reception_02.jpg", img2, "image/jpeg"))
    ]
    upload_res = client.post(f"/api/v1/events/{event_id}/photos", headers=headers, files=files)
    assert upload_res.status_code == 201
    photos = upload_res.json()["photos"]
    assert len(photos) == 2

    # Verify photos are processed and guest ready
    db_photos = db_session.query(Photo).filter(Photo.event_id == event_id).all()
    assert len(db_photos) == 2
    for p in db_photos:
        assert p.status == PhotoStatus.PROCESSED.value
        assert p.guest_ready_at is not None

    # 4. Photographer Event Photos Query (returns List[PhotoResponse])
    event_photos_res = client.get(f"/api/v1/events/{event_id}/photos", headers=headers)
    assert event_photos_res.status_code == 200
    assert len(event_photos_res.json()) >= 2

    # 5. Guest Public Lookup Flow
    public_res = client.get(f"/api/v1/events/public/by-token/{access_token}")
    assert public_res.status_code == 200
    assert public_res.json()["name"] == "Royal Wedding Acceptance Event"

    # 6. Guest Registration & Consent Flow
    reg_res = client.post(
        f"/api/v1/events/{event_id}/guests/register",
        json={"name": "Acceptance Guest", "mobile": "+919876543210"}
    )
    assert reg_res.status_code == 201
    guest_id = reg_res.json()["guest_id"]

    consent_res = client.post(
        f"/api/v1/guests/{guest_id}/consent",
        json={"guest_id": guest_id, "face_search_consent": True, "marketing_consent": False}
    )
    assert consent_res.status_code == 201

    # 7. Guest Selfie Face Matching Search
    selfie_bytes = create_dummy_face_image()
    search_res = client.post(
        f"/api/v1/events/{event_id}/guests/{guest_id}/search",
        files=[("selfie", ("selfie.jpg", selfie_bytes, "image/jpeg"))]
    )
    assert search_res.status_code == 200
    assert "search_id" in search_res.json()

    # 8. Live Event Health Telemetry
    health_res = client.get(f"/api/v1/events/{event_id}/health", headers=headers)
    assert health_res.status_code == 200
    health_data = health_res.json()
    assert health_data["photos_total"] == 2
    assert health_data["photos_ready"] == 2
    assert health_data["pipeline_health"] in ["READY", "PROCESSING"]

    # 9. Selection Portal Creation
    sel_res = client.post(
        f"/api/v1/selection/events/{event_id}/sessions",
        headers=headers,
        json={
            "client_name": "Acceptance Couple",
            "client_email": "couple@example.com",
            "max_selections": 10
        }
    )
    assert sel_res.status_code in [200, 201]

    # 10. Wireless FTP Ingest Status Check
    wireless_res = client.get("/api/v1/wireless/status")
    assert wireless_res.status_code == 200
    assert "is_running" in wireless_res.json()
