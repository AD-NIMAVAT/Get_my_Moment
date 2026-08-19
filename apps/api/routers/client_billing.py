"""
Client Invoicing, Tax Profiles, Quotations, Payments & Accounting API Router
Flow A: Photographer -> Client Billing
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Header, Query, Response
from fastapi.responses import HTMLResponse, PlainTextResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from jose import jwt, JWTError

from apps.api.database import get_db
from apps.api.models.photographer import Photographer
from apps.api.models.finance import (
    ClientInvoice,
    ClientInvoiceItem,
    ClientPaymentRecord,
    InvoicePaymentMilestone,
)
from apps.api.models.crm import Quotation, QuotationItem
from apps.api.auth import get_current_photographer, ALGORITHM
from apps.api.config import settings
from apps.api.services.tax_engine import tax_engine
from apps.api.services.client_invoice_service import client_invoice_service

router = APIRouter(prefix="/billing", tags=["Photographer Client Billing & Invoices"])


# -------------------------------------------------------------
# PYDANTIC SCHEMAS
# -------------------------------------------------------------
class TaxProfileUpdate(BaseModel):
    gst_status: str = Field("UNREGISTERED", description="UNREGISTERED, REGISTERED, COMPOSITION")
    gst_legal_name: Optional[str] = None
    gstin: Optional[str] = None
    gst_state: Optional[str] = None
    gst_state_code: Optional[str] = None
    gst_pincode: Optional[str] = None
    gst_address: Optional[str] = None
    default_tax_mode: str = Field("WITHOUT_GST", description="WITH_GST, WITHOUT_GST")
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_account_type: Optional[str] = "CURRENT"
    upi_id: Optional[str] = None
    digital_stamp_url: Optional[str] = None


class InvoiceItemInput(BaseModel):
    service_type: str = Field("PHOTOGRAPHY", description="PHOTOGRAPHY, VIDEOGRAPHY, ALBUM_PRINTING, etc.")
    description: str
    quantity: float = 1.0
    unit_price_inr: float
    discount_type: str = "FIXED"
    discount_value: float = 0.0


class MilestoneInput(BaseModel):
    title: str
    percentage: float = 0.0
    amount_inr: float = 0.0
    due_date: Optional[datetime] = None


class CreateInvoiceRequest(BaseModel):
    event_id: Optional[str] = None
    quotation_id: Optional[str] = None
    tax_mode: str = Field("WITHOUT_GST", description="WITH_GST, WITHOUT_GST")
    gst_rate_pct: float = 18.0
    invoice_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    finalize: bool = True
    client_name: str
    client_phone: Optional[str] = None
    client_email: Optional[str] = None
    client_address: Optional[str] = None
    client_city: Optional[str] = None
    client_state: Optional[str] = None
    client_state_code: Optional[str] = None
    client_pincode: Optional[str] = None
    client_gstin: Optional[str] = None
    event_name: Optional[str] = None
    event_date: Optional[datetime] = None
    event_venue: Optional[str] = None
    discount_inr: float = 0.0
    notes: Optional[str] = None
    terms_conditions: Optional[str] = None
    items: List[InvoiceItemInput]
    milestones: Optional[List[MilestoneInput]] = []
    advance_paid_inr: float = 0.0
    advance_payment_mode: str = "UPI"
    advance_reference_no: Optional[str] = None


class RecordPaymentRequest(BaseModel):
    amount_inr: float
    payment_mode: str = "UPI"
    reference_no: Optional[str] = None
    milestone_id: Optional[str] = None
    notes: Optional[str] = None


class CreateQuotationRequest(BaseModel):
    lead_id: Optional[str] = None
    package_name: str = "Wedding Photography Package"
    client_name: str
    client_phone: Optional[str] = None
    client_email: Optional[str] = None
    event_type: str = "Wedding"
    event_date: Optional[datetime] = None
    venue_city: Optional[str] = None
    tax_mode: str = "WITHOUT_GST"
    tax_pct: float = 18.0
    discount_inr: float = 0.0
    valid_until: Optional[datetime] = None
    notes: Optional[str] = None
    terms_conditions: Optional[str] = None
    deliverables: Optional[List[str]] = []
    items: List[InvoiceItemInput]


# -------------------------------------------------------------
# 1. TAX & STUDIO BANKING PROFILE
# -------------------------------------------------------------
@router.get("/tax-profile")
def get_photographer_tax_profile(
    current_photographer: Photographer = Depends(get_current_photographer),
):
    """Retrieve the photographer's business, GST and settlement bank profile."""
    # Mask bank account number for UI safety if present
    acc_no = current_photographer.bank_account_number or ""
    masked_acc = f"XXXXXX{acc_no[-4:]}" if len(acc_no) >= 4 else acc_no

    return {
        "gst_status": current_photographer.gst_status,
        "gst_legal_name": current_photographer.gst_legal_name or current_photographer.studio_name,
        "gstin": current_photographer.gstin or current_photographer.gst_number,
        "gst_state": current_photographer.gst_state or current_photographer.state,
        "gst_state_code": current_photographer.gst_state_code,
        "gst_pincode": current_photographer.gst_pincode,
        "gst_address": current_photographer.gst_address,
        "default_tax_mode": current_photographer.default_tax_mode,
        "bank_name": current_photographer.bank_name,
        "bank_account_number": current_photographer.bank_account_number,
        "bank_account_number_masked": masked_acc,
        "bank_ifsc": current_photographer.bank_ifsc,
        "bank_account_type": current_photographer.bank_account_type,
        "upi_id": current_photographer.upi_id,
        "digital_stamp_url": current_photographer.digital_stamp_url,
        "studio_name": current_photographer.studio_name,
        "phone": current_photographer.phone,
        "city": current_photographer.city,
    }


