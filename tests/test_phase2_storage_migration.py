"""
Phase 2: Storage Engine & Legacy Migration Tests
"""

import pytest
import uuid
import os
import io
from PIL import Image
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException
from apps.api.database import Base
from apps.api.models import Photographer, Event, Folder, FolderType, Photo
from apps.api.services.storage import storage_service, get_or_create_uncategorized_folder, reconcile_folder_counters
from apps.api.services.legacy_migration import run_legacy_photo_folder_migration


@pytest.fixture(scope="module")
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()


def create_dummy_jpeg() -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", (200, 200), color=(255, 100, 100))
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_storage_uuid_paths_and_traversal_guard(test_db):
    studio_id = str(uuid.uuid4())
    event_id = str(uuid.uuid4())
    folder_id = str(uuid.uuid4())

    dummy_bytes = create_dummy_jpeg()

    # 1. Save original to studio/event/folder path
    file_id, rel_path, file_size, sha256_hash = storage_service.save_original(
        event_id=event_id,
        file_bytes=dummy_bytes,
        original_filename="Haldi_001.JPG",
        studio_id=studio_id,
        folder_id=folder_id,
    )

    assert file_id is not None
    assert f"studios/{studio_id}/events/{event_id}/originals/{folder_id}" in rel_path
    assert file_size == len(dummy_bytes)

    # 2. Verify file exists on disk
    abs_path = storage_service.get_absolute_path(rel_path)
    assert os.path.exists(abs_path)

    # 3. Test path traversal protection
    with pytest.raises(HTTPException) as exc_info:
        storage_service.get_absolute_path("../../../windows/system32/cmd.exe")
    assert exc_info.value.status_code == 400


def test_uncategorized_folder_and_legacy_migration(test_db):
    # 1. Create Studio & Event
    studio = Photographer(
        id=str(uuid.uuid4()),
        email=f"migration_{uuid.uuid4().hex[:6]}@test.com",
        password_hash="pw",
        studio_name="Migration Test Studio",
        is_active=True,
    )
    test_db.add(studio)
    test_db.commit()

    event = Event(
        id=str(uuid.uuid4()),
        photographer_id=studio.id,
        name="Legacy Wedding 2025",
        slug="legacy-wedding-2025",
    )
    test_db.add(event)
    test_db.commit()

    # 2. Insert 3 legacy photos with folder_id=None and studio_id=None
    photos = []
    for i in range(3):
        p = Photo(
            id=str(uuid.uuid4()),
            event_id=event.id,
            original_file_name=f"LEGACY_{i}.JPG",
            file_path=f"events/{event.id}/originals/{i}.JPG",
            sha256_hash=f"hash_{uuid.uuid4().hex}",
            file_size=2000000,
            mime_type="image/jpeg",
            folder_id=None,
            studio_id=None,
        )
        test_db.add(p)
        photos.append(p)
    test_db.commit()

    # 3. Run legacy migration
    res = run_legacy_photo_folder_migration(test_db)
    assert res["status"] == "SUCCESS"
    assert res["photos_migrated"] >= 3

    # 4. Verify all photos have folder_id pointing to Uncategorized and studio_id pointing to studio
    uncat = get_or_create_uncategorized_folder(test_db, studio_id=studio.id, event_id=event.id)
    assert uncat.name == "Uncategorized"
    assert uncat.is_system is True

    for p in photos:
        test_db.refresh(p)
        assert p.studio_id == studio.id
        assert p.folder_id == uncat.id

    # 5. Verify folder counter reconciliation
    test_db.refresh(uncat)
    assert uncat.photo_count == 3
    assert uncat.total_size_bytes == 6000000
