"""
Phase 3: Folder Management REST APIs & Multi-Tenant Security Tests
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
def test_app():
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

    # Create Studio A & Studio B
    studio_a = Photographer(
        id=str(uuid.uuid4()),
        email="studio_a@test.com",
        password_hash="pw_a",
        studio_name="Studio Alpha",
        is_active=True,
    )
    studio_b = Photographer(
        id=str(uuid.uuid4()),
        email="studio_b@test.com",
        password_hash="pw_b",
        studio_name="Studio Beta",
        is_active=True,
    )
    db.add(studio_a)
    db.add(studio_b)
    db.commit()

    # Create Event for Studio A
    event_a = Event(
        id=str(uuid.uuid4()),
        photographer_id=studio_a.id,
        name="Studio A Wedding",
        slug="studio-a-wedding",
    )
    # Create Event for Studio B
    event_b = Event(
        id=str(uuid.uuid4()),
        photographer_id=studio_b.id,
        name="Studio B Wedding",
        slug="studio-b-wedding",
    )
    db.add(event_a)
    db.add(event_b)
    db.commit()

    token_a = create_access_token(data={"sub": studio_a.id})
    token_b = create_access_token(data={"sub": studio_b.id})

    yield {
        "client": client,
        "db": db,
        "studio_a": studio_a,
        "studio_b": studio_b,
        "event_a": event_a,
        "event_b": event_b,
        "token_a": token_a,
        "token_b": token_b,
    }

    db.close()
    app.dependency_overrides.clear()


def test_create_and_nest_folder(test_app):
    client = test_app["client"]
    token_a = test_app["token_a"]
    event_a = test_app["event_a"]

    headers = {"Authorization": f"Bearer {token_a}"}

    # 1. Create Root Folder
    res = client.post(
        f"/api/v1/events/{event_a.id}/folders",
        json={"name": "01_Haldi", "order_index": 1},
        headers=headers,
    )
    assert res.status_code == 201
    root_folder = res.json()
    assert root_folder["name"] == "01_Haldi"
    assert root_folder["slug"] == "01-haldi"

    # 2. Create Nested Subfolder
    res_sub = client.post(
        f"/api/v1/events/{event_a.id}/folders",
        json={"name": "Haldi Candids", "parent_id": root_folder["id"], "order_index": 1},
        headers=headers,
    )
    assert res_sub.status_code == 201
    subfolder = res_sub.json()
    assert subfolder["parent_id"] == root_folder["id"]

    # 3. List folders tree
    res_list = client.get(f"/api/v1/events/{event_a.id}/folders", headers=headers)
    assert res_list.status_code == 200
    tree = res_list.json()
    
    # Verify root folder contains subfolder
    haldi = next((f for f in tree if f["id"] == root_folder["id"]), None)
    assert haldi is not None
    assert len(haldi["subfolders"]) == 1
    assert haldi["subfolders"][0]["name"] == "Haldi Candids"


def test_multi_tenant_isolation(test_app):
    client = test_app["client"]
    token_b = test_app["token_b"]
    event_a = test_app["event_a"]

    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Studio B attempts to list Studio A's folders
    res = client.get(f"/api/v1/events/{event_a.id}/folders", headers=headers_b)
    assert res.status_code == 404

    # Studio B attempts to create a folder in Studio A's event
    res_create = client.post(
        f"/api/v1/events/{event_a.id}/folders",
        json={"name": "Hacked Folder"},
        headers=headers_b,
    )
    assert res_create.status_code == 404


def test_idempotent_wedding_presets(test_app):
    client = test_app["client"]
    token_a = test_app["token_a"]
    event_a = test_app["event_a"]

    headers = {"Authorization": f"Bearer {token_a}"}

    # 1. First Click
    res1 = client.post(f"/api/v1/events/{event_a.id}/folders/generate-wedding-preset", headers=headers)
    assert res1.status_code == 200
    folders1 = res1.json()
    names1 = [f["name"] for f in folders1]
    assert "01_Haldi" in names1
    assert "02_Mehendi" in names1
    assert "03_Sangeet" in names1
    assert "04_Wedding" in names1
    assert "05_Reception" in names1

    count1 = len(folders1)

    # 2. Second Click (Must be 100% Idempotent - 0 duplicates)
    res2 = client.post(f"/api/v1/events/{event_a.id}/folders/generate-wedding-preset", headers=headers)
    assert res2.status_code == 200
    folders2 = res2.json()
    assert len(folders2) == count1


def test_bulk_move_photos_and_counter_reconciliation(test_app):
    client = test_app["client"]
    db = test_app["db"]
    token_a = test_app["token_a"]
    studio_a = test_app["studio_a"]
    event_a = test_app["event_a"]

    headers = {"Authorization": f"Bearer {token_a}"}

    # Fetch folders
    res = client.get(f"/api/v1/events/{event_a.id}/folders", headers=headers)
    folders = res.json()
    haldi = next(f for f in folders if "Haldi" in f["name"])
    reception = next(f for f in folders if "Reception" in f["name"])

    # Create 3 photos in Haldi
    photo_ids = []
    for i in range(3):
        p = Photo(
            id=str(uuid.uuid4()),
            studio_id=studio_a.id,
            event_id=event_a.id,
            folder_id=haldi["id"],
            original_file_name=f"DSC_00{i}.jpg",
            file_path=f"studios/{studio_a.id}/events/{event_a.id}/originals/{haldi['id']}/{i}.jpg",
            sha256_hash=f"hash_{uuid.uuid4().hex}",
            file_size=3000000,
            mime_type="image/jpeg",
        )
        db.add(p)
        photo_ids.append(p.id)
    db.commit()

    # Move all 3 photos to Reception
    move_res = client.post(
        f"/api/v1/events/{event_a.id}/folders/move-photos",
        json={"photo_ids": photo_ids, "destination_folder_id": reception["id"]},
        headers=headers,
    )
    assert move_res.status_code == 200
    assert move_res.json()["moved_count"] == 3

    # Check updated folders counters
    res_after = client.get(f"/api/v1/events/{event_a.id}/folders", headers=headers)
    folders_after = res_after.json()
    haldi_after = next(f for f in folders_after if f["id"] == haldi["id"])
    reception_after = next(f for f in folders_after if f["id"] == reception["id"])

    assert haldi_after["photo_count"] == 0
    assert reception_after["photo_count"] == 3
