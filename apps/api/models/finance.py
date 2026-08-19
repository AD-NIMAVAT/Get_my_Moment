"""
Business OS - Client Billing, Invoices, Milestones, Payments & Tax Models
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from apps.api.database import Base


class ClientInvoice(Base):
    """
    Official Client Service Invoice, Bill of Supply, or Commercial Invoice.
    Flow A: Photographer -> Photography Client.
    """
    __tablename__ = "client_invoices"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    photographer_id = Column(String(36), ForeignKey("photographers.id", ondelete="CASCADE"), nullable=False, index=True)
    event_id = Column(String(36), ForeignKey("events.id", ondelete="SET NULL"), nullable=True, index=True)
    quotation_id = Column(String(36), nullable=True, index=True)
    
    # Sequential Identifier (e.g. INV-2026-000001)
    invoice_number = Column(String(64), nullable=False, index=True)
    financial_year = Column(String(16), default="2026-27", nullable=False)
    
    # Document Classification
    # TAX_INVOICE (for registered GST seller with GST enabled)
    # BILL_OF_SUPPLY (for composition or exempt)
    # COMMERCIAL_INVOICE (for unregistered non-GST seller)
    document_type = Column(String(32), default="TAX_INVOICE", nullable=False)
    tax_mode = Column(String(32), default="WITHOUT_GST", nullable=False)  # WITH_GST, WITHOUT_GST
    gst_applied = Column(Boolean, default=False, nullable=False)
    gst_rate_pct = Column(Float, default=18.0, nullable=False)
    
    # Dates
    invoice_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    due_date = Column(DateTime, nullable=True)
    finalized_at = Column(DateTime, nullable=True)
    
    # Lifecycle Status
    # DRAFT: fully editable
    # ISSUED: finalized & immutable
    # PARTIALLY_PAID: advances recorded, balance remaining
    # PAID: full balance settled
    # CANCELLED: voided
    status = Column(String(32), default="DRAFT", nullable=False, index=True)
    
    # Security: Cryptographically random token for client viewing & WhatsApp sharing
    secure_share_token = Column(String(64), unique=True, index=True, default=lambda: uuid.uuid4().hex + uuid.uuid4().hex[:8])
    share_token_expires_at = Column(DateTime, nullable=True)
    currency = Column(String(8), default="INR", nullable=False)
    
    # Client / Buyer Information
    client_name = Column(String(255), nullable=False)
    client_phone = Column(String(32), nullable=True)
    client_email = Column(String(255), nullable=True)
    client_address = Column(Text, nullable=True)
    client_city = Column(String(128), nullable=True)
    client_state = Column(String(128), nullable=True)
    client_state_code = Column(String(10), nullable=True)
    client_pincode = Column(String(20), nullable=True)
    client_gstin = Column(String(32), nullable=True)
    
    # Event Information
    event_name = Column(String(255), nullable=True)
    event_date = Column(DateTime, nullable=True)
    event_venue = Column(String(255), nullable=True)
    
    # Financial Calculation Snapshot (Immutable once finalized)
    subtotal_inr = Column(Float, default=0.0, nullable=False)
    discount_inr = Column(Float, default=0.0, nullable=False)
    taxable_amount_inr = Column(Float, default=0.0, nullable=False)
    cgst_amount_inr = Column(Float, default=0.0, nullable=False)
    sgst_amount_inr = Column(Float, default=0.0, nullable=False)
    igst_amount_inr = Column(Float, default=0.0, nullable=False)
    total_tax_inr = Column(Float, default=0.0, nullable=False)
    grand_total_inr = Column(Float, default=0.0, nullable=False)
    amount_paid_inr = Column(Float, default=0.0, nullable=False)
    balance_due_inr = Column(Float, default=0.0, nullable=False)
    
    # Studio / Seller Snapshot at issuance time
    seller_legal_name_snapshot = Column(String(255), nullable=True)
    seller_gstin_snapshot = Column(String(32), nullable=True)
    seller_state_snapshot = Column(String(128), nullable=True)
    seller_address_snapshot = Column(Text, nullable=True)
    seller_bank_name_snapshot = Column(String(255), nullable=True)
    seller_account_no_snapshot = Column(String(64), nullable=True)
    seller_ifsc_snapshot = Column(String(32), nullable=True)
    seller_upi_id_snapshot = Column(String(255), nullable=True)
    
    # Notes & Terms
    notes = Column(Text, nullable=True)
    terms_conditions = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    photographer = relationship("Photographer", backref="client_invoices")
    event = relationship("Event", backref="invoices")
    items = relationship("ClientInvoiceItem", back_populates="invoice", cascade="all, delete-orphan", order_by="ClientInvoiceItem.sort_order")
    payments = relationship("ClientPaymentRecord", back_populates="invoice", cascade="all, delete-orphan", order_by="ClientPaymentRecord.payment_date.desc()")
    milestones = relationship("InvoicePaymentMilestone", back_populates="invoice", cascade="all, delete-orphan")


class ClientInvoiceItem(Base):
    """
    Individual Line Item on a Client Invoice.
    """
    __tablename__ = "client_invoice_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_id = Column(String(36), ForeignKey("client_invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Service category
    # PHOTOGRAPHY, VIDEOGRAPHY, ALBUM_PRINTING, DRONE_SHOOT, PRE_WEDDING, CINEMATOGRAPHY, OTHER
    service_type = Column(String(64), default="PHOTOGRAPHY", nullable=False)
    description = Column(String(255), nullable=False)
    quantity = Column(Float, default=1.0, nullable=False)
    unit_price_inr = Column(Float, default=0.0, nullable=False)
    
    # Line Discount
    discount_type = Column(String(16), default="FIXED", nullable=False)  # FIXED, PERCENTAGE
    discount_value = Column(Float, default=0.0, nullable=False)
    discount_amount_inr = Column(Float, default=0.0, nullable=False)
    
    # Line Tax
    tax_rate_pct = Column(Float, default=18.0, nullable=False)
    tax_amount_inr = Column(Float, default=0.0, nullable=False)
    line_total_inr = Column(Float, default=0.0, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    invoice = relationship("ClientInvoice", back_populates="items")


class ClientPaymentRecord(Base):
    """
    Advance & Milestone Payments Recorded for a Client Invoice.
    """
    __tablename__ = "client_payment_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_id = Column(String(36), ForeignKey("client_invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    photographer_id = Column(String(36), ForeignKey("photographers.id", ondelete="CASCADE"), nullable=False, index=True)
    milestone_id = Column(String(36), nullable=True, index=True)
    
    receipt_number = Column(String(64), nullable=False, index=True)  # e.g. RCP-2026-000001
    amount_inr = Column(Float, default=0.0, nullable=False)
    payment_mode = Column(String(32), default="UPI", nullable=False)  # UPI, CASH, BANK_TRANSFER, CHEQUE, ONLINE
    payment_status = Column(String(32), default="SUCCESS", nullable=False)  # SUCCESS, PENDING, FAILED
    reference_no = Column(String(128), nullable=True)  # UTR / Cheque No / Transaction ID
    payment_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    invoice = relationship("ClientInvoice", back_populates="payments")
    photographer = relationship("Photographer", backref="client_payment_records")


class InvoicePaymentMilestone(Base):
    """
    Milestone Schedule Attached to an Invoice (e.g. 20% Token, 50% Event, 30% Delivery).
    """
    __tablename__ = "invoice_payment_milestones"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_id = Column(String(36), ForeignKey("client_invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    photographer_id = Column(String(36), ForeignKey("photographers.id", ondelete="CASCADE"), nullable=False, index=True)
    
    title = Column(String(255), nullable=False)  # e.g. "Booking Advance (20%)", "Stage 2 - Function Day", "Final Delivery"
    percentage = Column(Float, default=0.0, nullable=False)
    amount_inr = Column(Float, default=0.0, nullable=False)
    due_date = Column(DateTime, nullable=True)
    status = Column(String(32), default="PENDING", nullable=False, index=True)  # PENDING, DUE, PAID, OVERDUE
    paid_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    invoice = relationship("ClientInvoice", back_populates="milestones")
    photographer = relationship("Photographer", backref="invoice_payment_milestones")


class InvoiceSequence(Base):
    """
    Atomic Sequence Generator for Invoice, Quotation and Receipt Numbers.
    Avoids MAX(invoice_number) race conditions.
    """
    __tablename__ = "invoice_sequences"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    photographer_id = Column(String(36), ForeignKey("photographers.id", ondelete="CASCADE"), nullable=False, index=True)
    document_type = Column(String(32), default="INVOICE", nullable=False)  # INVOICE, QUOTATION, RECEIPT, CREDIT_NOTE
    financial_year = Column(String(16), default="2026-27", nullable=False)
    last_number = Column(Integer, default=0, nullable=False)
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class TaxConfiguration(Base):
    """
    Global / Configurable GST Tax Rates.
    """
    __tablename__ = "tax_configurations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tax_code = Column(String(32), default="GST_SERVICE", unique=True, nullable=False)
    description = Column(String(255), default="Standard GST for Photography & Videography Services", nullable=False)
    sac_code = Column(String(32), default="998314", nullable=False)
    cgst_rate_pct = Column(Float, default=9.0, nullable=False)
    sgst_rate_pct = Column(Float, default=9.0, nullable=False)
    igst_rate_pct = Column(Float, default=18.0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    effective_from = Column(DateTime, default=datetime.utcnow, nullable=False)


class CreditNote(Base):
    """
    Credit Note generated against a finalized Client Invoice for adjustment/cancellation.
    """
    __tablename__ = "credit_notes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    credit_note_number = Column(String(64), nullable=False, unique=True, index=True)  # CN-2026-000001
    photographer_id = Column(String(36), ForeignKey("photographers.id", ondelete="CASCADE"), nullable=False, index=True)
    original_invoice_id = Column(String(36), ForeignKey("client_invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    reason = Column(String(255), nullable=False)
    amount_inr = Column(Float, default=0.0, nullable=False)
    tax_adjustment_inr = Column(Float, default=0.0, nullable=False)
    status = Column(String(32), default="ISSUED", nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    original_invoice = relationship("ClientInvoice", backref="credit_notes")
    photographer = relationship("Photographer", backref="credit_notes")


# Legacy models preserved for backward compatibility
class PaymentMilestone(Base):
    __tablename__ = "payment_milestones"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    photographer_id = Column(String(36), ForeignKey("photographers.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    amount_inr = Column(Float, default=0.0, nullable=False)
    due_date = Column(DateTime, nullable=True)
    status = Column(String(32), default="PENDING", nullable=False, index=True)
    received_at = Column(DateTime, nullable=True)
    payment_mode = Column(String(32), nullable=True)
    upi_ref = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    event = relationship("Event", backref="payment_milestones")
    photographer = relationship("Photographer", backref="payment_milestones")


class EventExpense(Base):
    __tablename__ = "event_expenses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    photographer_id = Column(String(36), ForeignKey("photographers.id", ondelete="CASCADE"), nullable=False, index=True)
    category = Column(String(64), nullable=False)
    description = Column(String(255), nullable=False)
    amount_inr = Column(Float, default=0.0, nullable=False)
    paid_to = Column(String(255), nullable=True)
    receipt_url = Column(String(1024), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    event = relationship("Event", backref="expenses")
    photographer = relationship("Photographer", backref="expenses")
