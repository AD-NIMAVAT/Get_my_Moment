"""
Crew Member & Field Staff Management Router
Handles crew authentication, duty assignments, ceremony call sheets, live ceremony switching, and field photo uploads.
"""

import os
import socket
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel

from apps.api.database import get_db
from apps.api.models.operations import CrewMember, Ceremony, EventTask
from apps.api.models.event import Event
from apps.api.models.photo import Photo
from apps.api.models.folder import Folder
from apps.api.models.photographer import Photographer
from apps.api.auth import create_access_token, decode_access_token
from apps.api.services.storage import storage_service, get_or_create_uncategorized_folder, reconcile_folder_counters
from apps.api.services.wireless_ingest import wireless_server
from workers.ai_worker.worker import dispatch_photo_processing
from packages.shared.constants import PhotoStatus

router = APIRouter(prefix="/crew", tags=["Crew & Field Operations"])


def get_server_ip() -> str:
    """Detect active LAN IP or Cloud Host for Camera Wi-Fi."""
    tcp_domain = os.environ.get("RAILWAY_TCP_PROXY_DOMAIN")
    if tcp_domain:
        return tcp_domain
    if os.environ.get("FTP_PUBLIC_HOST"):
        return os.environ.get("FTP_PUBLIC_HOST")
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "192.168.31.37"


class CrewLoginRequest(BaseModel):
    phone: str
    pin: Optional[str] = None


class CrewLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    crew_id: str
    name: str
    phone: str
    total_assigned_events: int


@router.post("/login", response_model=CrewLoginResponse)
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

    return CrewLoginResponse(
        access_token=token,
        token_type="bearer",
        crew_id=primary_crew.id,
        name=primary_crew.name,
        phone=primary_crew.phone or phone_clean,
        total_assigned_events=len(crew_entries),
    )


