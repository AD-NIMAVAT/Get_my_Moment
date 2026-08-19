"""
Get My Moment - Super Admin & Platform Owner Model
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean
from apps.api.database import Base


class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(32), default="SUPER_ADMIN", nullable=False)  # SUPER_ADMIN, SUPPORT_ADMIN
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
