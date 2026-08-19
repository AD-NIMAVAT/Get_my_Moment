"""
Subscription, GST Tax Engine, Invoicing & Entitlement Service
"""

import uuid
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func

from apps.api.config import settings
from apps.api.models.photographer import Photographer
from apps.api.models.audit_log import AuditLog
from apps.api.models.subscription import (
    SubscriptionPlanDef,
    SubscriptionOrder,
    SubscriptionPayment,
    SubscriptionInvoice,
    SubscriptionWebhookEvent,
    SubscriptionLedgerEntry,
    SubscriptionSettlement
)
from apps.api.models.platform_settings import PlatformPaymentConfig
from apps.api.services.payment_gateway import payment_gateway

logger = logging.getLogger("getmymoment.subscription_service")

# Standard Catalog Definitions
DEFAULT_PLANS: List[Dict[str, Any]] = [
    {
        "plan_key": "FREE_TRIAL",
        "name": "Free Trial",
        "description": "Essential starter tools for emerging event photographers.",
        "monthly_price_inr": Decimal("0.00"),
        "annual_price_inr": Decimal("0.00"),
        "storage_limit_gb": 5,
        "event_limit_monthly": 1,
        "ai_face_limit_monthly": 100,
        "whatsapp_limit_monthly": 20,
        "watermark_removal_allowed": False,
        "client_selection_portal_allowed": False,
        "crm_pipeline_allowed": False,
        "custom_branding_allowed": False,
        "priority_gpu_allowed": False,
        "is_popular": False,
        "display_order": 1,
    },
    {
        "plan_key": "SOLO_PRO",
        "name": "Solo Pro",
        "description": "Powerful AI face-matching and high-speed delivery for solo photographers.",
        "monthly_price_inr": Decimal("599.00"),
        "annual_price_inr": Decimal("5750.00"),  # 20% savings
        "storage_limit_gb": 100,
        "event_limit_monthly": 10,
        "ai_face_limit_monthly": 5000,
        "whatsapp_limit_monthly": 1000,
        "watermark_removal_allowed": True,
        "client_selection_portal_allowed": False,
        "crm_pipeline_allowed": False,
        "custom_branding_allowed": False,
        "priority_gpu_allowed": False,
        "is_popular": True,
        "display_order": 2,
    },
    {
        "plan_key": "STUDIO_PRO",
        "name": "Studio Pro",
        "description": "Complete wedding studio suite with Client Selection and Custom Branding.",
        "monthly_price_inr": Decimal("1999.00"),
        "annual_price_inr": Decimal("19190.00"),
        "storage_limit_gb": 500,
        "event_limit_monthly": 30,
        "ai_face_limit_monthly": 25000,
        "whatsapp_limit_monthly": 5000,
        "watermark_removal_allowed": True,
        "client_selection_portal_allowed": True,
        "crm_pipeline_allowed": True,
        "custom_branding_allowed": True,
        "priority_gpu_allowed": True,
        "is_popular": False,
        "display_order": 3,
    },
    {
        "plan_key": "STUDIO_OS",
        "name": "Studio OS Complete",
        "description": "Full Business OS: Multi-day Timeline, CRM Pipeline, Quotations & Profitability.",
        "monthly_price_inr": Decimal("4999.00"),
        "annual_price_inr": Decimal("47990.00"),
        "storage_limit_gb": 2048,  # 2 TB
        "event_limit_monthly": 9999,
        "ai_face_limit_monthly": 100000,
        "whatsapp_limit_monthly": 25000,
        "watermark_removal_allowed": True,
        "client_selection_portal_allowed": True,
        "crm_pipeline_allowed": True,
        "custom_branding_allowed": True,
        "priority_gpu_allowed": True,
        "is_popular": False,
        "display_order": 4,
    },
    {
        "plan_key": "ENTERPRISE_VIP",
        "name": "Enterprise VIP",
        "description": "Dedicated Cloud Infrastructure, Multi-team Seats & Custom Domain.",
        "monthly_price_inr": Decimal("9999.00"),
        "annual_price_inr": Decimal("95990.00"),
        "storage_limit_gb": 10240,  # 10 TB
        "event_limit_monthly": 99999,
        "ai_face_limit_monthly": 500000,
        "whatsapp_limit_monthly": 100000,
        "watermark_removal_allowed": True,
        "client_selection_portal_allowed": True,
        "crm_pipeline_allowed": True,
        "custom_branding_allowed": True,
        "priority_gpu_allowed": True,
        "is_popular": False,
        "display_order": 5,
    },
]


