"""
Resumable Chunked Ingest Router for Multi-Tenant Photo Ingestion Engine
Supports tus/chunked 5MB streaming, atomic finalization, checksum validation, and AI priority queues.
"""

import os
import hashlib
import shutil
import uuid
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session

from apps.api.database import get_db
from apps.api.models.photographer import Photographer
from apps.api.models.event import Event
from apps.api.models.photo import Photo
from apps.api.models.upload_session import UploadSession, UploadChunk
from apps.api.auth import get_current_photographer
from apps.api.services.storage import storage_service
from apps.api.services.quota_engine import quota_engine
from workers.ai_worker.worker import dispatch_photo_processing
from packages.shared.constants import PhotoStatus

router = APIRouter(prefix="/uploads", tags=["Resumable Chunked Ingestion"])


class UploadInitRequest(BaseModel):
    filename: str
    expected_size: int
    content_type: Optional[str] = "image/jpeg"
    chunk_size: Optional[int] = 5242880  # 5MB default chunk
    total_chunks: Optional[int] = 1
    expected_sha256: Optional[str] = None
    client_upload_id: Optional[str] = None
    camera_id: Optional[str] = None
    priority: Optional[str] = "NORMAL"  # HIGH or NORMAL


class UploadInitResponse(BaseModel):
    upload_session_id: str
    event_id: str
    filename: str
    chunk_size: int
    total_chunks: int
    expires_at: str
    status: str


class ChunkUploadResponse(BaseModel):
    upload_session_id: str
    chunk_index: int
    received_chunks: int
    total_chunks: int
    chunk_sha256: str
    status: str


class UploadCompleteResponse(BaseModel):
    photo_id: str
    event_id: str
    original_file_name: str
    sha256_hash: str
    file_size: int
    thumbnail_url: str
    download_url: str
    status: str


def get_session_chunk_dir(studio_id: str, event_id: str, session_id: str) -> str:
    path = os.path.abspath(os.path.join(
        storage_service.root_dir,
        "studios",
        studio_id,
        "events",
        event_id,
        "uploads",
        session_id,
        "chunks"
    ))
    os.makedirs(path, exist_ok=True)
    return path


