"""
Wireless Camera Real-Time Auto-Sync Engine for Get My Moment.
Supports Sony Alpha, Canon EOS, Nikon Z, and Fujifilm Wi-Fi FTP background ingest.
Strictly enforces per-camera authorization, approval lifecycle, and event-bound access control.
"""

import os
import time
import logging
import threading
import uuid
from datetime import datetime
from typing import Dict, Optional, List, Callable
from pyftpdlib.authorizers import DummyAuthorizer, AuthenticationFailed
from pyftpdlib.handlers import FTPHandler
from pyftpdlib.servers import FTPServer
from PIL import Image

from apps.api.database import SessionLocal
from apps.api.models import Photo, Event, Folder, CameraDevice
from packages.shared.constants import PhotoStatus
from apps.api.services.storage import storage_service, get_or_create_uncategorized_folder, reconcile_folder_counters
from apps.api.auth import verify_password
from workers.ai_worker.worker import dispatch_photo_processing

logger = logging.getLogger("WirelessCameraIngest")
logger.setLevel(logging.INFO)

FTP_INCOMING_DIR = os.path.join(os.getcwd(), "data", "wireless_incoming")
os.makedirs(FTP_INCOMING_DIR, exist_ok=True)


def is_valid_uuid(val: str) -> bool:
    """Safely validate string against UUID format without raising ValueError."""
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, TypeError, AttributeError):
        return False


class CameraAuthorizer(DummyAuthorizer):
    """
    Database-backed Authorizer for Wireless Cameras with bcrypt verification.
    Provides session-safe authentication, records first_seen_at/last_seen_at/source_ip,
    and enforces status checks.
    Fails closed on any unknown identity, anonymous access, or database disconnection.
    """

    def __init__(self, db_factory: Optional[Callable] = None):
        super().__init__()
        self.db_factory = db_factory or SessionLocal

    def _get_db(self):
        return self.db_factory()

    def has_user(self, username: str) -> bool:
        if not username or username == "anonymous":
            return False
        try:
            db = self._get_db()
            try:
                cam = db.query(CameraDevice).filter(CameraDevice.ftp_username == username).first()
                return cam is not None
            finally:
                db.close()
        except Exception:
            return False

    def validate_authentication(self, username, password, handler):
        msg = "Authentication failed."
        if not username or username == "anonymous":
            raise AuthenticationFailed("Anonymous access not allowed.")

        # Check Database CameraDevice
        try:
            db = self._get_db()
            try:
                camera = db.query(CameraDevice).filter(CameraDevice.ftp_username == username).first()
                if not camera:
                    raise AuthenticationFailed(msg)

                # Verify bcrypt password hash
                if not verify_password(password, camera.password_hash):
                    raise AuthenticationFailed(msg)

                # If camera is explicitly REJECTED or REVOKED, deny connection
                if camera.status == "REJECTED":
                    raise AuthenticationFailed("Camera authorization rejected.")
                if camera.status == "REVOKED":
                    raise AuthenticationFailed("Camera authorization revoked.")

                # Record observational connection metadata (login / connection detection)
                now = datetime.utcnow()
                if not camera.first_seen_at:
                    camera.first_seen_at = now
                camera.last_seen_at = now
                try:
                    camera.last_source_ip = getattr(handler, "remote_ip", None)
                except Exception:
                    pass
                db.commit()

                # Ensure event directory exists on disk for camera CWD/MKD/upload
                if camera.event_id:
                    event = db.query(Event).filter(Event.id == camera.event_id).first()
                    if event:
                        if event.slug:
                            os.makedirs(os.path.join(FTP_INCOMING_DIR, event.slug), exist_ok=True)
                        if event.access_token:
                            os.makedirs(os.path.join(FTP_INCOMING_DIR, event.access_token), exist_ok=True)

                # Attach camera identity and event binding to handler context
                handler.authenticated_camera_id = camera.id
                handler.authenticated_camera_event_id = camera.event_id
                handler.authenticated_camera_status = camera.status
                handler.authenticated_camera_name = camera.display_name
                handler.authenticated_camera_photographer_id = camera.photographer_id
            finally:
                db.close()
        except AuthenticationFailed:
            raise
        except Exception as e:
            logger.error(f"Error during camera authentication for {username}: {e}", exc_info=True)
            raise AuthenticationFailed("Database error during authentication")

    def get_home_dir(self, username: str) -> str:
        return FTP_INCOMING_DIR

    def has_perm(self, username, perm, path=None):
        return True

    def get_perms(self, username: str) -> str:
        return "elradfmwM"

    def get_msg_login(self, username: str) -> str:
        return "Welcome to Get My Moment Wireless Camera FTP Server"

    def get_msg_quit(self, username: str) -> str:
        return "Goodbye"