@router.put("/tax-profile")
def update_photographer_tax_profile(
    data: TaxProfileUpdate,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db),
):
    """Update GST and banking details with server-side validation."""
    clean_status = (data.gst_status or "UNREGISTERED").strip().upper()
    if clean_status not in ["UNREGISTERED", "REGISTERED", "COMPOSITION"]:
        clean_status = "UNREGISTERED"

    clean_gstin = (data.gstin or "").strip().upper()
    if clean_status == "REGISTERED" and clean_gstin:
        if not tax_engine.validate_gstin(clean_gstin):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Indian GSTIN format. Expected 15-character format (e.g. 24AAACG1234F1Z5)."
            )

    current_photographer.gst_status = clean_status
    current_photographer.gst_legal_name = data.gst_legal_name or current_photographer.studio_name
    current_photographer.gstin = clean_gstin if clean_status == "REGISTERED" else None
    current_photographer.gst_number = current_photographer.gstin
    current_photographer.gst_state = data.gst_state
    current_photographer.gst_state_code = data.gst_state_code
    current_photographer.gst_pincode = data.gst_pincode
    current_photographer.gst_address = data.gst_address
    current_photographer.default_tax_mode = "WITH_GST" if data.default_tax_mode == "WITH_GST" and clean_status == "REGISTERED" else "WITHOUT_GST"

    if data.bank_name is not None:
        current_photographer.bank_name = data.bank_name
    if data.bank_account_number is not None:
        current_photographer.bank_account_number = data.bank_account_number
    if data.bank_ifsc is not None:
        current_photographer.bank_ifsc = (data.bank_ifsc or "").strip().upper()
    if data.bank_account_type is not None:
        current_photographer.bank_account_type = data.bank_account_type
    if data.upi_id is not None:
        current_photographer.upi_id = (data.upi_id or "").strip()
    if data.digital_stamp_url is not None:
        current_photographer.digital_stamp_url = data.digital_stamp_url

    db.commit()
    db.refresh(current_photographer)
    return {"message": "Tax & settlement profile updated successfully.", "gst_status": current_photographer.gst_status}


# -------------------------------------------------------------
# 2. CLIENT INVOICES
# -------------------------------------------------------------
@router.get("/invoices")
def list_client_invoices(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db),
):
    """List all client invoices for the authenticated studio."""
    query = db.query(ClientInvoice).filter(ClientInvoice.photographer_id == current_photographer.id)
    if status_filter:
        query = query.filter(ClientInvoice.status == status_filter.upper())

    invoices = query.order_by(ClientInvoice.created_at.desc()).all()

    return [
        {
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "document_type": inv.document_type,
            "client_name": inv.client_name,
            "client_phone": inv.client_phone,
            "event_name": inv.event_name,
            "invoice_date": inv.invoice_date,
            "due_date": inv.due_date,
            "tax_mode": inv.tax_mode,
            "subtotal_inr": inv.subtotal_inr,
            "discount_inr": inv.discount_inr,
            "taxable_amount_inr": inv.taxable_amount_inr,
            "total_tax_inr": inv.total_tax_inr,
            "grand_total_inr": inv.grand_total_inr,
            "amount_paid_inr": inv.amount_paid_inr,
            "balance_due_inr": inv.balance_due_inr,
            "status": inv.status,
            "secure_share_token": inv.secure_share_token,
            "created_at": inv.created_at,
        }
        for inv in invoices
    ]


