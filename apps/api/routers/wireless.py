"""
Wireless Camera Management & Wi-Fi Ingest Router
Provides camera pairing credentials, step-by-step camera guides, direct HTTP/FTP ingest status,
and per-camera authorization lifecycle (Add Camera, Approve, Reject, Revoke, Metadata Edit).
"""

import os
import socket
import secrets
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict

from apps.api.database import get_db
from apps.api.models.event import Event
from apps.api.models.photo import Photo
from apps.api.models.photographer import Photographer
from apps.api.models.camera import CameraDevice
from apps.api.auth import get_current_photographer, hash_password
from apps.api.services.storage import storage_service
from apps.api.services.wireless_ingest import wireless_server
from workers.ai_worker.worker import dispatch_photo_processing
from packages.shared.constants import PhotoStatus

router = APIRouter(prefix="/wireless", tags=["Wireless Camera Ingestion"])


def get_public_ip() -> str:
    """Return public FTP host IP. Uses FTP_PUBLIC_HOST env var (set on AWS/cloud), falls back to local LAN IP."""
    public_host = os.environ.get("FTP_PUBLIC_HOST")
    if public_host:
        return public_host
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


# --- Pydantic Schemas ---

class CreateCameraRequest(BaseModel):
    display_name: str
    manufacturer: Optional[str] = None
    model: Optional[str] = None


class UpdateCameraRequest(BaseModel):
    display_name: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None


class CameraResponse(BaseModel):
    id: str
    event_id: str
    photographer_id: str
    display_name: str
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    ftp_username: str
    status: str
    first_seen_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None
    last_upload_at: Optional[datetime] = None
    last_source_ip: Optional[str] = None
    created_at: datetime
    approved_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CameraCreatedResponse(BaseModel):
    camera: CameraResponse
    credentials: dict


# --- Camera Management Endpoints ---

@router.get("/events/{event_id}/cameras", response_model=List[CameraResponse])
def list_event_cameras(
    event_id: str,
    db: Session = Depends(get_db),
    current_photographer: Photographer = Depends(get_current_photographer),
):
    """List all registered cameras for an event owned by the authenticated photographer."""
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.photographer_id == current_photographer.id,
        Event.is_deleted == False
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found or access denied")

    cameras = db.query(CameraDevice).filter(
        CameraDevice.event_id == event_id,
        CameraDevice.photographer_id == current_photographer.id
    ).order_by(CameraDevice.created_at.desc()).all()

    return cameras


@router.post("/events/{event_id}/cameras", response_model=CameraCreatedResponse, status_code=status.HTTP_201_CREATED)
def create_event_camera(
    event_id: str,
    payload: CreateCameraRequest,
    db: Session = Depends(get_db),
    current_photographer: Photographer = Depends(get_current_photographer),
):
    """Register a new camera device in PENDING_APPROVAL status and generate unique FTP credentials."""
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.photographer_id == current_photographer.id,
        Event.is_deleted == False
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found or access denied")

    # Generate unique FTP username
    for _ in range(10):
        suffix = secrets.token_hex(4)
        m_prefix = payload.manufacturer.lower()[:4] if payload.manufacturer else "cam"
        m_prefix = "".join(c for c in m_prefix if c.isalnum()) or "cam"
        cand_username = f"{m_prefix}_{suffix}"
        existing = db.query(CameraDevice).filter(CameraDevice.ftp_username == cand_username).first()
        if not existing:
            break
    else:
        cand_username = f"cam_{secrets.token_hex(6)}"

    # Generate cryptographically secure one-time password
    plain_password = secrets.token_urlsafe(8) + "Aa1!"
    pwd_hash = hash_password(plain_password)

    # Initial status MUST be PENDING_APPROVAL
    camera = CameraDevice(
        photographer_id=current_photographer.id,
        event_id=event.id,
        display_name=payload.display_name.strip(),
        manufacturer=payload.manufacturer.strip() if payload.manufacturer else None,
        model=payload.model.strip() if payload.model else None,
        ftp_username=cand_username,
        password_hash=pwd_hash,
        status="PENDING_APPROVAL",
    )
    db.add(camera)
    db.commit()
    db.refresh(camera)

    server_ip = get_public_ip()
    server_port = int(os.environ.get("FTP_PUBLIC_PORT", wireless_server.port))
    dest_folder = f"/{event.slug}" if (event.slug and event.slug.strip()) else f"/{event.access_token}"

    credentials_payload = {
        "host": server_ip,
        "port": server_port,
        "username": cand_username,
        "password": plain_password,
        "destination_folder": dest_folder,
        "warning": "Save these credentials now. The FTP password will not be shown again."
    }

    return {
        "camera": camera,
        "credentials": credentials_payload,
    }


