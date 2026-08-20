"""
Business OS - Client Photo Selection & Album Proofing Router
"""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from apps.api.database import get_db
from apps.api.models import Event, Photo, Ceremony, Folder
from packages.shared.constants import PhotoStatus

router = APIRouter(prefix="/selection", tags=["Client Album Selection & Proofing"])


class PhotoSelectionToggleRequest(BaseModel):
    is_selected: bool
    comment: Optional[str] = None


class ClientSelectionResponse(BaseModel):
    event_id: str
    event_name: str
    client_name: Optional[str]
    studio_name: str
    total_photos: int
    selected_count: int
    is_submitted: bool
    ceremonies: List[dict]
    folders: List[dict] = []
    photos: List[dict]


@router.get("/{selection_token}", response_model=ClientSelectionResponse)
def get_client_selection_gallery(
    selection_token: str,
    db: Session = Depends(get_db)
):
    """Public proofing portal for client (bride & groom) to review and select album photos."""
    event = db.query(Event).filter(Event.selection_token == selection_token).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid selection link.")

    ceremonies = db.query(Ceremony).filter(Ceremony.event_id == event.id).order_by(Ceremony.order_index.asc()).all()
    folders = db.query(Folder).filter(Folder.event_id == event.id, Folder.deleted_at.is_(None)).order_by(Folder.order_index.asc()).all()
    photos = db.query(Photo).filter(
        Photo.event_id == event.id,
        Photo.is_deleted == False
    ).all()

    selected_count = sum(1 for p in photos if p.is_client_selected)
    is_submitted = event.settings.get("album_selection_submitted", False) if event.settings else False

    return ClientSelectionResponse(
        event_id=event.id,
        event_name=event.name,
        client_name=event.client_name,
        studio_name=event.photographer.studio_name if event.photographer else "Studio",
        total_photos=len(photos),
        selected_count=selected_count,
        is_submitted=is_submitted,
        ceremonies=[
            {
                "id": c.id,
                "name": c.name,
                "venue": c.venue,
            }
            for c in ceremonies
        ],
        folders=[
            {
                "id": f.id,
                "name": f.name,
                "slug": f.slug,
                "icon": f.icon,
                "color": f.color,
                "photo_count": f.photo_count,
            }
            for f in folders
        ],
        photos=[
            {
                "id": p.id,
                "original_file_name": p.original_file_name,
                "ceremony_id": p.ceremony_id,
                "folder_id": p.folder_id,
                "folder_name": p.folder.name if p.folder else None,
                "is_client_selected": p.is_client_selected,
                "client_comment": p.client_comment,
                "is_guest_uploaded": p.is_guest_uploaded,
            }
            for p in photos
        ],
    )


@router.post("/{selection_token}/photos/{photo_id}/toggle")
def toggle_photo_selection(
    selection_token: str,
    photo_id: str,
    data: PhotoSelectionToggleRequest,
    db: Session = Depends(get_db)
):
    """Toggle a photo's album selection status and update client note."""
    event = db.query(Event).filter(Event.selection_token == selection_token).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid selection link.")

    photo = db.query(Photo).filter(Photo.id == photo_id, Photo.event_id == event.id).first()
    if not photo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found.")

    photo.is_client_selected = data.is_selected
    if data.comment is not None:
        photo.client_comment = data.comment

    db.add(photo)
    db.commit()

    total_selected = db.query(Photo).filter(Photo.event_id == event.id, Photo.is_client_selected == True).count()
    return {
        "photo_id": photo.id,
        "is_client_selected": photo.is_client_selected,
        "client_comment": photo.client_comment,
        "total_selected": total_selected,
    }


@router.post("/{selection_token}/submit")
def submit_album_selection(
    selection_token: str,
    db: Session = Depends(get_db)
):
    """Finalize and submit album selection to photographer."""
    event = db.query(Event).filter(Event.selection_token == selection_token).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid selection link.")

    current_settings = dict(event.settings or {})
    current_settings["album_selection_submitted"] = True
    current_settings["selection_submitted_at"] = datetime.utcnow().isoformat()
    event.settings = current_settings

    db.add(event)
    db.commit()

    total_selected = db.query(Photo).filter(Photo.event_id == event.id, Photo.is_client_selected == True).count()
    return {
        "message": f"Album selection submitted successfully! {total_selected} photos selected.",
        "total_selected": total_selected,
    }
