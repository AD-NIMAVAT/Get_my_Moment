"""
Get My Moment - Studio Calendar & Availability Management Router
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, date
import calendar
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from apps.api.database import get_db
from apps.api.models import Photographer, Event, Lead, CalendarNote
from apps.api.auth import get_current_photographer

router = APIRouter(prefix="/calendar", tags=["Studio Calendar & Availability"])


class NoteCreateRequest(BaseModel):
    date_str: str  # YYYY-MM-DD
    title: str
    description: Optional[str] = None
    category: str = "NOTE"  # NOTE, REMINDER, BLOCKED, LEAVE


class NoteResponse(BaseModel):
    id: str
    date_str: str
    title: str
    description: Optional[str] = None
    category: str
    created_at: datetime


class CalendarEventItem(BaseModel):
    id: str
    name: str
    client_name: Optional[str] = None
    venue: Optional[str] = None
    city: Optional[str] = None
    package_amount_inr: float = 0.0
    status: str
    event_date: Optional[str] = None


class CalendarLeadItem(BaseModel):
    id: str
    client_name: str
    event_type: str
    stage: str
    estimated_budget_inr: float = 0.0
    event_date: Optional[str] = None


class DayAvailabilityItem(BaseModel):
    date_str: str
    day_of_month: int
    day_name: str
    availability_status: str  # "AVAILABLE", "BUSY", "BOOKED", "BLOCKED"
    events: List[CalendarEventItem] = []
    leads: List[CalendarLeadItem] = []
    notes: List[NoteResponse] = []


class MonthCalendarResponse(BaseModel):
    year: int
    month: int
    month_name: str
    days: List[DayAvailabilityItem]
    total_events_in_month: int
    total_revenue_in_month: float
    booked_days_count: int
    available_days_count: int


@router.get("/month", response_model=MonthCalendarResponse)
def get_month_calendar(
    year: Optional[int] = None,
    month: Optional[int] = None,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Retrieve full monthly calendar overview with event bookings, leads, notes, and availability."""
    now = datetime.utcnow()
    target_year = year or now.year
    target_month = month or now.month

    if target_month < 1 or target_month > 12:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Month must be between 1 and 12.")

    # Calculate days in month
    _, num_days = calendar.monthrange(target_year, target_month)
    month_name = calendar.month_name[target_month]

    # Month string prefix for fast querying, e.g. "2026-08"
    month_prefix = f"{target_year:04d}-{target_month:02d}"

    # Query all events for photographer
    all_events = db.query(Event).filter(
        Event.photographer_id == current_photographer.id
    ).all()

    # Query all leads for photographer
    all_leads = db.query(Lead).filter(
        Lead.photographer_id == current_photographer.id
    ).all()

    # Query all notes for the target month
    notes = db.query(CalendarNote).filter(
        CalendarNote.photographer_id == current_photographer.id,
        CalendarNote.date_str.like(f"{month_prefix}%")
    ).all()

    # Map events by date_str
    events_by_date: Dict[str, List[CalendarEventItem]] = {}
    for ev in all_events:
        if ev.event_date:
            ev_date_str = ev.event_date.strftime("%Y-%m-%d")
            if ev_date_str.startswith(month_prefix):
                if ev_date_str not in events_by_date:
                    events_by_date[ev_date_str] = []
                events_by_date[ev_date_str].append(
                    CalendarEventItem(
                        id=ev.id,
                        name=ev.name,
                        client_name=ev.client_name,
                        venue=ev.venue,
                        city=ev.city,
                        package_amount_inr=ev.package_amount_inr or 0.0,
                        status=ev.status,
                        event_date=ev_date_str,
                    )
                )

    # Map leads by date_str
    leads_by_date: Dict[str, List[CalendarLeadItem]] = {}
    for ld in all_leads:
        if ld.event_date:
            ld_date_str = ld.event_date.strftime("%Y-%m-%d")
            if ld_date_str.startswith(month_prefix):
                if ld_date_str not in leads_by_date:
                    leads_by_date[ld_date_str] = []
                leads_by_date[ld_date_str].append(
                    CalendarLeadItem(
                        id=ld.id,
                        client_name=ld.client_name,
                        event_type=ld.event_type,
                        stage=ld.stage,
                        estimated_budget_inr=ld.estimated_budget_inr or 0.0,
                        event_date=ld_date_str,
                    )
                )

    # Map notes by date_str
    notes_by_date: Dict[str, List[NoteResponse]] = {}
    for nt in notes:
        if nt.date_str not in notes_by_date:
            notes_by_date[nt.date_str] = []
        notes_by_date[nt.date_str].append(
            NoteResponse(
                id=nt.id,
                date_str=nt.date_str,
                title=nt.title,
                description=nt.description,
                category=nt.category,
                created_at=nt.created_at,
            )
        )

    # Build day-by-day response
    days: List[DayAvailabilityItem] = []
    total_events_in_month = 0
    total_revenue_in_month = 0.0
    booked_days_count = 0

    for day_num in range(1, num_days + 1):
        d_str = f"{target_year:04d}-{target_month:02d}-{day_num:02d}"
        d_obj = date(target_year, target_month, day_num)
        d_name = d_obj.strftime("%A")

        day_events = events_by_date.get(d_str, [])
        day_leads = leads_by_date.get(d_str, [])
        day_notes = notes_by_date.get(d_str, [])

        total_events_in_month += len(day_events)
        for e in day_events:
            total_revenue_in_month += e.package_amount_inr

        # Determine availability
        has_blocked_note = any(n.category in ("BLOCKED", "LEAVE") for n in day_notes)
        if has_blocked_note:
            avail_status = "BLOCKED"
            booked_days_count += 1
        elif len(day_events) >= 2:
            avail_status = "BOOKED"
            booked_days_count += 1
        elif len(day_events) == 1:
            avail_status = "BUSY"
            booked_days_count += 1
        else:
            avail_status = "AVAILABLE"

        days.append(
            DayAvailabilityItem(
                date_str=d_str,
                day_of_month=day_num,
                day_name=d_name,
                availability_status=avail_status,
                events=day_events,
                leads=day_leads,
                notes=day_notes,
            )
        )

    available_days_count = num_days - booked_days_count

    return MonthCalendarResponse(
        year=target_year,
        month=target_month,
        month_name=month_name,
        days=days,
        total_events_in_month=total_events_in_month,
        total_revenue_in_month=total_revenue_in_month,
        booked_days_count=booked_days_count,
        available_days_count=available_days_count,
    )


@router.post("/notes", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
def create_calendar_note(
    req: NoteCreateRequest,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Add personal note, task, or block a date in the calendar."""
    if not req.title.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Title is required.")

    note = CalendarNote(
        photographer_id=current_photographer.id,
        date_str=req.date_str,
        title=req.title.strip(),
        description=req.description.strip() if req.description else None,
        category=req.category.upper(),
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    return NoteResponse(
        id=note.id,
        date_str=note.date_str,
        title=note.title,
        description=note.description,
        category=note.category,
        created_at=note.created_at,
    )


@router.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_calendar_note(
    note_id: str,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Delete personal note or unblock date."""
    note = db.query(CalendarNote).filter(
        CalendarNote.id == note_id,
        CalendarNote.photographer_id == current_photographer.id
    ).first()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")

    db.delete(note)
    db.commit()
    return None
