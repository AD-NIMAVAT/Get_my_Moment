"""
Get My Moment — Event-Scoped Wi-Fi / FTP Camera Isolation & Security Tests
Tests strict multi-tenant isolation, cross-event listing isolation, cross-event delete IDOR protection,
and auto-approval provisioning.
"""

import pytest
import uuid
import time
from starlette.testclient import TestClient
from apps.api.models.photographer import Photographer
from apps.api.models.event import Event
from apps.api.models.camera import CameraDevice
from apps.api.auth import create_access_token


def test_camera_auto_approval_and_provisioning(client, db_session):
    """
    Test 1: Auto-approval & provisioning
    - When auto_approve=True: status == 'APPROVED', approved_at is set.
    - When auto_approve=False: status == 'PENDING_APPROVAL', approved_at is None.
    - Camera is strictly bound to photographer_id and event_id.
    """
    # 1. Create photographer & event
    p_email = f"camera_auto_{int(time.time())}@studio.com"
    studio = Photographer(
        id=str(uuid.uuid4()),
        email=p_email,
        password_hash="hash",
        studio_name="Auto Studio",
        is_active=True
    )
    db_session.add(studio)
    db_session.commit()

    event = Event(
        id=str(uuid.uuid4()),
        photographer_id=studio.id,
        name="Auto Approval Gala",
        slug=f"auto-gala-{int(time.time())}"
    )
    db_session.add(event)
    db_session.commit()

    token = create_access_token(data={"sub": studio.id})
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create camera with auto_approve = True
    res_approved = client.post(
        f"/api/v1/wireless/events/{event.id}/cameras",
        headers=headers,
        json={
            "display_name": "Sony A7 IV - Main Stage",
            "manufacturer": "Sony Alpha",
            "model": "A7 IV",
            "auto_approve": True
        }
    )
    assert res_approved.status_code == 201
    data_app = res_approved.json()
    assert data_app["camera"]["status"] == "APPROVED"
    assert data_app["camera"]["approved_at"] is not None
    assert data_app["camera"]["event_id"] == event.id
    assert data_app["camera"]["photographer_id"] == studio.id
    assert "credentials" in data_app
    assert "password" in data_app["credentials"]
    assert "host" in data_app["credentials"]

    # 3. Create camera with auto_approve = False (manual approval flow)
    res_pending = client.post(
        f"/api/v1/wireless/events/{event.id}/cameras",
        headers=headers,
        json={
            "display_name": "Canon R6 - Candid",
            "manufacturer": "Canon EOS",
            "model": "EOS R6 II",
            "auto_approve": False
        }
    )
    assert res_pending.status_code == 201
    data_pend = res_pending.json()
    assert data_pend["camera"]["status"] == "PENDING_APPROVAL"
    assert data_pend["camera"]["approved_at"] is None


def test_cross_event_camera_listing_isolation(client, db_session):
    """
    Test 2: Cross-Event Camera Listing Isolation
    - Studio owns Event A and Event B.
    - 2 cameras are registered in Event A.
    - Event B has 0 cameras.
    - Querying Event B cameras MUST return [] and NEVER leak Event A cameras.
    """
    p_email = f"camera_list_{int(time.time())}@studio.com"
    studio = Photographer(
        id=str(uuid.uuid4()),
        email=p_email,
        password_hash="hash",
        studio_name="Listing Studio",
        is_active=True
    )
    db_session.add(studio)
    db_session.commit()

    event_a = Event(id=str(uuid.uuid4()), photographer_id=studio.id, name="Event Alpha", slug=f"ev-alpha-{int(time.time())}")
    event_b = Event(id=str(uuid.uuid4()), photographer_id=studio.id, name="Event Beta", slug=f"ev-beta-{int(time.time())}")
    db_session.add_all([event_a, event_b])
    db_session.commit()

    token = create_access_token(data={"sub": studio.id})
    headers = {"Authorization": f"Bearer {token}"}

    # Add 2 cameras to Event A
    client.post(
        f"/api/v1/wireless/events/{event_a.id}/cameras",
        headers=headers,
        json={"display_name": "Alpha Cam 1", "manufacturer": "Sony Alpha", "auto_approve": True}
    )
    client.post(
        f"/api/v1/wireless/events/{event_a.id}/cameras",
        headers=headers,
        json={"display_name": "Alpha Cam 2", "manufacturer": "Nikon Z", "auto_approve": True}
    )

    # List Event A cameras -> should have 2
    res_a = client.get(f"/api/v1/wireless/events/{event_a.id}/cameras", headers=headers)
    assert res_a.status_code == 200
    assert len(res_a.json()) == 2

    # List Event B cameras -> MUST be empty []
    res_b = client.get(f"/api/v1/wireless/events/{event_b.id}/cameras", headers=headers)
    assert res_b.status_code == 200
    assert res_b.json() == []


