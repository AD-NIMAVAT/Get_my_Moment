"""
Photographer / Studio Model
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Text, Integer
from sqlalchemy.orm import relationship
from apps.api.database import Base


class Photographer(Base):
    __tablename__ = "photographers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    studio_name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)

    # Verification & KYC Onboarding
    city = Column(String(255), nullable=True)
    state = Column(String(255), nullable=True)
    instagram_handle = Column(String(255), nullable=True)
    portfolio_url = Column(String(500), nullable=True)
    years_of_experience = Column(String(64), nullable=True)
    specializations = Column(Text, nullable=True)  # JSON or comma-separated: "Wedding, Pre-Wedding, Cinematic"
    gst_number = Column(String(64), nullable=True)
    verification_status = Column(String(32), default="PENDING_REVIEW", nullable=False)  # PENDING_REVIEW, VERIFIED, REJECTED
    verification_notes = Column(Text, nullable=True)
    verification_submitted_at = Column(DateTime, default=datetime.utcnow, nullable=True)

    # Business & Tax Profile (Flow A: Photographer -> Client Invoicing)
    gst_status = Column(String(32), default="UNREGISTERED", nullable=False)  # UNREGISTERED, REGISTERED, COMPOSITION
    gst_legal_name = Column(String(255), nullable=True)
    gstin = Column(String(32), nullable=True)  # Synced with gst_number
    gst_state = Column(String(128), nullable=True)
    gst_state_code = Column(String(10), nullable=True)  # e.g. "24" for Gujarat
    gst_pincode = Column(String(20), nullable=True)
    gst_address = Column(Text, nullable=True)
    default_tax_mode = Column(String(32), default="WITHOUT_GST", nullable=False)  # WITH_GST, WITHOUT_GST

    # Studio Banking & Direct Client Settlement Details
    bank_name = Column(String(255), nullable=True)
    bank_account_number = Column(String(64), nullable=True)
    bank_ifsc = Column(String(32), nullable=True)
    bank_account_type = Column(String(32), default="CURRENT", nullable=True)
    upi_id = Column(String(255), nullable=True)

    # Studio Branding & Client Signatures
    logo_url = Column(String(1024), nullable=True)
    signature_url = Column(String(1024), nullable=True)
    digital_stamp_url = Column(String(1024), nullable=True)
    watermark_text = Column(String(255), nullable=True)

    # Subscription & Plan Management
    # Tiers: 'FREE_TRIAL', 'SOLO_PRO' (₹599/mo), 'STUDIO_PRO' (₹1,999/mo), 'STUDIO_OS' (₹4,999/mo), 'ENTERPRISE_VIP'
    subscription_plan = Column(String(64), default="SOLO_PRO", nullable=False)
    subscription_status = Column(String(32), default="ACTIVE", nullable=False)  # ACTIVE, TRIAL, EXPIRED, SUSPENDED
    subscription_valid_until = Column(DateTime, nullable=True)
    max_storage_gb = Column(Integer, default=100, nullable=False)
    max_events_per_month = Column(Integer, default=10, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    events = relationship("Event", back_populates="photographer", cascade="all, delete-orphan")
