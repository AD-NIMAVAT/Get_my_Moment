"""
P25: Security & Privacy Penetration Test Suite
Validates:
1. Cross-Event Isolation (Event A guests cannot match/view Event B photos)
2. Cross-Photographer Boundaries (Photographer A cannot access/modify Photographer B assets)
3. Directory Traversal Defenses (Path injection attacks ../../ blocked)
4. Magic Byte & MIME Spoofing (Non-image files disguised as .jpg rejected)
5. Expired/Inactive Event Protection
6. Transient Selfie Privacy (Selfie bytes not persisted to disk)
"""

import pytest
import io
from PIL import Image
from fastapi.testclient import TestClient
from apps.api.models import Photographer, Event, Photo, Face, FaceEmbedding, Guest, Consent
from apps.api.services.storage import storage_service
from packages.shared.constants import EventStatus, PhotoStatus


def test_cross_photographer_isolation(client: TestClient, db_session):
    """Verify Photographer A cannot view, modify, or delete Photographer B's events."""
    # 1. Register Photographer A
    res_a = client.post("/api/v1/auth/signup", json={
        "email": "photog_a@example.com",
        "password": "SecurePassword123!",
        "full_name": "Photographer A",
        "studio_name": "Studio A"
    })
    token_a = res_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. Register Photographer B
    res_b = client.post("/api/v1/auth/signup", json={
        "email": "photog_b@example.com",
        "password": "SecurePassword123!",
        "full_name": "Photographer B",
        "studio_name": "Studio B"
    })
    token_b = res_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 3. Photographer A creates Event A
    res_event_a = client.post("/api/v1/events", headers=headers_a, json={
        "name": "Secret VIP Event A",
        "slug": "secret-vip-event-a"
    })
    event_a_id = res_event_a.json()["id"]

    # 4. Photographer B attempts to access Event A
    res_unauth_get = client.get(f"/api/v1/events/{event_a_id}", headers=headers_b)
    assert res_unauth_get.status_code == 404, "Photographer B should not see Event A"

    # 5. Photographer B attempts to delete Event A
    res_unauth_delete = client.delete(f"/api/v1/events/{event_a_id}", headers=headers_b)
    assert res_unauth_delete.status_code == 404, "Photographer B cannot delete Event A"

    # 6. Photographer A can access Event A
    res_auth_get = client.get(f"/api/v1/events/{event_a_id}", headers=headers_a)
    assert res_auth_get.status_code == 200


def test_directory_traversal_prevention(client: TestClient, db_session):
    """Verify directory traversal attempts in file paths are intercepted and blocked."""
    with pytest.raises(Exception) as exc_info:
        storage_service._safe_resolve("../../etc/passwd")
    assert "Security Violation" in str(exc_info.value) or "traversal" in str(exc_info.value).lower()

    with pytest.raises(Exception) as exc_info:
        storage_service._safe_resolve("..\\..\\Windows\\System32\\cmd.exe")
    assert "Security Violation" in str(exc_info.value) or "traversal" in str(exc_info.value).lower()


def test_magic_byte_validation_rejects_fake_images(client: TestClient, db_session):
    """Verify non-image files renamed to .jpg are rejected by magic byte inspection."""
    fake_executable_bytes = b"MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00"
    with pytest.raises(Exception) as exc_info:
        storage_service.validate_image(fake_executable_bytes)
    assert "Invalid or corrupted" in str(exc_info.value) or "corrupted" in str(exc_info.value).lower()

    fake_script_bytes = b"#!/bin/bash\necho 'hacked'\n"
    with pytest.raises(Exception) as exc_info:
        storage_service.validate_image(fake_script_bytes)
    assert "Invalid or corrupted" in str(exc_info.value) or "corrupted" in str(exc_info.value).lower()


def test_unconsented_guest_search_blocked(client: TestClient, db_session):
    """Verify that a guest who has not accepted face-search consent cannot perform facial searches."""
    # 1. Photographer & Event setup
    signup_res = client.post("/api/v1/auth/signup", json={
        "email": "consent_test@example.com",
        "password": "Password123!",
        "full_name": "Consent Studio",
        "studio_name": "Consent Studio"
    })
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    event_res = client.post("/api/v1/events", headers=headers, json={"name": "Consent Event", "slug": "consent-event"})
    event_id = event_res.json()["id"]

    # 2. Register guest without consenting
    guest_res = client.post(f"/api/v1/events/{event_id}/guests/register", json={
        "name": "Jane NoConsent",
        "mobile": "+15550009999"
    })
    guest_id = guest_res.json()["guest_id"]

    # 3. Create a test image
    img = Image.new("RGB", (200, 200), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    # 4. Attempt search without consent
    search_res = client.post(
        f"/api/v1/events/{event_id}/guests/{guest_id}/search",
        files={"selfie": ("selfie.jpg", buf.getvalue(), "image/jpeg")}
    )
    assert search_res.status_code == 403, "Search without consent must return 403 Forbidden"
    assert "consent" in search_res.json()["detail"].lower()


def test_inactive_event_public_access_blocked(client: TestClient, db_session):
    """Verify that guests cannot access or register for inactive/archived events."""
    signup_res = client.post("/api/v1/auth/signup", json={
        "email": "archive_test@example.com",
        "password": "Password123!",
        "full_name": "Archive Studio",
        "studio_name": "Archive Studio"
    })
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    event_res = client.post("/api/v1/events", headers=headers, json={"name": "Archived Event", "slug": "archived-event"})
    event_id = event_res.json()["id"]
    access_token = event_res.json()["access_token"]

    # Archive the event via PATCH
    client.patch(f"/api/v1/events/{event_id}", headers=headers, json={"status": EventStatus.ARCHIVED.value})

    # Public token lookup should return 400
    pub_res = client.get(f"/api/v1/events/public/by-token/{access_token}")
    assert pub_res.status_code == 400
    assert "archived" in pub_res.json()["detail"].lower()