@router.patch("/events/{event_id}/cameras/{camera_id}", response_model=CameraResponse)
def update_event_camera(
    event_id: str,
    camera_id: str,
    payload: UpdateCameraRequest,
    db: Session = Depends(get_db),
    current_photographer: Photographer = Depends(get_current_photographer),
):
    """Update camera display name, manufacturer, or model."""
    camera = db.query(CameraDevice).filter(
        CameraDevice.id == camera_id,
        CameraDevice.event_id == event_id,
        CameraDevice.photographer_id == current_photographer.id
    ).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found or access denied")

    if payload.display_name is not None:
        camera.display_name = payload.display_name.strip()
    if payload.manufacturer is not None:
        camera.manufacturer = payload.manufacturer.strip() if payload.manufacturer else None
    if payload.model is not None:
        camera.model = payload.model.strip() if payload.model else None

    db.commit()
    db.refresh(camera)
    return camera


@router.post("/events/{event_id}/cameras/{camera_id}/approve", response_model=CameraResponse)
def approve_event_camera(
    event_id: str,
    camera_id: str,
    db: Session = Depends(get_db),
    current_photographer: Photographer = Depends(get_current_photographer),
):
    """Approve a camera device to allow uploads to this event."""
    camera = db.query(CameraDevice).filter(
        CameraDevice.id == camera_id,
        CameraDevice.event_id == event_id,
        CameraDevice.photographer_id == current_photographer.id
    ).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found or access denied")

    camera.status = "APPROVED"
    camera.approved_at = datetime.utcnow()
    db.commit()
    db.refresh(camera)
    return camera


@router.post("/events/{event_id}/cameras/{camera_id}/reject", response_model=CameraResponse)
def reject_event_camera(
    event_id: str,
    camera_id: str,
    db: Session = Depends(get_db),
    current_photographer: Photographer = Depends(get_current_photographer),
):
    """Reject a camera device request."""
    camera = db.query(CameraDevice).filter(
        CameraDevice.id == camera_id,
        CameraDevice.event_id == event_id,
        CameraDevice.photographer_id == current_photographer.id
    ).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found or access denied")

    camera.status = "REJECTED"
    camera.rejected_at = datetime.utcnow()
    db.commit()
    db.refresh(camera)
    return camera


@router.post("/events/{event_id}/cameras/{camera_id}/revoke", response_model=CameraResponse)
def revoke_event_camera(
    event_id: str,
    camera_id: str,
    db: Session = Depends(get_db),
    current_photographer: Photographer = Depends(get_current_photographer),
):
    """Revoke upload access for an already-approved camera."""
    camera = db.query(CameraDevice).filter(
        CameraDevice.id == camera_id,
        CameraDevice.event_id == event_id,
        CameraDevice.photographer_id == current_photographer.id
    ).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found or access denied")

    camera.status = "REVOKED"
    camera.revoked_at = datetime.utcnow()
    db.commit()
    db.refresh(camera)
    return camera


@router.post("/events/{event_id}/cameras/{camera_id}/reset-ftp-password")
def reset_camera_ftp_password(
    event_id: str,
    camera_id: str,
    db: Session = Depends(get_db),
    current_photographer: Photographer = Depends(get_current_photographer),
):
    """Generate a new secure FTP password for a camera. Returns plaintext password ONCE."""
    camera = db.query(CameraDevice).filter(
        CameraDevice.id == camera_id,
        CameraDevice.event_id == event_id,
        CameraDevice.photographer_id == current_photographer.id
    ).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found or access denied")

    plain_password = secrets.token_urlsafe(8) + "Aa1!"
    camera.password_hash = hash_password(plain_password)
    db.commit()

    return {
        "camera_id": camera.id,
        "ftp_username": camera.ftp_username,
        "new_password": plain_password,
        "warning": "Save this password now. It will not be shown again."
    }


# --- Existing Wireless Endpoints ---

@router.get("/status")
def get_wireless_status():
    """Check if the background Wireless Camera FTP Server is active."""
    return {
        "is_running": wireless_server.is_running,
        "ftp_port": wireless_server.port,
        "server_ip": get_public_ip(),
        "supported_brands": ["Sony Alpha", "Canon EOS", "Nikon Z", "Fujifilm X", "Pocket Mobile Relay"],
    }


@router.post("/start")
def start_wireless_server():
    """Start the wireless camera FTP receiver."""
    wireless_server.start()
    return {"status": "started", "port": wireless_server.port, "server_ip": get_public_ip()}


