"""
Photo Ingestion, Deduplication, and Streaming Router
Supports multi-tenant studio_id, folder_id target uploading, folder filtering, and nested ZIP exports.
"""

import os
import io
import uuid
import zipfile
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Response, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from apps.api.database import get_db
from apps.api.models import Event, Photo, Photographer, Folder, FolderType
from apps.api.auth import get_current_photographer
from apps.api.schemas.photo import PhotoResponse, PhotoBatchUploadResponse
from apps.api.services.storage import storage_service, get_or_create_uncategorized_folder, reconcile_folder_counters
from workers.ai_worker.worker import dispatch_photo_processing
from packages.shared.constants import PhotoStatus

router = APIRouter(tags=["Photo Management"])


@router.post("/events/{event_id}/photos", response_model=PhotoBatchUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_photos(
    event_id: str,
    files: List[UploadFile] = File(...),
    folder_id: Optional[str] = Form(None),
    camera_id: Optional[str] = Form(None),
    camera_model: Optional[str] = Form(None),
    upload_session_id: Optional[str] = Form(None),
    x_idempotency_key: Optional[str] = None,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """
    Batch photo upload endpoint with SHA-256 duplicate detection, folder routing,
    camera attribution, idempotency protection, and async AI background queue.
    """
    event = db.query(Event).filter(Event.id == event_id, Event.photographer_id == current_photographer.id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    # 1. Resolve or validate destination folder
    target_folder = None
    if folder_id:
        target_folder = db.query(Folder).filter(
            Folder.id == folder_id,
            Folder.event_id == event.id,
            Folder.studio_id == current_photographer.id,
            Folder.deleted_at.is_(None)
        ).first()
        if not target_folder:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Specified target folder not found.")
    
    if not target_folder:
        target_folder = get_or_create_uncategorized_folder(db, studio_id=current_photographer.id, event_id=event.id)

    uploaded_photos = []
    duplicates_count = 0
    uploaded_count = 0
    failed_count = 0

    for file in files:
        try:
            # 1. Read file bytes and compute SHA-256
            file_bytes = await file.read()
            if not file_bytes:
                continue

            sha256_hash = storage_service.calculate_sha256(file_bytes)

            # 2. Check for duplicate or idempotency match within the same event
            existing_photo = db.query(Photo).filter(
                Photo.event_id == event_id,
                (Photo.sha256_hash == sha256_hash) | 
                ((Photo.idempotency_key == x_idempotency_key) if x_idempotency_key else False)
            ).first()

            if existing_photo:
                duplicates_count += 1
                uploaded_photos.append(
                    PhotoResponse(
                        id=existing_photo.id,
                        event_id=existing_photo.event_id,
                        original_file_name=existing_photo.original_file_name,
                        sha256_hash=existing_photo.sha256_hash,
                        file_size=existing_photo.file_size,
                        width=existing_photo.width,
                        height=existing_photo.height,
                        mime_type=existing_photo.mime_type,
                        status="DUPLICATE",
                        faces_detected_count=existing_photo.faces_detected_count,
                        thumbnail_url=f"/api/v1/photos/{existing_photo.id}/thumbnail",
                        download_url=f"/api/v1/photos/{existing_photo.id}/download",
                        is_guest_uploaded=bool(existing_photo.is_guest_uploaded),
                        uploaded_by_guest_name=existing_photo.uploaded_by_guest_name,
                        uploaded_by_guest_phone=existing_photo.uploaded_by_guest_phone,
                        folder_id=existing_photo.folder_id,
                        folder_name=existing_photo.folder.name if existing_photo.folder else None,
                        created_at=existing_photo.created_at,
                    )
                )
                continue

            # 3. Save original file to persistent storage with studio & folder hierarchy
            file_id, rel_path, file_size, _ = storage_service.save_original(
                event_id=event_id,
                file_bytes=file_bytes,
                original_filename=file.filename or "photo.jpg",
                studio_id=current_photographer.id,
                folder_id=target_folder.id,
            )

            # Validate image dimensions
            img_format, width, height = storage_service.validate_image(file_bytes)

            photo = Photo(
                id=file_id,
                studio_id=current_photographer.id,
                event_id=event.id,
                folder_id=target_folder.id,
                original_file_name=file.filename or "photo.jpg",
                file_path=rel_path,
                sha256_hash=sha256_hash,
                file_size=file_size,
                width=width,
                height=height,
                mime_type=f"image/{img_format}",
                status=PhotoStatus.UPLOADED.value,
                is_guest_uploaded=False,
                camera_id=camera_id,
                camera_model=camera_model,
                upload_session_id=upload_session_id,
                idempotency_key=x_idempotency_key,
            )
            db.add(photo)
            db.commit()

            # 4. Dispatch non-blocking Celery background task
            dispatch_photo_processing(photo.id, event.id, db=db)

            uploaded_count += 1
            uploaded_photos.append(
                PhotoResponse(
                    id=photo.id,
                    event_id=photo.event_id,
                    original_file_name=photo.original_file_name,
                    sha256_hash=photo.sha256_hash,
                    file_size=photo.file_size,
                    width=photo.width,
                    height=photo.height,
                    mime_type=photo.mime_type,
                    status=photo.status,
                    faces_detected_count=photo.faces_detected_count,
                    thumbnail_url=f"/api/v1/photos/{photo.id}/thumbnail",
                    download_url=f"/api/v1/photos/{photo.id}/download",
                    is_guest_uploaded=False,
                    uploaded_by_guest_name=None,
                    uploaded_by_guest_phone=None,
                    folder_id=target_folder.id,
                    folder_name=target_folder.name,
                    created_at=photo.created_at,
                )
            )

        except Exception as e:
            import logging
            logging.getLogger("getmymoment").error(f"Error during photo upload: {e}", exc_info=True)
            failed_count += 1

    # Reconcile folder counters
    reconcile_folder_counters(db, event_id=event.id, folder_id=target_folder.id)

    return PhotoBatchUploadResponse(
        total_received=len(files),
        uploaded_count=uploaded_count,
        duplicates_count=duplicates_count,
        failed_count=failed_count,
        photos=uploaded_photos,
    )


@router.get("/events/{event_id}/photos", response_model=List[PhotoResponse])
def list_event_photos(
    event_id: str,
    folder_id: Optional[str] = Query(None),
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """List all photos uploaded to an event with optional folder filtering."""
    event = db.query(Event).filter(Event.id == event_id, Event.photographer_id == current_photographer.id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    query = db.query(Photo).filter(Photo.event_id == event_id, Photo.is_deleted == False)
    if folder_id:
        query = query.filter(Photo.folder_id == folder_id)

    photos = query.order_by(Photo.created_at.desc()).all()
    return [
        PhotoResponse(
            id=p.id,
            event_id=p.event_id,
            original_file_name=p.original_file_name,
            sha256_hash=p.sha256_hash,
            file_size=p.file_size,
            width=p.width,
            height=p.height,
            mime_type=p.mime_type,
            status=p.status,
            error_message=p.error_message,
            faces_detected_count=p.faces_detected_count,
            thumbnail_url=f"/api/v1/photos/{p.id}/thumbnail",
            download_url=f"/api/v1/photos/{p.id}/download",
            is_guest_uploaded=bool(p.is_guest_uploaded),
            uploaded_by_guest_name=p.uploaded_by_guest_name,
            uploaded_by_guest_phone=p.uploaded_by_guest_phone,
            folder_id=p.folder_id,
            folder_name=p.folder.name if p.folder else None,
            created_at=p.created_at,
        )
        for p in photos
    ]


@router.get("/photos/{photo_id}/thumbnail")
def get_photo_thumbnail(
    photo_id: str,
    db: Session = Depends(get_db)
):
    """Streaming endpoint for photo thumbnails with fallback to original."""
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found.")

    raw_path = photo.thumbnail_path or photo.file_path
    abs_path = storage_service.get_absolute_path(raw_path) if not os.path.isabs(raw_path) else raw_path
    
    if not os.path.exists(abs_path):
        target_path = storage_service.get_absolute_path(photo.file_path) if not os.path.isabs(photo.file_path) else photo.file_path
        if os.path.exists(target_path):
            abs_path = target_path
        else:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image file not found on disk.")

    return FileResponse(
        path=abs_path,
        media_type=photo.mime_type or "image/jpeg",
        headers={"Cache-Control": "public, max-age=31536000, immutable"}
    )


@router.get("/photos/{photo_id}/download")
def download_original_photo(
    photo_id: str,
    token: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Secure direct download endpoint for high-resolution original photos."""
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found.")

    if token:
        event = db.query(Event).filter(Event.id == photo.event_id).first()
        if not event or (event.access_token != token and event.selection_token != token):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid download token.")
        if not event.allow_downloads:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Photo downloads are disabled for this event.")

    abs_path = storage_service.get_absolute_path(photo.file_path) if not os.path.isabs(photo.file_path) else photo.file_path
    if not os.path.exists(abs_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Original photo not found on disk.")

    return FileResponse(
        path=abs_path,
        media_type=photo.mime_type or "image/jpeg",
        filename=photo.original_file_name,
        headers={"Content-Disposition": f'attachment; filename="{photo.original_file_name}"'}
    )


@router.get("/events/{event_id}/download-all-zip")
def download_all_photos_as_zip(
    event_id: str,
    filter_type: Optional[str] = Query("all", enum=["all", "studio", "guest"]),
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Downloads all event photos packaged as a structured nested ZIP archive.
    Preserves folders (e.g. 01_Haldi/, 02_Mehendi/, Uncategorized/).
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    if token:
        if event.access_token != token and event.selection_token != token:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid access token.")
        if not event.allow_downloads:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Downloads disabled for this event.")

    query = db.query(Photo).filter(Photo.event_id == event.id, Photo.is_deleted == False)
    if filter_type == "studio":
        query = query.filter(Photo.is_guest_uploaded == False)
    elif filter_type == "guest":
        query = query.filter(Photo.is_guest_uploaded == True)

    photos = query.order_by(Photo.created_at.asc()).all()
    if not photos:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No photos available to download in this event.")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        used_paths = set()
        for idx, p in enumerate(photos):
            abs_path = storage_service.get_absolute_path(p.file_path) if not os.path.isabs(p.file_path) else p.file_path
            if os.path.exists(abs_path):
                folder_prefix = ""
                if p.folder:
                    folder_prefix = f"{p.folder.name}/"
                elif p.is_guest_uploaded:
                    folder_prefix = "Guest_Uploads/"

                raw_name = p.original_file_name or f"photo_{idx+1}.jpg"
                arc_name = f"{folder_prefix}{raw_name}"

                # Avoid duplicate names in same folder
                if arc_name in used_paths:
                    arc_name = f"{folder_prefix}{idx+1}_{raw_name}"
                used_paths.add(arc_name)

                zf.write(abs_path, arcname=arc_name)

    zip_buffer.seek(0)
    safe_name = "".join(c for c in event.name if c.isalnum() or c in (' ', '_', '-')).strip().replace(' ', '_')
    filter_tag = f"_{filter_type.capitalize()}" if filter_type in ["studio", "guest"] else ""
    zip_filename = f"{safe_name}{filter_tag}_Photos.zip"

    return Response(
        content=zip_buffer.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{zip_filename}"'}
    )


@router.post("/events/public/{token}/guest-upload", status_code=status.HTTP_201_CREATED)
async def guest_upload_photos(
    token: str,
    guest_name: Optional[str] = Form(None),
    guest_phone: Optional[str] = Form(None),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    """Allow guests to upload their phone clicks into the event's Guest_Uploads folder."""
    event = db.query(Event).filter(Event.access_token == token).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    if not event.allow_guest_uploads:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Guest uploads are disabled for this event.")

    # Find or create Guest_Uploads folder
    guest_folder = db.query(Folder).filter(
        Folder.event_id == event.id,
        Folder.folder_type == FolderType.GUEST_UPLOADS,
        Folder.deleted_at.is_(None)
    ).first()

    if not guest_folder:
        guest_folder = Folder(
            id=str(uuid.uuid4()),
            studio_id=event.photographer_id,
            event_id=event.id,
            name="06_Guest_Uploads",
            slug="06-guest-uploads",
            folder_type=FolderType.GUEST_UPLOADS,
            icon="UploadCloud",
            color="#E86A5B",
            order_index=99,
            allow_guest_view=True,
        )
        db.add(guest_folder)
        db.commit()
        db.refresh(guest_folder)

    uploaded_count = 0
    for file in files:
        try:
            file_bytes = await file.read()
            if not file_bytes:
                continue

            sha256_hash = storage_service.calculate_sha256(file_bytes)
            existing = db.query(Photo).filter(Photo.event_id == event.id, Photo.sha256_hash == sha256_hash).first()
            if existing:
                continue

            file_id, rel_path, file_size, _ = storage_service.save_original(
                event_id=event.id,
                file_bytes=file_bytes,
                original_filename=file.filename or "guest_photo.jpg",
                studio_id=event.photographer_id,
                folder_id=guest_folder.id,
            )

            img_format, width, height = storage_service.validate_image(file_bytes)

            photo = Photo(
                id=file_id,
                studio_id=event.photographer_id,
                event_id=event.id,
                folder_id=guest_folder.id,
                original_file_name=file.filename or "guest_photo.jpg",
                file_path=rel_path,
                sha256_hash=sha256_hash,
                file_size=file_size,
                width=width,
                height=height,
                mime_type=f"image/{img_format}",
                status=PhotoStatus.UPLOADED.value,
                is_guest_uploaded=True,
                uploaded_by_guest_name=guest_name.strip() if guest_name else "Guest Contributor",
                uploaded_by_guest_phone=guest_phone.strip() if guest_phone else None,
            )
            db.add(photo)
            db.commit()
            db.refresh(photo)

            dispatch_photo_processing(photo.id, event.id, db=db)
            uploaded_count += 1
        except Exception:
            continue

    reconcile_folder_counters(db, event_id=event.id, folder_id=guest_folder.id)
    return {"message": f"Successfully uploaded {uploaded_count} photos", "uploaded_count": uploaded_count}
