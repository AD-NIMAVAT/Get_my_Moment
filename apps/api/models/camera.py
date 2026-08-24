"""
Get My Moment - Camera Device Model for Hardware Ingest Access Control
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from apps.api.database import Base


class CameraDevice(Base):
    __tablename__ = "camera_devices"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    photographer_id = Column(String(36), ForeignKey("photographers.id", ondelete="CASCADE"), nullable=False, index=True)
    event_id = Column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)

    display_name = Column(String(255), nullable=False)
    manufacturer = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)

    ftp_username = Column(String(64), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)

    # Lifecycle: PENDING_APPROVAL -> APPROVED -> REVOKED / REJECTED
    # Default MUST be PENDING_APPROVAL
    status = Column(String(32), default="PENDING_APPROVAL", nullable=False, index=True)

    first_seen_at = Column(DateTime, nullable=True)
    last_seen_at = Column(DateTime, nullable=True)
    last_upload_at = Column(DateTime, nullable=True)
    last_source_ip = Column(String(64), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    approved_at = Column(DateTime, nullable=True)
    rejected_at = Column(DateTime, nullable=True)
    revoked_at = Column(DateTime, nullable=True)

    # Relationships
    photographer = relationship("Photographer", backref="camera_devices")
    event = relationship("Event", backref="camera_devices")