@router.get("/events/{event_id}/credentials")
def get_camera_credentials(
    event_id: str,
    db: Session = Depends(get_db),
):
    """Fetch camera Wi-Fi / FTP pairing details and brand-specific menu setup steps."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    server_ip = get_public_ip()
    server_port = int(os.environ.get("FTP_PUBLIC_PORT", wireless_server.port))

    wireless_server.set_active_event_id(event.id)

    if not wireless_server.is_running:
        try:
            wireless_server.start()
        except Exception:
            pass

    dest_folder = f"/{event.slug}" if (event.slug and event.slug.strip()) else f"/{event.access_token}"

    return {
        "event_id": event.id,
        "event_name": event.name,
        "slug": event.slug,
        "access_token": event.access_token,
        "ftp_settings": {
            "host": server_ip,
            "port": server_port,
            "username": "Registered Camera FTP Username",
            "anonymous_allowed": False,
            "passive_mode": True,
            "destination_folder": dest_folder,
        },
        "http_relay_url": f"http://{server_ip}:8000/api/v1/wireless/events/{event.id}/http-ingest",
        "brand_guides": {
            "sony": {
                "title": "Sony Alpha (A7 IV, A7R V, A9, A1, FX3)",
                "steps": [
                    "1. Connect Sony camera to same Wi-Fi as laptop (Menu -> Network -> Wi-Fi).",
                    "2. Go to: Menu -> Network -> [FTP Transfer] -> [FTP Transfer Func.] -> ON.",
                    "3. Select [Server Setting 1] -> Set Host: " + server_ip + " | Port: " + str(server_port) + " | Directory: " + dest_folder + ".",
                    "4. Set User: (Camera Specific Username) | Password: (Camera Specific Password) | Passive Mode: ON.",
                    "5. Set [Auto FTP Transfer] to ON. Every shutter press will now wirelessly transmit!",
                ],
            },
            "canon": {
                "title": "Canon EOS (R5, R6 II, R3, R8, 5D IV)",
                "steps": [
                    "1. Connect Canon camera to Wi-Fi (Menu -> Communication settings -> Wi-Fi).",
                    "2. Go to: [FTP transfer settings] -> [Create New Connection].",
                    "3. Select [FTP] -> Target Host: " + server_ip + " | Port: " + str(server_port) + " | Directory: " + dest_folder + ".",
                    "4. Enter Login: (Camera Specific Username) | Password: (Camera Specific Password).",
                    "5. Enable [Automatic transfer]. New clicks will stream instantly to the gallery!",
                ],
            },
            "nikon": {
                "title": "Nikon Z Series (Z9, Z8, Z6 III, D850)",
                "steps": [
                    "1. Connect camera to Wi-Fi (Network menu -> Connect to PC / FTP).",
                    "2. Select [FTP server] -> [Add profile] -> Host: " + server_ip + " (Port " + str(server_port) + ") | Directory: " + dest_folder + ".",
                    "3. Enter User: (Camera Specific Username) | Pass: (Camera Specific Password).",
                    "4. Turn ON [Auto send]. Photos will transmit seamlessly in real-time.",
                ],
            },
            "pocket_relay": {
                "title": "Pocket Mobile 5G Relay (Sony Creators' Cloud / Canon CC)",
                "steps": [
                    "1. Pair your camera with your mobile phone via Bluetooth/Wi-Fi.",
                    "2. Photos will transfer to your phone background cache as you shoot.",
                    "3. Get My Moment Crew App automatically relays them over 5G to the event gallery!",
                ],
            },
        },
    }


@router.post("/events/{event_id}/http-ingest")
async def wireless_http_ingest(
    event_id: str,
    files: List[UploadFile] = File(...),
    camera_model: Optional[str] = Form("Wireless Camera"),
    db: Session = Depends(get_db),
):
    """Direct high-speed HTTP wireless upload endpoint for mobile relays & Wi-Fi camera tools."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    uploaded_ids = []
    for file in files:
        try:
            file_id, rel_path, file_size, sha256_hash, width, height, img_format = await storage_service.save_original_stream(
                event_id=event_id,
                upload_file=file,
                original_filename=file.filename or "wireless_click.jpg",
                studio_id=event.photographer_id,
            )

            existing = db.query(Photo).filter(
                Photo.event_id == event_id,
                Photo.sha256_hash == sha256_hash
            ).first()

            if existing:
                storage_service.delete_file(rel_path)
                continue

            photo = Photo(
                id=file_id,
                studio_id=event.photographer_id,
                event_id=event_id,
                original_file_name=file.filename or "wireless_click.jpg",
                file_path=rel_path,
                file_size=file_size,
                width=width,
                height=height,
                mime_type=f"image/{img_format}",
                sha256_hash=sha256_hash,
                status=PhotoStatus.UPLOADED.value,
                is_guest_uploaded=False,
                uploaded_by_guest_name=f"[WIRELESS] {camera_model}",
            )
            db.add(photo)
            db.commit()
            db.refresh(photo)

            dispatch_photo_processing(photo_id=photo.id, event_id=event_id, db=db)
            uploaded_ids.append(photo.id)
        except Exception:
            continue

    return {
        "event_id": event_id,
        "uploaded_count": len(uploaded_ids),
        "message": f"Successfully ingested {len(uploaded_ids)} wireless camera clicks.",
    }
