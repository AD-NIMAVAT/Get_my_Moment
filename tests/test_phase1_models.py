"""
Phase 1: Database Models & Tenant Validation Tests
"""

import pytest
import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from apps.api.database import Base
from apps.api.models import Photographer, Event, Folder, FolderType, Photo


@pytest.fixture(scope="module")
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()


def test_studio_event_folder_photo_hierarchy(test_db):
    # 1. Create Studio
    studio = Photographer(
        id=str(uuid.uuid4()),
        email=f"studio_{uuid.uuid4().hex[:6]}@test.com",
        password_hash="hashed_pw",
        studio_name="Royal Wedding Studio",
        is_active=True,
    )
    test_db.add(studio)
    test_db.commit()

    # 2. Create Event
    event = Event(
        id=str(uuid.uuid4()),
        photographer_id=studio.id,
        name="Patel Wedding 2026",
        slug="patel-wedding-2026",
    )
    test_db.add(event)
    test_db.commit()

    # 3. Create Root Folder
    root_folder = Folder(
        id=str(uuid.uuid4()),
        studio_id=studio.id,
        event_id=event.id,
        name="01_Haldi",
        slug="01-haldi",
        folder_type=FolderType.CEREMONY,
        icon="Sparkles",
        order_index=1,
    )
    test_db.add(root_folder)
    test_db.commit()

    # 4. Create Nested Subfolder
    subfolder = Folder(
        id=str(uuid.uuid4()),
        studio_id=studio.id,
        event_id=event.id,
        parent_id=root_folder.id,
        name="Bride Haldi Rituals",
        slug="bride-haldi-rituals",
        folder_type=FolderType.CEREMONY,
        order_index=1,
    )
    test_db.add(subfolder)
    test_db.commit()

    # 5. Create Photo linked to subfolder
    photo = Photo(
        id=str(uuid.uuid4()),
        studio_id=studio.id,
        event_id=event.id,
        folder_id=subfolder.id,
        original_file_name="DSC00123.JPG",
        file_path="studios/dummy/originals/DSC00123.JPG",
        sha256_hash="dummyhash123",
        file_size=5432100,
        mime_type="image/jpeg",
    )
    test_db.add(photo)
    test_db.commit()

    # 6. Verify Relationships
    fetched_folder = test_db.query(Folder).filter(Folder.id == root_folder.id).first()
    assert fetched_folder is not None
    assert fetched_folder.name == "01_Haldi"
    assert len(fetched_folder.subfolders) == 1
    assert fetched_folder.subfolders[0].name == "Bride Haldi Rituals"

    fetched_photo = test_db.query(Photo).filter(Photo.id == photo.id).first()
    assert fetched_photo is not None
    assert fetched_photo.folder_id == subfolder.id
    assert fetched_photo.studio_id == studio.id
    assert fetched_photo.folder.name == "Bride Haldi Rituals"
    assert fetched_photo.folder.parent.name == "01_Haldi"
    assert fetched_photo.event.name == "Patel Wedding 2026"
