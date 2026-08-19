"""
Photo Ingestion, Deduplication, and Streaming Router
"""

import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Response, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from apps.api.database import get_db
from apps.api.models import Event, Photo, Photographer
from apps.api.auth import get_current_photographer
from apps.api.schemas.photo import PhotoResponse, PhotoBatchUploadResponse
from apps.api.services.storage import storage_service
from workers.ai_worker.worker import dispatch_photo_processing
from packages.shared.constants import PhotoStatus

router = APIRouter(tags=["Photo Management"])


@router.post("/events/{event_id}/photos", response_model=PhotoBatchUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_photos(
    event_id: str,
    files: List[UploadFile] = File(...),
    camera_id: Optional[str] = Form(None),
    camera_model: Optional[str] = Form(None),
    upload_session_id: Optional[str] = Form(None),
    x_idempotency_key: Optional[str] = None,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """
    Batch photo upload endpoint with SHA-256 duplicate detection, camera attribution,
    idempotency protection, and async AI background queue.
    """
    event = db.query(Event).filter(Event.id == event_id, Event.photographer_id == current_photographer.id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

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
                        status=existing_photo.status,
                        faces_detected_count=existing_photo.faces_detected_count,
                        thumbnail_url=f"/api/v1/photos/{existing_photo.id}/thumbnail",
                        download_url=f"/api/v1/photos/{existing_photo.id}/download",
                        is_guest_uploaded=bool(existing_photo.is_guest_uploaded),
                        uploaded_by_guest_name=existing_photo.uploaded_by_guest_name,
                        uploaded_by_guest_phone=existing_photo.uploaded_by_guest_phone,
                        created_at=existing_photo.created_at,
                    )
                )
                continue

            # 3. Save original file to persistent storage
            file_id, rel_path, file_size, _ = storage_service.save_original(
                event_id=event_id,
                file_bytes=file_bytes,
                original_filename=file.filename or "photo.jpg"
            )

            # Validate image dimensions
            img_format, width, height = storage_service.validate_image(file_bytes)

            photo = Photo(
                id=file_id,
                event_id=event.id,
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
            db.refresh(photo)

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
                    created_at=photo.created_at,
                )
            )

        except Exception as e:
            import logging
            logging.getLogger("getmymoment").error(f"Error during photo upload: {e}", exc_info=True)
            failed_count += 1

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
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """List all photos uploaded to an event with processing status and face counts."""
    event = db.query(Event).filter(Event.id == event_id, Event.photographer_id == current_photographer.id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    photos = db.query(Photo).filter(Photo.event_id == event_id).order_by(Photo.created_at.desc()).all()
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
            created_at=p.created_at,
        )
        for p in photos
    ]


@router.get("/photos/{photo_id}/thumbnail")
def stream_photo_thumbnail(photo_id: str, db: Session = Depends(get_db)):
    """Stream web-optimized thumbnail for gallery viewing."""
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found.")

    # Use thumbnail path if available, or fall back to original
    raw_path = photo.thumbnail_path or photo.file_path
    if not raw_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo path not defined.")

    target_path = storage_service.get_absolute_path(raw_path) if not os.path.isabs(raw_path) else raw_path

    if not os.path.exists(target_path):
        target_path = storage_service.get_absolute_path(photo.file_path) if not os.path.isabs(photo.file_path) else photo.file_path
        if not os.path.exists(target_path):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo file not found on disk.")

    return FileResponse(
        path=target_path,
        media_type=photo.mime_type or "image/jpeg",
        filename=f"thumb_{photo.original_file_name}",
    )


