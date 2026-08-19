"""
Business OS - CRM, Leads & Quotations Router
"""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from apps.api.database import get_db
from apps.api.models import Photographer, Lead, Quotation, Event, Ceremony, PaymentMilestone
from apps.api.auth import get_current_photographer
from packages.shared.constants import EventStatus

router = APIRouter(prefix="/crm", tags=["CRM & Leads Pipeline"])


class LeadCreateRequest(BaseModel):
    client_name: str
    client_phone: str
    client_email: Optional[str] = None
    event_type: str = "Wedding"
    event_date: Optional[datetime] = None
    venue_city: Optional[str] = None
    estimated_budget_inr: float = 0.0
    stage: str = "NEW_LEAD"
    notes: Optional[str] = None


class LeadUpdateRequest(BaseModel):
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    client_email: Optional[str] = None
    event_type: Optional[str] = None
    event_date: Optional[datetime] = None
    venue_city: Optional[str] = None
    estimated_budget_inr: Optional[float] = None
    stage: Optional[str] = None
    notes: Optional[str] = None


class QuotationCreateRequest(BaseModel):
    package_name: str
    deliverables: List[str] = []
    price_inr: float
    tax_pct: float = 0.0
    status: str = "SENT"
    valid_until: Optional[datetime] = None


class QuotationResponse(BaseModel):
    id: str
    lead_id: str
    package_name: str
    deliverables: List[str]
    price_inr: float
    tax_pct: float
    total_amount_inr: float
    status: str
    valid_until: Optional[datetime]
    created_at: datetime


class LeadResponse(BaseModel):
    id: str
    photographer_id: str
    client_name: str
    client_phone: str
    client_email: Optional[str]
    event_type: str
    event_date: Optional[datetime]
    venue_city: Optional[str]
    estimated_budget_inr: float
    stage: str
    notes: Optional[str]
    converted_event_id: Optional[str]
    quotations_count: int = 0
    created_at: datetime
    updated_at: datetime


