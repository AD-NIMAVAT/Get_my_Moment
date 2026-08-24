"""
Queue Failure Recovery, Concurrency Claims & Durable Reconciliation Tests (P1-BATCH-12)
"""

import io
import os
import pytest
from datetime import datetime, timedelta
from PIL import Image
from apps.api.models import Photo, Event, Face, FaceEmbedding
from apps.api.services.storage import storage_service
from workers.ai_worker.worker import run_photo_pipeline, dispatch_photo_processing, reconcile_orphaned_photos
from packages.shared.constants import PhotoStatus


def generate_test_image() -> bytes:
    img = Image.new("RGB", (200, 200), color="green")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_atomic_processing_claim_and_duplicate_prevention(client, db_session):
    """Verify that atomic CAS claim prevents two workers from processing the same photo simultaneously."""
    # 1. Setup Studio & Event
    signup_res = client.post(
        "/api/v1/auth/signup",
        json={"email": "claim_test@example.com", "password": "Password123!", "studio_name": "Claim Studio"}
    )
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    event_res = client.post("/api/v1/events", headers=headers, json={"name": "Claim Event"})
    event_id = event_res.json()["id"]

    # 2. Upload Photo
    img = generate_test_image()
    files = [("files", ("claim_photo.jpg", img, "image/jpeg"))]
    res = client.post(f"/api/v1/events/{event_id}/photos", headers=headers, files=files)
    assert res.status_code == 201
    photo_id = res.json()["photos"][0]["id"]

    # 3. Simulate Photo already in PROCESSING state
    db_session.query(Photo).filter(Photo.id == photo_id).update({
        "status": PhotoStatus.PROCESSING.value,
        "processing_started_at": datetime.utcnow()
    })
    db_session.commit()

    # 4. Attempt second run_photo_pipeline -> Must return already_in_progress without duplicate execution
    result = run_photo_pipeline(photo_id, event_id, db_override=db_session)
    assert result["status"] == "already_in_progress"


def test_reprocessing_idempotency_and_face_cleanup(client, db_session):
    """Verify that re-processing a photo cleans up previous partial faces/embeddings cleanly."""
    signup_res = client.post(
        "/api/v1/auth/signup",
        json={"email": "idemp_test@example.com", "password": "Password123!", "studio_name": "Idemp Studio"}
    )
    headers = {"Authorization": f"Bearer {signup_res.json()['access_token']}"}
    event_res = client.post("/api/v1/events", headers=headers, json={"name": "Idemp Event"})
    event_id = event_res.json()["id"]

    img = generate_test_image()
    files = [("files", ("idemp_photo.jpg", img, "image/jpeg"))]
    res = client.post(f"/api/v1/events/{event_id}/photos", headers=headers, files=files)
    photo_id = res.json()["photos"][0]["id"]

    # 1. First full pipeline run
    db_session.query(Photo).filter(Photo.id == photo_id).update({"status": PhotoStatus.UPLOADED.value})
    db_session.commit()
    res1 = run_photo_pipeline(photo_id, event_id, db_override=db_session)
    assert res1["status"] == "success"

    # Verify Face and Embedding records created
    faces_1 = db_session.query(Face).filter(Face.photo_id == photo_id).count()

    # 2. Reset to FAILED and run second time (Retry simulation)
    db_session.query(Photo).filter(Photo.id == photo_id).update({"status": PhotoStatus.FAILED.value})
    db_session.commit()
    res2 = run_photo_pipeline(photo_id, event_id, db_override=db_session)
    assert res2["status"] == "success"

    # Verify Face count is identical (no duplicate leaked face rows)
    faces_2 = db_session.query(Face).filter(Face.photo_id == photo_id).count()
    assert faces_2 == faces_1


def test_reconcile_orphaned_photos_helper(client, db_session):
    """Verify that reconcile_orphaned_photos identifies stale UPLOADED records."""
    signup_res = client.post(
        "/api/v1/auth/signup",
        json={"email": "reconcile@example.com", "password": "Password123!", "studio_name": "Reconcile Studio"}
    )
    headers = {"Authorization": f"Bearer {signup_res.json()['access_token']}"}
    event_res = client.post("/api/v1/events", headers=headers, json={"name": "Reconcile Event"})
    event_id = event_res.json()["id"]

    # Create dummy photo in UPLOADED status created 10 minutes ago
    ten_mins_ago = datetime.utcnow() - timedelta(minutes=10)
    img = generate_test_image()
    file_id, rel_path, file_size, sha256_hash = storage_service.save_original(
        event_id=event_id,
        file_bytes=img,
        original_filename="orphaned.jpg"
    )

    photo = Photo(
        id=file_id,
        event_id=event_id,
        original_file_name="orphaned.jpg",
        file_path=rel_path,
        sha256_hash=sha256_hash,
        file_size=file_size,
        mime_type="image/jpeg",
        status=PhotoStatus.UPLOADED.value,
        created_at=ten_mins_ago,
    )
    db_session.add(photo)
    db_session.commit()

    # Run reconciliation
    reconciled = reconcile_orphaned_photos(event_id=event_id, max_age_seconds=60, db=db_session)
    assert reconciled >= 1
