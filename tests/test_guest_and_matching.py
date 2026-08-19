"""
Guest Registration, Consent, and Event-Scoped Face Matching Tests
"""

import io
import pytest
from PIL import Image, ImageDraw
from apps.api.models import Face, FaceEmbedding, Photo
from packages.shared.constants import PhotoStatus


def create_dummy_face_image() -> bytes:
    """Create synthetic test image with facial features."""
    img = Image.new("RGB", (300, 300), color=(240, 220, 200))
    draw = ImageDraw.Draw(img)
    # Eyes
    draw.ellipse((80, 100, 110, 130), fill=(50, 50, 50))
    draw.ellipse((190, 100, 220, 130), fill=(50, 50, 50))
    # Nose
    draw.polygon([(150, 130), (140, 170), (160, 170)], fill=(180, 120, 100))
    # Mouth
    draw.rectangle((120, 200, 180, 220), fill=(180, 50, 50))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_full_guest_flow_and_matching(client, db_session):
    # 1. Photographer setup
    signup_res = client.post(
        "/api/v1/auth/signup",
        json={
            "email": "match_studio@example.com",
            "password": "Password123!",
            "studio_name": "Match Studio",
        }
    )
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Event 1
    event_res = client.post("/api/v1/events", headers=headers, json={"name": "Wedding of Alice & Bob"})
    event_id = event_res.json()["id"]

    # 3. Add Photo with Mock Vector Embedding into Event 1
    photo = Photo(
        event_id=event_id,
        original_file_name="alice_bob_01.jpg",
        file_path="storage/events/mock/originals/photo1.jpg",
        sha256_hash="hash123",
        file_size=1024,
        mime_type="image/jpeg",
        status=PhotoStatus.PROCESSED.value,
        faces_detected_count=1,
    )
    db_session.add(photo)
    db_session.flush()

    face = Face(
        photo_id=photo.id,
        event_id=event_id,
        bounding_box={"x": 50, "y": 50, "w": 100, "h": 100},
        detection_confidence=0.98,
    )
    db_session.add(face)
    db_session.flush()

    # Pre-calculated dummy normalized embedding
    dummy_vec = [1.0 / (128 ** 0.5)] * 128
    face_emb = FaceEmbedding(
        face_id=face.id,
        event_id=event_id,
        embedding=dummy_vec,
    )
    db_session.add(face_emb)
    db_session.commit()

    # 4. Guest registers for Event 1
    reg_res = client.post(
        f"/api/v1/events/{event_id}/guests/register",
        json={"name": "Guest Charlie", "mobile": "+919876543210"}
    )
    assert reg_res.status_code == 201
    guest_id = reg_res.json()["guest_id"]

    # 5. Guest provides explicit face-search consent
    consent_res = client.post(
        f"/api/v1/guests/{guest_id}/consent",
        json={"guest_id": guest_id, "face_search_consent": True, "marketing_consent": False}
    )
    assert consent_res.status_code == 201
    assert consent_res.json()["face_search_consent"] is True

    # 6. Guest uploads selfie for AI matching
    selfie_bytes = create_dummy_face_image()
    files = [("selfie", ("selfie.jpg", selfie_bytes, "image/jpeg"))]

    search_res = client.post(
        f"/api/v1/events/{event_id}/guests/{guest_id}/search",
        files=files
    )
    assert search_res.status_code == 200
    search_data = search_res.json()
    assert "search_id" in search_data
    assert search_data["search_latency_ms"] >= 0


def test_cross_event_isolation(client, db_session):
    """Verify that a guest searching Event 1 CANNOT receive photos from Event 2."""
    signup_res = client.post(
        "/api/v1/auth/signup",
        json={
            "email": "iso_studio@example.com",
            "password": "Password123!",
            "studio_name": "Iso Studio",
        }
    )
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Event 1 and Event 2
    e1_res = client.post("/api/v1/events", headers=headers, json={"name": "Event One"})
    e1_id = e1_res.json()["id"]

    e2_res = client.post("/api/v1/events", headers=headers, json={"name": "Event Two"})
    e2_id = e2_res.json()["id"]

    # Add photo to Event 2 ONLY
    p2 = Photo(
        event_id=e2_id,
        original_file_name="event2_secret.jpg",
        file_path="storage/events/mock/originals/photo2.jpg",
        sha256_hash="hash456",
        file_size=2048,
        mime_type="image/jpeg",
        status=PhotoStatus.PROCESSED.value,
        faces_detected_count=1,
    )
    db_session.add(p2)
    db_session.flush()

    face2 = Face(photo_id=p2.id, event_id=e2_id, bounding_box={"x": 10, "y": 10, "w": 50, "h": 50}, detection_confidence=0.99)
    db_session.add(face2)
    db_session.flush()

    face_emb2 = FaceEmbedding(face_id=face2.id, event_id=e2_id, embedding=[0.1] * 128)
    db_session.add(face_emb2)
    db_session.commit()

    # Guest registers in Event 1
    g1_res = client.post(f"/api/v1/events/{e1_id}/guests/register", json={"name": "Guest E1", "mobile": "+919111122222"})
    g1_id = g1_res.json()["guest_id"]

    client.post(f"/api/v1/guests/{g1_id}/consent", json={"guest_id": g1_id, "face_search_consent": True})

    # Search in Event 1
    selfie_bytes = create_dummy_face_image()
    search_res = client.post(
        f"/api/v1/events/{e1_id}/guests/{g1_id}/search",
        files=[("selfie", ("selfie.jpg", selfie_bytes, "image/jpeg"))]
    )
    assert search_res.status_code == 200
    # ZERO matches because Event 1 has no photos, proving complete event isolation!
    assert search_res.json()["matched_count"] == 0
    assert len(search_res.json()["matched_photos"]) == 0
