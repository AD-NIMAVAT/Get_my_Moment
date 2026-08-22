"""
Wireless Camera Management & Wi-Fi Ingest Router
Provides camera pairing credentials, step-by-step camera guides, and direct HTTP/FTP ingest status.
"""

import os
import socket
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel

from apps.api.database import get_db
from apps.api.models.event import Event
from apps.api.models.photo import Photo
from apps.api.models.photographer import Photographer
from apps.api.auth import get_current_photographer
from apps.api.services.storage import storage_service
from apps.api.services.wireless_ingest import wireless_server
from workers.ai_worker.worker import dispatch_photo_processing
from packages.shared.constants import PhotoStatus

router = APIRouter(prefix="/wireless", tags=["Wireless Camera Ingestion"])


def get_public_ip() -> str:
    """Return public FTP host IP. Uses FTP_PUBLIC_HOST env var (set on AWS/cloud), falls back to local LAN IP."""
    # Cloud/AWS deployment: use explicitly configured public host
    public_host = os.environ.get("FTP_PUBLIC_HOST")
    if public_host:
        return public_host
    # Local venue Wi-Fi: detect LAN IP automatically
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


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

    # Dynamic Public Host Detection (Railway TCP Proxy / Custom Domain / Local LAN)
    tcp_domain = os.environ.get("RAILWAY_TCP_PROXY_DOMAIN")
    tcp_port = os.environ.get("RAILWAY_TCP_PROXY_PORT")
    
    if tcp_domain and tcp_port:
        server_ip = tcp_domain
        server_port = int(tcp_port)
    elif os.environ.get("FTP_PUBLIC_HOST"):
        server_ip = os.environ.get("FTP_PUBLIC_HOST")
        server_port = int(os.environ.get("FTP_PUBLIC_PORT", 2121))
    else:
        server_ip = get_local_ip()
        server_port = wireless_server.port

    # Automatically bind incoming camera shoots to this event
    wireless_server.set_active_event_id(event.id)

    # Ensure wireless server is running
    if not wireless_server.is_running:
        try:
            wireless_server.start()
        except Exception:
            pass

    return {
        "event_id": event.id,
        "event_name": event.name,
        "access_token": event.access_token,
        "ftp_settings": {
            "host": server_ip,
            "port": server_port,
            "username": "camera",
            "password": "shoot123",
            "anonymous_allowed": True,
            "passive_mode": True,
            "destination_folder": f"/{event.access_token}",
        },
        "http_relay_url": f"http://{server_ip}:8000/api/v1/wireless/events/{event.id}/http-ingest",
        "brand_guides": {
            "sony": {
                "title": "Sony Alpha (A7 IV, A7R V, A9, A1, FX3)",
                "steps": [
                    "1. Connect Sony camera to same Wi-Fi as laptop (Menu -> Network -> Wi-Fi).",
                    "2. Go to: Menu -> Network -> [FTP Transfer] -> [FTP Transfer Func.] -> ON.",
                    "3. Select [Server Setting 1] -> Set Host: " + server_ip + " | Port: 2121.",
                    "4. Set User: 'camera' | Password: 'shoot123' | Passive Mode: ON.",
                    "5. Set [Auto FTP Transfer] to ON. Every shutter press will now wirelessly transmit!",
                ],
            },
            "canon": {
                "title": "Canon EOS (R5, R6 II, R3, R8, 5D IV)",
                "steps": [
                    "1. Connect Canon camera to Wi-Fi (Menu -> Communication settings -> Wi-Fi).",
                    "2. Go to: [FTP transfer settings] -> [Create New Connection].",
                    "3. Select [FTP] -> Target Host: " + server_ip + " | Port: 2121.",
                    "4. Enter Login: 'camera' | Password: 'shoot123'.",
                    "5. Enable [Automatic transfer]. New clicks will stream instantly to the gallery!",
                ],
            },
            "nikon": {
                "title": "Nikon Z Series (Z9, Z8, Z6 III, D850)",
                "steps": [
                    "1. Connect camera to Wi-Fi (Network menu -> Connect to PC / FTP).",
                    "2. Select [FTP server] -> [Add profile] -> Host: " + server_ip + " (Port 2121).",
                    "3. Enter User: 'camera' | Pass: 'shoot123'.",
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
        file_bytes = await file.read()
        if not file_bytes:
            continue

        sha256_hash = storage_service.calculate_sha256(file_bytes)

        # Check duplicate
        existing = db.query(Photo).filter(
            Photo.event_id == event_id,
            Photo.sha256_hash == sha256_hash
        ).first()

        if existing:
            continue

        file_id, rel_path, file_size, _ = storage_service.save_original(
            file_bytes=file_bytes,
            original_filename=file.filename or "wireless_click.jpg",
            event_id=event_id,
        )

        photo = Photo(
            id=file_id,
            event_id=event_id,
            original_file_name=file.filename or "wireless_click.jpg",
            file_path=rel_path,
            file_size=file_size,
            mime_type=file.content_type or "image/jpeg",
            sha256_hash=sha256_hash,
            status=PhotoStatus.UPLOADED.value,
            is_guest_uploaded=False,
            uploaded_by_guest_name=f"[WIRELESS] {camera_model}",
        )
        db.add(photo)
        db.commit()
        db.refresh(photo)

        # Trigger AI face matching worker
        dispatch_photo_processing(photo_id=photo.id, event_id=event_id)
        uploaded_ids.append(photo.id)

    return {
        "event_id": event_id,
        "uploaded_count": len(uploaded_ids),
        "message": f"Successfully ingested {len(uploaded_ids)} wireless camera clicks.",
    }
