"""
Event Management and QR Router
"""

import re
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from apps.api.database import get_db
from apps.api.models import (
    Event, Photo, Guest, Photographer,
    PaymentMilestone, EventExpense, Ceremony, CrewMember, EventTask,
    Lead, Face, FaceEmbedding, GuestSearch, Consent
)
from apps.api.auth import get_current_photographer
from apps.api.schemas.event import (
    EventCreateRequest,
    EventUpdateRequest,
    EventResponse,
    PublicEventResponse,
)
from apps.api.services.qr_service import qr_service
from packages.shared.constants import EventStatus

router = APIRouter(prefix="/events", tags=["Event Management"])


def slugify(text: str) -> str:
    """Generate a clean URL slug from event title."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text.strip("-") or "event"


@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(
    request: EventCreateRequest,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Create a new event owned by the authenticated photographer."""
    slug = slugify(request.name)
    event = Event(
        photographer_id=current_photographer.id,
        name=request.name,
        slug=slug,
        event_date=request.event_date,
        allow_downloads=request.allow_downloads,
        allow_guest_uploads=request.allow_guest_uploads,
        require_otp=request.require_otp,
        settings=request.settings,
        status=EventStatus.ACTIVE.value,
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    return EventResponse(
        id=event.id,
        photographer_id=event.photographer_id,
        name=event.name,
        slug=event.slug,
        access_token=event.access_token,
        event_date=event.event_date,
        cover_image_url=event.cover_image_url,
        status=event.status,
        expires_at=event.expires_at,
        allow_downloads=event.allow_downloads,
        allow_guest_uploads=event.allow_guest_uploads,
        require_otp=event.require_otp,
        settings=event.settings or {},
        photo_count=0,
        guest_count=0,
        created_at=event.created_at,
        updated_at=event.updated_at,
    )


@router.get("", response_model=List[EventResponse])
def list_photographer_events(
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """List all active events owned by the authenticated photographer (excluding Recycle Bin)."""
    events = db.query(Event).filter(
        Event.photographer_id == current_photographer.id,
        Event.is_deleted == False
    ).order_by(Event.created_at.desc()).all()
    
    results = []
    for event in events:
        photo_count = db.query(func.count(Photo.id)).filter(Photo.event_id == event.id, Photo.is_deleted == False).scalar() or 0
        guest_count = db.query(func.count(Guest.id)).filter(Guest.event_id == event.id).scalar() or 0
        results.append(
            EventResponse(
                id=event.id,
                photographer_id=event.photographer_id,
                name=event.name,
                slug=event.slug,
                access_token=event.access_token,
                event_date=event.event_date,
                cover_image_url=event.cover_image_url,
                status=event.status,
                expires_at=event.expires_at,
                allow_downloads=event.allow_downloads,
                allow_guest_uploads=event.allow_guest_uploads,
                require_otp=event.require_otp,
                settings=event.settings or {},
                photo_count=photo_count,
                guest_count=guest_count,
                created_at=event.created_at,
                updated_at=event.updated_at,
            )
        )
    return results


@router.get("/{event_id}", response_model=EventResponse)
def get_event_details(
    event_id: str,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Get single event details with ownership verification."""
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.photographer_id == current_photographer.id,
        Event.is_deleted == False
    ).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    photo_count = db.query(func.count(Photo.id)).filter(Photo.event_id == event.id).scalar() or 0
    guest_count = db.query(func.count(Guest.id)).filter(Guest.event_id == event.id).scalar() or 0

    return EventResponse(
        id=event.id,
        photographer_id=event.photographer_id,
        name=event.name,
        slug=event.slug,
        access_token=event.access_token,
        event_date=event.event_date,
        cover_image_url=event.cover_image_url,
        status=event.status,
        expires_at=event.expires_at,
        allow_downloads=event.allow_downloads,
        allow_guest_uploads=event.allow_guest_uploads,
        require_otp=event.require_otp,
        settings=event.settings or {},
        photo_count=photo_count,
        guest_count=guest_count,
        created_at=event.created_at,
        updated_at=event.updated_at,
    )


@router.patch("/{event_id}", response_model=EventResponse)
def update_event(
    event_id: str,
    request: EventUpdateRequest,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Update event settings, status, or configuration."""
    event = db.query(Event).filter(Event.id == event_id, Event.photographer_id == current_photographer.id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    if request.name is not None:
        event.name = request.name
        event.slug = slugify(request.name)
    if request.event_date is not None:
        event.event_date = request.event_date
    if request.status is not None:
        event.status = request.status.value
    if request.allow_downloads is not None:
        event.allow_downloads = request.allow_downloads
    if request.allow_guest_uploads is not None:
        event.allow_guest_uploads = request.allow_guest_uploads
    if request.require_otp is not None:
        event.require_otp = request.require_otp
    if request.settings is not None:
        event.settings = request.settings

    db.commit()
    db.refresh(event)

    photo_count = db.query(func.count(Photo.id)).filter(Photo.event_id == event.id).scalar() or 0
    guest_count = db.query(func.count(Guest.id)).filter(Guest.event_id == event.id).scalar() or 0

    return EventResponse(
        id=event.id,
        photographer_id=event.photographer_id,
        name=event.name,
        slug=event.slug,
        access_token=event.access_token,
        event_date=event.event_date,
        cover_image_url=event.cover_image_url,
        status=event.status,
        expires_at=event.expires_at,
        allow_downloads=event.allow_downloads,
        allow_guest_uploads=event.allow_guest_uploads,
        require_otp=event.require_otp,
        settings=event.settings or {},
        photo_count=photo_count,
        guest_count=guest_count,
        created_at=event.created_at,
        updated_at=event.updated_at,
    )


@router.patch("/{event_id}/toggle-guest-uploads")
def toggle_guest_uploads(
    event_id: str,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """1-click toggle for guest photo uploads permission."""
    event = db.query(Event).filter(Event.id == event_id, Event.photographer_id == current_photographer.id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    event.allow_guest_uploads = not event.allow_guest_uploads
    db.commit()
    db.refresh(event)

    return {
        "event_id": event.id,
        "allow_guest_uploads": event.allow_guest_uploads,
        "message": f"Guest uploads {'ENABLED' if event.allow_guest_uploads else 'DISABLED'} for this event."
    }


@router.get("/{event_id}/guest-uploads")
def get_guest_uploads_report(
    event_id: str,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Detailed inspector of guest-contributed photos grouped by guest uploader name and phone."""
    event = db.query(Event).filter(Event.id == event_id, Event.photographer_id == current_photographer.id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    guest_photos = (
        db.query(Photo)
        .filter(Photo.event_id == event_id, Photo.is_guest_uploaded == True)
        .order_by(Photo.created_at.desc())
        .all()
    )

    # Group by guest contributor
    contributors_map = {}
    for p in guest_photos:
        contributor_key = f"{p.uploaded_by_guest_name or 'Anonymous Guest'}|{p.uploaded_by_guest_phone or 'No Phone'}"
        if contributor_key not in contributors_map:
            contributors_map[contributor_key] = {
                "guest_name": p.uploaded_by_guest_name or "Anonymous Guest",
                "guest_phone": p.uploaded_by_guest_phone or "N/A",
                "photo_count": 0,
                "latest_upload": p.created_at,
                "photos": []
            }
        contributors_map[contributor_key]["photo_count"] += 1
        contributors_map[contributor_key]["photos"].append({
            "id": p.id,
            "original_file_name": p.original_file_name,
            "file_size": p.file_size,
            "status": p.status,
            "created_at": p.created_at,
            "thumbnail_url": f"/api/v1/photos/{p.id}/thumbnail",
            "download_url": f"/api/v1/photos/{p.id}/download",
        })

    contributors_list = sorted(list(contributors_map.values()), key=lambda x: x["latest_upload"], reverse=True)

    return {
        "event_id": event.id,
        "allow_guest_uploads": event.allow_guest_uploads,
        "total_guest_photos": len(guest_photos),
        "contributors_count": len(contributors_list),
        "contributors": contributors_list
    }


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: str,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Soft-delete an event and cascade-hide its photos into 30-day Recycle Bin."""
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.photographer_id == current_photographer.id,
        Event.is_deleted == False
    ).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    now = datetime.utcnow()
    event.is_deleted = True
    event.deleted_at = now
    db.query(Photo).filter(Photo.event_id == event_id).update({"is_deleted": True, "deleted_at": now}, synchronize_session=False)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{event_id}/restore", response_model=EventResponse)
def restore_event(
    event_id: str,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Restore a soft-deleted event and its photos from the Recycle Bin."""
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.photographer_id == current_photographer.id,
        Event.is_deleted == True
    ).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deleted event not found in Recycle Bin.")

    event.is_deleted = False
    event.deleted_at = None
    db.query(Photo).filter(Photo.event_id == event_id).update({"is_deleted": False, "deleted_at": None}, synchronize_session=False)
    db.commit()
    db.refresh(event)

    photo_count = db.query(func.count(Photo.id)).filter(Photo.event_id == event.id, Photo.is_deleted == False).scalar() or 0
    guest_count = db.query(func.count(Guest.id)).filter(Guest.event_id == event.id).scalar() or 0

    return EventResponse(
        id=event.id,
        photographer_id=event.photographer_id,
        name=event.name,
        slug=event.slug,
        access_token=event.access_token,
        event_date=event.event_date,
        cover_image_url=event.cover_image_url,
        status=event.status,
        expires_at=event.expires_at,
        allow_downloads=event.allow_downloads,
        allow_guest_uploads=event.allow_guest_uploads,
        require_otp=event.require_otp,
        settings=event.settings or {},
        photo_count=photo_count,
        guest_count=guest_count,
        created_at=event.created_at,
        updated_at=event.updated_at,
    )


@router.get("/trash/list", response_model=List[EventResponse])
def list_trash_events(
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """List all soft-deleted events in the 30-day Recycle Bin."""
    events = db.query(Event).filter(
        Event.photographer_id == current_photographer.id,
        Event.is_deleted == True
    ).order_by(Event.deleted_at.desc()).all()

    results = []
    for event in events:
        photo_count = db.query(func.count(Photo.id)).filter(Photo.event_id == event.id).scalar() or 0
        guest_count = db.query(func.count(Guest.id)).filter(Guest.event_id == event.id).scalar() or 0
        results.append(
            EventResponse(
                id=event.id,
                photographer_id=event.photographer_id,
                name=event.name,
                slug=event.slug,
                access_token=event.access_token,
                event_date=event.event_date,
                cover_image_url=event.cover_image_url,
                status=event.status,
                expires_at=event.expires_at,
                allow_downloads=event.allow_downloads,
                allow_guest_uploads=event.allow_guest_uploads,
                require_otp=event.require_otp,
                settings=event.settings or {},
                photo_count=photo_count,
                guest_count=guest_count,
                created_at=event.created_at,
                updated_at=event.updated_at,
            )
        )
    return results


@router.delete("/{event_id}/permanent", status_code=status.HTTP_204_NO_CONTENT)
def permanent_delete_event(
    event_id: str,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Permanently delete an event, photos, and physical disk files."""
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.photographer_id == current_photographer.id
    ).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    # Unlink CRM leads
    db.query(Lead).filter(Lead.converted_event_id == event_id).update({"converted_event_id": None})

    # Delete child records
    db.query(PaymentMilestone).filter(PaymentMilestone.event_id == event_id).delete(synchronize_session=False)
    db.query(EventExpense).filter(EventExpense.event_id == event_id).delete(synchronize_session=False)
    db.query(CrewMember).filter(CrewMember.event_id == event_id).delete(synchronize_session=False)
    db.query(EventTask).filter(EventTask.event_id == event_id).delete(synchronize_session=False)
    db.query(Ceremony).filter(Ceremony.event_id == event_id).delete(synchronize_session=False)
    db.query(FaceEmbedding).filter(FaceEmbedding.event_id == event_id).delete(synchronize_session=False)
    db.query(Face).filter(Face.event_id == event_id).delete(synchronize_session=False)
    db.query(GuestSearch).filter(GuestSearch.event_id == event_id).delete(synchronize_session=False)
    db.query(Photo).filter(Photo.event_id == event_id).delete(synchronize_session=False)
    db.query(Guest).filter(Guest.event_id == event_id).delete(synchronize_session=False)

    db.delete(event)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{event_id}/qr")
def get_event_qr_code(event_id: str, db: Session = Depends(get_db)):
    """Generate high-resolution downloadable QR code PNG for the event."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    qr_bytes = qr_service.generate_qr_bytes(event.access_token)
    return Response(content=qr_bytes, media_type="image/png")


# Public guest lookup endpoint
@router.get("/public/by-token/{access_token}", response_model=PublicEventResponse)
def get_public_event_by_token(access_token: str, db: Session = Depends(get_db)):
    """Public endpoint: resolves event details by public access token for guest landing page."""
    event = db.query(Event).filter(Event.access_token == access_token).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid event QR code or link.")
    if event.status != EventStatus.ACTIVE.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"This event is currently {event.status.lower()}.")

    photographer = db.query(Photographer).filter(Photographer.id == event.photographer_id).first()
    photo_count = db.query(func.count(Photo.id)).filter(Photo.event_id == event.id).scalar() or 0

    return PublicEventResponse(
        id=event.id,
        name=event.name,
        slug=event.slug,
        access_token=event.access_token,
        event_date=event.event_date,
        cover_image_url=event.cover_image_url,
        status=event.status,
        allow_downloads=event.allow_downloads,
        allow_guest_uploads=event.allow_guest_uploads,
        require_otp=event.require_otp,
        studio_name=photographer.studio_name if photographer else "Photography Studio",
        studio_logo_url=photographer.logo_url if photographer else None,
        studio_phone=photographer.phone if photographer else None,
        photo_count=photo_count,
    )
