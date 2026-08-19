"""
Guest Model
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from apps.api.database import Base


class Guest(Base):
    __tablename__ = "guests"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    mobile = Column(String(32), nullable=False, index=True)
    otp_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    event = relationship("Event", back_populates="guests")
    consent = relationship("Consent", back_populates="guest", uselist=False, cascade="all, delete-orphan")
    searches = relationship("GuestSearch", back_populates="guest", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_guests_event_mobile", "event_id", "mobile"),
    )
