"""
Wireless Camera Ingest Service for Sony, Canon, Nikon & Fujifilm Wi-Fi FTP Transfers.
Enables real-time cable-free photo ingestion directly from camera shutter clicks.
"""

import os
import time
import logging
import threading
from typing import Dict, Optional
from pyftpdlib.authorizers import DummyAuthorizer
from pyftpdlib.handlers import FTPHandler
from pyftpdlib.servers import FTPServer

from apps.api.database import SessionLocal
from apps.api.models.event import Event
from apps.api.models.photo import Photo
from apps.api.services.storage import storage_service
from workers.ai_worker.worker import dispatch_photo_processing
from packages.shared.constants import PhotoStatus, EventStatus

logger = logging.getLogger("WirelessCameraIngest")

FTP_INCOMING_DIR = os.path.join(os.getcwd(), "data", "wireless_incoming")
os.makedirs(FTP_INCOMING_DIR, exist_ok=True)


def process_incoming_camera_photo(file_path: str, target_event_id: Optional[str] = None):
    """Core function to ingest any wireless photo from camera into the database and AI pipeline."""
    if not os.path.exists(file_path):
        return

    try:
        filename = os.path.basename(file_path)
        # Avoid temporary or partial transfer files
        if filename.startswith(".") or filename.endswith(".tmp") or filename.endswith(".part"):
            return

        # Check if file is still being written by camera Wi-Fi socket
        try:
            initial_size = os.path.getsize(file_path)
            if initial_size < 1024:
                return
            time.sleep(0.4)
            if not os.path.exists(file_path):
                return
            if os.path.getsize(file_path) != initial_size:
                return  # Still streaming from camera

            # Ensure file hasn't been modified in the last 0.5 seconds
            if time.time() - os.path.getmtime(file_path) < 0.5:
                return
        except Exception:
            return

        with open(file_path, "rb") as f:
            file_bytes = f.read()

        if not file_bytes or len(file_bytes) < 1024:
            return

        # Crucial: Verify complete image bitmap decoding to prevent truncated / half-rendered photos
        try:
            from PIL import Image
            import io
            with Image.open(io.BytesIO(file_bytes)) as img:
                img.verify()
            with Image.open(io.BytesIO(file_bytes)) as img:
                img.load()
        except Exception as img_err:
            logger.debug(f"Camera photo '{filename}' is still incomplete/truncated ({img_err}). Waiting for transfer...")
            return

        db = SessionLocal()
        try:
            event = None
            camera_name = "[CAMERA] Wi-Fi Direct Shoot"

            # 1. Check path tokens in subfolders (e.g. /incoming/{access_token}/IMG_0001.JPG)
            parts = file_path.replace("\\", "/").split("/")
            for i, part in enumerate(parts):
                match = db.query(Event).filter((Event.access_token == part) | (Event.id == part)).first()
                if match:
                    event = match
                    # Check if next subfolder indicates camera identity (e.g. /access_token/Camera_A1/...)
                    if i + 1 < len(parts) - 1:
                        camera_name = f"[CAMERA] {parts[i+1]}"
                    break

            # 2. Check explicit target_event_id
            if not event and target_event_id:
                event = db.query(Event).filter(Event.id == target_event_id).first()

            # 3. Check active event set in wireless server singleton
            if not event and wireless_server.active_event_id:
                event = db.query(Event).filter(Event.id == wireless_server.active_event_id).first()

            # 4. Fallback: Automatically map to the latest active event so camera clicks are never lost
            if not event:
                event = db.query(Event).filter(Event.status == EventStatus.ACTIVE.value).order_by(Event.created_at.desc()).first()

            # 5. Last resort fallback: latest event in DB
            if not event:
                event = db.query(Event).order_by(Event.created_at.desc()).first()

            if not event:
                logger.warning(f"⚠️ [WIRELESS CAMERA] No events exist in database yet to ingest camera photo '{filename}'.")
                return

            event_id = event.id
            sha256_hash = storage_service.calculate_sha256(file_bytes)

            # Check duplicate in same event
            existing = db.query(Photo).filter(
                Photo.event_id == event_id,
                Photo.sha256_hash == sha256_hash
            ).first()

            if existing:
                logger.info(f"Duplicate wireless photo skipped: {filename}")
                try:
                    os.remove(file_path)
                except Exception:
                    pass
                return

            file_id, rel_path, file_size, _ = storage_service.save_original(
                file_bytes=file_bytes,
                original_filename=filename,
                event_id=event_id,
            )

            photo = Photo(
                id=file_id,
                event_id=event_id,
                original_file_name=filename,
                file_path=rel_path,
                file_size=file_size,
                mime_type="image/jpeg",
                sha256_hash=sha256_hash,
                status=PhotoStatus.UPLOADED.value,
                is_guest_uploaded=False,
                uploaded_by_guest_name=camera_name,
                camera_id=camera_name,
                camera_model="Wireless Camera Wi-Fi Ingest",
            )
            db.add(photo)
            db.commit()
            db.refresh(photo)

            logger.info(f"📸 ✅ [WIRELESS CAMERA SYNCED] Photo '{filename}' (ID={photo.id[:8]}) ingested into Event '{event.name}' ({event.id[:8]})")

            # Dispatch AI face recognition worker
            dispatch_photo_processing(photo_id=photo.id, event_id=event_id)

            # Remove from incoming staging directory
            try:
                os.remove(file_path)
            except Exception:
                pass

        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error processing wireless photo {file_path}: {e}", exc_info=True)


