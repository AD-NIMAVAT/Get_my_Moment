"""
Guest Search and Match Record Model
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from apps.api.database import Base


class GuestSearch(Base):
    __tablename__ = "guest_searches"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    guest_id = Column(String(36), ForeignKey("guests.id", ondelete="CASCADE"), nullable=False, index=True)
    event_id = Column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    selfie_hash = Column(String(64), nullable=True)
    matched_photo_count = Column(Integer, default=0, nullable=False)
    # Stored as JSONB/array for MVP; normalized guest_search_results table planned for enterprise scale
    matched_photo_ids = Column(JSON, default=list, nullable=False)
    similarity_scores = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    guest = relationship("Guest", back_populates="searches")
    event = relationship("Event", back_populates="searches")
