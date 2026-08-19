"""
Business OS - Studio Calendar & Personal Notes Model
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from apps.api.database import Base


class CalendarNote(Base):
    __tablename__ = "calendar_notes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    photographer_id = Column(String(36), ForeignKey("photographers.id", ondelete="CASCADE"), nullable=False, index=True)
    date_str = Column(String(10), nullable=False, index=True)  # Format: "YYYY-MM-DD"
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(32), default="NOTE", nullable=False)  # NOTE, REMINDER, BLOCKED, LEAVE
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationship
    photographer = relationship("Photographer", backref="calendar_notes")