def test_cross_event_delete_idor_defense(client, db_session):
    """
    Test 3: Cross-Event Delete IDOR Defense
    - Studio owns Event A (has Camera A) and Event B (empty).
    - Attempting DELETE /events/{event_b}/cameras/{camera_a} MUST return 404.
    - Camera A MUST remain in the database.
    - Proper deletion with matching event_id MUST succeed.
    """
    p_email = f"camera_idor_{int(time.time())}@studio.com"
    studio = Photographer(
        id=str(uuid.uuid4()),
        email=p_email,
        password_hash="hash",
        studio_name="IDOR Studio",
        is_active=True
    )
    db_session.add(studio)
    db_session.commit()

    event_a = Event(id=str(uuid.uuid4()), photographer_id=studio.id, name="Event Alpha IDOR", slug=f"ev-a-idor-{int(time.time())}")
    event_b = Event(id=str(uuid.uuid4()), photographer_id=studio.id, name="Event Beta IDOR", slug=f"ev-b-idor-{int(time.time())}")
    db_session.add_all([event_a, event_b])
    db_session.commit()

    token = create_access_token(data={"sub": studio.id})
    headers = {"Authorization": f"Bearer {token}"}

    # Create Camera in Event A
    create_res = client.post(
        f"/api/v1/wireless/events/{event_a.id}/cameras",
        headers=headers,
        json={"display_name": "Target Camera A", "manufacturer": "Sony Alpha", "auto_approve": True}
    )
    assert create_res.status_code == 201
    camera_a_id = create_res.json()["camera"]["id"]

    # Attempt cross-event IDOR delete via Event B path
    attack_res = client.delete(
        f"/api/v1/wireless/events/{event_b.id}/cameras/{camera_a_id}",
        headers=headers
    )
    assert attack_res.status_code == 404

    # Verify Camera A STILL exists in database
    db_session.expire_all()
    cam_in_db = db_session.query(CameraDevice).filter(CameraDevice.id == camera_a_id).first()
    assert cam_in_db is not None
    assert cam_in_db.event_id == event_a.id

    # Valid delete through matching Event A path
    valid_delete = client.delete(
        f"/api/v1/wireless/events/{event_a.id}/cameras/{camera_a_id}",
        headers=headers
    )
    assert valid_delete.status_code == 200
    assert valid_delete.json()["id"] == camera_a_id

    # Verify camera is gone from DB
    db_session.expire_all()
    cam_after_delete = db_session.query(CameraDevice).filter(CameraDevice.id == camera_a_id).first()
    assert cam_after_delete is None


def test_cross_photographer_isolation(client, db_session):
    """
    Test 4: Cross-Photographer Security Defense
    - Photographer A registers Camera A under Event A.
    - Photographer B MUST NOT be able to:
      - List Photographer A's cameras
      - Delete Photographer A's camera
      - Approve Photographer A's camera
      - Update Photographer A's camera
      - Reset Photographer A's camera FTP password
    """
    # Create Photographer A
    pa_email = f"photographer_a_{int(time.time())}@studio.com"
    studio_a = Photographer(id=str(uuid.uuid4()), email=pa_email, password_hash="h1", studio_name="Studio A", is_active=True)
    event_a = Event(id=str(uuid.uuid4()), photographer_id=studio_a.id, name="Event Studio A", slug=f"ev-a-p-{int(time.time())}")
    db_session.add_all([studio_a, event_a])
    db_session.commit()

    token_a = create_access_token(data={"sub": studio_a.id})
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Create Photographer B
    pb_email = f"photographer_b_{int(time.time())}@studio.com"
    studio_b = Photographer(id=str(uuid.uuid4()), email=pb_email, password_hash="h2", studio_name="Studio B", is_active=True)
    event_b = Event(id=str(uuid.uuid4()), photographer_id=studio_b.id, name="Event Studio B", slug=f"ev-b-p-{int(time.time())}")
    db_session.add_all([studio_b, event_b])
    db_session.commit()

    token_b = create_access_token(data={"sub": studio_b.id})
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Photographer A creates Camera A
    res_create = client.post(
        f"/api/v1/wireless/events/{event_a.id}/cameras",
        headers=headers_a,
        json={"display_name": "Studio A High-End Camera", "manufacturer": "Fujifilm X", "auto_approve": False}
    )
    assert res_create.status_code == 201
    camera_a_id = res_create.json()["camera"]["id"]

    # 1. Photographer B attempts to list Event A cameras -> 404
    assert client.get(f"/api/v1/wireless/events/{event_a.id}/cameras", headers=headers_b).status_code == 404

    # 2. Photographer B attempts to delete Camera A -> 404
    assert client.delete(f"/api/v1/wireless/events/{event_a.id}/cameras/{camera_a_id}", headers=headers_b).status_code == 404

    # 3. Photographer B attempts to approve Camera A -> 404
    assert client.post(f"/api/v1/wireless/events/{event_a.id}/cameras/{camera_a_id}/approve", headers=headers_b).status_code == 404

    # 4. Photographer B attempts to update Camera A -> 404
    assert client.patch(f"/api/v1/wireless/events/{event_a.id}/cameras/{camera_a_id}", headers=headers_b, json={"display_name": "Hacked"}).status_code == 404

    # 5. Photographer B attempts to reset Camera A FTP password -> 404
    assert client.post(f"/api/v1/wireless/events/{event_a.id}/cameras/{camera_a_id}/reset-ftp-password", headers=headers_b).status_code == 404
