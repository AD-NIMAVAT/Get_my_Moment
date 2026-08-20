"""
Business OS - Event Operations, Multi-Ceremony & Crew Models
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Text, JSON, Index
from sqlalchemy.orm import relationship
from apps.api.database import Base


class Ceremony(Base):
    __tablename__ = "ceremonies"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)  # Haldi, Mehendi, Sangeet, Wedding Ceremony, Reception, Ring Ceremony
    ceremony_date = Column(DateTime, nullable=True)
    venue = Column(String(255), nullable=True)
    order_index = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    event = relationship("Event", backref="ceremonies")
    photos = relationship("Photo", backref="ceremony")


class CrewMember(Base):
    __tablename__ = "crew_members"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    photographer_id = Column(String(36), ForeignKey("photographers.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    role = Column(String(64), nullable=False)  # Traditional Photo, Candid Photo, Cinematographer, Drone Pilot, Album Editor, Video Editor
    phone = Column(String(32), nullable=True)
    payout_inr = Column(Float, default=0.0, nullable=False)
    payout_status = Column(String(32), default="PENDING", nullable=False)  # PENDING, PAID
    assigned_ceremonies = Column(JSON, default=list, nullable=True)  # List of assigned ceremony names/IDs e.g. ["Mandap", "Haldi"]
    camera_tag = Column(String(64), nullable=True)  # e.g. "Sony-A7IV-CamA"
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("idx_crew_phone_event", "phone", "event_id"),
    )

    # Relationships
    event = relationship("Event", backref="crew_members")
    photographer = relationship("Photographer", backref="crew_members")


class EventTask(Base):
    __tablename__ = "event_tasks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)  # e.g. "Format SD cards & backup RAWs", "Deliver selection link to bride", "Dispatch printed albums"
    assigned_to = Column(String(255), nullable=True)
    due_date = Column(DateTime, nullable=True)
    is_completed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    event = relationship("Event", backref="tasks")