@router.post("/invoices", status_code=status.HTTP_201_CREATED)
def create_client_invoice(
    data: CreateInvoiceRequest,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db),
):
    """Create a new client invoice with server-side tax validation and optional advance payment."""
    invoice = client_invoice_service.create_invoice(
        db=db,
        photographer=current_photographer,
        data=data.dict()
    )
    return {
        "message": f"Invoice {invoice.invoice_number} created successfully.",
        "invoice_id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "grand_total_inr": invoice.grand_total_inr,
        "amount_paid_inr": invoice.amount_paid_inr,
        "balance_due_inr": invoice.balance_due_inr,
        "status": invoice.status,
        "secure_share_token": invoice.secure_share_token,
    }


@router.get("/invoices/{invoice_id}")
def get_client_invoice_details(
    invoice_id: str,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db),
):
    """Get full details of a specific Client Invoice (IDOR protected)."""
    invoice = db.query(ClientInvoice).filter(
        ClientInvoice.id == invoice_id,
        ClientInvoice.photographer_id == current_photographer.id
    ).first()

    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found or access denied.")

    wa_payload = client_invoice_service.generate_whatsapp_share_payload(invoice, current_photographer)

    return {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "document_type": invoice.document_type,
        "tax_mode": invoice.tax_mode,
        "gst_applied": invoice.gst_applied,
        "gst_rate_pct": invoice.gst_rate_pct,
        "invoice_date": invoice.invoice_date,
        "due_date": invoice.due_date,
        "status": invoice.status,
        "currency": invoice.currency,
        "client_name": invoice.client_name,
        "client_phone": invoice.client_phone,
        "client_email": invoice.client_email,
        "client_address": invoice.client_address,
        "client_city": invoice.client_city,
        "client_state": invoice.client_state,
        "client_gstin": invoice.client_gstin,
        "event_name": invoice.event_name,
        "event_date": invoice.event_date,
        "event_venue": invoice.event_venue,
        "subtotal_inr": invoice.subtotal_inr,
        "discount_inr": invoice.discount_inr,
        "taxable_amount_inr": invoice.taxable_amount_inr,
        "cgst_amount_inr": invoice.cgst_amount_inr,
        "sgst_amount_inr": invoice.sgst_amount_inr,
        "igst_amount_inr": invoice.igst_amount_inr,
        "total_tax_inr": invoice.total_tax_inr,
        "grand_total_inr": invoice.grand_total_inr,
        "amount_paid_inr": invoice.amount_paid_inr,
        "balance_due_inr": invoice.balance_due_inr,
        "seller_legal_name_snapshot": invoice.seller_legal_name_snapshot,
        "seller_gstin_snapshot": invoice.seller_gstin_snapshot,
        "seller_upi_id_snapshot": invoice.seller_upi_id_snapshot,
        "notes": invoice.notes,
        "terms_conditions": invoice.terms_conditions,
        "secure_share_token": invoice.secure_share_token,
        "whatsapp_share": wa_payload,
        "items": [
            {
                "id": it.id,
                "service_type": it.service_type,
                "description": it.description,
                "quantity": it.quantity,
                "unit_price_inr": it.unit_price_inr,
                "discount_amount_inr": it.discount_amount_inr,
                "line_total_inr": it.line_total_inr,
            }
            for it in invoice.items
        ],
        "payments": [
            {
                "id": p.id,
                "receipt_number": p.receipt_number,
                "amount_inr": p.amount_inr,
                "payment_mode": p.payment_mode,
                "payment_status": p.payment_status,
                "reference_no": p.reference_no,
                "payment_date": p.payment_date,
                "notes": p.notes,
            }
            for p in invoice.payments
        ],
        "milestones": [
            {
                "id": m.id,
                "title": m.title,
                "percentage": m.percentage,
                "amount_inr": m.amount_inr,
                "due_date": m.due_date,
                "status": m.status,
                "paid_at": m.paid_at,
            }
            for m in invoice.milestones
        ],
    }


