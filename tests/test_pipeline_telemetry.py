"""
Pipeline Telemetry, Queue Observability & Event Health Tests (P1-BATCH-06)
"""

import pytest
from datetime import datetime
from apps.api.models import Event, Photo, Face, FaceEmbedding
from packages.shared.constants import EventStatus, PhotoStatus
from workers.ai_worker.worker import run_photo_pipeline, dispatch_photo_processing
from apps.api.services.queue_telemetry import queue_telemetry


def get_auth_token_for(client, email, studio_name):
    res = client.post(
        "/api/v1/auth/signup",
        json={
            "email": email,
            "password": "Password123!",
            "studio_name": studio_name,
        }
    )
    if res.status_code == 201:
        return res.json()["access_token"]
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Password123!"}
    )
    return login_res.json()["access_token"]


def test_photo_pipeline_telemetry_timestamps(client, db_session):
    """Verify that processing a photo generates monotonic latency and lifecycle timestamps."""
    token = get_auth_token_for(client, "telemetry_owner@studio.com", "Telemetry Studio")
    headers = {"Authorization": f"Bearer {token}"}

    create_res = client.post(
        "/api/v1/events",
        headers=headers,
        json={"name": "Telemetry Royal Gala"}
    )
    assert create_res.status_code == 201
    event_id = create_res.json()["id"]

    # 1. Create a 100x100 RGB dummy image
    from PIL import Image
    import io
    from apps.api.services.storage import storage_service

    img = Image.new("RGB", (100, 100), color=(73, 109, 137))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    file_bytes = buf.getvalue()

    file_id, rel_path, file_size, sha256_hash = storage_service.save_original(
        event_id=event_id,
        file_bytes=file_bytes,
        original_filename="telemetry_test.jpg",
    )

    photo = Photo(
        id=file_id,
        event_id=event_id,
        file_path=rel_path,
        original_file_name="telemetry_test.jpg",
        sha256_hash=sha256_hash,
        file_size=file_size,
        mime_type="image/jpeg",
        status=PhotoStatus.UPLOADED.value,
    )
    db_session.add(photo)
    db_session.commit()
    db_session.refresh(photo)

    # 2. Dispatch photo processing
    dispatch_photo_processing(photo_id=photo.id, event_id=event_id, db=db_session)
    db_session.refresh(photo)

    # In test mode, dispatch executes synchronously and records telemetry
    assert photo.queued_at is not None
    assert photo.processing_started_at is not None
    assert photo.guest_ready_at is not None
    assert photo.processing_duration_ms is not None
    assert photo.processing_duration_ms >= 0
    assert photo.status == PhotoStatus.PROCESSED.value


