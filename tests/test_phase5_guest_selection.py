"""
Phase 5: Client & Guest Portals Folder Integration Tests
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
        email="selection_studio@test.com",
        password_hash="pw",
        studio_name="Royal Heritage Studio",
        is_active=True,
    )
    db.add(studio)
    db.commit()

    event = Event(
        id=str(uuid.uuid4()),
        photographer_id=studio.id,
        name="Shah Wedding 2026",
        slug="shah-wedding-2026",
        selection_token="shah-selection-token-123",
        access_token="shah-guest-token-123",
    )
    db.add(event)
    db.commit()

    folder_haldi = Folder(
        id=str(uuid.uuid4()),
        studio_id=studio.id,
        event_id=event.id,
        name="01_Haldi",
        slug="01-haldi",
        folder_type=FolderType.CEREMONY,
        allow_guest_view=True,
    )
    folder_private = Folder(
        id=str(uuid.uuid4()),
        studio_id=studio.id,
        event_id=event.id,
        name="Private_Raw_Archive",
        slug="private-raw-archive",
        folder_type=FolderType.CUSTOM,
        allow_guest_view=False,  # Private folder
    )
    db.add(folder_haldi)
    db.add(folder_private)
    db.commit()

    photo_haldi = Photo(
        id=str(uuid.uuid4()),
        studio_id=studio.id,
        event_id=event.id,
        folder_id=folder_haldi.id,
        original_file_name="Haldi_01.jpg",
        file_path=f"events/{event.id}/originals/1.jpg",
        sha256_hash="hash_h1",
        file_size=2000000,
        mime_type="image/jpeg",
        status="PROCESSED",
    )
    photo_private = Photo(
        id=str(uuid.uuid4()),
        studio_id=studio.id,
        event_id=event.id,
        folder_id=folder_private.id,
        original_file_name="Raw_Behind_Scenes.jpg",
        file_path=f"events/{event.id}/originals/2.jpg",
        sha256_hash="hash_p1",
        file_size=5000000,
        mime_type="image/jpeg",
        status="PROCESSED",
    )
    db.add(photo_haldi)
    db.add(photo_private)
    db.commit()

    yield {
        "client": client,
        "event": event,
        "folder_haldi": folder_haldi,
        "folder_private": folder_private,
        "photo_haldi": photo_haldi,
        "photo_private": photo_private,
    }

    db.close()
    app.dependency_overrides.clear()


def test_client_album_selection_portal_folders(test_app):
    client = test_app["client"]
    event = test_app["event"]

    res = client.get(f"/api/v1/selection/{event.selection_token}")
    assert res.status_code == 200
    data = res.json()

    assert "folders" in data
    assert len(data["folders"]) == 2
    folder_names = [f["name"] for f in data["folders"]]
    assert "01_Haldi" in folder_names
    assert "Private_Raw_Archive" in folder_names

    assert len(data["photos"]) == 2
    haldi_photo = next(p for p in data["photos"] if p["id"] == test_app["photo_haldi"].id)
    assert haldi_photo["folder_name"] == "01_Haldi"