def process_incoming_camera_photo(
    file_path: str,
    target_event_id: Optional[str] = None,
    target_folder_id: Optional[str] = None,
    db: Optional[object] = None,
    camera_username: Optional[str] = None,
    camera_id: Optional[str] = None,
    incoming_base_dir: Optional[str] = None
):
    """
    Processes a photo received via wireless camera FTP upload or background directory watcher.
    Extracts event identifier from path, strictly enforces CameraDevice approval and event-binding,
    stores the photo, and dispatches AI face indexing.
    """
    try:
        # Ignore temporary / partial files written during active transfers
        filename = os.path.basename(file_path)
        if filename.startswith(".") or filename.endswith((".tmp", ".part", ".crdownload")):
            return

        # Check that file exists and is not zero bytes
        if not os.path.exists(file_path):
            return

        file_size_bytes = os.path.getsize(file_path)
        if file_size_bytes == 0:
            logger.warning(f"Zero byte file detected: {file_path}. Skipping.")
            return

        # Verify image integrity via PIL
        try:
            with Image.open(file_path) as img:
                img.verify()
        except Exception as e:
            logger.warning(f"File {file_path} is not a valid or complete image yet: {e}")
            return

        # Read file bytes
        with open(file_path, "rb") as f:
            file_bytes = f.read()

        close_db_on_exit = False
        if db is None:
            db = SessionLocal()
            close_db_on_exit = True

        try:
            # Parse directory path relative to base directory
            base_dir = incoming_base_dir or FTP_INCOMING_DIR
            rel_path_to_incoming = os.path.relpath(file_path, base_dir)
            path_segments = [seg for seg in rel_path_to_incoming.replace(os.sep, "/").split("/") if seg and seg != "."]

            event = None
            matched_folder_from_path = None

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
                    disambiguated = [e for e in slug_matches if e.id == wireless_server.active_event_id or e.id == target_event_id]
                    if len(disambiguated) == 1:
                        event = disambiguated[0]
                    else:
                        logger.warning(f"⚠️ [WIRELESS CAMERA] Ambiguous event slug '{root_dir}' matched {len(slug_matches)} events. Failing closed.")
                        return

                # 2. EXACT legacy Event.access_token matching
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
                    logger.warning(f"⚠️ [WIRELESS CAMERA] Directory '{root_dir}' does not match any valid Event. Ingest rejected (Fail Closed).")
                    return

                # Nested subfolder resolution (if camera created subfolders inside event)
                if len(path_segments) > 2:
                    subfolder_name = path_segments[1]
                    matched_folder_from_path = db.query(Folder).filter(
                        Folder.event_id == event.id,
                        (Folder.slug == subfolder_name) | (Folder.name == subfolder_name)
                    ).first()

            # Fallback to active_event_id or target_event_id only if no root directory was prepended
            if not event:
                candidate_id = target_event_id or wireless_server.active_event_id
                if candidate_id:
                    event = db.query(Event).filter(
                        Event.id == candidate_id,
                        Event.is_deleted == False
                    ).first()

            if not event:
                logger.warning(f"⚠️ [WIRELESS CAMERA] No valid Event resolved for incoming photo '{filename}'. Ingest aborted.")
                return

            # --- CAMERA DEVICE AUTHORIZATION GATE ---
            camera_device = None
            if camera_id:
                camera_device = db.query(CameraDevice).filter(CameraDevice.id == camera_id).first()
            elif camera_username:
                camera_device = db.query(CameraDevice).filter(CameraDevice.ftp_username == camera_username).first()

            # FAIL CLOSED: Physical FTP ingest strictly requires a valid registered CameraDevice
            if not camera_device:
                logger.warning(
                    f"⚠️ [WIRELESS CAMERA] Ingest DENIED: No registered CameraDevice found "
                    f"(camera_id={camera_id}, username={camera_username}). FTP upload rejected."
                )
                try:
                    os.remove(file_path)
                except Exception:
                    pass
                return

            # Gate 1: Must be APPROVED
            if camera_device.status != "APPROVED":
                logger.warning(
                    f"⚠️ [WIRELESS CAMERA] Ingest DENIED: Camera '{camera_device.display_name}' "
                    f"({camera_device.ftp_username}) status is '{camera_device.status}' (Must be APPROVED). Photo discarded."
                )
                try:
                    os.remove(file_path)
                except Exception:
                    pass
                return

            # Gate 2: Strict Event Binding Verification: Camera event_id must match resolved event.id
            if camera_device.event_id != event.id:
                logger.warning(
                    f"⚠️ [WIRELESS CAMERA] Ingest DENIED: Camera '{camera_device.display_name}' is bound to Event {camera_device.event_id}, "
                    f"but attempted upload to Event {event.id} ({event.name}). Cross-event upload strictly blocked."
                )
                try:
                    os.remove(file_path)
                except Exception:
                    pass
                return

            # Gate 3: Photographer Ownership Verification
            if camera_device.photographer_id != event.photographer_id:
                logger.warning(
                    f"⚠️ [WIRELESS CAMERA] Ingest DENIED: Camera photographer {camera_device.photographer_id} "
                    f"does not own destination event photographer {event.photographer_id}. Ingest blocked."
                )
                try:
                    os.remove(file_path)
                except Exception:
                    pass
                return

            # Record upload timestamp
            camera_device.last_upload_at = datetime.utcnow()
            db.commit()
            camera_name = f"[CAMERA] {camera_device.display_name}"

            event_id = event.id
            studio_id = event.photographer_id

            # Determine destination folder
            target_folder = None
            if matched_folder_from_path:
                target_folder = matched_folder_from_path
            elif target_folder_id:
                target_folder = db.query(Folder).filter(Folder.id == target_folder_id, Folder.event_id == event_id).first()
            elif wireless_server.active_folder_id:
                target_folder = db.query(Folder).filter(Folder.id == wireless_server.active_folder_id, Folder.event_id == event_id).first()

            if not target_folder:
                target_folder = get_or_create_uncategorized_folder(db, studio_id=studio_id, event_id=event_id)

            # Check duplicate by sha256
            import hashlib
            sha256_hash = hashlib.sha256(file_bytes).hexdigest()
            existing = db.query(Photo).filter(
                Photo.event_id == event_id,
                Photo.sha256_hash == sha256_hash,
                Photo.is_deleted == False
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
                camera_id=camera_device.id if camera_device else None,
                camera_model=camera_device.model if (camera_device and camera_device.model) else None,
            )
            db.add(photo)
            db.commit()
            db.refresh(photo)

            reconcile_folder_counters(db, event_id=event.id, folder_id=target_folder.id)
            logger.info(f"📸 ✅ [WIRELESS CAMERA SYNCED] Photo '{filename}' ingested into Folder '{target_folder.name}' in Event '{event.name}'")

            # Dispatch AI face recognition worker
            dispatch_photo_processing(photo_id=photo.id, event_id=event_id)

            # Remove from incoming staging directory
            try:
                os.remove(file_path)
            except Exception:
                pass

        finally:
            if close_db_on_exit and db is not None:
                db.close()

    except Exception as e:
        logger.error(f"Error processing wireless photo {file_path}: {e}", exc_info=True)


