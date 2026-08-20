"""
Business OS - Event Operations, Multi-Ceremony & Crew Management Router
"""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from apps.api.database import get_db
from apps.api.models import Photographer, Event, Ceremony, CrewMember, EventTask, Photo
from apps.api.auth import get_current_photographer

router = APIRouter(prefix="/events/{event_id}/operations", tags=["Event Operations & Command Center"])


class CeremonyCreate(BaseModel):
    name: str
    ceremony_date: Optional[datetime] = None
    venue: Optional[str] = None
    order_index: int = 0


class CrewMemberCreate(BaseModel):
    name: str
    role: str  # Traditional Photo, Candid Photo, Cinematographer, Drone Pilot, Album Editor, Video Editor
    phone: Optional[str] = None
    payout_inr: float = 0.0
    payout_status: str = "PENDING"
    assigned_ceremonies: List[str] = []  # List of ceremony names or IDs e.g. ["Mandap", "Haldi"]
    camera_tag: Optional[str] = None  # e.g. "Sony-A7IV-Cam1"
    notes: Optional[str] = None


class EventTaskCreate(BaseModel):
    title: str
    assigned_to: Optional[str] = None
    due_date: Optional[datetime] = None


class OperationsResponse(BaseModel):
    event_id: str
    event_name: str
    ceremonies: List[dict]
    crew_members: List[dict]
    tasks: List[dict]


@router.get("", response_model=OperationsResponse)
def get_event_operations(
    event_id: str,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Retrieve full event command center operational data."""
    event = db.query(Event).filter(Event.id == event_id, Event.photographer_id == current_photographer.id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    ceremonies = db.query(Ceremony).filter(Ceremony.event_id == event.id).order_by(Ceremony.order_index.asc()).all()
    crew_members = db.query(CrewMember).filter(CrewMember.event_id == event.id).all()
    tasks = db.query(EventTask).filter(EventTask.event_id == event.id).order_by(EventTask.created_at.asc()).all()

    ceremonies_data = []
    for c in ceremonies:
        photo_count = db.query(Photo).filter(Photo.ceremony_id == c.id).count()
        # Find crew members assigned to this ceremony
        assigned_crew = [
            {"id": cr.id, "name": cr.name, "role": cr.role}
            for cr in crew_members
            if cr.assigned_ceremonies and (c.name in cr.assigned_ceremonies or c.id in cr.assigned_ceremonies)
        ]
        ceremonies_data.append({
            "id": c.id,
            "name": c.name,
            "ceremony_date": c.ceremony_date.isoformat() if c.ceremony_date else None,
            "venue": c.venue,
            "order_index": c.order_index,
            "photo_count": photo_count,
            "assigned_crew": assigned_crew,
        })

    return OperationsResponse(
        event_id=event.id,
        event_name=event.name,
        ceremonies=ceremonies_data,
        crew_members=[
            {
                "id": cr.id,
                "name": cr.name,
                "role": cr.role,
                "phone": cr.phone,
                "payout_inr": cr.payout_inr,
                "payout_status": cr.payout_status,
                "assigned_ceremonies": cr.assigned_ceremonies or [],
                "camera_tag": cr.camera_tag,
                "notes": cr.notes,
            }
            for cr in crew_members
        ],
        tasks=[
            {
                "id": t.id,
                "title": t.title,
                "assigned_to": t.assigned_to,
                "due_date": t.due_date.isoformat() if t.due_date else None,
                "is_completed": t.is_completed,
            }
            for t in tasks
        ],
    )


@router.post("/ceremonies", status_code=status.HTTP_201_CREATED)
def add_ceremony(
    event_id: str,
    data: CeremonyCreate,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Add a function/ceremony to the event (e.g. Haldi, Sangeet, Wedding)."""
    event = db.query(Event).filter(Event.id == event_id, Event.photographer_id == current_photographer.id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    ceremony = Ceremony(
        event_id=event.id,
        name=data.name.strip(),
        ceremony_date=data.ceremony_date,
        venue=data.venue,
        order_index=data.order_index,
    )
    db.add(ceremony)
    db.commit()
    db.refresh(ceremony)
    return {"id": ceremony.id, "name": ceremony.name, "message": "Ceremony added successfully."}


@router.post("/crew", status_code=status.HTTP_201_CREATED)
def add_crew_member(
    event_id: str,
    data: CrewMemberCreate,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Assign a freelancer or crew member to the event with agreed payout."""
    event = db.query(Event).filter(Event.id == event_id, Event.photographer_id == current_photographer.id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    crew = CrewMember(
        event_id=event.id,
        photographer_id=current_photographer.id,
        name=data.name.strip(),
        role=data.role,
        phone=data.phone,
        payout_inr=data.payout_inr,
        payout_status=data.payout_status,
        assigned_ceremonies=data.assigned_ceremonies or [],
        camera_tag=data.camera_tag,
        notes=data.notes,
    )
    db.add(crew)
    db.commit()
    db.refresh(crew)
    return {
        "id": crew.id,
        "name": crew.name,
        "assigned_ceremonies": crew.assigned_ceremonies,
        "camera_tag": crew.camera_tag,
        "message": "Crew member assigned successfully."
    }


@router.patch("/crew/{crew_id}/payout")
def update_crew_payout(
    event_id: str,
    crew_id: str,
    status_val: str = "PAID",
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Mark crew payout as PAID or PENDING."""
    crew = db.query(CrewMember).filter(
        CrewMember.id == crew_id,
        CrewMember.event_id == event_id,
        CrewMember.photographer_id == current_photographer.id
    ).first()
    if not crew:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Crew member not found.")

    crew.payout_status = status_val
    db.add(crew)
    db.commit()
    return {"id": crew.id, "payout_status": crew.payout_status, "message": "Payout status updated."}


@router.post("/tasks", status_code=status.HTTP_201_CREATED)
def add_event_task(
    event_id: str,
    data: EventTaskCreate,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Add a task / deadline to the event operations checklist."""
    event = db.query(Event).filter(Event.id == event_id, Event.photographer_id == current_photographer.id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    task = EventTask(
        event_id=event.id,
        title=data.title.strip(),
        assigned_to=data.assigned_to,
        due_date=data.due_date,
        is_completed=False,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return {"id": task.id, "title": task.title, "message": "Task added."}


@router.patch("/tasks/{task_id}/toggle")
def toggle_event_task(
    event_id: str,
    task_id: str,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Toggle event task completion."""
    task = db.query(EventTask).filter(EventTask.id == task_id, EventTask.event_id == event_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")

    task.is_completed = not task.is_completed
    db.add(task)
    db.commit()
    return {"id": task.id, "is_completed": task.is_completed}
