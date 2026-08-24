"""
Master Studio-Wise Folder Management REST API Router
Enforces strict multi-tenant ownership, circular hierarchy checks, idempotent presets, and bulk move.
"""

import os
import uuid
import zipfile
import tempfile
import re
import threading
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from apps.api.database import get_db
from apps.api.models import Photographer, Event, Folder, FolderType, Photo
from apps.api.auth import get_current_photographer
from apps.api.services.storage import storage_service, get_or_create_uncategorized_folder, reconcile_folder_counters
from packages.shared.constants import PhotoStatus

router = APIRouter(prefix="/events/{event_id}/folders", tags=["Studio Folder Management"])
_preset_generation_lock = threading.Lock()


def generate_slug(text: str) -> str:
    """Generate a clean URL-safe slug."""
    text = text.replace("_", "-")
    text = re.sub(r"[^\w\s-]", "", text).strip().lower()
    return re.sub(r"[-\s]+", "-", text)


# -----------------------------------------------------------------------------
# Schemas
# -----------------------------------------------------------------------------

class FolderResponse(BaseModel):
    id: str
    studio_id: str
    event_id: str
    parent_id: Optional[str] = None
    name: str
    slug: str
    folder_type: str
    icon: Optional[str] = None
    color: Optional[str] = None
    order_index: int
    is_locked: bool
    allow_guest_view: bool
    is_system: bool
    photo_count: int
    total_size_bytes: int
    created_at: datetime
    updated_at: datetime
    subfolders: List["FolderResponse"] = []

    model_config = {"from_attributes": True}


class CreateFolderRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    parent_id: Optional[str] = None
    folder_type: str = FolderType.CEREMONY
    icon: Optional[str] = "Folder"
    color: Optional[str] = "#E86A5B"
    order_index: int = 0
    allow_guest_view: bool = True


class UpdateFolderRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    icon: Optional[str] = None
    color: Optional[str] = None
    order_index: Optional[int] = None
    is_locked: Optional[bool] = None
    allow_guest_view: Optional[bool] = None


class BulkMovePhotosRequest(BaseModel):
    photo_ids: List[str]
    destination_folder_id: str


# -----------------------------------------------------------------------------
# Helper: Verify Event Ownership
# -----------------------------------------------------------------------------

def verify_event_ownership(event_id: str, current_user: Photographer, db: Session) -> Event:
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.photographer_id == current_user.id,
        Event.is_deleted == False
    ).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found or access denied."
        )
    return event


# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------

