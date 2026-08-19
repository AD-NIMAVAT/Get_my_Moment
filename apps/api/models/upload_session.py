"""
Upload Session & Chunk Models for Resumable Ingestion Engine
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, BigInteger, DateTime, ForeignKey, Index, Text, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from apps.api.database import Base


class UploadSession(Base):
    __tablename__ = "upload_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    studio_id = Column(String(36), ForeignKey("photographers.id", ondelete="CASCADE"), nullable=False, index=True)
    event_id = Column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    camera_id = Column(String(100), nullable=True, index=True)
    user_id = Column(String(36), nullable=True)
    client_upload_id = Column(String(128), nullable=True, index=True)
    
    filename = Column(String(255), nullable=False)
    content_type = Column(String(64), default="image/jpeg", nullable=False)
    expected_size = Column(BigInteger, nullable=False)
    chunk_size = Column(Integer, default=5242880, nullable=False)  # 5MB chunks
    total_chunks = Column(Integer, default=1, nullable=False)
    received_chunks = Column(Integer, default=0, nullable=False)
    received_bytes = Column(BigInteger, default=0, nullable=False)
    expected_sha256 = Column(String(64), nullable=True)
    final_sha256 = Column(String(64), nullable=True)
    
    # States: INITIATED, UPLOADING, VERIFYING, FINALIZING, COMPLETED, FAILED, CANCELLED, EXPIRED
    status = Column(String(32), default="INITIATED", nullable=False, index=True)
    # Priorities: HIGH (Live Wi-Fi Camera), NORMAL (Bulk SD Card Dump)
    priority = Column(String(16), default="NORMAL", nullable=False, index=True)
    
    final_photo_id = Column(String(36), nullable=True)
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    chunks = relationship("UploadChunk", back_populates="session", cascade="all, delete-orphan", order_by="UploadChunk.chunk_index")

    __table_args__ = (
        Index("ix_upload_sessions_studio_event", "studio_id", "event_id"),
        Index("ix_upload_sessions_client_upload", "event_id", "client_upload_id"),
    )


class UploadChunk(Base):
    __tablename__ = "upload_chunks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    upload_session_id = Column(String(36), ForeignKey("upload_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    chunk_size = Column(Integer, nullable=False)
    chunk_sha256 = Column(String(64), nullable=False)
    storage_path = Column(String(1024), nullable=False)
    received_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    session = relationship("UploadSession", back_populates="chunks")

    __table_args__ = (
        UniqueConstraint("upload_session_id", "chunk_index", name="uq_session_chunk_index"),
        Index("ix_upload_chunks_session_idx", "upload_session_id", "chunk_index"),
    )
