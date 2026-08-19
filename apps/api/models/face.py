"""
Face and Face Embedding Models with pgvector Support
"""

import uuid
from datetime import datetime
from typing import List
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Index, JSON, TypeDecorator
from sqlalchemy.orm import relationship
from apps.api.database import Base
from packages.shared.constants import FACE_EMBEDDING_DIMENSIONS

try:
    from pgvector.sqlalchemy import Vector
except ImportError:
    Vector = None


class VectorType(TypeDecorator):
    """
    Cross-dialect vector type:
    Uses pgvector.sqlalchemy.Vector(dim) on PostgreSQL,
    and JSON array on SQLite for offline unit tests.
    """
    impl = JSON
    cache_ok = True

    def __init__(self, dim: int = FACE_EMBEDDING_DIMENSIONS, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.dim = dim

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql" and Vector is not None:
            return dialect.type_descriptor(Vector(self.dim))
        return dialect.type_descriptor(JSON())

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, (list, tuple)):
            return list(value)
        return value

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, (list, tuple)):
            return [float(x) for x in value]
        return value


class Face(Base):
    __tablename__ = "faces"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    photo_id = Column(String(36), ForeignKey("photos.id", ondelete="CASCADE"), nullable=False, index=True)
    event_id = Column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    bounding_box = Column(JSON, nullable=False)  # {"x": 10, "y": 20, "w": 100, "h": 120}
    detection_confidence = Column(Float, nullable=False)
    quality_score = Column(Float, default=1.0, nullable=False)
    crop_path = Column(String(1024), nullable=True)  # Populated only if FACE_DEBUG_CROPS_ENABLED=true
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    photo = relationship("Photo", back_populates="faces")
    event = relationship("Event", back_populates="faces")
    embedding = relationship("FaceEmbedding", back_populates="face", uselist=False, cascade="all, delete-orphan")


class FaceEmbedding(Base):
    __tablename__ = "face_embeddings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    face_id = Column(String(36), ForeignKey("faces.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    event_id = Column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    embedding = Column(VectorType(dim=FACE_EMBEDDING_DIMENSIONS), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    face = relationship("Face", back_populates="embedding")
    event = relationship("Event", back_populates="face_embeddings")