def test_event_health_endpoint_and_tenancy(client, db_session, monkeypatch):
    """Verify GET /api/v1/events/{id}/health exposes aggregated metrics and blocks cross-tenant access."""
    monkeypatch.setattr("apps.api.routers.events.queue_telemetry.get_queue_depth", lambda: 0)
    token_a = get_auth_token_for(client, "health_tenant_a@studio.com", "Studio A Health")
    token_b = get_auth_token_for(client, "health_tenant_b@studio.com", "Studio B Health")

    # Studio A creates event
    create_res = client.post(
        "/api/v1/events",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"name": "Studio A Health Event"}
    )
    event_id = create_res.json()["id"]

    # Add 2 processed photos with mock latency
    now = datetime.utcnow()
    p1 = Photo(
        event_id=event_id,
        file_path="storage/photos/p1.jpg",
        original_file_name="p1.jpg",
        sha256_hash="1111111111111111111111111111111111111111111111111111111111111111",
        file_size=1024,
        mime_type="image/jpeg",
        status=PhotoStatus.PROCESSED.value,
        guest_ready_at=now,
        processing_duration_ms=120,
        ai_inference_ms=85,
    )
    p2 = Photo(
        event_id=event_id,
        file_path="storage/photos/p2.jpg",
        original_file_name="p2.jpg",
        sha256_hash="2222222222222222222222222222222222222222222222222222222222222222",
        file_size=1024,
        mime_type="image/jpeg",
        status=PhotoStatus.PROCESSED.value,
        guest_ready_at=now,
        processing_duration_ms=140,
        ai_inference_ms=95,
    )
    db_session.add(p1)
    db_session.add(p2)
    db_session.commit()

    # Studio A queries health -> 200 OK
    health_res = client.get(
        f"/api/v1/events/{event_id}/health",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert health_res.status_code == 200
    data = health_res.json()
    assert data["event_id"] == event_id
    assert data["photos_total"] == 2
    assert data["photos_ready"] == 2
    assert data["photos_failed"] == 0
    assert data["pipeline_health"] in ["HEALTHY", "READY"]
    assert data["avg_processing_duration_ms"] == 130
    assert data["avg_ai_inference_ms"] == 90
    assert data["last_guest_ready_at"] is not None

    # Studio B queries Studio A health -> 404 (Tenancy Isolation)
    attack_res = client.get(
        f"/api/v1/events/{event_id}/health",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert attack_res.status_code == 404


def test_queue_telemetry_graceful_fallback():
    """Verify queue telemetry returns safe fallback depth when queue is empty or offline."""
    depth = queue_telemetry.get_queue_depth()
    # In test environment, depth is either an int (if redis is online) or None
    assert depth is None or isinstance(depth, int)

    stats = queue_telemetry.get_pipeline_telemetry()
    assert "queue_depth" in stats
    assert "is_backlogged" in stats
    assert "queue_metrics_unavailable" in stats


def test_queue_telemetry_unavailable_distinction(monkeypatch):
    """Verify that when Redis throws an error, queue_depth is None and queue_metrics_unavailable is True."""
    from apps.api.services.queue_telemetry import QueueTelemetryService
    svc = QueueTelemetryService()
    
    # Mock _get_redis to return None (simulating down redis)
    monkeypatch.setattr(svc, "_get_redis", lambda: None)
    
    assert svc.get_queue_depth() is None
    assert svc.is_available() is False
    telemetry = svc.get_pipeline_telemetry()
    assert telemetry["queue_depth"] is None
    assert telemetry["queue_metrics_unavailable"] is True


def test_event_health_oldest_queue_age(client, db_session):
    """Verify oldest_queue_age_seconds is computed from earliest queued_at timestamp."""
    token = get_auth_token_for(client, "oldest_age@studio.com", "Oldest Age Studio")
    headers = {"Authorization": f"Bearer {token}"}

    create_res = client.post(
        "/api/v1/events",
        headers=headers,
        json={"name": "Queue Age Event"}
    )
    event_id = create_res.json()["id"]

    # Add a photo in UPLOADED state queued 45 seconds ago
    from datetime import timedelta
    queued_time = datetime.utcnow() - timedelta(seconds=45)
    p = Photo(
        event_id=event_id,
        file_path="storage/photos/queued_photo.jpg",
        original_file_name="queued_photo.jpg",
        sha256_hash="3333333333333333333333333333333333333333333333333333333333333333",
        file_size=1024,
        mime_type="image/jpeg",
        status=PhotoStatus.UPLOADED.value,
        queued_at=queued_time,
    )
    db_session.add(p)
    db_session.commit()

    health_res = client.get(f"/api/v1/events/{event_id}/health", headers=headers)
    assert health_res.status_code == 200
    data = health_res.json()
    assert data["oldest_queue_age_seconds"] is not None
    assert data["oldest_queue_age_seconds"] >= 40


def test_event_health_pipeline_states_and_thresholds(client, db_session, monkeypatch):
    """Verify READY, PROCESSING, WARNING, CRITICAL, and TELEMETRY_UNAVAILABLE states."""
    from apps.api.config import settings
    monkeypatch.setattr("apps.api.routers.events.queue_telemetry.get_queue_depth", lambda: 0)
    token = get_auth_token_for(client, "states_tester@studio.com", "States Studio")
    headers = {"Authorization": f"Bearer {token}"}

    create_res = client.post(
        "/api/v1/events",
        headers=headers,
        json={"name": "State Progression Event"}
    )
    event_id = create_res.json()["id"]

    # 1. State: READY (0 photos, queue empty)
    res = client.get(f"/api/v1/events/{event_id}/health", headers=headers)
    assert res.status_code == 200
    assert res.json()["pipeline_health"] == "READY"
    assert res.json()["database_pending_count"] == 0

    # 2. State: PROCESSING (5 pending photos < WARNING threshold 25)
    from datetime import timedelta
    for i in range(5):
        p = Photo(
            event_id=event_id,
            file_path=f"storage/photos/p_proc_{i}.jpg",
            original_file_name=f"p_proc_{i}.jpg",
            sha256_hash=f"hash_proc_{i}_{'0'*50}",
            file_size=1024,
            mime_type="image/jpeg",
            status=PhotoStatus.UPLOADED.value,
            queued_at=datetime.utcnow() - timedelta(seconds=5),
        )
        db_session.add(p)
    db_session.commit()

    res = client.get(f"/api/v1/events/{event_id}/health", headers=headers)
    assert res.status_code == 200
    assert res.json()["pipeline_health"] == "PROCESSING"
    assert res.json()["database_pending_count"] == 5

    # 3. State: WARNING (oldest pending age > 30s)
    p_old = Photo(
        event_id=event_id,
        file_path="storage/photos/p_old.jpg",
        original_file_name="p_old.jpg",
        sha256_hash=f"hash_old_{'0'*55}",
        file_size=1024,
        mime_type="image/jpeg",
        status=PhotoStatus.UPLOADED.value,
        queued_at=datetime.utcnow() - timedelta(seconds=45),
    )
    db_session.add(p_old)
    db_session.commit()

    res = client.get(f"/api/v1/events/{event_id}/health", headers=headers)
    assert res.status_code == 200
    assert res.json()["pipeline_health"] == "WARNING"

    # 4. State: CRITICAL (oldest pending age > 120s or failed photo present)
    p_fail = Photo(
        event_id=event_id,
        file_path="storage/photos/p_fail.jpg",
        original_file_name="p_fail.jpg",
        sha256_hash=f"hash_fail_{'0'*55}",
        file_size=1024,
        mime_type="image/jpeg",
        status=PhotoStatus.FAILED.value,
        error_message="Decode error",
        failure_category="DECODE_FAILED",
    )
    db_session.add(p_fail)
    db_session.commit()

    res = client.get(f"/api/v1/events/{event_id}/health", headers=headers)
    assert res.status_code == 200
    assert res.json()["pipeline_health"] == "CRITICAL"

    # 5. State: TELEMETRY_UNAVAILABLE (Redis connection offline)
    monkeypatch.setattr("apps.api.routers.events.queue_telemetry.get_queue_depth", lambda: None)
    res_unavail = client.get(f"/api/v1/events/{event_id}/health", headers=headers)
    assert res_unavail.status_code == 200
    assert res_unavail.json()["pipeline_health"] == "TELEMETRY_UNAVAILABLE"
    assert res_unavail.json()["queue_metrics_unavailable"] is True


def test_durable_photo_ingest_preserves_data_under_backlog(client, db_session):
    """Verify that photo upload endpoints durably persist file metadata and return HTTP 201 without rejecting."""
    token = get_auth_token_for(client, "durability_studio@test.com", "Durability Studio")
    headers = {"Authorization": f"Bearer {token}"}

    create_res = client.post("/api/v1/events", headers=headers, json={"name": "Durability Event"})
    event_id = create_res.json()["id"]

    # Generate dummy image
    from PIL import Image
    import io
    img = Image.new("RGB", (200, 200), color=(100, 150, 200))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    upload_res = client.post(
        f"/api/v1/events/{event_id}/photos",
        headers=headers,
        files={"files": ("durable_shot.jpg", buf, "image/jpeg")}
    )
    assert upload_res.status_code == 201
    data = upload_res.json()
    assert len(data["photos"]) == 1
    photo_id = data["photos"][0]["id"]

    # Verify photo is durably saved in database with queued_at timestamp
    stored_photo = db_session.query(Photo).filter(Photo.id == photo_id).first()
    assert stored_photo is not None
    assert stored_photo.status in [PhotoStatus.UPLOADED.value, PhotoStatus.PROCESSING.value, PhotoStatus.PROCESSED.value]
    assert stored_photo.queued_at is not None


def test_celery_hardware_portable_configuration_defaults():
    """Verify that hardware-portable Celery and backlog settings exist with safe defaults."""
    from apps.api.config import settings
    assert settings.CELERY_WORKER_CONCURRENCY == 2
    assert settings.CELERY_WORKER_PREFETCH_MULTIPLIER == 1
    assert settings.CELERY_TASK_ACKS_LATE is True
    assert settings.CELERY_TASK_REJECT_ON_WORKER_LOST is True
    assert settings.AI_BACKLOG_WARNING_THRESHOLD == 25
    assert settings.AI_BACKLOG_CRITICAL_THRESHOLD == 100
    assert settings.AI_QUEUE_AGE_WARNING_SECONDS == 30
    assert settings.AI_QUEUE_AGE_CRITICAL_SECONDS == 120