class SubscriptionService:
    """Core Subscription, Tax Billing and Invoicing Engine."""

    def seed_default_plans_if_missing(self, db: Session):
        """Ensure all standard plans exist in DB."""
        for p in DEFAULT_PLANS:
            existing = db.query(SubscriptionPlanDef).filter(SubscriptionPlanDef.plan_key == p["plan_key"]).first()
            if not existing:
                plan_def = SubscriptionPlanDef(**p)
                db.add(plan_def)
        db.commit()

    def get_plan(self, db: Session, plan_key: str) -> SubscriptionPlanDef:
        """Fetch plan by key from DB or fallback catalog."""
        plan = db.query(SubscriptionPlanDef).filter(SubscriptionPlanDef.plan_key == plan_key.upper()).first()
        if not plan:
            self.seed_default_plans_if_missing(db)
            plan = db.query(SubscriptionPlanDef).filter(SubscriptionPlanDef.plan_key == plan_key.upper()).first()
        if not plan:
            raise ValueError(f"Plan key '{plan_key}' not found in catalog.")
        return plan

    def get_or_create_payment_config(self, db: Session) -> PlatformPaymentConfig:
        """Fetch active platform payment & owner bank configuration from DB."""
        cfg = db.query(PlatformPaymentConfig).first()
        if not cfg:
            cfg = PlatformPaymentConfig()
            db.add(cfg)
            db.commit()
            db.refresh(cfg)
        return cfg

    def calculate_gst_tax(
        self,
        amount_inr: Decimal,
        buyer_state: str = "Gujarat",
        is_inclusive: bool = True,
        gst_rate_pct: Optional[Decimal] = None,
        seller_state: Optional[str] = None
    ) -> Dict[str, Decimal]:
        """
        Calculate GST Tax Breakdown (CGST 9% + SGST 9% for Intra-state, IGST 18% for Inter-state).
        """
        gst_rate = gst_rate_pct if gst_rate_pct is not None else Decimal(str(settings.GST_RATE_PCT))  # 18%
        seller_state_name = seller_state or settings.SELLER_STATE
        
        if is_inclusive:
            # Reverse tax calculation from total MRP
            taxable = (amount_inr / (Decimal("1.00") + (gst_rate / Decimal("100.00")))).quantize(Decimal("0.01"))
            total_tax = (amount_inr - taxable).quantize(Decimal("0.01"))
            total_payable = amount_inr
        else:
            taxable = amount_inr.quantize(Decimal("0.01"))
            total_tax = (taxable * (gst_rate / Decimal("100.00"))).quantize(Decimal("0.01"))
            total_payable = (taxable + total_tax).quantize(Decimal("0.01"))

        # Seller state code comparison
        is_intra_state = (buyer_state.strip().lower() == seller_state_name.strip().lower())
        
        if is_intra_state:
            cgst = (total_tax / Decimal("2.00")).quantize(Decimal("0.01"))
            sgst = total_tax - cgst  # Prevent 1 paise rounding discrepancy
            igst = Decimal("0.00")
        else:
            cgst = Decimal("0.00")
            sgst = Decimal("0.00")
            igst = total_tax

        return {
            "taxable_amount": taxable,
            "gst_rate_pct": gst_rate,
            "cgst": cgst,
            "sgst": sgst,
            "igst": igst,
            "total_tax": total_tax,
            "total_payable": total_payable,
        }

    def generate_next_invoice_number(self, db: Session) -> str:
        """
        Generate sequential invoice number (e.g. GMM-2026-000001).
        """
        year = datetime.utcnow().year
        prefix = f"GMM-{year}-"
        
        count = db.query(SubscriptionInvoice).filter(
            SubscriptionInvoice.invoice_number.like(f"{prefix}%")
        ).count()
        
        next_seq = count + 1
        return f"{prefix}{next_seq:06d}"

    def create_subscription_order(
        self,
        db: Session,
        photographer: Photographer,
        plan_key: str,
        billing_cycle: str = "MONTHLY",
        buyer_state: Optional[str] = None
    ) -> Tuple[SubscriptionOrder, Dict[str, Any]]:
        """
        Create internal order record and corresponding Gateway checkout order.
        """
        plan = self.get_plan(db, plan_key)
        cfg = self.get_or_create_payment_config(db)
        
        if billing_cycle.upper() == "ANNUAL":
            base_amount = plan.annual_price_inr
        else:
            base_amount = plan.monthly_price_inr

        state_for_tax = buyer_state or photographer.state or cfg.seller_state
        tax_calc = self.calculate_gst_tax(
            amount_inr=base_amount, 
            buyer_state=state_for_tax, 
            is_inclusive=(cfg.gst_pricing_mode == "inclusive"),
            gst_rate_pct=cfg.gst_rate_pct,
            seller_state=cfg.seller_state
        )

        # 1. Create Internal Order
        order_id = str(uuid.uuid4())
        internal_order = SubscriptionOrder(
            id=order_id,
            photographer_id=photographer.id,
            plan_key=plan.plan_key,
            billing_cycle=billing_cycle.upper(),
            currency="INR",
            base_amount_inr=base_amount,
            taxable_amount_inr=tax_calc["taxable_amount"],
            gst_rate_pct=tax_calc["gst_rate_pct"],
            cgst_inr=tax_calc["cgst"],
            sgst_inr=tax_calc["sgst"],
            igst_inr=tax_calc["igst"],
            total_tax_inr=tax_calc["total_tax"],
            total_payable_inr=tax_calc["total_payable"],
            gateway_name=cfg.gateway_provider.upper(),
            status="CREATED",
            expires_at=datetime.utcnow() + timedelta(hours=24)
        )
        db.add(internal_order)
        db.commit()
        db.refresh(internal_order)

        # 2. Call Payment Gateway
        gw_res = payment_gateway.create_order(
            amount_inr=tax_calc["total_payable"],
            currency="INR",
            receipt=f"rcpt_{internal_order.id[:8]}",
            key_id=cfg.key_id,
            notes={
                "photographer_id": photographer.id,
                "studio_name": photographer.studio_name,
                "plan_key": plan.plan_key,
                "internal_order_id": internal_order.id
            }
        )

        internal_order.gateway_order_id = gw_res["gateway_order_id"]
        db.commit()

        return internal_order, gw_res

    def verify_and_activate_subscription(
        self,
        db: Session,
        photographer: Photographer,
        gateway_order_id: str,
        gateway_payment_id: str,
        gateway_signature: str,
        payment_method: str = "UPI",
        payment_method_details: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Atomic Server-Side Verification, Plan Upgrade, Validity Extension, and Invoicing.
        """
        # 1. Locate Order
        order = db.query(SubscriptionOrder).filter(
            SubscriptionOrder.gateway_order_id == gateway_order_id,
            SubscriptionOrder.photographer_id == photographer.id
        ).first()

        if not order:
            raise ValueError("Order not found or does not belong to authenticated photographer.")

        # Idempotency: If already paid, return existing receipt
        if order.status == "PAID":
            invoice = db.query(SubscriptionInvoice).filter(SubscriptionInvoice.order_id == order.id).first()
            return {
                "success": True,
                "already_processed": True,
                "message": "Subscription order was already activated.",
                "plan_key": order.plan_key,
                "invoice_number": invoice.invoice_number if invoice else None
            }

        # 2. Cryptographic Signature Verification
        is_signature_valid = payment_gateway.verify_payment_signature(
            gateway_order_id=gateway_order_id,
            gateway_payment_id=gateway_payment_id,
            gateway_signature=gateway_signature
        )

        if not is_signature_valid:
            logger.error(f"Signature verification failed for order {gateway_order_id}, payment {gateway_payment_id}")
            order.status = "FAILED"
            db.commit()
            raise ValueError("Payment signature verification failed. Untrusted payload rejected.")

        # 3. Calculate Estimated Bank Settlement
        fee, tax_on_fee, net_settle = payment_gateway.calculate_estimated_settlement(order.total_payable_inr)

        # 4. Create Payment Record
        payment = SubscriptionPayment(
            order_id=order.id,
            photographer_id=photographer.id,
            gateway_name=settings.PAYMENT_GATEWAY.upper(),
            gateway_order_id=gateway_order_id,
            gateway_payment_id=gateway_payment_id,
            gateway_signature=gateway_signature,
            amount_inr=order.total_payable_inr,
            currency="INR",
            status="CAPTURED",
            payment_method=payment_method,
            payment_method_details=payment_method_details,
            estimated_gateway_fee_inr=fee,
            estimated_gateway_tax_inr=tax_on_fee,
            estimated_net_settlement_inr=net_settle,
            is_settled_to_bank=False,
            paid_at=datetime.utcnow()
        )
        db.add(payment)
        db.flush()

        # 5. Extend Subscription Expiry safely
        plan = self.get_plan(db, order.plan_key)
        days_to_add = 365 if order.billing_cycle == "ANNUAL" else 30
        
        now = datetime.utcnow()
        if photographer.subscription_valid_until and photographer.subscription_valid_until > now:
            new_valid_until = photographer.subscription_valid_until + timedelta(days=days_to_add)
        else:
            new_valid_until = now + timedelta(days=days_to_add)

        # Update Photographer Entitlements
        photographer.subscription_plan = plan.plan_key
        photographer.subscription_status = "ACTIVE"
        photographer.subscription_valid_until = new_valid_until
        photographer.max_storage_gb = plan.storage_limit_gb
        photographer.max_events_per_month = plan.event_limit_monthly

        order.status = "PAID"

        # 6. Generate Official Tax Invoice
        cfg = self.get_or_create_payment_config(db)
        invoice_no = self.generate_next_invoice_number(db)
        invoice = SubscriptionInvoice(
            invoice_number=invoice_no,
            order_id=order.id,
            payment_id=payment.id,
            photographer_id=photographer.id,
            plan_key=plan.plan_key,
            plan_name=plan.name,
            billing_period_start=now,
            billing_period_end=new_valid_until,
            seller_legal_name=cfg.seller_legal_name,
            seller_address=cfg.seller_address,
            seller_gstin=cfg.seller_gstin,
            seller_pan=cfg.seller_pan,
            seller_state=cfg.seller_state,
            seller_state_code=cfg.seller_state_code,
            buyer_studio_name=photographer.studio_name,
            buyer_email=photographer.email,
            buyer_phone=photographer.phone,
            buyer_city=photographer.city or "Surat",
            buyer_state=photographer.state or cfg.seller_state,
            buyer_gstin=photographer.gst_number,
            currency="INR",
            taxable_amount_inr=order.taxable_amount_inr,
            cgst_pct=Decimal("9.00") if order.cgst_inr > 0 else Decimal("0.00"),
            cgst_amount_inr=order.cgst_inr,
            sgst_pct=Decimal("9.00") if order.sgst_inr > 0 else Decimal("0.00"),
            sgst_amount_inr=order.sgst_inr,
            igst_pct=Decimal("18.00") if order.igst_inr > 0 else Decimal("0.00"),
            igst_amount_inr=order.igst_inr,
            total_tax_inr=order.total_tax_inr,
            total_amount_inr=order.total_payable_inr,
            status="PAID",
            invoice_date=now
        )
        db.add(invoice)

        # 7. Financial Accounting Ledger Entry
        ledger = SubscriptionLedgerEntry(
            photographer_id=photographer.id,
            reference_id=payment.id,
            entry_type="SUBSCRIPTION_PAYMENT",
            amount_inr=order.total_payable_inr,
            balance_inr=order.total_payable_inr,
            currency="INR",
            notes=f"Paid for {plan.name} ({order.billing_cycle}) via {payment_method}. Invoice: {invoice_no}"
        )
        db.add(ledger)

        # 8. Audit Log
        audit = AuditLog(
            photographer_id=photographer.id,
            actor_type="PHOTOGRAPHER",
            actor_id=photographer.id,
            action="SUBSCRIPTION_UPGRADE_PAID",
            details={"notes": f"Upgraded to {plan.name} ({order.billing_cycle}) for ₹{order.total_payable_inr}. Invoice {invoice_no} generated."}
        )
        db.add(audit)

        db.commit()
        db.refresh(photographer)

        logger.info(f"🎉 Successfully activated {plan.name} for {photographer.studio_name}. Expiry: {new_valid_until}")

        return {
            "success": True,
            "already_processed": False,
            "message": f"Successfully activated {plan.name} subscription!",
            "plan_key": plan.plan_key,
            "plan_name": plan.name,
            "storage_gb": plan.storage_limit_gb,
            "valid_until": new_valid_until.isoformat(),
            "invoice_number": invoice_no,
            "amount_paid_inr": float(order.total_payable_inr)
        }

    def process_gateway_webhook(
        self,
        db: Session,
        raw_body: bytes,
        signature_header: str
    ) -> Dict[str, Any]:
        """
        Idempotent Server-to-Server Webhook Processing.
        """
        # 1. Verify Webhook Signature
        if not payment_gateway.verify_webhook_signature(raw_body, signature_header):
            logger.error("Webhook signature mismatch. Rejecting payload.")
            raise ValueError("Invalid webhook signature.")

        import json
        payload = json.loads(raw_body.decode('utf-8'))
        event_id = payload.get("id") or str(uuid.uuid4())
        event_type = payload.get("event", "payment.captured")

        # 2. Check Idempotency Table
        existing_event = db.query(SubscriptionWebhookEvent).filter(
            SubscriptionWebhookEvent.event_id == event_id
        ).first()

        if existing_event and existing_event.status == "PROCESSED":
            logger.info(f"Duplicate webhook event {event_id} ({event_type}) skipped idempotently.")
            return {"status": "skipped", "message": "Duplicate event already processed"}

        # 3. Log Event
        if not existing_event:
            existing_event = SubscriptionWebhookEvent(
                gateway_name=settings.PAYMENT_GATEWAY.upper(),
                event_id=event_id,
                event_type=event_type,
                signature=signature_header,
                payload_json=raw_body.decode('utf-8'),
                status="RECEIVED"
            )
            db.add(existing_event)
            db.commit()

        # 4. Handle Event
        if event_type in ["payment.captured", "order.paid"]:
            payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
            order_id = payment_entity.get("order_id")
            payment_id = payment_entity.get("id")
            method = payment_entity.get("method", "UPI")

            if order_id:
                order = db.query(SubscriptionOrder).filter(
                    SubscriptionOrder.gateway_order_id == order_id
                ).first()

                if order and order.status != "PAID":
                    photographer = db.query(Photographer).filter(
                        Photographer.id == order.photographer_id
                    ).first()

                    if photographer:
                        # Auto-activate via webhook
                        self.verify_and_activate_subscription(
                            db=db,
                            photographer=photographer,
                            gateway_order_id=order_id,
                            gateway_payment_id=payment_id or f"pay_{event_id[:12]}",
                            gateway_signature="webhook_verified",
                            payment_method=method
                        )

        existing_event.status = "PROCESSED"
        existing_event.processed_at = datetime.utcnow()
        db.commit()

        return {"status": "success", "event_id": event_id}


subscription_service = SubscriptionService()
