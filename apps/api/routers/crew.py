"""
Crew Member & Field Staff Management Router
Handles crew authentication, duty assignments, ceremony call sheets, and field photo uploads.
"""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from apps.api.database import get_db
from apps.api.models.operations import CrewMember, Ceremony, EventTask
from apps.api.models.event import Event
from apps.api.models.photo import Photo
from apps.api.models.photographer import Photographer
from apps.api.auth import create_access_token
from apps.api.services.storage import storage_service
from workers.ai_worker.worker import dispatch_photo_processing
from packages.shared.constants import PhotoStatus

router = APIRouter(prefix="/crew", tags=["Crew & Field Operations"])


class CrewLoginRequest(BaseModel):
    phone: str
    pin: Optional[str] = None


class CrewLoginResponse(BaseModel):
    access_token: str = ""
    token_type: str = "bearer"
    crew_id: str
    name: str
    phone: str
    total_assigned_events: int


@router.post("/login")
def crew_login(request: CrewLoginRequest, db: Session = Depends(get_db)):
    """Log in a crew member via registered phone number."""
    phone_clean = request.phone.strip().replace(" ", "").replace("-", "")
    if not phone_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number is required"
        )

    # Search for crew members registered with this phone
    crew_entries = db.query(CrewMember).filter(
        (CrewMember.phone == phone_clean) | (CrewMember.phone.endswith(phone_clean[-10:]))
    ).all()

    if not crew_entries:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No crew assignments found with this phone number. Please contact your studio manager."
        )

    primary_crew = crew_entries[0]
    token = create_access_token(data={"sub": primary_crew.id, "phone": primary_crew.phone, "role": "CREW"})

    return {
        "access_token": token,
        "token_type": "bearer",
        "crew_id": primary_crew.id,
        "name": primary_crew.name,
        "phone": primary_crew.phone or phone_clean,
        "total_assigned_events": len(crew_entries),
    }


@router.get("/my-assignments")
def get_my_assignments(phone: str, db: Session = Depends(get_db)):
    """Fetch all events and duties assigned to this crew member by phone."""
    phone_clean = phone.strip().replace(" ", "").replace("-", "")
    crew_entries = db.query(CrewMember).filter(
        (CrewMember.phone == phone_clean) | (CrewMember.phone.endswith(phone_clean[-10:]))
    ).all()

    results = []
    for crew in crew_entries:
        event = db.query(Event).filter(Event.id == crew.event_id).first()
        if not event:
            continue
        photographer = db.query(Photographer).filter(Photographer.id == event.photographer_id).first()
        ceremonies = db.query(Ceremony).filter(Ceremony.event_id == event.id).all()
        tasks = db.query(EventTask).filter(EventTask.event_id == event.id).all()
        photo_count = db.query(Photo).filter(Photo.event_id == event.id).count()

        results.append({
            "crew_id": crew.id,
            "event_id": event.id,
            "event_name": event.name,
            "access_token": event.access_token,
            "event_date": event.event_date.isoformat() if event.event_date else None,
            "role": crew.role,
            "payout_inr": crew.payout_inr,
            "payout_status": crew.payout_status,
            "notes": crew.notes,
            "studio_name": photographer.studio_name if photographer else "Photography Studio",
            "ceremonies": [
                {
                    "id": c.id,
                    "name": c.name,
                    "venue": c.venue,
                    "ceremony_date": c.ceremony_date.isoformat() if c.ceremony_date else None,
                }
                for c in ceremonies
            ],
            "tasks": [
                {
                    "id": t.id,
                    "title": t.title,
                    "is_completed": t.is_completed,
                    "assigned_to": t.assigned_to,
                }
                for t in tasks
            ],
            "photo_count": photo_count,
        })

    return results


@router.post("/events/{event_id}/upload-photos")
async def crew_upload_photos(
    event_id: str,
    crew_name: str = Form("Crew Member"),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
):
    """Allow field crew to upload photos directly from their camera/gallery."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    uploaded_photos = []
    for file in files:
        file_bytes = await file.read()
        if not file_bytes:
            continue

        sha256_hash = storage_service.calculate_sha256(file_bytes)

        # Check duplicate
        existing = db.query(Photo).filter(Photo.event_id == event_id, Photo.sha256_hash == sha256_hash).first()
        if existing:
            continue

        file_id, rel_path, file_size, _ = storage_service.save_original(
            file_bytes=file_bytes,
            original_filename=file.filename or "crew_photo.jpg",
            event_id=event_id,
        )

        photo = Photo(
            id=file_id,
            event_id=event_id,
            original_file_name=file.filename or "crew_photo.jpg",
            file_path=rel_path,
            file_size=file_size,
            mime_type=file.content_type or "image/jpeg",
            sha256_hash=sha256_hash,
            status=PhotoStatus.PENDING_PROCESSING.value,
            is_guest_uploaded=False,
            uploaded_by_guest_name=f"[CREW] {crew_name}",
        )
        db.add(photo)
        db.commit()
        db.refresh(photo)

        # Trigger AI facial recognition worker
        dispatch_photo_processing(photo_id=photo.id, event_id=event_id)
        uploaded_photos.append(photo.id)

    return {
        "event_id": event_id,
        "uploaded_count": len(uploaded_photos),
        "message": f"Successfully uploaded {len(uploaded_photos)} photos from field crew.",
    }