@router.post("/invoices/{invoice_id}/record-payment")
def record_invoice_payment(
    invoice_id: str,
    data: RecordPaymentRequest,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db),
):
    """Record advance / milestone payment against an invoice."""
    payment = client_invoice_service.record_client_payment(
        db=db,
        photographer=current_photographer,
        invoice_id=invoice_id,
        amount=data.amount_inr,
        payment_mode=data.payment_mode,
        reference_no=data.reference_no,
        milestone_id=data.milestone_id,
        notes=data.notes,
    )
    return {
        "message": f"Payment of ₹{payment.amount_inr:,.2f} recorded successfully.",
        "receipt_number": payment.receipt_number,
        "amount_inr": payment.amount_inr,
        "payment_date": payment.payment_date,
    }


@router.post("/invoices/{invoice_id}/cancel")
def cancel_client_invoice(
    invoice_id: str,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db),
):
    """Void / Cancel a client invoice."""
    invoice = db.query(ClientInvoice).filter(
        ClientInvoice.id == invoice_id,
        ClientInvoice.photographer_id == current_photographer.id
    ).first()

    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found.")

    invoice.status = "CANCELLED"
    db.commit()
    return {"message": f"Invoice {invoice.invoice_number} has been cancelled."}


@router.get("/invoices/{invoice_id}/html", response_class=HTMLResponse)
def render_invoice_printable_html(
    invoice_id: str,
    token: Optional[str] = Query(None),
    autoprint: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """
    Render A4 printable HTML for client invoice.
    Supports Authorization header or query token for browser print.
    """
    auth_token = None
    if authorization and authorization.startswith("Bearer "):
        auth_token = authorization.split(" ")[1].strip()
    elif token:
        auth_token = token.strip()

    if not auth_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication token required.")

    user_id = None
    try:
        payload = jwt.decode(auth_token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token.")

    invoice = db.query(ClientInvoice).filter(
        ClientInvoice.id == invoice_id,
        ClientInvoice.photographer_id == user_id
    ).first()

    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found or access denied.")

    photographer = db.query(Photographer).filter(Photographer.id == user_id).first()
    html = client_invoice_service.render_invoice_html(invoice, photographer)
    return HTMLResponse(content=html, status_code=200)


# -------------------------------------------------------------
# 3. PUBLIC UNGUESSABLE SHARE TOKEN (FOR CLIENT VIEWING & WHATSAPP)
# -------------------------------------------------------------
@router.get("/share/{secure_token}")
def get_public_shared_invoice(
    secure_token: str,
    db: Session = Depends(get_db),
):
    """Public secure endpoint for photography clients to view their invoice via unguessable share token."""
    invoice = db.query(ClientInvoice).filter(
        ClientInvoice.secure_share_token == secure_token
    ).first()

    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found or link expired.")

    photographer = db.query(Photographer).filter(Photographer.id == invoice.photographer_id).first()
    seller_name = invoice.seller_legal_name_snapshot or photographer.studio_name
    seller_upi = invoice.seller_upi_id_snapshot or photographer.upi_id

    return {
        "invoice_number": invoice.invoice_number,
        "document_type": invoice.document_type,
        "invoice_date": invoice.invoice_date,
        "due_date": invoice.due_date,
        "status": invoice.status,
        "studio_name": seller_name,
        "studio_phone": photographer.phone if photographer else None,
        "studio_upi_id": seller_upi,
        "studio_logo_url": photographer.logo_url if photographer else None,
        "signature_url": photographer.signature_url if photographer else None,
        "digital_stamp_url": photographer.digital_stamp_url if photographer else None,
        "client_name": invoice.client_name,
        "event_name": invoice.event_name,
        "grand_total_inr": invoice.grand_total_inr,
        "amount_paid_inr": invoice.amount_paid_inr,
        "balance_due_inr": invoice.balance_due_inr,
        "items": [
            {
                "description": it.description,
                "quantity": it.quantity,
                "line_total_inr": it.line_total_inr,
            }
            for it in invoice.items
        ],
    }


@router.get("/share/{secure_token}/html", response_class=HTMLResponse)
def get_public_shared_invoice_html(
    secure_token: str,
    db: Session = Depends(get_db),
):
    """Public secure endpoint for client to print / view A4 HTML invoice."""
    invoice = db.query(ClientInvoice).filter(
        ClientInvoice.secure_share_token == secure_token
    ).first()

    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found.")

    photographer = db.query(Photographer).filter(Photographer.id == invoice.photographer_id).first()
    html = client_invoice_service.render_invoice_html(invoice, photographer)
    return HTMLResponse(content=html, status_code=200)


# -------------------------------------------------------------
# 4. QUOTATIONS & ESTIMATES
# -------------------------------------------------------------
@router.get("/quotations")
def list_quotations(
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db),
):
    """List all quotations / estimates created by the studio."""
    quotations = db.query(Quotation).filter(
        Quotation.photographer_id == current_photographer.id
    ).order_by(Quotation.created_at.desc()).all()

    return [
        {
            "id": q.id,
            "quotation_number": q.quotation_number,
            "package_name": q.package_name,
            "client_name": q.client_name,
            "client_phone": q.client_phone,
            "event_type": q.event_type,
            "event_date": q.event_date,
            "venue_city": q.venue_city,
            "subtotal_inr": q.subtotal_inr,
            "discount_inr": q.discount_inr,
            "total_amount_inr": q.total_amount_inr,
            "status": q.status,
            "converted_invoice_id": q.converted_invoice_id,
            "valid_until": q.valid_until,
            "created_at": q.created_at,
        }
        for q in quotations
    ]


@router.post("/quotations", status_code=status.HTTP_201_CREATED)
def create_quotation(
    data: CreateQuotationRequest,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db),
):
    """Create a new Quotation / Estimate."""
    quotation = client_invoice_service.create_quotation(
        db=db,
        photographer=current_photographer,
        data=data.dict()
    )
    return {
        "message": f"Quotation {quotation.quotation_number} created successfully.",
        "quotation_id": quotation.id,
        "quotation_number": quotation.quotation_number,
        "total_amount_inr": quotation.total_amount_inr,
    }


