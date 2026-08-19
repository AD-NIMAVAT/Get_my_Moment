"""
P28: Event Analytics and Telemetry Router
Provides photographers with live event performance telemetry and lead capture metrics.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from apps.api.database import get_db
from apps.api.models import Event, Photo, Face, Guest, Consent, GuestSearch, Photographer
from apps.api.auth import get_current_photographer
from packages.shared.constants import PhotoStatus

router = APIRouter(tags=["Event Analytics & Telemetry"])


class EventAnalyticsResponse(BaseModel):
    event_id: str
    event_name: str
    total_photos: int
    processed_photos: int
    total_faces_indexed: int
    total_guests_registered: int
    total_searches_performed: int
    total_moments_delivered: int
    marketing_leads_count: int
    search_success_rate_pct: float


@router.get("/events/{event_id}/analytics", response_model=EventAnalyticsResponse)
def get_event_analytics(
    event_id: str,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Retrieve full analytics, delivery metrics, and conversion rates for an event."""
    event = db.query(Event).filter(Event.id == event_id, Event.photographer_id == current_photographer.id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    total_photos = db.query(func.count(Photo.id)).filter(Photo.event_id == event.id).scalar() or 0
    processed_photos = db.query(func.count(Photo.id)).filter(Photo.event_id == event.id, Photo.status == PhotoStatus.PROCESSED.value).scalar() or 0
    total_faces = db.query(func.count(Face.id)).filter(Face.event_id == event.id).scalar() or 0
    total_guests = db.query(func.count(Guest.id)).filter(Guest.event_id == event.id).scalar() or 0
    
    searches = db.query(GuestSearch).filter(GuestSearch.event_id == event.id).all()
    total_searches = len(searches)
    successful_searches = sum(1 for s in searches if s.matched_photo_count > 0)
    total_moments_delivered = sum(s.matched_photo_count for s in searches)

    marketing_leads = db.query(func.count(Consent.id)).filter(
        Consent.event_id == event.id,
        Consent.marketing_consent == True
    ).scalar() or 0

    success_rate = round((successful_searches / total_searches * 100), 1) if total_searches > 0 else 100.0

    return EventAnalyticsResponse(
        event_id=event.id,
        event_name=event.name,
        total_photos=total_photos,
        processed_photos=processed_photos,
        total_faces_indexed=total_faces,
        total_guests_registered=total_guests,
        total_searches_performed=total_searches,
        total_moments_delivered=total_moments_delivered,
        marketing_leads_count=marketing_leads,
        search_success_rate_pct=success_rate,
    )
