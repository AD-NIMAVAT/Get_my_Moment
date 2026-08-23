"""
Event Model
"""

import uuid
import secrets
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship
from apps.api.database import Base
from packages.shared.constants import EventStatus


def generate_event_token() -> str:
    """Generate a secure, URL-safe random public token for event QR."""
    return secrets.token_urlsafe(12)


class Event(Base):
    __tablename__ = "events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    photographer_id = Column(String(36), ForeignKey("photographers.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), nullable=False, index=True)
    access_token = Column(String(64), unique=True, index=True, default=generate_event_token, nullable=False)
    event_date = Column(DateTime, nullable=True)
    cover_image_url = Column(String(1024), nullable=True)
    status = Column(String(32), default=EventStatus.ACTIVE.value, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=True)
    allow_downloads = Column(Boolean, default=True, nullable=False)
    allow_guest_uploads = Column(Boolean, default=True, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)
    deleted_at = Column(DateTime, nullable=True)
    require_otp = Column(Boolean, default=False, nullable=False)
    package_amount_inr = Column(Float, default=0.0, nullable=False)
    client_name = Column(String(255), nullable=True)
    client_phone = Column(String(32), nullable=True)
    client_email = Column(String(255), nullable=True)
    venue = Column(String(255), nullable=True)
    city = Column(String(255), nullable=True)
    selection_token = Column(String(64), unique=True, index=True, default=generate_event_token, nullable=False)
    settings = Column(JSON, default=dict, nullable=False)
    closed_at = Column(DateTime, nullable=True)
    archived_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    photographer = relationship("Photographer", back_populates="events")
    photos = relationship("Photo", back_populates="event", cascade="all, delete-orphan")
    guests = relationship("Guest", back_populates="event", cascade="all, delete-orphan")
    faces = relationship("Face", back_populates="event", cascade="all, delete-orphan")
    face_embeddings = relationship("FaceEmbedding", back_populates="event", cascade="all, delete-orphan")
    searches = relationship("GuestSearch", back_populates="event", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="event", cascade="all, delete-orphan")