@router.get("/leads", response_model=List[LeadResponse])
def list_leads(
    stage: Optional[str] = None,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """List and filter leads by pipeline stage."""
    query = db.query(Lead).filter(Lead.photographer_id == current_photographer.id)
    if stage:
        query = query.filter(Lead.stage == stage)
    leads = query.order_by(Lead.created_at.desc()).all()

    results = []
    for l in leads:
        q_count = len(l.quotations)
        results.append(
            LeadResponse(
                id=l.id,
                photographer_id=l.photographer_id,
                client_name=l.client_name,
                client_phone=l.client_phone,
                client_email=l.client_email,
                event_type=l.event_type,
                event_date=l.event_date,
                venue_city=l.venue_city,
                estimated_budget_inr=l.estimated_budget_inr,
                stage=l.stage,
                notes=l.notes,
                converted_event_id=l.converted_event_id,
                quotations_count=q_count,
                created_at=l.created_at,
                updated_at=l.updated_at,
            )
        )
    return results


@router.post("/leads", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
def create_lead(
    data: LeadCreateRequest,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Create a new inquiry / lead."""
    lead = Lead(
        photographer_id=current_photographer.id,
        client_name=data.client_name.strip(),
        client_phone=data.client_phone.strip(),
        client_email=data.client_email.strip() if data.client_email else None,
        event_type=data.event_type,
        event_date=data.event_date,
        venue_city=data.venue_city,
        estimated_budget_inr=data.estimated_budget_inr,
        stage=data.stage,
        notes=data.notes,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)

    return LeadResponse(
        id=lead.id,
        photographer_id=lead.photographer_id,
        client_name=lead.client_name,
        client_phone=lead.client_phone,
        client_email=lead.client_email,
        event_type=lead.event_type,
        event_date=lead.event_date,
        venue_city=lead.venue_city,
        estimated_budget_inr=lead.estimated_budget_inr,
        stage=lead.stage,
        notes=lead.notes,
        converted_event_id=lead.converted_event_id,
        quotations_count=0,
        created_at=lead.created_at,
        updated_at=lead.updated_at,
    )


@router.get("/leads/{lead_id}", response_model=LeadResponse)
def get_lead(
    lead_id: str,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Retrieve single lead by ID."""
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.photographer_id == current_photographer.id).first()
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found.")

    return LeadResponse(
        id=lead.id,
        photographer_id=lead.photographer_id,
        client_name=lead.client_name,
        client_phone=lead.client_phone,
        client_email=lead.client_email,
        event_type=lead.event_type,
        event_date=lead.event_date,
        venue_city=lead.venue_city,
        estimated_budget_inr=lead.estimated_budget_inr,
        stage=lead.stage,
        notes=lead.notes,
        converted_event_id=lead.converted_event_id,
        quotations_count=len(lead.quotations),
        created_at=lead.created_at,
        updated_at=lead.updated_at,
    )


@router.patch("/leads/{lead_id}", response_model=LeadResponse)
def update_lead(
    lead_id: str,
    data: LeadUpdateRequest,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Update lead stage or details."""
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.photographer_id == current_photographer.id).first()
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found.")

    update_dict = data.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(lead, field, val)

    db.add(lead)
    db.commit()
    db.refresh(lead)

    return LeadResponse(
        id=lead.id,
        photographer_id=lead.photographer_id,
        client_name=lead.client_name,
        client_phone=lead.client_phone,
        client_email=lead.client_email,
        event_type=lead.event_type,
        event_date=lead.event_date,
        venue_city=lead.venue_city,
        estimated_budget_inr=lead.estimated_budget_inr,
        stage=lead.stage,
        notes=lead.notes,
        converted_event_id=lead.converted_event_id,
        quotations_count=len(lead.quotations),
        created_at=lead.created_at,
        updated_at=lead.updated_at,
    )


@router.post("/leads/{lead_id}/convert-to-event")
def convert_lead_to_event(
    lead_id: str,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """1-Click convert a booked lead into a live Event Workspace with ceremonies and payment schedule."""
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.photographer_id == current_photographer.id).first()
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found.")

    if lead.converted_event_id:
        # Already converted
        existing_event = db.query(Event).filter(Event.id == lead.converted_event_id).first()
        if existing_event:
            return {"event_id": existing_event.id, "message": "Lead was already converted to an event."}

    # Generate slug from client name & date
    import re
    base_slug = re.sub(r'[^a-zA-Z0-9]+', '-', lead.client_name.lower()).strip('-')
    slug = f"{base_slug}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

    event_name = f"{lead.client_name} - {lead.event_type}"
    event = Event(
        photographer_id=current_photographer.id,
        name=event_name,
        slug=slug,
        event_date=lead.event_date or datetime.utcnow(),
        status=EventStatus.ACTIVE.value,
        package_amount_inr=lead.estimated_budget_inr,
        client_name=lead.client_name,
        client_phone=lead.client_phone,
        client_email=lead.client_email,
        city=lead.venue_city,
        allow_downloads=True,
        allow_guest_uploads=True,
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    # Automatically initialize standard wedding ceremonies if wedding
    if "wedding" in lead.event_type.lower():
        ceremonies = ["Mehendi & Sangeet", "Haldi Ceremony", "Wedding / Mandap", "Grand Reception"]
        for idx, c_name in enumerate(ceremonies):
            ceremony = Ceremony(
                event_id=event.id,
                name=c_name,
                ceremony_date=lead.event_date,
                order_index=idx,
            )
            db.add(ceremony)

    # Initialize standard Indian payment milestones (30% Advance, 50% Event Day, 20% Album Delivery)
    budget = lead.estimated_budget_inr
    if budget > 0:
        p1 = PaymentMilestone(
            event_id=event.id,
            photographer_id=current_photographer.id,
            title="Booking Advance (30%)",
            amount_inr=round(budget * 0.30, 2),
            status="RECEIVED" if lead.stage == "BOOKED" else "PENDING",
            received_at=datetime.utcnow() if lead.stage == "BOOKED" else None,
            payment_mode="UPI" if lead.stage == "BOOKED" else None,
        )
        p2 = PaymentMilestone(
            event_id=event.id,
            photographer_id=current_photographer.id,
            title="Function Day Stage Payment (50%)",
            amount_inr=round(budget * 0.50, 2),
            due_date=lead.event_date,
            status="PENDING",
        )
        p3 = PaymentMilestone(
            event_id=event.id,
            photographer_id=current_photographer.id,
            title="Final Album & Video Delivery Balance (20%)",
            amount_inr=round(budget * 0.20, 2),
            status="PENDING",
        )
        db.add_all([p1, p2, p3])

    # Mark lead as BOOKED and link converted event
    lead.stage = "BOOKED"
    lead.converted_event_id = event.id
    db.add(lead)
    db.commit()

    return {
        "event_id": event.id,
        "event_name": event.name,
        "access_token": event.access_token,
        "message": "Lead successfully converted to live Event Command Center.",
    }


@router.get("/leads/{lead_id}/quotations", response_model=List[QuotationResponse])
def list_lead_quotations(
    lead_id: str,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """List quotations created for a lead."""
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.photographer_id == current_photographer.id).first()
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found.")

    quotes = db.query(Quotation).filter(Quotation.lead_id == lead_id).order_by(Quotation.created_at.desc()).all()
    return [
        QuotationResponse(
            id=q.id,
            lead_id=q.lead_id,
            package_name=q.package_name,
            deliverables=q.deliverables or [],
            price_inr=q.price_inr,
            tax_pct=q.tax_pct,
            total_amount_inr=q.total_amount_inr,
            status=q.status,
            valid_until=q.valid_until,
            created_at=q.created_at,
        )
        for q in quotes
    ]


@router.post("/leads/{lead_id}/quotations", response_model=QuotationResponse, status_code=status.HTTP_201_CREATED)
def create_lead_quotation(
    lead_id: str,
    data: QuotationCreateRequest,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Create a package quotation for a lead."""
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.photographer_id == current_photographer.id).first()
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found.")

    tax_amount = (data.price_inr * data.tax_pct) / 100.0
    total_amount = data.price_inr + tax_amount

    import time
    q_num = f"QT-{datetime.utcnow().strftime('%Y%m%d')}-{int(time.time()) % 10000:04d}"

    quotation = Quotation(
        photographer_id=current_photographer.id,
        lead_id=lead.id,
        quotation_number=q_num,
        client_name=lead.client_name,
        client_phone=lead.client_phone,
        client_email=lead.client_email,
        package_name=data.package_name,
        deliverables=data.deliverables,
        price_inr=data.price_inr,
        tax_pct=data.tax_pct,
        total_amount_inr=total_amount,
        status=data.status,
        valid_until=data.valid_until,
    )
    db.add(quotation)

    # If lead budget was 0, update it with quotation price
    if lead.estimated_budget_inr == 0:
        lead.estimated_budget_inr = total_amount
    lead.stage = "QUOTE_SENT"
    db.add(lead)
    db.commit()
    db.refresh(quotation)

    return QuotationResponse(
        id=quotation.id,
        lead_id=quotation.lead_id,
        package_name=quotation.package_name,
        deliverables=quotation.deliverables or [],
        price_inr=quotation.price_inr,
        tax_pct=quotation.tax_pct,
        total_amount_inr=quotation.total_amount_inr,
        status=quotation.status,
        valid_until=quotation.valid_until,
        created_at=quotation.created_at,
    )