@router.post("/events/{event_id}/init", response_model=UploadInitResponse, status_code=status.HTTP_201_CREATED)
def init_chunked_upload(
    event_id: str,
    req: UploadInitRequest,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Initialize a resumable chunked upload session with atomic storage quota reservation."""
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.photographer_id == current_photographer.id,
        Event.is_deleted == False
    ).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found or access denied.")

    # Idempotency check: if client_upload_id already active, return existing session
    if req.client_upload_id:
        existing = db.query(UploadSession).filter(
            UploadSession.event_id == event_id,
            UploadSession.client_upload_id == req.client_upload_id,
            UploadSession.status.in_(["INITIATED", "UPLOADING", "VERIFYING"])
        ).first()
        if existing:
            return UploadInitResponse(
                upload_session_id=existing.id,
                event_id=existing.event_id,
                filename=existing.filename,
                chunk_size=existing.chunk_size,
                total_chunks=existing.total_chunks,
                expires_at=existing.expires_at.isoformat(),
                status=existing.status
            )

    # Validate file size & type
    if req.expected_size <= 0 or req.expected_size > 100 * 1024 * 1024:  # 100MB max per photo
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid photo file size (Max: 100MB).")

    # Calculate chunks
    chunk_size = req.chunk_size or 5242880
    total_chunks = max(1, (req.expected_size + chunk_size - 1) // chunk_size)
    session_id = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(hours=6)

    # Atomic quota check and reservation
    quota_engine.check_and_reserve(
        db=db,
        studio_id=current_photographer.id,
        required_bytes=req.expected_size,
        upload_session_id=session_id
    )

    session = UploadSession(
        id=session_id,
        studio_id=current_photographer.id,
        event_id=event.id,
        camera_id=req.camera_id,
        user_id=current_photographer.id,
        client_upload_id=req.client_upload_id,
        filename=req.filename,
        content_type=req.content_type or "image/jpeg",
        expected_size=req.expected_size,
        chunk_size=chunk_size,
        total_chunks=total_chunks,
        received_chunks=0,
        received_bytes=0,
        expected_sha256=req.expected_sha256,
        status="INITIATED",
        priority=req.priority if req.priority in ["HIGH", "NORMAL"] else "NORMAL",
        expires_at=expires_at
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return UploadInitResponse(
        upload_session_id=session.id,
        event_id=session.event_id,
        filename=session.filename,
        chunk_size=session.chunk_size,
        total_chunks=session.total_chunks,
        expires_at=session.expires_at.isoformat(),
        status=session.status
    )


@router.put("/{upload_session_id}/chunks/{chunk_index}", response_model=ChunkUploadResponse)
async def upload_chunk(
    upload_session_id: str,
    chunk_index: int,
    file: UploadFile = File(...),
    content_range: Optional[str] = Header(None),
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Receive, checksum-verify, and persist a single upload chunk."""
    session = db.query(UploadSession).filter(
        UploadSession.id == upload_session_id,
        UploadSession.studio_id == current_photographer.id
    ).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Upload session not found or access denied.")

    if session.status in ["COMPLETED", "CANCELLED", "EXPIRED"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Upload session is already {session.status}.")

    if chunk_index < 0 or chunk_index >= session.total_chunks:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Chunk index {chunk_index} out of bounds (Total: {session.total_chunks}).")

    chunk_bytes = await file.read()
    if not chunk_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty chunk received.")

    # Calculate server-side chunk checksum
    chunk_sha256 = hashlib.sha256(chunk_bytes).hexdigest()

    # Save chunk part to tenant-isolated temporary directory
    chunk_dir = get_session_chunk_dir(session.studio_id, session.event_id, session.id)
    chunk_file_path = os.path.join(chunk_dir, f"{chunk_index:05d}.part")
    with open(chunk_file_path, "wb") as f:
        f.write(chunk_bytes)

    # Check if chunk record already exists
    existing_chunk = db.query(UploadChunk).filter(
        UploadChunk.upload_session_id == session.id,
        UploadChunk.chunk_index == chunk_index
    ).first()

    if not existing_chunk:
        chunk_record = UploadChunk(
            id=str(uuid.uuid4()),
            upload_session_id=session.id,
            chunk_index=chunk_index,
            chunk_size=len(chunk_bytes),
            chunk_sha256=chunk_sha256,
            storage_path=chunk_file_path
        )
        db.add(chunk_record)
        session.received_chunks += 1
        session.received_bytes += len(chunk_bytes)
        session.status = "UPLOADING"
        db.commit()
    else:
        # Update existing chunk
        existing_chunk.chunk_size = len(chunk_bytes)
        existing_chunk.chunk_sha256 = chunk_sha256
        existing_chunk.storage_path = chunk_file_path
        db.commit()

    return ChunkUploadResponse(
        upload_session_id=session.id,
        chunk_index=chunk_index,
        received_chunks=session.received_chunks,
        total_chunks=session.total_chunks,
        chunk_sha256=chunk_sha256,
        status=session.status
    )


@router.post("/{upload_session_id}/complete", response_model=UploadCompleteResponse)
def complete_chunked_upload(
    upload_session_id: str,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Atomically assemble all chunks, verify full file SHA-256, commit quota, and publish photo."""
    session = db.query(UploadSession).filter(
        UploadSession.id == upload_session_id,
        UploadSession.studio_id == current_photographer.id
    ).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Upload session not found.")

    if session.status == "COMPLETED" and session.final_photo_id:
        photo = db.query(Photo).filter(Photo.id == session.final_photo_id).first()
        if photo:
            return UploadCompleteResponse(
                photo_id=photo.id,
                event_id=photo.event_id,
                original_file_name=photo.original_file_name,
                sha256_hash=photo.sha256_hash,
                file_size=photo.file_size,
                thumbnail_url=f"/api/v1/photos/{photo.id}/thumbnail",
                download_url=f"/api/v1/photos/{photo.id}/download",
                status=photo.status
            )

    # 1. Verify all chunks exist
    chunks = db.query(UploadChunk).filter(UploadChunk.upload_session_id == session.id).order_by(UploadChunk.chunk_index).all()
    if len(chunks) != session.total_chunks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Incomplete upload: Received {len(chunks)} of {session.total_chunks} chunks."
        )

    chunk_dir = get_session_chunk_dir(session.studio_id, session.event_id, session.id)

    # 2. Reassemble into in-memory or final buffer and compute SHA-256
    hasher = hashlib.sha256()
    assembled_bytes = bytearray()

    for c in chunks:
        c_path = os.path.join(chunk_dir, f"{c.chunk_index:05d}.part")
        if not os.path.exists(c_path):
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Missing chunk file {c.chunk_index}.")
        with open(c_path, "rb") as cf:
            data = cf.read()
            hasher.update(data)
            assembled_bytes.extend(data)

    final_sha256 = hasher.hexdigest()
    if session.expected_sha256 and session.expected_sha256.lower() != final_sha256.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Integrity violation: Final SHA-256 checksum does not match expected checksum."
        )

    # 3. Duplicate check within event
    existing_photo = db.query(Photo).filter(
        Photo.event_id == session.event_id,
        Photo.sha256_hash == final_sha256
    ).first()

    if existing_photo:
        # Mark completed and link existing photo
        session.status = "COMPLETED"
        session.final_photo_id = existing_photo.id
        session.completed_at = datetime.utcnow()
        quota_engine.release_reservation(db, session.id)
        db.commit()

        # Clean up chunk parts
        try:
            shutil.rmtree(chunk_dir, ignore_errors=True)
        except Exception:
            pass

        return UploadCompleteResponse(
            photo_id=existing_photo.id,
            event_id=existing_photo.event_id,
            original_file_name=existing_photo.original_file_name,
            sha256_hash=existing_photo.sha256_hash,
            file_size=existing_photo.file_size,
            thumbnail_url=f"/api/v1/photos/{existing_photo.id}/thumbnail",
            download_url=f"/api/v1/photos/{existing_photo.id}/download",
            status=existing_photo.status
        )

    # 4. Save to permanent storage
    file_id, rel_path, file_size, _ = storage_service.save_original(
        event_id=session.event_id,
        file_bytes=bytes(assembled_bytes),
        original_filename=session.filename
    )
    img_format, width, height = storage_service.validate_image(bytes(assembled_bytes))

    # 5. Create Photo Record
    photo = Photo(
        id=file_id,
        event_id=session.event_id,
        original_file_name=session.filename,
        file_path=rel_path,
        sha256_hash=final_sha256,
        file_size=file_size,
        width=width,
        height=height,
        mime_type=f"image/{img_format}",
        status=PhotoStatus.UPLOADED.value,
        is_guest_uploaded=False,
        camera_id=session.camera_id,
        camera_model="Resumable Ingest",
        upload_session_id=session.id
    )
    db.add(photo)

    session.status = "COMPLETED"
    session.final_photo_id = photo.id
    session.final_sha256 = final_sha256
    session.completed_at = datetime.utcnow()

    # Commit quota reservation
    quota_engine.commit_reservation(db, session.id)
    db.commit()
    db.refresh(photo)

    # 6. Dispatch AI face recognition worker with priority
    dispatch_photo_processing(photo_id=photo.id, event_id=session.event_id)

    # 7. Clean up temporary chunks
    try:
        shutil.rmtree(chunk_dir, ignore_errors=True)
    except Exception:
        pass

    return UploadCompleteResponse(
        photo_id=photo.id,
        event_id=photo.event_id,
        original_file_name=photo.original_file_name,
        sha256_hash=photo.sha256_hash,
        file_size=photo.file_size,
        thumbnail_url=f"/api/v1/photos/{photo.id}/thumbnail",
        download_url=f"/api/v1/photos/{photo.id}/download",
        status=photo.status
    )


@router.get("/{upload_session_id}")
def get_upload_session_status(
    upload_session_id: str,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Inspect status and list received chunks for upload resuming."""
    session = db.query(UploadSession).filter(
        UploadSession.id == upload_session_id,
        UploadSession.studio_id == current_photographer.id
    ).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Upload session not found.")

    chunks = db.query(UploadChunk).filter(UploadChunk.upload_session_id == session.id).order_by(UploadChunk.chunk_index).all()
    return {
        "upload_session_id": session.id,
        "event_id": session.event_id,
        "filename": session.filename,
        "expected_size": session.expected_size,
        "chunk_size": session.chunk_size,
        "total_chunks": session.total_chunks,
        "received_chunks": session.received_chunks,
        "received_bytes": session.received_bytes,
        "status": session.status,
        "chunks": [{"index": c.chunk_index, "size": c.chunk_size, "sha256": c.chunk_sha256} for c in chunks]
    }


@router.post("/{upload_session_id}/cancel")
def cancel_upload_session(
    upload_session_id: str,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Cancel an active upload session, release quota reservations, and clean up temporary parts."""
    session = db.query(UploadSession).filter(
        UploadSession.id == upload_session_id,
        UploadSession.studio_id == current_photographer.id
    ).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Upload session not found.")

    session.status = "CANCELLED"
    quota_engine.release_reservation(db, session.id)
    db.commit()

    chunk_dir = get_session_chunk_dir(session.studio_id, session.event_id, session.id)
    try:
        shutil.rmtree(chunk_dir, ignore_errors=True)
    except Exception:
        pass

    return {"status": "CANCELLED", "upload_session_id": session.id}