class CameraFTPHandler(FTPHandler):
    """Custom FTP handler that processes wireless photos arriving from DSLR / Mirrorless cameras."""

    def on_file_received(self, file_path: str):
        """Triggered automatically when camera completes Wi-Fi FTP file transfer."""
        super().on_file_received(file_path)
        logger.info(f"📸 [WIRELESS CAMERA FTP] File received from camera: {file_path}")
        process_incoming_camera_photo(file_path, target_event_id=wireless_server.active_event_id)


class WirelessCameraServerManager:
    """Manages the background FTP listener and incoming watcher for Sony/Canon/Nikon/Fuji Wi-Fi shoots."""

    def __init__(self, host: str = "0.0.0.0", port: int = 2121):
        self.host = host
        self.port = int(os.environ.get("FTP_PORT", port))
        self.server: Optional[FTPServer] = None
        self.thread: Optional[threading.Thread] = None
        self.watcher_thread: Optional[threading.Thread] = None
        self.is_running = False
        self.active_event_id: Optional[str] = None

    def set_active_event_id(self, event_id: str):
        """Set the active event currently being shot by the photographer."""
        self.active_event_id = event_id
        logger.info(f"🎯 Wireless Camera Active Event set to: {event_id}")

    def _watch_incoming_loop(self):
        """Background continuous scanner for incoming camera subfolders (Sony, Canon, Nikon DCIM)."""
        valid_extensions = (".jpg", ".jpeg", ".png", ".arw", ".cr3", ".nef", ".JPG", ".JPEG", ".PNG")
        while self.is_running:
            try:
                for root, dirs, files in os.walk(FTP_INCOMING_DIR):
                    for file in files:
                        if file.lower().endswith(valid_extensions):
                            full_path = os.path.join(root, file)
                            try:
                                if os.path.exists(full_path) and (time.time() - os.path.getmtime(full_path) >= 0.8):
                                    process_incoming_camera_photo(full_path, self.active_event_id)
                            except Exception:
                                pass
            except Exception as e:
                logger.error(f"Error in wireless incoming watcher: {e}")
            time.sleep(1.0)

    def start(self):
        """Start the background FTP server and directory watcher."""
        if self.is_running:
            return

        authorizer = DummyAuthorizer()

        # Add anonymous / default guest user for easy camera Wi-Fi pairing
        authorizer.add_anonymous(FTP_INCOMING_DIR, perm="elradfmwM")

        # Add standard studio camera user credentials
        authorizer.add_user("camera", "shoot123", FTP_INCOMING_DIR, perm="elradfmwM")
        authorizer.add_user("sony", "sony123", FTP_INCOMING_DIR, perm="elradfmwM")
        authorizer.add_user("canon", "canon123", FTP_INCOMING_DIR, perm="elradfmwM")
        authorizer.add_user("nikon", "nikon123", FTP_INCOMING_DIR, perm="elradfmwM")
        authorizer.add_user("fuji", "fuji123", FTP_INCOMING_DIR, perm="elradfmwM")

        handler = CameraFTPHandler
        handler.authorizer = authorizer
        handler.banner = "Get My Moment Wireless Camera Ingest Ready"

        # Configure public masquerade address for cloud TCP proxy NAT traversal
        tcp_domain = os.environ.get("RAILWAY_TCP_PROXY_DOMAIN", os.environ.get("FTP_PUBLIC_HOST"))
        if tcp_domain:
            handler.masquerade_address = tcp_domain
            logger.info(f"🌐 FTP Masquerade Address set to: {tcp_domain}")

        # Exclude HTTP API PORT from FTP ports to prevent binding collision
        http_port = int(os.environ.get("PORT", 8000))
        target_port = self.port if self.port != http_port else 2122
        candidate_ports = [target_port] + [p for p in [2121, 2122, 2125, 2120] if p != http_port and p != target_port]

        bound = False
        for p in candidate_ports:
            try:
                self.server = FTPServer((self.host, p), handler)
                self.port = p
                bound = True
                break
            except Exception as e:
                logger.warning(f"Could not bind FTP on {self.host}:{p} ({e}). Trying next port...")

        if not bound:
            logger.error("Could not bind Wireless Camera FTP on any port.")
            return

        try:
            self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
            self.thread.start()
            self.is_running = True

            # Start folder watcher thread
            self.watcher_thread = threading.Thread(target=self._watch_incoming_loop, daemon=True)
            self.watcher_thread.start()

            logger.info(f"🚀 Wireless Camera FTP Server running on {self.host}:{self.port} & Ingest Watcher active.")
        except Exception as e:
            logger.error(f"Failed to start Wireless Camera FTP Server: {e}")

    def stop(self):
        """Stop the FTP server."""
        if self.server and self.is_running:
            self.server.close_all()
            self.is_running = False
            logger.info("Wireless Camera FTP Server stopped.")


# Global Singleton Manager
wireless_server = WirelessCameraServerManager(host="0.0.0.0", port=2121)
