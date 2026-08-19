"""
Get My Moment - Platform System & Payment Gateway Configuration Models
"""

import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, String, DateTime, Numeric, Text
from apps.api.database import Base


class PlatformPaymentConfig(Base):
    """
    Persistent Master Configuration for Payment Gateway,
    Website Owner Bank Settlement Details, and Indian GST Tax Invoicing.
    """
    __tablename__ = "platform_payment_configs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    # --- 1. Website Owner / Merchant Bank Settlement Details ---
    beneficiary_name = Column(String(255), default="Get My Moment Media Technologies Pvt Ltd", nullable=False)
    bank_name = Column(String(255), default="HDFC Bank", nullable=False)
    account_number = Column(String(64), default="50200012345678", nullable=False)
    ifsc_code = Column(String(32), default="HDFC0001234", nullable=False)
    account_type = Column(String(32), default="CURRENT", nullable=False)  # CURRENT, SAVINGS
    business_upi_id = Column(String(128), default="getmymoment@okhdfcbank", nullable=False)
    bank_branch = Column(String(255), default="Ring Road Branch, Surat", nullable=True)

    # --- 2. Payment Gateway Credentials ---
    gateway_provider = Column(String(32), default="RAZORPAY", nullable=False)  # RAZORPAY, CASHFREE
    gateway_mode = Column(String(16), default="TEST", nullable=False)  # TEST, LIVE
    key_id = Column(String(255), default="rzp_test_GMM2026StudioPay", nullable=False)
    key_secret = Column(String(255), default="secret_GMM2026StudioKeySec", nullable=False)
    webhook_secret = Column(String(255), default="whsec_GMM2026WebhookSec", nullable=False)

    # --- 3. Indian GST Tax & Legal Invoicing Details ---
    seller_legal_name = Column(String(255), default="Get My Moment Media Technologies Pvt Ltd", nullable=False)
    seller_address = Column(String(500), default="104, Royal Sapphire Hub, Surat - 395007, Gujarat, India", nullable=False)
    seller_gstin = Column(String(32), default="24AAACG1234F1Z5", nullable=False)
    seller_pan = Column(String(32), default="AAACG1234F", nullable=False)
    seller_state = Column(String(64), default="Gujarat", nullable=False)
    seller_state_code = Column(String(8), default="24", nullable=False)
    seller_support_email = Column(String(255), default="billing@getmymoment.com", nullable=False)
    seller_support_phone = Column(String(32), default="+91 98765 43210", nullable=True)
    gst_rate_pct = Column(Numeric(5, 2), default=Decimal("18.00"), nullable=False)
    gst_pricing_mode = Column(String(16), default="inclusive", nullable=False)  # inclusive, exclusive

    # --- 4. Digital Stamp & Signatory Details ---
    authorized_signatory_name = Column(String(255), default="Aryan Patel", nullable=True)
    authorized_signatory_designation = Column(String(255), default="Managing Director & Founder", nullable=True)
    digital_stamp_url = Column(Text, nullable=True)
    digital_signature_url = Column(Text, nullable=True)

    # --- 5. Security Audit ---
    last_updated_by = Column(String(255), default="Platform Owner (Superadmin)", nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
