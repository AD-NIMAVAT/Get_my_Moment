"""
Master Studio-Wise Folder Model
Hierarchical multi-tenant folder architecture for Get My Moment
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, BigInteger, Boolean, DateTime, ForeignKey, Index, Text
from sqlalchemy.orm import relationship
from apps.api.database import Base


class FolderType:
    CEREMONY = "CEREMONY"
    PORTRAITS = "PORTRAITS"
    CANDID = "CANDID"
    TRADITIONAL = "TRADITIONAL"
    GUEST_UPLOADS = "GUEST_UPLOADS"
    DRONE = "DRONE"
    VIDEO = "VIDEO"
    CUSTOM = "CUSTOM"
    UNCATEGORIZED = "UNCATEGORIZED"


class Folder(Base):
    __tablename__ = "folders"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    studio_id = Column(String(36), ForeignKey("photographers.id", ondelete="CASCADE"), nullable=False, index=True)
    event_id = Column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_id = Column(String(36), ForeignKey("folders.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), nullable=False, index=True)
    folder_type = Column(String(32), default=FolderType.CEREMONY, nullable=False)
    icon = Column(String(64), nullable=True)
    color = Column(String(32), nullable=True)
    order_index = Column(Integer, default=0, nullable=False)
    is_locked = Column(Boolean, default=False, nullable=False)
    allow_guest_view = Column(Boolean, default=True, nullable=False)
    is_system = Column(Boolean, default=False, nullable=False)  # True for protected 'Uncategorized' folder
    ceremony_id = Column(String(36), ForeignKey("ceremonies.id", ondelete="SET NULL"), nullable=True, index=True)
    photo_count = Column(Integer, default=0, nullable=False)
    total_size_bytes = Column(BigInteger, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    photographer = relationship("Photographer", backref="folders")
    event = relationship("Event", backref="folders")
    ceremony = relationship("Ceremony", backref="folder_link")
    parent = relationship("Folder", remote_side=[id], backref="subfolders")
    photos = relationship("Photo", back_populates="folder")

    __table_args__ = (
        Index("ix_folders_studio_event", "studio_id", "event_id"),
        Index("ix_folders_event_parent", "event_id", "parent_id"),
        Index("ix_folders_event_slug", "event_id", "slug"),
        Index("ix_folders_event_type", "event_id", "folder_type"),
    )
