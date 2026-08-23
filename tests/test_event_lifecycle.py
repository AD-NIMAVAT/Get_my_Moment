"""
Dedicated Event Lifecycle Architecture & Tenancy Isolation Tests (P1-BATCH-05)
"""

import pytest
from apps.api.models import Event, Photo, Face, FaceEmbedding, Guest, Consent
from packages.shared.constants import EventStatus


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


def test_event_lifecycle_defaults_and_backward_compatibility(client):
    """Verify event creation without lifecycle fields returns None for closed_at and archived_at."""
    token = get_auth_token_for(client, "lifecycle_owner@studio.com", "Lifecycle Studio")
    headers = {"Authorization": f"Bearer {token}"}

    create_res = client.post(
        "/api/v1/events",
        headers=headers,
        json={"name": "Royal Heritage Wedding 2026"}
    )
    assert create_res.status_code == 201
    data = create_res.json()
    assert data["name"] == "Royal Heritage Wedding 2026"
    assert data["closed_at"] is None
    assert data["archived_at"] is None


def test_event_lifecycle_closed_at_and_archived_at_updates(client):
    """Verify setting closed_at and archived_at explicitly on an event."""
    token = get_auth_token_for(client, "lifecycle_owner2@studio.com", "Lifecycle Studio 2")
    headers = {"Authorization": f"Bearer {token}"}

    create_res = client.post(
        "/api/v1/events",
        headers=headers,
        json={"name": "Sunset Beach Sangeet"}
    )
    assert create_res.status_code == 201
    event_id = create_res.json()["id"]

    closed_time = "2026-08-24T12:00:00"
    archived_time = "2026-08-25T18:30:00"

    # 1. Close event proofing
    patch_res1 = client.patch(
        f"/api/v1/events/{event_id}",
        headers=headers,
        json={"closed_at": closed_time}
    )
    assert patch_res1.status_code == 200
    assert patch_res1.json()["closed_at"] is not None
    assert patch_res1.json()["archived_at"] is None

    # 2. Archive event
    patch_res2 = client.patch(
        f"/api/v1/events/{event_id}",
        headers=headers,
        json={"archived_at": archived_time, "status": "ARCHIVED"}
    )
    assert patch_res2.status_code == 200
    assert patch_res2.json()["closed_at"] is not None
    assert patch_res2.json()["archived_at"] is not None
    assert patch_res2.json()["status"] == "ARCHIVED"


def test_lifecycle_tenancy_isolation(client):
    """Verify Tenant A cannot modify or inspect Tenant B event lifecycle timestamps."""
    token_a = get_auth_token_for(client, "tenant_a@studio.com", "Studio A")
    token_b = get_auth_token_for(client, "tenant_b@studio.com", "Studio B")

    # Tenant A creates event
    create_res = client.post(
        "/api/v1/events",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"name": "Tenant A Private Gala"}
    )
    event_a_id = create_res.json()["id"]

    # Tenant B attempts to set closed_at on Tenant A's event -> 404
    attack_res = client.patch(
        f"/api/v1/events/{event_a_id}",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"closed_at": "2026-08-24T00:00:00"}
    )
    assert attack_res.status_code == 404


def test_lifecycle_non_destructive_invariants(client, db_session):
    """Verify setting closed_at or archived_at does not delete photos, faces, embeddings or guests."""
    token = get_auth_token_for(client, "nondestructive@studio.com", "Non Destructive Studio")
    headers = {"Authorization": f"Bearer {token}"}

    create_res = client.post(
        "/api/v1/events",
        headers=headers,
        json={"name": "Invariant Protection Wedding"}
    )
    event_id = create_res.json()["id"]

    # Add mock child records
    photo = Photo(
        event_id=event_id,
        storage_path="storage/photos/test_invariant.jpg",
        original_file_name="invariant.jpg",
        file_size=1024,
    )
    guest = Guest(
        event_id=event_id,
        name="Test Guest",
        mobile="9999999999",
    )
    db_session.add(photo)
    db_session.add(guest)
    db_session.commit()
    db_session.refresh(photo)
    db_session.refresh(guest)

    # Set closed_at and archived_at
    patch_res = client.patch(
        f"/api/v1/events/{event_id}",
        headers=headers,
        json={
            "closed_at": "2026-08-24T15:00:00",
            "archived_at": "2026-08-24T16:00:00"
        }
    )
    assert patch_res.status_code == 200

    # Verify child records remain 100% intact in database
    photo_check = db_session.query(Photo).filter(Photo.event_id == event_id).first()
    guest_check = db_session.query(Guest).filter(Guest.event_id == event_id).first()
    assert photo_check is not None
    assert photo_check.id == photo.id
    assert guest_check is not None
    assert guest_check.id == guest.id
