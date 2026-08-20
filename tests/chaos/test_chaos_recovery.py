"""
Chaos Engineering & Disaster Recovery Hard Test Suite
Simulates sudden crashes, missing paths, and database transaction rollbacks.
"""

import pytest
import uuid
import os
import io
from PIL import Image
from starlette.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from apps.api.database import Base, get_db
from apps.api.main import app
from apps.api.models import Photographer, Event, Folder, FolderType, Photo
from apps.api.services.storage import storage_service, get_or_create_uncategorized_folder


@pytest.fixture(scope="module")
def chaos_env():
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
        email="chaos_studio@test.com",
        password_hash="pw",
        studio_name="Chaos Test Studio",
        is_active=True,
    )
    db.add(studio)
    db.commit()

    event = Event(
        id=str(uuid.uuid4()),
        photographer_id=studio.id,
        name="Chaos Event",
        slug="chaos-event",
    )
    db.add(event)
    db.commit()

    yield {
        "db": db,
        "studio": studio,
        "event": event,
    }

    db.close()
    app.dependency_overrides.clear()


def test_missing_directory_auto_healing(chaos_env):
    studio = chaos_env["studio"]
    event = chaos_env["event"]

    # Generate dummy image
    buf = io.BytesIO()
    img = Image.new("RGB", (100, 100), color=(50, 50, 50))
    img.save(buf, format="JPEG")
    dummy_bytes = buf.getvalue()

    folder_id = str(uuid.uuid4())

    # Save to a new folder_id whose directory does NOT exist on disk yet
    file_id, rel_path, file_size, _ = storage_service.save_original(
        event_id=event.id,
        file_bytes=dummy_bytes,
        original_filename="healed_shot.jpg",
        studio_id=studio.id,
        folder_id=folder_id,
    )

    abs_path = storage_service.get_absolute_path(rel_path)
    # Storage service must automatically create parent folders without raising FileNotFoundError
    assert os.path.exists(abs_path)


def test_transaction_rollback_preserves_consistency(chaos_env):
    db = chaos_env["db"]
    studio = chaos_env["studio"]
    event = chaos_env["event"]

    # Attempt to create an invalid folder that fails DB constraint
    initial_folders_count = db.query(Folder).filter(Folder.event_id == event.id).count()

    try:
        invalid_folder = Folder(
            id=str(uuid.uuid4()),
            studio_id=studio.id,
            event_id=event.id,
            name=None,  # NOT NULL constraint violation
            slug="invalid",
        )
        db.add(invalid_folder)
        db.commit()
    except Exception:
        db.rollback()

    # Verify state is 100% clean and uncorrupted
    after_folders_count = db.query(Folder).filter(Folder.event_id == event.id).count()
    assert after_folders_count == initial_folders_count
