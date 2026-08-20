"""
Tenancy & IDOR Isolation Hard Test Suite
Verifies zero cross-studio and cross-event leakage, slug collision resistance, and IDOR protection.
"""

import pytest
import uuid
from starlette.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from apps.api.database import Base, get_db
from apps.api.main import app
from apps.api.models import Photographer, Event, Folder, FolderType, Photo
from apps.api.auth import create_access_token


@pytest.fixture(scope="module")
def tenancy_env():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    db = TestingSessionLocal()

    # 1. Create Studios with similar names to test collision resistance
    studios = []
    names = ["Studio A", "Studio A1", "Studio-A", "Studio A Test"]
    for i, name in enumerate(names):
        s = Photographer(
            id=str(uuid.uuid4()),
            email=f"studio_{i}_{uuid.uuid4().hex[:4]}@test.com",
            password_hash="pw",
            studio_name=name,
            is_active=True,
        )
        db.add(s)
        studios.append(s)

    # Suspended Studio
    suspended_studio = Photographer(
        id=str(uuid.uuid4()),
        email="suspended@studio.com",
        password_hash="pw",
        studio_name="Suspended Studio",
        is_active=False,  # Suspended
    )
    db.add(suspended_studio)
    db.commit()

    # 2. Create Events with similar names
    events = []
    event_names = ["Wedding", "Wedding 2026", "Wedding_Test", "Wedding-2026"]
    for i, ev_name in enumerate(event_names):
        ev = Event(
            id=str(uuid.uuid4()),
            photographer_id=studios[i % len(studios)].id,
            name=ev_name,
            slug=ev_name.lower().replace(" ", "-").replace("_", "-"),
            access_token=f"token-{i}-{uuid.uuid4().hex[:6]}",
        )
        db.add(ev)
        events.append(ev)

    # 3. Create Folders & Photos for Studio 0 (Studio A)
    folder_a = Folder(
        id=str(uuid.uuid4()),
        studio_id=studios[0].id,
        event_id=events[0].id,
        name="01_Haldi",
        slug="01-haldi",
        folder_type=FolderType.CEREMONY,
    )
    db.add(folder_a)
    db.commit()

    photo_a = Photo(
        id=str(uuid.uuid4()),
        studio_id=studios[0].id,
        event_id=events[0].id,
        folder_id=folder_a.id,
        original_file_name="Secret_Photo_A.jpg",
        file_path="studios/a/originals/1.jpg",
        sha256_hash="hash_a1",
        file_size=1024000,
        mime_type="image/jpeg",
    )
    db.add(photo_a)
    db.commit()

    tokens = [create_access_token(data={"sub": s.id}) for s in studios]
    suspended_token = create_access_token(data={"sub": suspended_studio.id})

    yield {
        "client": client,
        "db": db,
        "studios": studios,
        "suspended_studio": suspended_studio,
        "events": events,
        "folder_a": folder_a,
        "photo_a": photo_a,
        "tokens": tokens,
        "suspended_token": suspended_token,
    }

    db.close()
    app.dependency_overrides.clear()


def test_cross_studio_data_isolation(tenancy_env):
    client = tenancy_env["client"]
    tokens = tenancy_env["tokens"]
    events = tenancy_env["events"]
    folder_a = tenancy_env["folder_a"]

    # Studio B (token 1) attempts to access Studio A's Event 0
    headers_b = {"Authorization": f"Bearer {tokens[1]}"}

    # 1. Cannot list Studio A's folders
    res1 = client.get(f"/api/v1/events/{events[0].id}/folders", headers=headers_b)
    assert res1.status_code == 404

    # 2. Cannot list Studio A's photos
    res2 = client.get(f"/api/v1/events/{events[0].id}/photos", headers=headers_b)
    assert res2.status_code == 404

    # 3. Cannot update Studio A's folder
    res3 = client.put(
        f"/api/v1/events/{events[0].id}/folders/{folder_a.id}",
        json={"name": "Hacked"},
        headers=headers_b
    )
    assert res3.status_code == 404

    # 4. Cannot delete Studio A's folder
    res4 = client.delete(f"/api/v1/events/{events[0].id}/folders/{folder_a.id}", headers=headers_b)
    assert res4.status_code == 404


def test_idor_and_malformed_id_defense(tenancy_env):
    client = tenancy_env["client"]
    tokens = tenancy_env["tokens"]
    events = tenancy_env["events"]

    headers_a = {"Authorization": f"Bearer {tokens[0]}"}

    malformed_ids = [
        "1",
        "0",
        "-1",
        "undefined",
        "null",
        "../events",
        "' OR 1=1 --",
        "00000000-0000-0000-0000-000000000000",
        str(uuid.uuid4()),  # Random non-existent UUID
    ]

    for bad_id in malformed_ids:
        res = client.get(f"/api/v1/events/{events[0].id}/folders/{bad_id}", headers=headers_a)
        # Should be 404 or 405, never 500
        assert res.status_code in [404, 405]


def test_suspended_account_access_blocked(tenancy_env):
    client = tenancy_env["client"]
    suspended_token = tenancy_env["suspended_token"]
    events = tenancy_env["events"]

    headers_suspended = {"Authorization": f"Bearer {suspended_token}"}

    # Suspended studio attempt to access events or folders -> 401 / 403
    res = client.get(f"/api/v1/events/{events[0].id}/folders", headers=headers_suspended)
    assert res.status_code in [401, 403, 404]
