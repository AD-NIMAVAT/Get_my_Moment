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


def test_guest_login_and_session_flow(client, db_session):
    """Test returning guest login by mobile number and session validation."""
    signup_res = client.post(
        "/api/v1/auth/signup",
        json={"email": "login_test@example.com", "password": "Password123!", "studio_name": "Login Studio"}
    )
    headers = {"Authorization": f"Bearer {signup_res.json()['access_token']}"}

    event_res = client.post("/api/v1/events", headers=headers, json={"name": "Login Test Wedding"})
    event_id = event_res.json()["id"]

    # 1. First-time registration
    reg_res = client.post(
        f"/api/v1/events/{event_id}/guests/register",
        json={"name": "Kavita Patel", "mobile": "+919876500001"}
    )
    assert reg_res.status_code == 201
    guest_id = reg_res.json()["guest_id"]

    # Provide consent
    client.post(f"/api/v1/guests/{guest_id}/consent", json={"guest_id": guest_id, "face_search_consent": True})

    # 2. Returning guest login
    login_res = client.post(
        f"/api/v1/events/{event_id}/guests/login",
        json={"mobile": "+919876500001"}
    )
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert login_data["guest_id"] == guest_id
    assert login_data["name"] == "Kavita Patel"
    assert login_data["has_consent"] is True
    assert "session_token" in login_data

    # 3. Server-side session validation
    val_res = client.get(f"/api/v1/events/{event_id}/guests/{guest_id}/session/validate")
    assert val_res.status_code == 200
    assert val_res.json()["is_valid"] is True
    assert val_res.json()["name"] == "Kavita Patel"

    # 4. Unknown mobile returns 404
    unknown_res = client.post(
        f"/api/v1/events/{event_id}/guests/login",
        json={"mobile": "+919999999999"}
    )
    assert unknown_res.status_code == 404


def test_cached_match_persistence_and_isolation(client, db_session):
    """Test that cached matches are persisted and retrievable on page refresh."""
    signup_res = client.post(
        "/api/v1/auth/signup",
        json={"email": "cache_test@example.com", "password": "Password123!", "studio_name": "Cache Studio"}
    )
    headers = {"Authorization": f"Bearer {signup_res.json()['access_token']}"}

    event_res = client.post("/api/v1/events", headers=headers, json={"name": "Cache Test Wedding"})
    event_id = event_res.json()["id"]

    # Register guest
    reg_res = client.post(
        f"/api/v1/events/{event_id}/guests/register",
        json={"name": "Rohan Sharma", "mobile": "+919876500002"}
    )
    guest_id = reg_res.json()["guest_id"]
    client.post(f"/api/v1/guests/{guest_id}/consent", json={"guest_id": guest_id, "face_search_consent": True})

    # Initial cached match is NOT_FOUND
    cache_res1 = client.get(f"/api/v1/events/{event_id}/guests/{guest_id}/cached-match")
    assert cache_res1.status_code == 200
    assert cache_res1.json()["status"] == "NOT_FOUND"

    # Perform selfie search
    selfie_bytes = create_dummy_face_image()
    search_res = client.post(
        f"/api/v1/events/{event_id}/guests/{guest_id}/search",
        files=[("selfie", ("selfie.jpg", selfie_bytes, "image/jpeg"))]
    )
    assert search_res.status_code == 200

    # Subsequent cached match is READY
    cache_res2 = client.get(f"/api/v1/events/{event_id}/guests/{guest_id}/cached-match")
    assert cache_res2.status_code == 200
    assert cache_res2.json()["status"] == "READY"
    assert cache_res2.json()["guest_id"] == guest_id


def test_face_matching_joined_query_and_cross_event_isolation(client, db_session, monkeypatch):
    """Verify that joined face search executes correctly and never returns photos from other events."""
    from apps.api.services.ai_service import ai_service
    monkeypatch.setattr(ai_service, "compute_cosine_similarity", lambda v1, v2: 0.95)

    # 1. Studio setup
    signup_res = client.post(
        "/api/v1/auth/signup",
        json={"email": "join_iso@example.com", "password": "Password123!", "studio_name": "Join Studio"}
    )
    headers = {"Authorization": f"Bearer {signup_res.json()['access_token']}"}

    # 2. Create Event A and Event B
    res_a = client.post("/api/v1/events", headers=headers, json={"name": "Event A"})
    event_a_id = res_a.json()["id"]

    res_b = client.post("/api/v1/events", headers=headers, json={"name": "Event B"})
    event_b_id = res_b.json()["id"]

    # 3. Add Photo & FaceEmbedding in Event A
    photo_a = Photo(
        event_id=event_a_id,
        original_file_name="event_a_photo.jpg",
        file_path="storage/events/mock/a.jpg",
        sha256_hash="hash_a_12345",
        file_size=1024,
        mime_type="image/jpeg",
        status=PhotoStatus.PROCESSED.value,
        faces_detected_count=1,
    )
    db_session.add(photo_a)
    db_session.flush()

    face_a = Face(
        photo_id=photo_a.id,
        event_id=event_a_id,
        bounding_box={"x": 10, "y": 10, "w": 50, "h": 50},
        detection_confidence=0.99,
    )
    db_session.add(face_a)
    db_session.flush()

    dummy_vec = [1.0 / (128 ** 0.5)] * 128
    face_emb_a = FaceEmbedding(face_id=face_a.id, event_id=event_a_id, embedding=dummy_vec)
    db_session.add(face_emb_a)

    # 4. Add Photo & FaceEmbedding in Event B with identical embedding
    photo_b = Photo(
        event_id=event_b_id,
        original_file_name="event_b_photo.jpg",
        file_path="storage/events/mock/b.jpg",
        sha256_hash="hash_b_67890",
        file_size=1024,
        mime_type="image/jpeg",
        status=PhotoStatus.PROCESSED.value,
        faces_detected_count=1,
    )
    db_session.add(photo_b)
    db_session.flush()

    face_b = Face(
        photo_id=photo_b.id,
        event_id=event_b_id,
        bounding_box={"x": 10, "y": 10, "w": 50, "h": 50},
        detection_confidence=0.99,
    )
    db_session.add(face_b)
    db_session.flush()

    face_emb_b = FaceEmbedding(face_id=face_b.id, event_id=event_b_id, embedding=dummy_vec)
    db_session.add(face_emb_b)
    db_session.commit()

    # 5. Register guest in Event A
    reg_res = client.post(
        f"/api/v1/events/{event_a_id}/guests/register",
        json={"name": "Guest In A", "mobile": "+919876543299"}
    )
    guest_a_id = reg_res.json()["guest_id"]
    client.post(f"/api/v1/guests/{guest_a_id}/consent", json={"guest_id": guest_a_id, "face_search_consent": True})

    # 6. Guest searches in Event A -> Must receive Photo A ONLY, NEVER Photo B
    selfie_bytes = create_dummy_face_image()
    search_res = client.post(
        f"/api/v1/events/{event_a_id}/guests/{guest_a_id}/search",
        files=[("selfie", ("selfie.jpg", selfie_bytes, "image/jpeg"))]
    )
    assert search_res.status_code == 200
    matched_ids = [p["id"] for p in search_res.json()["matched_photos"]]
    assert photo_a.id in matched_ids
    assert photo_b.id not in matched_ids