@router.get("/dashboard")
def get_crew_dashboard(
    phone: Optional[str] = None,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Fetch complete field dashboard for crew member with camera settings and ceremonies."""
    target_phone = phone
    if not target_phone and authorization:
        try:
            token = authorization.replace("Bearer ", "").strip()
            payload = decode_access_token(token)
            target_phone = payload.get("phone")
        except Exception:
            pass

    if not target_phone:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Crew phone number or authentication required.")

    phone_clean = target_phone.strip().replace(" ", "").replace("-", "")
    crew_entries = db.query(CrewMember).filter(
        (CrewMember.phone == phone_clean) | (CrewMember.phone.endswith(phone_clean[-10:]))
    ).all()

    if not crew_entries:
        return {"crew_name": "Field Crew", "phone": target_phone, "events": []}

    primary_crew = crew_entries[0]
    server_ip = get_server_ip()
    ftp_port = int(os.environ.get("RAILWAY_TCP_PROXY_PORT", os.environ.get("FTP_PUBLIC_PORT", wireless_server.port)))

    events_data = []
    for crew in crew_entries:
        event = db.query(Event).filter(Event.id == crew.event_id, Event.is_deleted == False).first()
        if not event:
            continue

        photographer = db.query(Photographer).filter(Photographer.id == event.photographer_id).first()
        ceremonies = db.query(Ceremony).filter(Ceremony.event_id == event.id).order_by(Ceremony.order_index.asc()).all()
        folders = db.query(Folder).filter(Folder.event_id == event.id, Folder.deleted_at.is_(None)).order_by(Folder.order_index.asc()).all()
        tasks = db.query(EventTask).filter(EventTask.event_id == event.id).all()
        photo_count = db.query(Photo).filter(Photo.event_id == event.id, Photo.is_deleted == False).count()

        events_data.append({
            "crew_id": crew.id,
            "event_id": event.id,
            "event_name": event.name,
            "access_token": event.access_token,
            "event_date": event.event_date.isoformat() if event.event_date else None,
            "venue": event.venue,
            "city": event.city,
            "role": crew.role,
            "camera_tag": crew.camera_tag,
            "payout_inr": crew.payout_inr,
            "payout_status": crew.payout_status,
            "assigned_ceremonies": crew.assigned_ceremonies or [],
            "notes": crew.notes,
            "studio_name": photographer.studio_name if photographer else "Photography Studio",
            "studio_phone": photographer.phone if photographer else None,
            "total_photos": photo_count,
            "ceremonies": [
                {
                    "id": c.id,
                    "name": c.name,
                    "venue": c.venue,
                    "ceremony_date": c.ceremony_date.isoformat() if c.ceremony_date else None,
                }
                for c in ceremonies
            ],
            "folders": [
                {
                    "id": f.id,
                    "name": f.name,
                    "folder_type": f.folder_type.value if hasattr(f.folder_type, "value") else str(f.folder_type),
                    "photo_count": f.photo_count,
                    "color": f.color,
                    "icon": f.icon,
                }
                for f in folders
            ],
            "camera_settings": {
                "host": server_ip,
                "port": ftp_port,
                "username": "camera",
                "password": "shoot123",
                "destination_folder": f"/{event.access_token}",
                "passive_mode": True,
            },
            "tasks": [
                {
                    "id": t.id,
                    "title": t.title,
                    "is_completed": t.is_completed,
                    "assigned_to": t.assigned_to,
                }
                for t in tasks
            ],
        })

    return {
        "crew_id": primary_crew.id,
        "crew_name": primary_crew.name,
        "phone": primary_crew.phone or target_phone,
        "role": primary_crew.role,
        "camera_tag": primary_crew.camera_tag,
        "total_events": len(events_data),
        "events": events_data,
    }


class SetActiveCeremonyRequest(BaseModel):
    folder_id: str


@router.post("/events/{event_id}/set-active-ceremony")
def set_active_ceremony(
    event_id: str,
    request: SetActiveCeremonyRequest,
    db: Session = Depends(get_db)
):
    """Set the active ceremony folder for live incoming camera photos."""
    event = db.query(Event).filter(Event.id == event_id, Event.is_deleted == False).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    folder = db.query(Folder).filter(
        Folder.id == request.folder_id,
        Folder.event_id == event.id,
        Folder.deleted_at.is_(None)
    ).first()

    if not folder:
        raise HTTPException(status_code=404, detail="Target folder not found")

    wireless_server.set_active_event_id(event.id, folder_id=folder.id)

    return {
        "status": "success",
        "event_id": event.id,
        "active_folder_id": folder.id,
        "active_folder_name": folder.name,
        "message": f"🔴 Live Camera target set to: {folder.name}",
    }


@router.post("/events/{event_id}/upload-photos")
async def crew_upload_photos(
    event_id: str,
    crew_name: str = Form("Crew Member"),
    folder_id: Optional[str] = Form(None),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
):
    """Allow field crew to upload photos directly from their camera or phone into target ceremony folder."""
    event = db.query(Event).filter(Event.id == event_id, Event.is_deleted == False).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Resolve target folder
    target_folder = None
    if folder_id:
        target_folder = db.query(Folder).filter(
            Folder.id == folder_id,
            Folder.event_id == event.id,
            Folder.deleted_at.is_(None)
        ).first()

    if not target_folder:
        target_folder = get_or_create_uncategorized_folder(db, studio_id=event.photographer_id, event_id=event.id)

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
            studio_id=event.photographer_id,
            folder_id=target_folder.id,
        )

        img_format, width, height = storage_service.validate_image(file_bytes)

        photo = Photo(
            id=file_id,
            studio_id=event.photographer_id,
            event_id=event_id,
            folder_id=target_folder.id,
            original_file_name=file.filename or "crew_photo.jpg",
            file_path=rel_path,
            file_size=file_size,
            width=width,
            height=height,
            mime_type=f"image/{img_format}",
            sha256_hash=sha256_hash,
            status=PhotoStatus.UPLOADED.value,
            is_guest_uploaded=False,
            uploaded_by_guest_name=f"[CREW] {crew_name}",
        )
        db.add(photo)
        db.commit()

        # Trigger AI facial recognition worker
        dispatch_photo_processing(photo_id=photo.id, event_id=event_id, db=db)
        uploaded_photos.append(photo.id)

    # Reconcile folder counters
    reconcile_folder_counters(db, event_id=event.id, folder_id=target_folder.id)

    return {
        "event_id": event_id,
        "folder_id": target_folder.id,
        "folder_name": target_folder.name,
        "uploaded_count": len(uploaded_photos),
        "message": f"Successfully ingested {len(uploaded_photos)} photos into '{target_folder.name}'.",
    }