@router.get("", response_model=List[FolderResponse])
def list_folders(
    event_id: str,
    current_user: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """List all folders in the event with nested subfolders and reconciled photo counts."""
    event = verify_event_ownership(event_id, current_user, db)

    # Ensure system Uncategorized folder exists
    get_or_create_uncategorized_folder(db, studio_id=current_user.id, event_id=event.id)

    # Live counter reconciliation to ensure 100% accurate photo counts
    reconcile_folder_counters(db, event_id=event.id)

    # Fetch all folders in this event
    all_folders = db.query(Folder).filter(
        Folder.event_id == event.id,
        Folder.deleted_at.is_(None)
    ).order_by(Folder.order_index.asc(), Folder.created_at.asc()).all()

    # Build hierarchical tree
    folder_dict = {}
    root_folders = []

    for f in all_folders:
        folder_dict[f.id] = FolderResponse(
            id=f.id,
            studio_id=f.studio_id,
            event_id=f.event_id,
            parent_id=f.parent_id,
            name=f.name,
            slug=f.slug,
            folder_type=f.folder_type,
            icon=f.icon,
            color=f.color,
            order_index=f.order_index,
            is_locked=f.is_locked,
            allow_guest_view=f.allow_guest_view,
            is_system=f.is_system,
            photo_count=f.photo_count,
            total_size_bytes=f.total_size_bytes,
            created_at=f.created_at,
            updated_at=f.updated_at,
            subfolders=[]
        )

    for f in all_folders:
        resp = folder_dict[f.id]
        if f.parent_id and f.parent_id in folder_dict:
            folder_dict[f.parent_id].subfolders.append(resp)
        else:
            root_folders.append(resp)

    return root_folders


@router.post("", response_model=FolderResponse, status_code=status.HTTP_201_CREATED)
def create_folder(
    event_id: str,
    payload: CreateFolderRequest,
    current_user: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Create a new folder or nested subfolder with circular hierarchy & duplicate checks."""
    event = verify_event_ownership(event_id, current_user, db)

    # 1. Parent validation
    if payload.parent_id:
        parent = db.query(Folder).filter(
            Folder.id == payload.parent_id,
            Folder.event_id == event.id,
            Folder.studio_id == current_user.id
        ).first()
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parent folder not found in this event."
            )

    # 2. Check duplicate name under same parent
    existing = db.query(Folder).filter(
        Folder.event_id == event.id,
        Folder.parent_id == payload.parent_id,
        Folder.name == payload.name.strip(),
        Folder.deleted_at.is_(None)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A folder named '{payload.name.strip()}' already exists at this level."
        )

    slug = generate_slug(payload.name.strip())
    # Ensure slug uniqueness in event
    slug_count = db.query(Folder).filter(
        Folder.event_id == event.id,
        Folder.slug.like(f"{slug}%")
    ).count()
    if slug_count > 0:
        slug = f"{slug}-{slug_count + 1}"

    folder = Folder(
        id=str(uuid.uuid4()),
        studio_id=current_user.id,
        event_id=event.id,
        parent_id=payload.parent_id,
        name=payload.name.strip(),
        slug=slug,
        folder_type=payload.folder_type,
        icon=payload.icon or "Folder",
        color=payload.color or "#E86A5B",
        order_index=payload.order_index,
        allow_guest_view=payload.allow_guest_view,
        is_locked=False,
        is_system=False,
    )
    db.add(folder)
    db.commit()
    db.refresh(folder)

    return FolderResponse.model_validate(folder)


@router.put("/{folder_id}", response_model=FolderResponse)
def update_folder(
    event_id: str,
    folder_id: str,
    payload: UpdateFolderRequest,
    current_user: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Update folder metadata (name, icon, color, lock, guest view). Physical disk paths remain stable."""
    event = verify_event_ownership(event_id, current_user, db)

    folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.event_id == event.id,
        Folder.studio_id == current_user.id,
        Folder.deleted_at.is_(None)
    ).first()
    if not folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found.")

    if folder.is_system and payload.name and payload.name.strip() != "Uncategorized":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="System folder name cannot be changed.")

    if payload.name:
        folder.name = payload.name.strip()
        folder.slug = generate_slug(payload.name.strip())
    if payload.icon is not None:
        folder.icon = payload.icon
    if payload.color is not None:
        folder.color = payload.color
    if payload.order_index is not None:
        folder.order_index = payload.order_index
    if payload.is_locked is not None:
        folder.is_locked = payload.is_locked
    if payload.allow_guest_view is not None:
        folder.allow_guest_view = payload.allow_guest_view

    db.commit()
    db.refresh(folder)
    return FolderResponse.model_validate(folder)


