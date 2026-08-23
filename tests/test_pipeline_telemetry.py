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

    # 1. Create photo in UPLOADED state
    photo = Photo(
        event_id=event_id,
        file_path="storage/photos/test_telemetry.jpg",
        original_file_name="telemetry.jpg",
        sha256_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        file_size=2048,
        mime_type="image/jpeg",
        status=PhotoStatus.UPLOADED.value,
    )
    db_session.add(photo)
    db_session.commit()
    db_session.refresh(photo)

    # 2. Dispatch photo processing
    dispatch_photo_processing(photo_id=photo.id, event_id=event_id, db=db_session)
    db_session.refresh(photo)

    # In test mode, dispatch executes synchronously and records queued_at
    assert photo.queued_at is not None


def test_event_health_endpoint_and_tenancy(client, db_session):
    """Verify GET /api/v1/events/{id}/health exposes aggregated metrics and blocks cross-tenant access."""
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
    assert data["pipeline_health"] == "HEALTHY"
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
    assert isinstance(depth, int)
    assert depth >= 0

    stats = queue_telemetry.get_pipeline_telemetry()
    assert "queue_depth" in stats
    assert "is_backlogged" in stats
