"""
Wireless Camera Ingest Service for Sony, Canon, Nikon & Fujifilm Wi-Fi FTP Transfers.
Enables real-time cable-free photo ingestion directly from camera shutter clicks into targeted event folders.
"""

import os
import time
import uuid
import logging
import threading
from typing import Dict, Optional
from pyftpdlib.authorizers import DummyAuthorizer
from pyftpdlib.handlers import FTPHandler
from pyftpdlib.servers import FTPServer

from apps.api.database import SessionLocal
from apps.api.models.event import Event
from apps.api.models.photo import Photo
from apps.api.models.folder import Folder
from apps.api.services.storage import storage_service, get_or_create_uncategorized_folder, reconcile_folder_counters
from workers.ai_worker.worker import dispatch_photo_processing
from packages.shared.constants import PhotoStatus, EventStatus

logger = logging.getLogger("WirelessCameraIngest")

FTP_INCOMING_DIR = os.path.join(os.getcwd(), "data", "wireless_incoming")
os.makedirs(FTP_INCOMING_DIR, exist_ok=True)


def is_valid_uuid(val: str) -> bool:
    """Safely validate string against UUID format without raising ValueError."""
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, TypeError, AttributeError):
        return False



def process_incoming_camera_photo(
    file_path: str,
    target_event_id: Optional[str] = None,
    target_folder_id: Optional[str] = None
):
    """Core function to ingest any wireless photo from camera into the database and AI pipeline."""
    if not os.path.exists(file_path):
        return

    try:
        filename = os.path.basename(file_path)
        # Avoid temporary or partial transfer files
        if filename.startswith(".") or filename.endswith(".tmp") or filename.endswith(".part"):
            return

        # Check file minimum size
        try:
            if not os.path.exists(file_path) or os.path.getsize(file_path) < 1024:
                return
        except Exception:
            return

        with open(file_path, "rb") as f:
            file_bytes = f.read()

        if not file_bytes or len(file_bytes) < 1024:
            return

        # Verify complete image bitmap decoding
        try:
            from PIL import Image
            import io
            with Image.open(io.BytesIO(file_bytes)) as img:
                img.verify()
            with Image.open(io.BytesIO(file_bytes)) as img:
                img.load()
        except Exception as img_err:
            logger.debug(f"Camera photo '{filename}' is incomplete ({img_err}). Waiting...")
            return

        db = SessionLocal()
        try:
            event = None
            camera_name = "[CAMERA] Wi-Fi Direct Shoot"
            matched_folder_from_path = None

            # Determine relative path from FTP_INCOMING_DIR
            try:
                rel_path = os.path.relpath(os.path.abspath(file_path), os.path.abspath(FTP_INCOMING_DIR))
            except Exception:
                rel_path = os.path.basename(file_path)

            # Normalize slashes and reject traversal attempts
            normalized_rel = rel_path.replace("\\", "/").strip("/")
            path_segments = [p.strip() for p in normalized_rel.split("/") if p.strip() and p.strip() != "."]

            if any(seg in ("..", "~") for seg in path_segments):
                logger.warning(f"⚠️ [WIRELESS CAMERA] Path traversal attempt rejected: {file_path}")
                return

            if len(path_segments) > 1:
                # Structure: [root_event_dir, optional_subfolders..., filename]
                root_dir = path_segments[0]

                # 1. EXACT Event.slug matching with ambiguity protection
                slug_matches = db.query(Event).filter(
                    Event.slug == root_dir,
                    Event.is_deleted == False
                ).all()

                if len(slug_matches) == 1:
                    event = slug_matches[0]
                elif len(slug_matches) > 1:
                    # Disambiguate if target_event_id or active_event_id matches one of them
                    disambiguated = [e for e in slug_matches if e.id == wireless_server.active_event_id or e.id == target_event_id]
                    if len(disambiguated) == 1:
                        event = disambiguated[0]
                    else:
                        logger.warning(f"⚠️ [WIRELESS CAMERA] Ambiguous event slug '{root_dir}' matched {len(slug_matches)} events. Failing closed.")
                        return

                # 2. EXACT legacy Event.access_token matching (backward compatibility)
                if not event:
                    token_matches = db.query(Event).filter(
                        Event.access_token == root_dir,
                        Event.is_deleted == False
                    ).all()
                    if len(token_matches) == 1:
                        event = token_matches[0]
                    elif len(token_matches) > 1:
                        disambiguated = [e for e in token_matches if e.id == wireless_server.active_event_id or e.id == target_event_id]
                        if len(disambiguated) == 1:
                            event = disambiguated[0]
                        else:
                            logger.warning(f"⚠️ [WIRELESS CAMERA] Ambiguous access_token '{root_dir}' matched {len(token_matches)} events. Failing closed.")
                            return

                # 3. EXACT Event.id UUID matching (only if valid UUID string)
                if not event and is_valid_uuid(root_dir):
                    event = db.query(Event).filter(
                        Event.id == root_dir,
                        Event.is_deleted == False
                    ).first()

                # If root directory was provided by camera but matches NO valid event, FAIL CLOSED
                if not event:
                    logger.warning(f"⚠️ [WIRELESS CAMERA] Unknown event routing directory '{root_dir}'. Ingest rejected (fail closed).")
                    return

                # Check optional subfolder inside the already-resolved event
                if len(path_segments) > 2:
                    sub_name = path_segments[1]
                    sub_folder = db.query(Folder).filter(
                        Folder.event_id == event.id,
                        Folder.deleted_at.is_(None),
                        (Folder.slug == sub_name) | (Folder.name == sub_name)
                    ).first()
                    if sub_folder:
                        matched_folder_from_path = sub_folder
                        camera_name = f"[CAMERA] {sub_folder.name}"
                    else:
                        camera_name = f"[CAMERA] {sub_name}"

            else:
                # Direct FTP root upload without subfolder: resolve via explicit context
                if target_event_id:
                    event = db.query(Event).filter(Event.id == target_event_id, Event.is_deleted == False).first()
                elif wireless_server.active_event_id:
                    event = db.query(Event).filter(Event.id == wireless_server.active_event_id, Event.is_deleted == False).first()

                if not event:
                    logger.warning(f"⚠️ [WIRELESS CAMERA] Direct root upload without target event context for '{filename}'. Ingest rejected (fail closed).")
                    return

            event_id = event.id
            studio_id = event.photographer_id

            # Resolve Target Folder
            target_folder = matched_folder_from_path
            if not target_folder:
                resolved_folder_id = target_folder_id or wireless_server.get_camera_folder(camera_name) or wireless_server.active_folder_id
                if resolved_folder_id:
                    target_folder = db.query(Folder).filter(
                        Folder.id == resolved_folder_id,
                        Folder.event_id == event_id,
                        Folder.deleted_at.is_(None)
                    ).first()

            # Graceful Fallback to Uncategorized folder
            if not target_folder:
                target_folder = get_or_create_uncategorized_folder(db, studio_id=studio_id, event_id=event_id)

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
                studio_id=studio_id,
                folder_id=target_folder.id,
            )

            photo = Photo(
                id=file_id,
                studio_id=studio_id,
                event_id=event_id,
                folder_id=target_folder.id,
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

            # Reconcile counters
            reconcile_folder_counters(db, event_id=event_id, folder_id=target_folder.id)

            logger.info(f"📸 ✅ [WIRELESS CAMERA SYNCED] Photo '{filename}' ingested into Folder '{target_folder.name}' in Event '{event.name}'")

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
        process_incoming_camera_photo(
            file_path,
            target_event_id=wireless_server.active_event_id,
            target_folder_id=wireless_server.active_folder_id
        )


class WirelessCameraServerManager:
    """Manages the background FTP listener, multi-camera sessions, and folder routing."""

    def __init__(self, host: str = "0.0.0.0", port: int = 2121):
        self.host = host
        self.port = int(os.environ.get("FTP_PORT", port))
        self.server: Optional[FTPServer] = None
        self.thread: Optional[threading.Thread] = None
        self.watcher_thread: Optional[threading.Thread] = None
        self.is_running = False
        self.active_event_id: Optional[str] = None
        self.active_folder_id: Optional[str] = None
        self.camera_sessions: Dict[str, dict] = {}

    def set_active_event_id(self, event_id: str, folder_id: Optional[str] = None):
        """Set the active event and optional active folder currently being shot."""
        self.active_event_id = event_id
        if folder_id:
            self.active_folder_id = folder_id
        logger.info(f"🎯 Wireless Camera Active Event set to: {event_id}, Folder: {self.active_folder_id}")

    def set_active_folder_id(self, folder_id: Optional[str]):
        """Set or clear the active target folder for incoming camera photos."""
        self.active_folder_id = folder_id
        logger.info(f"🎯 Wireless Camera Active Folder set to: {folder_id}")

    def set_camera_session(self, camera_id: str, studio_id: str, event_id: str, folder_id: Optional[str] = None):
        """Map specific camera device ID to an independent event & folder destination."""
        self.camera_sessions[camera_id] = {
            "studio_id": studio_id,
            "event_id": event_id,
            "folder_id": folder_id,
            "last_active": time.time(),
        }
        logger.info(f"📷 Camera session updated: {camera_id} -> Event {event_id}, Folder {folder_id}")

    def get_camera_folder(self, camera_id: str) -> Optional[str]:
        """Get the active folder mapped to a specific camera session."""
        session = self.camera_sessions.get(camera_id)
        return session.get("folder_id") if session else None

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
                                    process_incoming_camera_photo(
                                        full_path,
                                        target_event_id=self.active_event_id,
                                        target_folder_id=self.active_folder_id
                                    )
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
        authorizer.add_anonymous(FTP_INCOMING_DIR, perm="elradfmwM")
        authorizer.add_user("camera", "shoot123", FTP_INCOMING_DIR, perm="elradfmwM")
        authorizer.add_user("sony", "sony123", FTP_INCOMING_DIR, perm="elradfmwM")
        authorizer.add_user("canon", "canon123", FTP_INCOMING_DIR, perm="elradfmwM")
        authorizer.add_user("nikon", "nikon123", FTP_INCOMING_DIR, perm="elradfmwM")
        authorizer.add_user("fuji", "fuji123", FTP_INCOMING_DIR, perm="elradfmwM")

        handler = CameraFTPHandler
        handler.authorizer = authorizer
        handler.banner = "Get My Moment Wireless Camera Ingest Ready"

        tcp_domain = os.environ.get("RAILWAY_TCP_PROXY_DOMAIN", os.environ.get("FTP_PUBLIC_HOST"))
        if tcp_domain:
            handler.masquerade_address = tcp_domain
            logger.info(f"🌐 FTP Masquerade Address set to: {tcp_domain}")

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


wireless_server = WirelessCameraServerManager(host="0.0.0.0", port=2121)
