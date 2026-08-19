"""
Storage Reservation & Quota Models for Atomic Concurrency Enforcement
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, BigInteger, DateTime, ForeignKey, Index
from apps.api.database import Base


class StorageReservation(Base):
    __tablename__ = "storage_reservations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    studio_id = Column(String(36), ForeignKey("photographers.id", ondelete="CASCADE"), nullable=False, index=True)
    upload_session_id = Column(String(36), nullable=False, unique=True, index=True)
    reserved_bytes = Column(BigInteger, nullable=False)
    # ACTIVE, COMMITTED, RELEASED, EXPIRED
    status = Column(String(32), default="ACTIVE", nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
