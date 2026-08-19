"""
Subscription, Billing, Payment, Invoicing & Bank Settlement Models
"""

import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import (
    Column, String, DateTime, Boolean, Text, Integer, 
    Numeric, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from apps.api.database import Base


class SubscriptionPlanDef(Base):
    """Configurable Subscription Plan Catalog."""
    __tablename__ = "subscription_plans"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    plan_key = Column(String(64), unique=True, index=True, nullable=False)  # FREE_TRIAL, SOLO_PRO, STUDIO_PRO, STUDIO_OS, ENTERPRISE_VIP
    name = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    monthly_price_inr = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    annual_price_inr = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    currency = Column(String(8), default="INR", nullable=False)
    
    # Entitlement Limits
    storage_limit_gb = Column(Integer, nullable=False, default=100)
    event_limit_monthly = Column(Integer, nullable=False, default=10)
    ai_face_limit_monthly = Column(Integer, nullable=False, default=5000)
    whatsapp_limit_monthly = Column(Integer, nullable=False, default=1000)
    
    # Feature Flags
    watermark_removal_allowed = Column(Boolean, default=True, nullable=False)
    client_selection_portal_allowed = Column(Boolean, default=True, nullable=False)
    crm_pipeline_allowed = Column(Boolean, default=True, nullable=False)
    custom_branding_allowed = Column(Boolean, default=False, nullable=False)
    priority_gpu_allowed = Column(Boolean, default=False, nullable=False)
    
    is_active = Column(Boolean, default=True, nullable=False)
    is_popular = Column(Boolean, default=False, nullable=False)
    display_order = Column(Integer, default=0, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class SubscriptionOrder(Base):
    """Internal Order Record before Gateway Checkout."""
    __tablename__ = "subscription_orders"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    photographer_id = Column(String(36), ForeignKey("photographers.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_key = Column(String(64), nullable=False)
    billing_cycle = Column(String(32), default="MONTHLY", nullable=False)  # MONTHLY, ANNUAL
    
    # Financials (Exact Decimal calculation)
    currency = Column(String(8), default="INR", nullable=False)
    base_amount_inr = Column(Numeric(12, 2), nullable=False)
    discount_amount_inr = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    taxable_amount_inr = Column(Numeric(12, 2), nullable=False)
    gst_rate_pct = Column(Numeric(5, 2), default=Decimal("18.00"), nullable=False)
    cgst_inr = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    sgst_inr = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    igst_inr = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    total_tax_inr = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    total_payable_inr = Column(Numeric(12, 2), nullable=False)
    
    # Gateway Attributes
    gateway_name = Column(String(32), default="RAZORPAY", nullable=False)
    gateway_order_id = Column(String(128), unique=True, index=True, nullable=True)
    
    # Order Status: CREATED, PENDING, PAID, FAILED, CANCELLED, EXPIRED
    status = Column(String(32), default="CREATED", nullable=False, index=True)
    
    idempotency_key = Column(String(128), unique=True, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    photographer = relationship("Photographer", backref="subscription_orders")
    payments = relationship("SubscriptionPayment", back_populates="order", cascade="all, delete-orphan")


class SubscriptionPayment(Base):
    """Captured Payment Transaction Record."""
    __tablename__ = "subscription_payments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String(36), ForeignKey("subscription_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    photographer_id = Column(String(36), ForeignKey("photographers.id", ondelete="CASCADE"), nullable=False, index=True)
    
    gateway_name = Column(String(32), default="RAZORPAY", nullable=False)
    gateway_order_id = Column(String(128), nullable=False, index=True)
    gateway_payment_id = Column(String(128), unique=True, index=True, nullable=False)
    gateway_signature = Column(String(500), nullable=True)
    
    amount_inr = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(8), default="INR", nullable=False)
    
    # Payment Status: AUTHORIZED, CAPTURED, FAILED, REFUNDED, PARTIALLY_REFUNDED
    status = Column(String(32), default="CAPTURED", nullable=False, index=True)
    payment_method = Column(String(64), default="UPI", nullable=False)  # UPI, CARD, NETBANKING, WALLET
    payment_method_details = Column(Text, nullable=True)  # e.g. "VPA: aryan@okaxis", "Visa **** 4242"
    
    # Settlement Estimation
    estimated_gateway_fee_inr = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    estimated_gateway_tax_inr = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    estimated_net_settlement_inr = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    is_settled_to_bank = Column(Boolean, default=False, nullable=False)
    settlement_id = Column(String(64), nullable=True, index=True)
    settled_at = Column(DateTime, nullable=True)
    
    error_code = Column(String(64), nullable=True)
    error_description = Column(Text, nullable=True)
    
    paid_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    order = relationship("SubscriptionOrder", back_populates="payments")
    photographer = relationship("Photographer", backref="subscription_payments")


class SubscriptionInvoice(Base):
    """Official GST Tax Invoice Record."""
    __tablename__ = "subscription_invoices"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_number = Column(String(64), unique=True, index=True, nullable=False)  # e.g. GMM-2026-000001
    order_id = Column(String(36), ForeignKey("subscription_orders.id", ondelete="CASCADE"), nullable=False)
    payment_id = Column(String(36), ForeignKey("subscription_payments.id", ondelete="CASCADE"), nullable=False)
    photographer_id = Column(String(36), ForeignKey("photographers.id", ondelete="CASCADE"), nullable=False, index=True)
    
    plan_key = Column(String(64), nullable=False)
    plan_name = Column(String(128), nullable=False)
    billing_period_start = Column(DateTime, nullable=False)
    billing_period_end = Column(DateTime, nullable=False)
    
    # Seller Legal Info
    seller_legal_name = Column(String(255), default="Get My Moment Media Technologies Pvt Ltd", nullable=False)
    seller_address = Column(Text, default="Surat, Gujarat, India", nullable=False)
    seller_gstin = Column(String(32), default="24AAACG1234F1Z5", nullable=False)
    seller_pan = Column(String(32), default="AAACG1234F", nullable=False)
    seller_state = Column(String(64), default="Gujarat", nullable=False)
    seller_state_code = Column(String(8), default="24", nullable=False)
    
    # Buyer Studio Info
    buyer_studio_name = Column(String(255), nullable=False)
    buyer_email = Column(String(255), nullable=False)
    buyer_phone = Column(String(50), nullable=True)
    buyer_city = Column(String(128), nullable=True)
    buyer_state = Column(String(128), default="Gujarat", nullable=False)
    buyer_gstin = Column(String(32), nullable=True)
    
    # Exact Tax Breakdown
    currency = Column(String(8), default="INR", nullable=False)
    taxable_amount_inr = Column(Numeric(12, 2), nullable=False)
    cgst_pct = Column(Numeric(5, 2), default=Decimal("9.00"), nullable=False)
    cgst_amount_inr = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    sgst_pct = Column(Numeric(5, 2), default=Decimal("9.00"), nullable=False)
    sgst_amount_inr = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    igst_pct = Column(Numeric(5, 2), default=Decimal("0.00"), nullable=False)
    igst_amount_inr = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    total_tax_inr = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    total_amount_inr = Column(Numeric(12, 2), nullable=False)
    
    status = Column(String(32), default="PAID", nullable=False)  # PAID, VOID, REFUNDED
    pdf_url = Column(String(500), nullable=True)
    
    invoice_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    photographer = relationship("Photographer", backref="subscription_invoices")


class SubscriptionWebhookEvent(Base):
    """Immutable Webhook Audit & Idempotency Log."""
    __tablename__ = "subscription_webhook_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    gateway_name = Column(String(32), default="RAZORPAY", nullable=False)
    event_id = Column(String(128), unique=True, index=True, nullable=False)
    event_type = Column(String(128), index=True, nullable=False)  # payment.captured, payment.failed, order.paid
    signature = Column(String(500), nullable=True)
    payload_json = Column(Text, nullable=False)
    
    # Status: RECEIVED, PROCESSED, DUPLICATE_SKIPPED, FAILED
    status = Column(String(32), default="RECEIVED", nullable=False, index=True)
    error_message = Column(Text, nullable=True)
    
    received_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    processed_at = Column(DateTime, nullable=True)


class SubscriptionLedgerEntry(Base):
    """Double-Entry Accounting / Financial Audit Ledger."""
    __tablename__ = "subscription_ledger"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    photographer_id = Column(String(36), ForeignKey("photographers.id", ondelete="CASCADE"), nullable=False, index=True)
    reference_id = Column(String(128), nullable=False, index=True)  # Payment ID, Invoice ID, Refund ID
    entry_type = Column(String(32), nullable=False)  # SUBSCRIPTION_PAYMENT, REFUND, CREDIT_ADJUSTMENT, GATEWAY_FEE
    amount_inr = Column(Numeric(12, 2), nullable=False)
    balance_inr = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(8), default="INR", nullable=False)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class SubscriptionSettlement(Base):
    """Bank Settlement Records (T+1 Daily Merchant Settlement)."""
    __tablename__ = "subscription_settlements"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    settlement_id = Column(String(128), unique=True, index=True, nullable=False)
    gateway_name = Column(String(32), default="RAZORPAY", nullable=False)
    gross_amount_inr = Column(Numeric(12, 2), nullable=False)
    gateway_fee_inr = Column(Numeric(12, 2), nullable=False)
    gateway_tax_inr = Column(Numeric(12, 2), nullable=False)
    net_settlement_inr = Column(Numeric(12, 2), nullable=False)
    
    bank_reference = Column(String(128), nullable=True)  # UTR / NEFT Reference
    bank_account_last4 = Column(String(8), nullable=True)
    status = Column(String(32), default="PROCESSED", nullable=False)  # CREATED, PROCESSED, FAILED
    
    settlement_date = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
