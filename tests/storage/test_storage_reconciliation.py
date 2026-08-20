"""
Storage Integrity & Orphan Reconciliation Hard Test Suite
"""

import pytest
import uuid
import os
import io
from PIL import Image
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from apps.api.database import Base
from apps.api.models import Photographer, Event, Folder, FolderType, Photo
from apps.api.services.storage import storage_service, reconcile_folder_counters


def make_jpeg() -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", (100, 100), color=(100, 150, 200))
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture(scope="module")
def stor_env():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()

    studio = Photographer(
        id=str(uuid.uuid4()),
        email="storage_audit@test.com",
        password_hash="pw",
        studio_name="Storage Audit Studio",
        is_active=True,
    )
    db.add(studio)
    db.commit()

    event = Event(
        id=str(uuid.uuid4()),
        photographer_id=studio.id,
        name="Storage Event",
        slug="storage-event",
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

    yield {
        "db": db,
        "studio": studio,
        "event": event,
        "folder": folder,
    }

    db.close()


def test_storage_file_lifecycle_and_reconciliation(stor_env):
    db = stor_env["db"]
    studio = stor_env["studio"]
    event = stor_env["event"]
    folder = stor_env["folder"]

    img_bytes = make_jpeg()

    # 1. Save original to studio/event/folder
    file_id, rel_path, file_size, sha256_hash = storage_service.save_original(
        event_id=event.id,
        file_bytes=img_bytes,
        original_filename="IMG_001.JPG",
        studio_id=studio.id,
        folder_id=folder.id,
    )

    photo = Photo(
        id=file_id,
        studio_id=studio.id,
        event_id=event.id,
        folder_id=folder.id,
        original_file_name="IMG_001.JPG",
        file_path=rel_path,
        sha256_hash=sha256_hash,
        file_size=file_size,
        mime_type="image/jpeg",
    )
    db.add(photo)
    db.commit()

    # Verify physical file existence
    abs_path = storage_service.get_absolute_path(rel_path)
    assert os.path.exists(abs_path)

    # 2. Reconcile counters
    reconcile_folder_counters(db, event_id=event.id, folder_id=folder.id)
    db.refresh(folder)
    assert folder.photo_count == 1
    assert folder.total_size_bytes == file_size

    # 3. Test orphan storage detection
    orphan_file_id = str(uuid.uuid4())
    orphan_rel_path = f"studios/{studio.id}/events/{event.id}/originals/{folder.id}/{orphan_file_id}.jpg"
    orphan_abs = storage_service.get_absolute_path(orphan_rel_path)
    with open(orphan_abs, "wb") as f:
        f.write(img_bytes)

    assert os.path.exists(orphan_abs)
    # DB does not have orphan_file_id
    assert db.query(Photo).filter(Photo.id == orphan_file_id).first() is None

    # Clean up orphan
    storage_service.delete_file(orphan_rel_path)
    assert not os.path.exists(orphan_abs)
