"""
Subscription, Checkout, Invoicing & Bank Settlement API Router
"""

from typing import List, Optional
from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Header, Query, Request, Response
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from jose import jwt, JWTError

from apps.api.database import get_db
from apps.api.models.photographer import Photographer
from apps.api.models.admin import AdminUser
from apps.api.models.subscription import (
    SubscriptionPlanDef,
    SubscriptionOrder,
    SubscriptionPayment,
    SubscriptionInvoice,
    SubscriptionLedgerEntry,
    SubscriptionSettlement
)
from apps.api.models.platform_settings import PlatformPaymentConfig
from apps.api.auth import get_current_photographer, get_current_admin, ALGORITHM
from apps.api.services.subscription_service import subscription_service
from apps.api.config import settings

router = APIRouter(prefix="/subscription", tags=["Subscription & Payment Billing"])


# Request & Response Schemas
class CreateOrderRequest(BaseModel):
    plan_key: str = Field(..., description="Plan tier: SOLO_PRO, STUDIO_PRO, STUDIO_OS, ENTERPRISE_VIP")
    billing_cycle: str = Field("MONTHLY", description="MONTHLY or ANNUAL")
    buyer_state: Optional[str] = Field(None, description="Studio State for GST calculation")


class CreateOrderResponse(BaseModel):
    order_id: str
    gateway_order_id: str
    gateway_name: str
    key_id: str
    amount_inr: float
    taxable_amount_inr: float
    cgst_inr: float
    sgst_inr: float
    igst_inr: float
    total_tax_inr: float
    currency: str
    plan_key: str
    plan_name: str
    billing_cycle: str


class VerifyPaymentRequest(BaseModel):
    gateway_order_id: str
    gateway_payment_id: str
    gateway_signature: str
    payment_method: Optional[str] = "UPI"
    payment_method_details: Optional[str] = None


class VerifyPaymentResponse(BaseModel):
    success: bool
    already_processed: bool = False
    message: str
    plan_key: str
    plan_name: str
    storage_gb: int
    valid_until: str
    invoice_number: str
    amount_paid_inr: float


class PlanItemResponse(BaseModel):
    plan_key: str
    name: str
    description: Optional[str]
    monthly_price_inr: float
    annual_price_inr: float
    currency: str
    storage_limit_gb: int
    event_limit_monthly: int
    ai_face_limit_monthly: int
    whatsapp_limit_monthly: int
    watermark_removal_allowed: bool
    client_selection_portal_allowed: bool
    crm_pipeline_allowed: bool
    custom_branding_allowed: bool
    is_popular: bool


class InvoiceItemResponse(BaseModel):
    id: str
    invoice_number: str
    plan_name: str
    invoice_date: datetime
    billing_period_start: datetime
    billing_period_end: datetime
    taxable_amount_inr: float
    total_tax_inr: float
    total_amount_inr: float
    status: str
    buyer_studio_name: str
    seller_legal_name: str


@router.get("/plans", response_model=List[PlanItemResponse])
def list_subscription_plans(db: Session = Depends(get_db)):
    """Retrieve public subscription plan catalog."""
    subscription_service.seed_default_plans_if_missing(db)
    plans = db.query(SubscriptionPlanDef).filter(
        SubscriptionPlanDef.is_active == True
    ).order_by(SubscriptionPlanDef.display_order.asc()).all()

    return [
        PlanItemResponse(
            plan_key=p.plan_key,
            name=p.name,
            description=p.description,
            monthly_price_inr=float(p.monthly_price_inr),
            annual_price_inr=float(p.annual_price_inr),
            currency=p.currency,
            storage_limit_gb=p.storage_limit_gb,
            event_limit_monthly=p.event_limit_monthly,
            ai_face_limit_monthly=p.ai_face_limit_monthly,
            whatsapp_limit_monthly=p.whatsapp_limit_monthly,
            watermark_removal_allowed=p.watermark_removal_allowed,
            client_selection_portal_allowed=p.client_selection_portal_allowed,
            crm_pipeline_allowed=p.crm_pipeline_allowed,
            custom_branding_allowed=p.custom_branding_allowed,
            is_popular=p.is_popular,
        )
        for p in plans
    ]