@router.get("/photos/{photo_id}/download")
def download_original_photo(
    photo_id: str,
    token: Optional[str] = None,
    current_photographer: Optional[Photographer] = Depends(lambda: None),
    db: Session = Depends(get_db)
):
    """Direct high-resolution download of original uploaded photo with soft-delete and event checks."""
    photo = db.query(Photo).filter(Photo.id == photo_id, Photo.is_deleted == False).first()
    if not photo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found.")

    event = db.query(Event).filter(Event.id == photo.event_id, Event.is_deleted == False).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    abs_path = storage_service.get_absolute_path(photo.file_path) if not os.path.isabs(photo.file_path) else photo.file_path
    if not os.path.exists(abs_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Original photo not found on storage.")

    return FileResponse(
        path=abs_path,
        media_type=photo.mime_type or "image/jpeg",
        filename=photo.original_file_name,
        headers={"Content-Disposition": f'attachment; filename="{photo.original_file_name}"'}
    )


@router.get("/events/{event_id}/photos/download-all-zip")
def download_all_event_photos_zip(
    event_id: str,
    filter_type: Optional[str] = "all",  # all, studio, guest
    token: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Bundle and download all event photos as a single compressed ZIP archive.
    Supports filtering by 'all', 'studio', or 'guest'.
    Protected by event access token or studio ownership.
    """
    import io
    import zipfile

    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    # Authorization Check
    if token:
        if event.access_token != token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token for event gallery download.")
        if not event.allow_downloads:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="High-resolution downloads are disabled for this event.")
    # If no token, allow internal authenticated access or require token

    query = db.query(Photo).filter(Photo.event_id == event.id)
    if filter_type == "studio":
        query = query.filter(Photo.is_guest_uploaded == False)
    elif filter_type == "guest":
        query = query.filter(Photo.is_guest_uploaded == True)

    photos = query.order_by(Photo.created_at.asc()).all()
    if not photos:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No photos available to download in this event.")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        used_filenames = set()
        for idx, p in enumerate(photos):
            abs_path = storage_service.get_absolute_path(p.file_path) if not os.path.isabs(p.file_path) else p.file_path
            if os.path.exists(abs_path):
                raw_name = p.original_file_name or f"photo_{idx+1}.jpg"
                fname = raw_name
                # Avoid duplicate names inside ZIP
                if fname in used_filenames:
                    fname = f"{idx+1}_{raw_name}"
                used_filenames.add(fname)
                zf.write(abs_path, arcname=fname)

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
    """Allow guests to upload their phone clicks to the couple's community guest album with attribution."""
    event = db.query(Event).filter(Event.access_token == token).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    if not event.allow_guest_uploads:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Guest uploads are disabled by the studio for this event.")

    uploaded_count = 0
    clean_name = guest_name.strip() if guest_name else "Anonymous Guest"
    clean_phone = guest_phone.strip() if guest_phone else None

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
                original_filename=file.filename or "guest_photo.jpg"
            )
            img_format, width, height = storage_service.validate_image(file_bytes)

            photo = Photo(
                id=file_id,
                event_id=event.id,
                original_file_name=file.filename or "guest_photo.jpg",
                file_path=rel_path,
                sha256_hash=sha256_hash,
                file_size=file_size,
                width=width,
                height=height,
                mime_type=f"image/{img_format}",
                status=PhotoStatus.UPLOADED.value,
                is_guest_uploaded=True,
                uploaded_by_guest_name=clean_name,
                uploaded_by_guest_phone=clean_phone,
            )
            db.add(photo)
            db.commit()
            db.refresh(photo)

            dispatch_photo_processing(photo.id, event.id, db=db)
            uploaded_count += 1
        except Exception:
            continue

    return {
        "uploaded_count": uploaded_count,
        "guest_name": clean_name,
        "guest_phone": clean_phone,
        "message": f"{uploaded_count} guest photo(s) uploaded by {clean_name} and queued for AI indexing."
    }


@router.patch("/photos/{photo_id}/ceremony")
def tag_photo_ceremony(
    photo_id: str,
    ceremony_id: Optional[str] = None,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Tag a photo to a specific ceremony/function with strict studio ownership validation."""
    photo = db.query(Photo).filter(Photo.id == photo_id, Photo.is_deleted == False).first()
    if not photo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found.")

    # Strict IDOR check: Verify the photo belongs to an event owned by the authenticated photographer
    event = db.query(Event).filter(Event.id == photo.event_id, Event.photographer_id == current_photographer.id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found or access denied.")

    photo.ceremony_id = ceremony_id
    db.add(photo)
    db.commit()
    return {"id": photo.id, "ceremony_id": photo.ceremony_id}

