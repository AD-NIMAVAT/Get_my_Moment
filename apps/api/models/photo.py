"""
Photo Model
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Index, Text, Boolean
from sqlalchemy.orm import relationship
from apps.api.database import Base
from packages.shared.constants import PhotoStatus


class Photo(Base):
    __tablename__ = "photos"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    original_file_name = Column(String(255), nullable=False)
    file_path = Column(String(1024), nullable=False)
    thumbnail_path = Column(String(1024), nullable=True)
    processed_path = Column(String(1024), nullable=True)
    sha256_hash = Column(String(64), nullable=False, index=True)
    file_size = Column(Integer, nullable=False)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    mime_type = Column(String(64), nullable=False)
    status = Column(String(32), default=PhotoStatus.UPLOADED.value, nullable=False, index=True)
    error_message = Column(Text, nullable=True)
    faces_detected_count = Column(Integer, default=0, nullable=False)
    ceremony_id = Column(String(36), ForeignKey("ceremonies.id", ondelete="SET NULL"), nullable=True, index=True)
    is_client_selected = Column(Boolean, default=False, nullable=False, index=True)
    client_comment = Column(Text, nullable=True)
    is_guest_uploaded = Column(Boolean, default=False, nullable=False)
    uploaded_by_guest_name = Column(String(255), nullable=True)
    uploaded_by_guest_phone = Column(String(50), nullable=True)
    camera_id = Column(String(100), nullable=True, index=True)
    camera_model = Column(String(100), nullable=True)
    upload_session_id = Column(String(64), nullable=True, index=True)
    idempotency_key = Column(String(128), nullable=True, index=True)
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)
    deleted_at = Column(DateTime, nullable=True)
    storage_object_id = Column(String(36), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    event = relationship("Event", back_populates="photos")
    faces = relationship("Face", back_populates="photo", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_photos_event_sha256", "event_id", "sha256_hash"),
        Index("ix_photos_event_camera", "event_id", "camera_id"),
        Index("ix_photos_event_idempotency", "event_id", "idempotency_key"),
    )