class CameraFTPHandler(FTPHandler):
    """Custom FTP handler that processes wireless photos arriving from DSLR / Mirrorless cameras."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.authenticated_camera_id: Optional[str] = None
        self.authenticated_camera_event_id: Optional[str] = None
        self.authenticated_camera_status: Optional[str] = None
        self.authenticated_camera_name: Optional[str] = None
        self.authenticated_camera_photographer_id: Optional[str] = None

    def on_file_received(self, file_path: str):
        """Triggered automatically when camera completes Wi-Fi FTP file transfer."""
        super().on_file_received(file_path)
        logger.info(f"📸 [WIRELESS CAMERA FTP] File received from camera: {file_path} (User: {self.username})")
        process_incoming_camera_photo(
            file_path,
            target_event_id=getattr(self, "authenticated_camera_event_id", None) or wireless_server.active_event_id,
            target_folder_id=wireless_server.active_folder_id,
            camera_username=self.username,
            camera_id=getattr(self, "authenticated_camera_id", None)
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
        """Start the background FTP server with database-backed CameraAuthorizer."""
        if self.is_running:
            return

        authorizer = CameraAuthorizer()
        handler = CameraFTPHandler
        handler.authorizer = authorizer
        handler.banner = "Get My Moment Wireless Camera Ingest Ready"

        # Explicitly configure passive ports range matching Docker & UFW firewall
        handler.passive_ports = range(30000, 30101)

        tcp_domain = os.environ.get("RAILWAY_TCP_PROXY_DOMAIN", os.environ.get("FTP_PUBLIC_HOST"))
        if tcp_domain:
            handler.masquerade_address = tcp_domain
            logger.info(f"🌐 FTP Masquerade Address set to: {tcp_domain}")

        # Pre-create incoming directories for all active events
        try:
            db = SessionLocal()
            try:
                events = db.query(Event).filter(Event.is_deleted == False).all()
                for e in events:
                    if e.slug:
                        os.makedirs(os.path.join(FTP_INCOMING_DIR, e.slug), exist_ok=True)
                    if e.access_token:
                        os.makedirs(os.path.join(FTP_INCOMING_DIR, e.access_token), exist_ok=True)
            finally:
                db.close()
        except Exception:
            pass

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
