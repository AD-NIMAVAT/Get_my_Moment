"""
Business OS - Finance, Invoicing & Event Profitability Router
"""

from typing import List, Optional, Dict
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from apps.api.database import get_db
from apps.api.models import Photographer, Event, PaymentMilestone, EventExpense, CrewMember
from apps.api.auth import get_current_photographer

router = APIRouter(prefix="/events/{event_id}/finance", tags=["Event Finance & Profitability"])


class PaymentMilestoneCreate(BaseModel):
    title: str
    amount_inr: float
    due_date: Optional[datetime] = None
    status: str = "PENDING"
    notes: Optional[str] = None


class PaymentMilestoneUpdate(BaseModel):
    status: str  # RECEIVED, PENDING
    payment_mode: Optional[str] = "UPI"  # UPI, BANK_TRANSFER, CASH
    upi_ref: Optional[str] = None
    received_at: Optional[datetime] = None
    notes: Optional[str] = None


class EventExpenseCreate(BaseModel):
    category: str  # FREELANCER_CREW, VIDEO_EDITOR, ALBUM_PRINTING, TRAVEL_HOTEL, EQUIPMENT_RENTAL, MISC
    description: str
    amount_inr: float
    paid_to: Optional[str] = None


class FinanceSummaryResponse(BaseModel):
    event_id: str
    event_name: str
    client_name: Optional[str]
    package_amount_inr: float
    total_received_inr: float
    total_pending_inr: float
    
    # Cost Breakdown
    crew_cost_inr: float
    editor_cost_inr: float
    album_printing_cost_inr: float
    travel_hotel_cost_inr: float
    equipment_rental_cost_inr: float
    misc_expenses_inr: float
    total_expenses_inr: float

    # Net Profit
    net_profit_inr: float
    profit_margin_pct: float

    payment_milestones: List[dict]
    expenses: List[dict]


@router.get("", response_model=FinanceSummaryResponse)
def get_event_finance(
    event_id: str,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Retrieve full event finance report and real-time net profit calculation."""
    event = db.query(Event).filter(Event.id == event_id, Event.photographer_id == current_photographer.id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    milestones = db.query(PaymentMilestone).filter(PaymentMilestone.event_id == event.id).all()
    expenses = db.query(EventExpense).filter(EventExpense.event_id == event.id).all()
    crew_members = db.query(CrewMember).filter(CrewMember.event_id == event.id).all()

    # Revenue
    total_received = sum(m.amount_inr for m in milestones if m.status == "RECEIVED")
    total_pending = sum(m.amount_inr for m in milestones if m.status != "RECEIVED")
    package_val = event.package_amount_inr if event.package_amount_inr > 0 else (total_received + total_pending)

    # Crew costs from CrewMember table
    crew_cost = sum(c.payout_inr for c in crew_members)

    # Categorized Expenses
    editor_cost = sum(e.amount_inr for e in expenses if e.category == "VIDEO_EDITOR")
    album_cost = sum(e.amount_inr for e in expenses if e.category == "ALBUM_PRINTING")
    travel_cost = sum(e.amount_inr for e in expenses if e.category == "TRAVEL_HOTEL")
    equipment_cost = sum(e.amount_inr for e in expenses if e.category == "EQUIPMENT_RENTAL")
    misc_cost = sum(e.amount_inr for e in expenses if e.category in ["MISC", "FREELANCER_CREW"])

    total_expenses = crew_cost + sum(e.amount_inr for e in expenses)

    # Real Net Profit Calculation
    net_profit = package_val - total_expenses
    profit_margin = round((net_profit / package_val * 100), 1) if package_val > 0 else 0.0

    return FinanceSummaryResponse(
        event_id=event.id,
        event_name=event.name,
        client_name=event.client_name,
        package_amount_inr=package_val,
        total_received_inr=total_received,
        total_pending_inr=total_pending,
        crew_cost_inr=crew_cost,
        editor_cost_inr=editor_cost,
        album_printing_cost_inr=album_cost,
        travel_hotel_cost_inr=travel_cost,
        equipment_rental_cost_inr=equipment_cost,
        misc_expenses_inr=misc_cost,
        total_expenses_inr=total_expenses,
        net_profit_inr=net_profit,
        profit_margin_pct=profit_margin,
        payment_milestones=[
            {
                "id": m.id,
                "title": m.title,
                "amount_inr": m.amount_inr,
                "due_date": m.due_date.isoformat() if m.due_date else None,
                "status": m.status,
                "received_at": m.received_at.isoformat() if m.received_at else None,
                "payment_mode": m.payment_mode,
                "upi_ref": m.upi_ref,
                "notes": m.notes,
            }
            for m in milestones
        ],
        expenses=[
            {
                "id": e.id,
                "category": e.category,
                "description": e.description,
                "amount_inr": e.amount_inr,
                "paid_to": e.paid_to,
                "created_at": e.created_at.isoformat(),
            }
            for e in expenses
        ],
    )


@router.post("/payments", status_code=status.HTTP_201_CREATED)
def add_payment_milestone(
    event_id: str,
    data: PaymentMilestoneCreate,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Add a payment milestone / stage to the event."""
    event = db.query(Event).filter(Event.id == event_id, Event.photographer_id == current_photographer.id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    milestone = PaymentMilestone(
        event_id=event.id,
        photographer_id=current_photographer.id,
        title=data.title,
        amount_inr=data.amount_inr,
        due_date=data.due_date,
        status=data.status,
        notes=data.notes,
    )
    db.add(milestone)
    db.commit()
    db.refresh(milestone)
    return {"id": milestone.id, "message": "Payment milestone created successfully."}


@router.patch("/payments/{milestone_id}")
def update_payment_milestone(
    event_id: str,
    milestone_id: str,
    data: PaymentMilestoneUpdate,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Record payment receipt (UPI / Cash / Bank Transfer)."""
    milestone = db.query(PaymentMilestone).filter(
        PaymentMilestone.id == milestone_id,
        PaymentMilestone.event_id == event_id,
        PaymentMilestone.photographer_id == current_photographer.id
    ).first()
    if not milestone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment milestone not found.")

    milestone.status = data.status
    if data.status == "RECEIVED":
        milestone.received_at = data.received_at or datetime.utcnow()
        milestone.payment_mode = data.payment_mode or "UPI"
        milestone.upi_ref = data.upi_ref
    else:
        milestone.received_at = None

    if data.notes:
        milestone.notes = data.notes

    db.add(milestone)
    db.commit()
    return {"id": milestone.id, "status": milestone.status, "message": "Payment status updated."}


@router.post("/expenses", status_code=status.HTTP_201_CREATED)
def log_event_expense(
    event_id: str,
    data: EventExpenseCreate,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Log an expense for this event (Freelancer payout, Album printing, Travel, Editor)."""
    event = db.query(Event).filter(Event.id == event_id, Event.photographer_id == current_photographer.id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    expense = EventExpense(
        event_id=event.id,
        photographer_id=current_photographer.id,
        category=data.category,
        description=data.description,
        amount_inr=data.amount_inr,
        paid_to=data.paid_to,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return {"id": expense.id, "message": "Expense logged successfully."}


@router.delete("/expenses/{expense_id}")
def delete_event_expense(
    event_id: str,
    expense_id: str,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Delete an expense item."""
    expense = db.query(EventExpense).filter(
        EventExpense.id == expense_id,
        EventExpense.event_id == event_id,
        EventExpense.photographer_id == current_photographer.id
    ).first()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found.")

    db.delete(expense)
    db.commit()
    return {"message": "Expense deleted."}
