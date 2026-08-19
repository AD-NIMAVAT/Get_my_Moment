"""
Business OS - CRM, Leads & Quotation Models
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from apps.api.database import Base


class Lead(Base):
    __tablename__ = "leads"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    photographer_id = Column(String(36), ForeignKey("photographers.id", ondelete="CASCADE"), nullable=False, index=True)
    client_name = Column(String(255), nullable=False)
    client_phone = Column(String(32), nullable=False)
    client_email = Column(String(255), nullable=True)
    event_type = Column(String(64), default="Wedding", nullable=False)  # Wedding, Pre-Wedding, Corporate, Birthday, Baby Shoot
    event_date = Column(DateTime, nullable=True)
    venue_city = Column(String(255), nullable=True)
    estimated_budget_inr = Column(Float, default=0.0, nullable=False)
    stage = Column(String(32), default="NEW_LEAD", nullable=False, index=True)  # NEW_LEAD, QUOTE_SENT, NEGOTIATION, BOOKED, LOST
    notes = Column(Text, nullable=True)
    converted_event_id = Column(String(36), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    photographer = relationship("Photographer", backref="leads")
    quotations = relationship("Quotation", back_populates="lead", cascade="all, delete-orphan")


class Quotation(Base):
    """
    Client Quotation / Estimate with itemized services & 1-click conversion to Client Invoice.
    """
    __tablename__ = "quotations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    photographer_id = Column(String(36), ForeignKey("photographers.id", ondelete="CASCADE"), nullable=False, index=True)
    lead_id = Column(String(36), ForeignKey("leads.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Sequential Identifier (e.g. QT-2026-000001)
    quotation_number = Column(String(64), nullable=False, index=True)
    package_name = Column(String(255), nullable=True)
    
    # Client Info
    client_name = Column(String(255), nullable=False)
    client_phone = Column(String(32), nullable=True)
    client_email = Column(String(255), nullable=True)
    event_type = Column(String(64), default="Wedding", nullable=True)
    event_date = Column(DateTime, nullable=True)
    venue_city = Column(String(255), nullable=True)
    
    # Deliverables & Financials
    deliverables = Column(JSON, default=list, nullable=False)
    subtotal_inr = Column(Float, default=0.0, nullable=False)
    discount_inr = Column(Float, default=0.0, nullable=False)
    price_inr = Column(Float, default=0.0, nullable=False)  # Base / Subtotal
    tax_mode = Column(String(32), default="WITHOUT_GST", nullable=False)
    tax_pct = Column(Float, default=0.0, nullable=False)
    tax_amount_inr = Column(Float, default=0.0, nullable=False)
    total_amount_inr = Column(Float, default=0.0, nullable=False)
    
    # Lifecycle Status: DRAFT, SENT, VIEWED, ACCEPTED, REJECTED, EXPIRED, CONVERTED, CANCELLED
    status = Column(String(32), default="DRAFT", nullable=False, index=True)
    valid_until = Column(DateTime, nullable=True)
    converted_invoice_id = Column(String(36), nullable=True, index=True)
    
    notes = Column(Text, nullable=True)
    terms_conditions = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    lead = relationship("Lead", back_populates="quotations")
    photographer = relationship("Photographer", backref="quotations")
    items = relationship("QuotationItem", back_populates="quotation", cascade="all, delete-orphan", order_by="QuotationItem.sort_order")


class QuotationItem(Base):
    """
    Individual service item on a Quotation.
    """
    __tablename__ = "quotation_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    quotation_id = Column(String(36), ForeignKey("quotations.id", ondelete="CASCADE"), nullable=False, index=True)
    
    service_type = Column(String(64), default="PHOTOGRAPHY", nullable=False)
    description = Column(String(255), nullable=False)
    quantity = Column(Float, default=1.0, nullable=False)
    unit_price_inr = Column(Float, default=0.0, nullable=False)
    discount_inr = Column(Float, default=0.0, nullable=False)
    line_total_inr = Column(Float, default=0.0, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    quotation = relationship("Quotation", back_populates="items")
