"""
Consent Model - Privacy and Face Search Authorization
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from apps.api.database import Base


class Consent(Base):
    __tablename__ = "consents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    guest_id = Column(String(36), ForeignKey("guests.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    event_id = Column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    face_search_consent = Column(Boolean, nullable=False, default=False)
    marketing_consent = Column(Boolean, nullable=False, default=False)
    consent_version = Column(String(32), default="1.0", nullable=False)
    ip_address = Column(String(64), nullable=True)
    user_agent = Column(Text, nullable=True)
    consented_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    guest = relationship("Guest", back_populates="consent")
