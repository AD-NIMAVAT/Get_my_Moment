"""
Database Models and Schema Tests
"""

import pytest
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from apps.api.database import Base
from apps.api.models import (
    Photographer,
    Event,
    Photo,
    Face,
    FaceEmbedding,
    Guest,
    Consent,
    GuestSearch,
    AuditLog,
)
from packages.shared.constants import EventStatus, PhotoStatus


@pytest.fixture
def db_session():
    """Create an in-memory SQLite database for testing models."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


def test_create_photographer_and_event(db_session):
    photographer = Photographer(
        email="studio@example.com",
        password_hash="mock_hash",
        studio_name="Pro Photography Studio",
        phone="+919876543210",
    )
    db_session.add(photographer)
    db_session.commit()

    assert photographer.id is not None
    assert photographer.studio_name == "Pro Photography Studio"

    event = Event(
        photographer_id=photographer.id,
        name="Royal Wedding Gala",
        slug="royal-wedding-gala",
        status=EventStatus.ACTIVE.value,
        settings={"primary_color": "#0284c7"},
    )
    db_session.add(event)
    db_session.commit()

    assert event.id is not None
    assert event.access_token is not None
    assert len(event.access_token) >= 12
    assert event.photographer.email == "studio@example.com"
    assert len(photographer.events) == 1


def test_photo_and_faces_and_embeddings(db_session):
    photographer = Photographer(
        email="photo@example.com",
        password_hash="mock_hash",
        studio_name="Creative Lens",
    )
    db_session.add(photographer)
    db_session.commit()

    event = Event(
        photographer_id=photographer.id,
        name="Tech Conference 2026",
        slug="tech-conf-2026",
    )
    db_session.add(event)
    db_session.commit()

    photo = Photo(
        event_id=event.id,
        original_file_name="DSC_001.JPG",
        file_path="storage/events/123/originals/uuid.jpg",
        thumbnail_path="storage/events/123/thumbnails/uuid_thumb.jpg",
        sha256_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        file_size=5242880,
        mime_type="image/jpeg",
        status=PhotoStatus.UPLOADED.value,
    )
    db_session.add(photo)
    db_session.commit()

    assert photo.id is not None
    assert photo.status == PhotoStatus.UPLOADED.value

    # Add face detection
    face = Face(
        photo_id=photo.id,
        event_id=event.id,
        bounding_box={"x": 100, "y": 150, "w": 80, "h": 90},
        detection_confidence=0.98,
        quality_score=0.95,
    )
    db_session.add(face)
    db_session.commit()

    # Add 128-d embedding
    dummy_embedding = [0.05] * 128
    face_embedding = FaceEmbedding(
        face_id=face.id,
        event_id=event.id,
        embedding=dummy_embedding,
    )
    db_session.add(face_embedding)
    db_session.commit()

    assert face.id is not None
    assert face_embedding.id is not None
    assert len(face_embedding.embedding) == 128
    assert face.embedding.event_id == event.id


def test_guest_registration_and_consent(db_session):
    photographer = Photographer(
        email="studio2@example.com",
        password_hash="mock_hash",
        studio_name="Elite Studio",
    )
    db_session.add(photographer)
    db_session.commit()

    event = Event(
        photographer_id=photographer.id,
        name="Annual Gala Dinner",
        slug="gala-dinner",
    )
    db_session.add(event)
    db_session.commit()

    guest = Guest(
        event_id=event.id,
        name="Himalaya Sharma",
        mobile="+919999988888",
        otp_verified=True,
    )
    db_session.add(guest)
    db_session.commit()

    consent = Consent(
        guest_id=guest.id,
        event_id=event.id,
        face_search_consent=True,
        marketing_consent=False,
        consent_version="1.0",
        ip_address="127.0.0.1",
        user_agent="Mozilla/5.0",
    )
    db_session.add(consent)
    db_session.commit()

    search = GuestSearch(
        guest_id=guest.id,
        event_id=event.id,
        selfie_hash="aabbcc112233",
        matched_photo_count=2,
        matched_photo_ids=["photo-uuid-1", "photo-uuid-2"],
        similarity_scores={"photo-uuid-1": 0.82, "photo-uuid-2": 0.78},
    )
    db_session.add(search)
    db_session.commit()

    assert guest.id is not None
    assert guest.consent.face_search_consent is True
    assert guest.consent.marketing_consent is False
    assert len(guest.searches) == 1
    assert guest.searches[0].matched_photo_count == 2