@router.post("/quotations/{quotation_id}/convert-to-invoice")
def convert_quotation_to_invoice(
    quotation_id: str,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db),
):
    """1-Click Conversion of Quotation into a Client Invoice."""
    invoice = client_invoice_service.convert_quotation_to_invoice(
        db=db,
        photographer=current_photographer,
        quotation_id=quotation_id
    )
    return {
        "message": f"Quotation converted to Invoice {invoice.invoice_number} successfully.",
        "invoice_id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "grand_total_inr": invoice.grand_total_inr,
        "status": invoice.status,
    }


# -------------------------------------------------------------
# 5. GSTR-1 & ACCOUNTING CSV EXPORT
# -------------------------------------------------------------
@router.get("/exports/gstr1")
def export_gstr1_csv(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db),
):
    """Export studio sales data into GSTR-1 compliant CSV format for CA / Tax filing."""
    s_dt = datetime.fromisoformat(start_date) if start_date else None
    e_dt = datetime.fromisoformat(end_date) if end_date else None

    csv_data = client_invoice_service.export_invoices_csv(
        db=db,
        photographer_id=current_photographer.id,
        start_date=s_dt,
        end_date=e_dt
    )

    filename = f"GSTR1_{current_photographer.studio_name.replace(' ', '_')}_{datetime.utcnow().strftime('%Y%m%d')}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


# -------------------------------------------------------------
# 6. FINANCE STATS SUMMARY
# -------------------------------------------------------------
@router.get("/stats")
def get_finance_overview_stats(
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db),
):
    """Get high-level financial KPIs for the photographer finance dashboard."""
    invoices = db.query(ClientInvoice).filter(
        ClientInvoice.photographer_id == current_photographer.id,
        ClientInvoice.status != "CANCELLED"
    ).all()

    total_billed = sum(inv.grand_total_inr for inv in invoices)
    total_collected = sum(inv.amount_paid_inr for inv in invoices)
    total_balance_due = sum(inv.balance_due_inr for inv in invoices)
    active_invoices = len(invoices)

    active_quotations = db.query(Quotation).filter(
        Quotation.photographer_id == current_photographer.id,
        Quotation.status.in_(["DRAFT", "SENT", "VIEWED"])
    ).count()

    return {
        "total_billed_inr": round(total_billed, 2),
        "total_collected_inr": round(total_collected, 2),
        "total_balance_due_inr": round(total_balance_due, 2),
        "active_invoices_count": active_invoices,
        "active_quotations_count": active_quotations,
        "gst_status": current_photographer.gst_status,
        "default_tax_mode": current_photographer.default_tax_mode,
    }
