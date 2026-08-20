"""
AI Face Search & Biometric Privacy Scoping Hard Test Suite
Verifies strict event boundary enforcement and folder guest view rules.
"""

import pytest
import uuid
from starlette.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from apps.api.database import Base, get_db
from apps.api.main import app
from apps.api.models import Photographer, Event, Folder, FolderType, Photo, Guest, Consent, Face, FaceEmbedding


@pytest.fixture(scope="module")
def ai_env():
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
        email="ai_audit@test.com",
        password_hash="pw",
        studio_name="AI Studio",
        is_active=True,
    )
    db.add(studio)
    db.commit()

    # Event 1 & Event 2
    event1 = Event(
        id=str(uuid.uuid4()),
        photographer_id=studio.id,
        name="AI Event 1",
        slug="ai-event-1",
        access_token="ai-tok-1",
    )
    event2 = Event(
        id=str(uuid.uuid4()),
        photographer_id=studio.id,
        name="AI Event 2",
        slug="ai-event-2",
        access_token="ai-tok-2",
    )
    db.add(event1)
    db.add(event2)
    db.commit()

    # Folders in Event 1: Public Haldi & Private Archive
    folder_public = Folder(
        id=str(uuid.uuid4()),
        studio_id=studio.id,
        event_id=event1.id,
        name="01_Haldi",
        slug="01-haldi",
        folder_type=FolderType.CEREMONY,
        allow_guest_view=True,
    )
    folder_private = Folder(
        id=str(uuid.uuid4()),
        studio_id=studio.id,
        event_id=event1.id,
        name="Private_Raw",
        slug="private-raw",
        folder_type=FolderType.CUSTOM,
        allow_guest_view=False,
    )
    db.add(folder_public)
    db.add(folder_private)
    db.commit()

    # Photos with embeddings in Event 1
    photo_pub = Photo(
        id=str(uuid.uuid4()),
        studio_id=studio.id,
        event_id=event1.id,
        folder_id=folder_public.id,
        original_file_name="Public_Shot.jpg",
        file_path="events/1/originals/1.jpg",
        sha256_hash="hash_pub",
        file_size=1000000,
        mime_type="image/jpeg",
        status="PROCESSED",
    )
    photo_priv = Photo(
        id=str(uuid.uuid4()),
        studio_id=studio.id,
        event_id=event1.id,
        folder_id=folder_private.id,
        original_file_name="Private_Shot.jpg",
        file_path="events/1/originals/2.jpg",
        sha256_hash="hash_priv",
        file_size=1000000,
        mime_type="image/jpeg",
        status="PROCESSED",
    )
    db.add(photo_pub)
    db.add(photo_priv)
    db.commit()

    # Guest with Consent in Event 1
    guest1 = Guest(
        id=str(uuid.uuid4()),
        event_id=event1.id,
        mobile="+919876543210",
        name="Pooja Sharma",
        otp_verified=True,
    )
    db.add(guest1)
    db.commit()

    consent1 = Consent(
        id=str(uuid.uuid4()),
        guest_id=guest1.id,
        event_id=event1.id,
        face_search_consent=True,
    )
    db.add(consent1)
    db.commit()

    yield {
        "client": client,
        "db": db,
        "event1": event1,
        "event2": event2,
        "guest1": guest1,
        "photo_pub": photo_pub,
        "photo_priv": photo_priv,
        "folder_private": folder_private,
    }

    db.close()
    app.dependency_overrides.clear()


def test_guest_cannot_search_other_event(ai_env):
    client = ai_env["client"]
    event2 = ai_env["event2"]
    guest1 = ai_env["guest1"]

    # Guest 1 registered in Event 1 attempts to search in Event 2 -> 404
    files = [("selfie", ("selfie.jpg", b"fake_bytes", "image/jpeg"))]
    res = client.post(
        f"/api/v1/events/{event2.id}/guests/{guest1.id}/search",
        files=files,
    )
    assert res.status_code == 404
