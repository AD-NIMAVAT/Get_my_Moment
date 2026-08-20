"""
Phase 4: Photo Ingest & Wireless Camera Sessions Tests
"""

import pytest
import uuid
import io
import random
from PIL import Image
from starlette.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from apps.api.database import Base, get_db
from apps.api.main import app
from apps.api.models import Photographer, Event, Folder, FolderType, Photo
from apps.api.auth import create_access_token


def create_dummy_jpeg() -> bytes:
    buf = io.BytesIO()
    r, g, b = random.randint(0, 255), random.randint(0, 255), random.randint(0, 255)
    img = Image.new("RGB", (200, 200), color=(r, g, b))
    img.save(buf, format="JPEG")
    return buf.getvalue()


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

    studio = Photographer(
        id=str(uuid.uuid4()),
        email="camera_studio@test.com",
        password_hash="pw",
        studio_name="Camera Ingest Studio",
        is_active=True,
    )
    db.add(studio)
    db.commit()

    event = Event(
        id=str(uuid.uuid4()),
        photographer_id=studio.id,
        name="Royal Ingest Wedding",
        slug="royal-ingest-wedding",
    )
    db.add(event)
    db.commit()

    folder = Folder(
        id=str(uuid.uuid4()),
        studio_id=studio.id,
        event_id=event.id,
        name="01_Haldi",
        slug="01-haldi",
        folder_type=FolderType.CEREMONY,
    )
    db.add(folder)
    db.commit()

    token = create_access_token(data={"sub": studio.id})

    yield {
        "client": client,
        "db": db,
        "studio": studio,
        "event": event,
        "folder": folder,
        "token": token,
        "SessionLocal": TestingSessionLocal,
    }

    db.close()
    app.dependency_overrides.clear()


def test_upload_photo_to_specific_folder(test_app):
    client = test_app["client"]
    token = test_app["token"]
    event = test_app["event"]
    folder = test_app["folder"]

    headers = {"Authorization": f"Bearer {token}"}
    dummy_bytes = create_dummy_jpeg()

    files = [("files", ("haldi_shot_01.jpg", dummy_bytes, "image/jpeg"))]
    data = {"folder_id": folder.id}

    res = client.post(
        f"/api/v1/events/{event.id}/photos",
        files=files,
        data=data,
        headers=headers,
    )
    assert res.status_code == 201
    resp_data = res.json()
    assert resp_data["uploaded_count"] == 1
    photo = resp_data["photos"][0]
    assert photo["folder_id"] == folder.id
    assert photo["folder_name"] == "01_Haldi"


def test_upload_photo_fallback_to_uncategorized(test_app):
    client = test_app["client"]
    token = test_app["token"]
    event = test_app["event"]

    headers = {"Authorization": f"Bearer {token}"}
    dummy_bytes = create_dummy_jpeg()

    # Upload without specifying folder_id
    files = [("files", ("unassigned_shot.jpg", dummy_bytes, "image/jpeg"))]

    res = client.post(
        f"/api/v1/events/{event.id}/photos",
        files=files,
        headers=headers,
    )
    assert res.status_code == 201
    resp_data = res.json()
    assert resp_data["uploaded_count"] == 1
    photo = resp_data["photos"][0]
    assert photo["folder_name"] == "Uncategorized"


def test_list_photos_filtered_by_folder(test_app):
    client = test_app["client"]
    token = test_app["token"]
    event = test_app["event"]
    folder = test_app["folder"]

    headers = {"Authorization": f"Bearer {token}"}

    # Filter by Haldi folder
    res_haldi = client.get(f"/api/v1/events/{event.id}/photos?folder_id={folder.id}", headers=headers)
    assert res_haldi.status_code == 200
    haldi_photos = res_haldi.json()
    assert len(haldi_photos) == 1
    assert haldi_photos[0]["folder_id"] == folder.id
