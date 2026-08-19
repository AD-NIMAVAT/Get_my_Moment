"""
Audit Log Model - Compliance and Security Tracking
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from apps.api.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=True, index=True)
    photographer_id = Column(String(36), ForeignKey("photographers.id", ondelete="CASCADE"), nullable=True, index=True)
    actor_type = Column(String(32), nullable=False)  # PHOTOGRAPHER, GUEST, SYSTEM
    actor_id = Column(String(64), nullable=True)
    action = Column(String(64), nullable=False, index=True)
    details = Column(JSON, default=dict, nullable=False)
    ip_address = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    event = relationship("Event", back_populates="audit_logs")