@router.post("/create-order", response_model=CreateOrderResponse)
def create_checkout_order(
    req: CreateOrderRequest,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """
    Generate an authentic Gateway Order for the selected subscription plan.
    """
    try:
        order, gw_res = subscription_service.create_subscription_order(
            db=db,
            photographer=current_photographer,
            plan_key=req.plan_key,
            billing_cycle=req.billing_cycle,
            buyer_state=req.buyer_state
        )
        plan = subscription_service.get_plan(db, req.plan_key)

        return CreateOrderResponse(
            order_id=order.id,
            gateway_order_id=order.gateway_order_id or gw_res["gateway_order_id"],
            gateway_name=order.gateway_name,
            key_id=gw_res.get("key_id") or settings.RAZORPAY_KEY_ID,
            amount_inr=float(order.total_payable_inr),
            taxable_amount_inr=float(order.taxable_amount_inr),
            cgst_inr=float(order.cgst_inr),
            sgst_inr=float(order.sgst_inr),
            igst_inr=float(order.igst_inr),
            total_tax_inr=float(order.total_tax_inr),
            currency=order.currency,
            plan_key=plan.plan_key,
            plan_name=plan.name,
            billing_cycle=order.billing_cycle,
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/verify-payment", response_model=VerifyPaymentResponse)
def verify_payment_and_activate(
    req: VerifyPaymentRequest,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """
    Cryptographically verify payment signature and unlock studio features instantly.
    """
    try:
        result = subscription_service.verify_and_activate_subscription(
            db=db,
            photographer=current_photographer,
            gateway_order_id=req.gateway_order_id,
            gateway_payment_id=req.gateway_payment_id,
            gateway_signature=req.gateway_signature,
            payment_method=req.payment_method or "UPI",
            payment_method_details=req.payment_method_details
        )
        return VerifyPaymentResponse(**result)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Activation error: {str(e)}")


@router.post("/webhook")
async def handle_payment_gateway_webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_razorpay_signature: Optional[str] = Header(None)
):
    """
    Idempotent Webhook Callback endpoint from Payment Gateway.
    """
    raw_body = await request.body()
    sig = x_razorpay_signature or request.headers.get("x-signature") or "test_wh_sig"

    try:
        res = subscription_service.process_gateway_webhook(
            db=db,
            raw_body=raw_body,
            signature_header=sig
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/current")
def get_current_subscription(
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Get active photographer subscription status, validity, and entitlements."""
    plan = subscription_service.get_plan(db, current_photographer.subscription_plan or "SOLO_PRO")
    
    return {
        "studio_name": current_photographer.studio_name,
        "subscription_plan": current_photographer.subscription_plan,
        "plan_name": plan.name,
        "subscription_status": current_photographer.subscription_status,
        "subscription_valid_until": current_photographer.subscription_valid_until,
        "max_storage_gb": current_photographer.max_storage_gb,
        "max_events_per_month": current_photographer.max_events_per_month,
        "watermark_removal_allowed": plan.watermark_removal_allowed,
        "client_selection_portal_allowed": plan.client_selection_portal_allowed,
        "crm_pipeline_allowed": plan.crm_pipeline_allowed,
        "custom_branding_allowed": plan.custom_branding_allowed,
    }


@router.get("/invoices", response_model=List[InvoiceItemResponse])
def list_photographer_invoices(
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """List all official GST tax invoices for the studio."""
    invoices = db.query(SubscriptionInvoice).filter(
        SubscriptionInvoice.photographer_id == current_photographer.id
    ).order_by(SubscriptionInvoice.invoice_date.desc()).all()

    return [
        InvoiceItemResponse(
            id=inv.id,
            invoice_number=inv.invoice_number,
            plan_name=inv.plan_name,
            invoice_date=inv.invoice_date,
            billing_period_start=inv.billing_period_start,
            billing_period_end=inv.billing_period_end,
            taxable_amount_inr=float(inv.taxable_amount_inr),
            total_tax_inr=float(inv.total_tax_inr),
            total_amount_inr=float(inv.total_amount_inr),
            status=inv.status,
            buyer_studio_name=inv.buyer_studio_name,
            seller_legal_name=inv.seller_legal_name,
        )
        for inv in invoices
    ]


@router.get("/invoices/{invoice_id}/html", response_class=HTMLResponse)
def render_invoice_html(
    invoice_id: str,
    token: Optional[str] = Query(None),
    autoprint: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Render beautifully styled, official Indian GST Tax Invoice for printing / PDF saving.
    Protected against IDOR: Supports both Authorization header and ?token= query parameter.
    Only invoice owner or SuperAdmin can view.
    """
    auth_token = None
    if authorization and authorization.startswith("Bearer "):
        auth_token = authorization.split(" ")[1].strip()
    elif token:
        auth_token = token.strip()

    if not auth_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is required to view this invoice. Please log in to your account."
        )

    # Validate token
    user_id = None
    is_admin = False
    try:
        payload = jwt.decode(auth_token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        is_admin = payload.get("is_admin", False)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired security token.")

    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token identity.")

    # IDOR Protection: SuperAdmin can view any invoice, photographer can only view their own
    if is_admin:
        invoice = db.query(SubscriptionInvoice).filter(SubscriptionInvoice.id == invoice_id).first()
    else:
        invoice = db.query(SubscriptionInvoice).filter(
            SubscriptionInvoice.id == invoice_id,
            SubscriptionInvoice.photographer_id == user_id
        ).first()

    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tax Invoice not found or access denied.")

    tax_rows = ""
    if invoice.cgst_amount_inr > 0:
        tax_rows += f"""
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #E5E7EB;">CGST (9.0%)</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #E5E7EB; text-align: right;">₹{invoice.cgst_amount_inr:,.2f}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #E5E7EB;">SGST (9.0%)</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #E5E7EB; text-align: right;">₹{invoice.sgst_amount_inr:,.2f}</td>
        </tr>
        """
    else:
        tax_rows += f"""
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #E5E7EB;">IGST (18.0%)</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #E5E7EB; text-align: right;">₹{invoice.igst_amount_inr:,.2f}</td>
        </tr>
        """

    cfg = db.query(PlatformPaymentConfig).first()
    signatory_name = cfg.authorized_signatory_name if cfg and cfg.authorized_signatory_name else "Aryan Patel"
    signatory_designation = cfg.authorized_signatory_designation if cfg and cfg.authorized_signatory_designation else "Managing Director & Founder"
    stamp_url = cfg.digital_stamp_url if cfg and cfg.digital_stamp_url else None
    signature_url = cfg.digital_signature_url if cfg and cfg.digital_signature_url else None
    support_phone = cfg.seller_support_phone if cfg and cfg.seller_support_phone else "+91 98765 43210"
    support_email = cfg.seller_support_email if cfg and cfg.seller_support_email else settings.SELLER_SUPPORT_EMAIL

    stamp_html = f'<img src="{stamp_url}" alt="Official Seal" style="max-height: 80px; max-width: 80px; object-fit: contain;" />' if stamp_url else '<div style="width: 70px; height: 70px; border: 2px dashed #E86A5B; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 800; color: #E86A5B; text-align: center; text-transform: uppercase; transform: rotate(-8deg); padding: 4px;">GET MY MOMENT<br>★ SEAL ★</div>'
    signature_html = f'<img src="{signature_url}" alt="Authorized Signature" style="max-height: 50px; max-width: 120px; object-fit: contain;" />' if signature_url else f'<div style="font-family: cursive, Georgia, serif; font-size: 20px; color: #1E293B; font-weight: 700; font-style: italic;">{signatory_name}</div>'

    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Tax Invoice - {invoice.invoice_number} | Get My Moment</title>
      <style>
        @page {{
          size: A4 portrait;
          margin: 12mm 15mm;
        }}
        * {{
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }}
        body {{
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #1F2937;
          margin: 0;
          padding: 24px 16px;
          background: #F3F1EC;
        }}
        .no-print-bar {{
          max-width: 820px;
          margin: 0 auto 16px auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #1E293B;
          color: #FFFFFF;
          padding: 12px 20px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }}
        .no-print-bar button {{
          background: linear-gradient(135deg, #E86A5B, #D95748);
          color: #FFFFFF;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }}
        .invoice-card {{
          max-width: 820px;
          margin: 0 auto;
          background: #FFFFFF;
          border-radius: 16px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.06);
          padding: 40px 48px;
          border: 1px solid #E2DDD5;
        }}
        .header {{
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 24px;
          border-bottom: 2px solid #E86A5B;
          margin-bottom: 28px;
        }}
        .logo {{
          font-size: 24px;
          font-weight: 800;
          color: #E86A5B;
          letter-spacing: -0.5px;
        }}
        .badge {{
          background: #ECFDF5;
          color: #059669;
          padding: 4px 12px;
          border-radius: 9999px;
          font-weight: 700;
          font-size: 12px;
          border: 1px solid #A7F3D0;
          display: inline-block;
        }}
        .grid {{
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 28px;
          font-size: 13px;
          line-height: 1.6;
        }}
        .party-box {{
          background: #FAF9F7;
          padding: 16px 18px;
          border-radius: 12px;
          border: 1px solid #E8E5E2;
        }}
        table {{
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
          font-size: 13px;
        }}
        th {{
          background: #F3F4F6;
          text-align: left;
          padding: 10px 12px;
          font-weight: 700;
          color: #4B5563;
          border-bottom: 1px solid #D1D5DB;
        }}
        .total-box {{
          max-width: 340px;
          margin-left: auto;
          font-size: 14px;
        }}
        @media print {{
          body {{
            background: #FFFFFF !important;
            padding: 0 !important;
          }}
          .no-print, .no-print-bar {{
            display: none !important;
          }}
          .invoice-card {{
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            max-width: 100% !important;
          }}
        }}
      </style>
      <script>
        window.addEventListener('DOMContentLoaded', () => {{
          const params = new URLSearchParams(window.location.search);
          if (params.get('autoprint') === 'true') {{
            setTimeout(() => {{
              window.print();
            }}, 400);
          }}
        }});
      </script>
    </head>
    <body>
      <div class="no-print-bar">
        <div style="font-size: 13px; font-weight: 600;">
          📄 GST Tax Invoice — <span style="color: #94A3B8;">{invoice.invoice_number}</span>
        </div>
        <button onclick="window.print()">
          🖨️ Print / Save as PDF
        </button>
      </div>

      <div class="invoice-card">
        <div class="header">
          <div>
            <div class="logo">Get My Moment</div>
            <div style="font-size: 12px; color: #6B7280; margin-top: 4px;">SaaS Platform for Wedding & Event Photographers</div>
          </div>
          <div style="text-align: right;">
            <span class="badge">TAX INVOICE — {invoice.status}</span>
            <div style="font-size: 15px; font-weight: 800; margin-top: 8px; color: #111827;">{invoice.invoice_number}</div>
            <div style="font-size: 12px; color: #6B7280;">Date: {invoice.invoice_date.strftime('%d %B %Y')}</div>
          </div>
        </div>

        <div class="grid">
          <div class="party-box">
            <strong style="color: #E86A5B; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Billed By (Seller):</strong><br>
            <div style="font-weight: 700; font-size: 14px; color: #111827; margin-top: 4px;">{invoice.seller_legal_name}</div>
            <div style="color: #4B5563; margin-top: 2px;">{invoice.seller_address}</div>
            <div style="margin-top: 6px;"><strong>GSTIN:</strong> {invoice.seller_gstin}</div>
            <div><strong>PAN:</strong> {invoice.seller_pan}</div>
            <div><strong>State:</strong> {invoice.seller_state} (Code: {invoice.seller_state_code})</div>
          </div>
          <div class="party-box">
            <strong style="color: #E86A5B; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Billed To (Buyer):</strong><br>
            <div style="font-weight: 700; font-size: 14px; color: #111827; margin-top: 4px;">{invoice.buyer_studio_name}</div>
            <div style="color: #4B5563; margin-top: 2px;">{invoice.buyer_email} {f' | {invoice.buyer_phone}' if invoice.buyer_phone else ''}</div>
            <div style="color: #4B5563;">{invoice.buyer_city or 'Surat'}, {invoice.buyer_state}</div>
            <div style="margin-top: 6px;"><strong>GSTIN:</strong> {invoice.buyer_gstin or 'Unregistered / Consumer'}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description & SAC Code</th>
              <th>Billing Period</th>
              <th style="text-align: right;">Taxable Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 14px 12px; border-bottom: 1px solid #E5E7EB;">
                <strong>{invoice.plan_name} Plan Subscription</strong><br>
                <span style="font-size: 11px; color: #6B7280;">SAC Code: 998314 (IT Software & Cloud Services)</span>
              </td>
              <td style="padding: 14px 12px; border-bottom: 1px solid #E5E7EB; color: #4B5563;">
                {invoice.billing_period_start.strftime('%d/%m/%Y')} to {invoice.billing_period_end.strftime('%d/%m/%Y')}
              </td>
              <td style="padding: 14px 12px; border-bottom: 1px solid #E5E7EB; text-align: right; font-weight: 700;">
                ₹{invoice.taxable_amount_inr:,.2f}
              </td>
            </tr>
          </tbody>
        </table>

        <div class="total-box">
          <table style="margin-bottom: 0;">
            <tr>
              <td style="padding: 8px 12px; border-bottom: 1px solid #E5E7EB; color: #4B5563;">Taxable Amount</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #E5E7EB; text-align: right; font-weight: 600;">₹{invoice.taxable_amount_inr:,.2f}</td>
            </tr>
            {tax_rows}
            <tr style="font-size: 15px; font-weight: 800; background: #FDF2F1; color: #E86A5B;">
              <td style="padding: 12px; border-radius: 8px 0 0 8px;">Total Amount Paid</td>
              <td style="padding: 12px; text-align: right; border-radius: 0 8px 8px 0;">₹{invoice.total_amount_inr:,.2f}</td>
            </tr>
          </table>
        </div>

        <div style="margin-top: 36px; padding-top: 20px; border-top: 1px solid #E5E7EB; font-size: 11px; color: #6B7280; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            This is an official computer-generated GST tax invoice valid under Section 31 of CGST Act, 2017.<br>
            Support Email: <strong>{support_email}</strong> | Support Phone: <strong>{support_phone}</strong>
          </div>
          <div style="text-align: right; min-width: 220px;">
            <div style="font-weight: 700; color: #1F2937; margin-bottom: 6px;">For {invoice.seller_legal_name}</div>
            <div style="display: flex; justify-content: flex-end; align-items: center; gap: 14px; margin-bottom: 8px;">
              {stamp_html}
              {signature_html}
            </div>
            <div style="border-top: 1px dashed #9CA3AF; padding-top: 4px; color: #1F2937; font-weight: 700;">
              {signatory_name}
              <div style="font-size: 10px; color: #6B7280; font-weight: normal;">{signatory_designation}</div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html, status_code=200)


@router.get("/admin/invoices")
def get_superadmin_subscription_invoices(
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    SuperAdmin View: Retrieve all studio subscription tax invoices across the entire platform.
    """
    invoices = db.query(SubscriptionInvoice).order_by(SubscriptionInvoice.invoice_date.desc()).all()
    results = []
    for inv in invoices:
        results.append({
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "invoice_date": inv.invoice_date.isoformat(),
            "photographer_id": inv.photographer_id,
            "buyer_studio_name": inv.buyer_studio_name,
            "buyer_email": inv.buyer_email,
            "buyer_phone": inv.buyer_phone,
            "buyer_city": inv.buyer_city,
            "buyer_state": inv.buyer_state,
            "buyer_gstin": inv.buyer_gstin,
            "plan_name": inv.plan_name,
            "billing_period_start": inv.billing_period_start.isoformat(),
            "billing_period_end": inv.billing_period_end.isoformat(),
            "taxable_amount_inr": float(inv.taxable_amount_inr),
            "cgst_amount_inr": float(inv.cgst_amount_inr),
            "sgst_amount_inr": float(inv.sgst_amount_inr),
            "igst_amount_inr": float(inv.igst_amount_inr),
            "total_tax_inr": float(inv.total_tax_inr),
            "total_amount_inr": float(inv.total_amount_inr),
            "status": inv.status,
        })
    return results


@router.get("/admin/revenue")
def get_superadmin_subscription_revenue(
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    SuperAdmin Telemetry: Total MRR, Gross GMV, Gateway Deductions, Net Bank Settlements, and Transactions.
    """
    # 1. Total Paid Payments
    payments = db.query(SubscriptionPayment).filter(
        SubscriptionPayment.status == "CAPTURED"
    ).order_by(SubscriptionPayment.paid_at.desc()).all()

    total_gross_gmv = sum(float(p.amount_inr) for p in payments)
    total_gateway_fees = sum(float(p.estimated_gateway_fee_inr + p.estimated_gateway_tax_inr) for p in payments)
    total_net_bank_settled = sum(float(p.estimated_net_settlement_inr) for p in payments)

    # 2. Active Paid Subscribers Count
    now = datetime.utcnow()
    active_paid_studios = db.query(Photographer).filter(
        Photographer.subscription_status == "ACTIVE",
        Photographer.subscription_plan != "FREE_TRIAL",
        Photographer.subscription_valid_until > now
    ).count()

    # Calculate Monthly Recurring Revenue (MRR)
    active_photographers = db.query(Photographer).filter(
        Photographer.subscription_status == "ACTIVE",
        Photographer.subscription_valid_until > now
    ).all()

    plan_prices = {
        "SOLO_PRO": 599.0,
        "STUDIO_PRO": 1999.0,
        "STUDIO_OS": 4999.0,
        "ENTERPRISE_VIP": 9999.0,
        "FREE_TRIAL": 0.0
    }
    mrr = sum(plan_prices.get(p.subscription_plan, 0.0) for p in active_photographers)

    # Recent Transactions List
    tx_list = []
    for p in payments[:20]:
        order = p.order
        photographer = p.photographer
        tx_list.append({
            "payment_id": p.id,
            "gateway_payment_id": p.gateway_payment_id,
            "studio_name": photographer.studio_name if photographer else "Studio",
            "photographer_email": photographer.email if photographer else "email",
            "plan_key": order.plan_key if order else "N/A",
            "billing_cycle": order.billing_cycle if order else "MONTHLY",
            "amount_inr": float(p.amount_inr),
            "gateway_fee_inr": float(p.estimated_gateway_fee_inr + p.estimated_gateway_tax_inr),
            "net_bank_settlement_inr": float(p.estimated_net_settlement_inr),
            "payment_method": p.payment_method,
            "paid_at": p.paid_at.isoformat(),
            "status": p.status
        })

    return {
        "mrr_inr": mrr,
        "arr_inr": mrr * 12,
        "total_gross_gmv_inr": total_gross_gmv,
        "total_gateway_fees_inr": total_gateway_fees,
        "total_net_bank_settled_inr": total_net_bank_settled,
        "active_paid_studios_count": active_paid_studios,
        "total_transactions_count": len(payments),
        "recent_transactions": tx_list,
        "payment_gateway": settings.PAYMENT_GATEWAY,
        "payment_mode": settings.PAYMENT_MODE,
    }