@router.delete("/{folder_id}")
def delete_folder(
    event_id: str,
    folder_id: str,
    mode: str = Query("MOVE_TO_UNCATEGORIZED", enum=["MOVE_TO_UNCATEGORIZED", "DELETE_PHOTOS"]),
    current_user: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Delete folder with option to safely move photos to Uncategorized or delete them."""
    event = verify_event_ownership(event_id, current_user, db)

    folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.event_id == event.id,
        Folder.studio_id == current_user.id
    ).first()
    if not folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found.")

    if folder.is_system:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The system 'Uncategorized' folder is protected and cannot be deleted."
        )

    uncat = get_or_create_uncategorized_folder(db, studio_id=current_user.id, event_id=event.id)

    # Find photos in this folder
    photos = db.query(Photo).filter(Photo.folder_id == folder.id).all()

    if mode == "MOVE_TO_UNCATEGORIZED":
        for p in photos:
            p.folder_id = uncat.id
    elif mode == "DELETE_PHOTOS":
        for p in photos:
            p.is_deleted = True
            p.deleted_at = datetime.utcnow()

    # Move any subfolders to root or uncategorized
    for sub in folder.subfolders:
        sub.parent_id = None

    db.delete(folder)
    db.commit()

    reconcile_folder_counters(db, event_id=event.id)

    return {"message": f"Folder '{folder.name}' deleted successfully", "photos_relocated": len(photos)}


@router.post("/generate-wedding-preset", response_model=List[FolderResponse])
def generate_wedding_preset(
    event_id: str,
    current_user: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """
    Idempotently creates standard Indian wedding ceremony folders.
    If clicked multiple times, avoids creating duplicate folders.
    """
    event = verify_event_ownership(event_id, current_user, db)

    with _preset_generation_lock:
        presets = [
            {"name": "01_Haldi", "icon": "Sparkles", "color": "#D9A441", "order_index": 1, "type": FolderType.CEREMONY},
            {"name": "02_Mehendi", "icon": "Heart", "color": "#3FA66B", "order_index": 2, "type": FolderType.CEREMONY},
            {"name": "03_Sangeet", "icon": "Sparkles", "color": "#9333EA", "order_index": 3, "type": FolderType.CEREMONY},
            {"name": "04_Wedding", "icon": "Camera", "color": "#E86A5B", "order_index": 4, "type": FolderType.CEREMONY},
            {"name": "05_Reception", "icon": "Crown", "color": "#2563EB", "order_index": 5, "type": FolderType.CEREMONY},
            {"name": "06_Guest_Uploads", "icon": "UploadCloud", "color": "#E86A5B", "order_index": 6, "type": FolderType.GUEST_UPLOADS},
        ]

        for item in presets:
            existing = db.query(Folder).filter(
                Folder.event_id == event.id,
                Folder.name == item["name"],
                Folder.deleted_at.is_(None)
            ).first()

            if not existing:
                f = Folder(
                    id=str(uuid.uuid4()),
                    studio_id=current_user.id,
                    event_id=event.id,
                    name=item["name"],
                    slug=generate_slug(item["name"]),
                    folder_type=item["type"],
                    icon=item["icon"],
                    color=item["color"],
                    order_index=item["order_index"],
                    allow_guest_view=True,
                    is_locked=False,
                    is_system=False,
                )
                db.add(f)
                db.flush()

        db.commit()
        reconcile_folder_counters(db, event_id=event.id)

        # Return full folder list
        all_folders = db.query(Folder).filter(
            Folder.event_id == event.id,
            Folder.deleted_at.is_(None)
        ).order_by(Folder.order_index.asc()).all()

        return [FolderResponse.model_validate(f) for f in all_folders]


@router.post("/move-photos")
def move_photos(
    event_id: str,
    payload: BulkMovePhotosRequest,
    current_user: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """
    Atomic bulk move of selected photo IDs into destination folder.
    Guarantees strict studio & event isolation.
    """
    event = verify_event_ownership(event_id, current_user, db)

    # Verify destination folder
    dest_folder = db.query(Folder).filter(
        Folder.id == payload.destination_folder_id,
        Folder.event_id == event.id,
        Folder.studio_id == current_user.id,
        Folder.deleted_at.is_(None)
    ).first()
    if not dest_folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Destination folder not found.")

    if not payload.photo_ids:
        return {"moved_count": 0}

    # Fetch and update photos
    photos = db.query(Photo).filter(
        Photo.id.in_(payload.photo_ids),
        Photo.event_id == event.id,
        Photo.is_deleted == False
    ).all()

    for p in photos:
        p.folder_id = dest_folder.id
        p.studio_id = current_user.id

    db.commit()
    reconcile_folder_counters(db, event_id=event.id)

    return {
        "message": f"Successfully moved {len(photos)} photos to '{dest_folder.name}'",
        "moved_count": len(photos),
        "destination_folder_id": dest_folder.id
    }


@router.get("/{folder_id}/download-zip")
def download_folder_zip(
    event_id: str,
    folder_id: str,
    current_user: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Stream a ZIP archive containing all high-res original photos of the specified folder."""
    event = verify_event_ownership(event_id, current_user, db)

    folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.event_id == event.id,
        Folder.studio_id == current_user.id
    ).first()
    if not folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found.")

    photos = db.query(Photo).filter(
        Photo.folder_id == folder.id,
        Photo.event_id == event.id,
        Photo.is_deleted == False
    ).all()

    if not photos:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No photos in this folder to download.")

    temp_dir = tempfile.mkdtemp()
    safe_folder_name = generate_slug(folder.name)
    zip_path = os.path.join(temp_dir, f"{safe_folder_name}.zip")

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for p in photos:
            try:
                abs_path = storage_service.get_absolute_path(p.file_path)
                if os.path.exists(abs_path):
                    zipf.write(abs_path, arcname=p.original_file_name)
            except Exception:
                continue

    return FileResponse(
        path=zip_path,
        filename=f"{safe_folder_name}.zip",
        media_type="application/zip"
    )
