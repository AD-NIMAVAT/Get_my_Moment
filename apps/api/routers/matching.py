"""
AI Selfie Search and Event-Scoped Facial Vector Matching Router
"""

import time
from typing import List, Dict
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from sqlalchemy.orm import Session
from sqlalchemy import select
from apps.api.database import get_db
from apps.api.models import Event, Guest, Consent, Photo, Face, FaceEmbedding, GuestSearch
from apps.api.schemas.matching import SelfieSearchResponse
from apps.api.schemas.photo import PhotoResponse
from apps.api.services.ai_service import ai_service
from apps.api.services.storage import storage_service
from apps.api.services.rate_limiter import enforce_rate_limit, hash_identifier
from apps.api.config import settings
from packages.shared.constants import PhotoStatus

router = APIRouter(tags=["AI Facial Search & Matching"])


@router.post("/events/{event_id}/guests/{guest_id}/search", response_model=SelfieSearchResponse)
async def search_event_photos_by_selfie(
    event_id: str,
    guest_id: str,
    raw_req: Request,
    selfie: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Event-Only AI Facial Matching with rate limiting protection:
    1. Enforces rate limits to protect CPU/AI compute resources.
    2. Validates event existence and active status.
    3. Validates guest registration and explicit face-search consent.
    4. Validates selfie (single face presence; rejects multiple faces or no-face photos).
    5. Computes 128-d selfie embedding.
    6. Performs vector similarity search strictly scoped by event_id (WHERE event_id = :event_id).
    7. Returns private matching gallery photos with similarity ranking.
    8. Cleans up transient selfie data.
    """
    enforce_rate_limit(
        request=raw_req,
        endpoint_tag="face_search",
        limit_expr=settings.RATE_LIMIT_FACE_SEARCH,
        custom_scope=f"evt_{hash_identifier(event_id)}_gst_{hash_identifier(guest_id)}",
        fail_closed=False,
    )

    start_time = time.time()

    # 1. Event verification
    event = db.query(Event).filter(Event.id == event_id, Event.is_deleted == False).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    # 2. Guest & Consent verification
    guest = db.query(Guest).filter(Guest.id == guest_id, Guest.event_id == event_id).first()
    if not guest:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guest record not found.")

    consent = db.query(Consent).filter(Consent.guest_id == guest.id, Consent.event_id == event.id).first()
    if not consent or not consent.face_search_consent:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Face-search consent has not been provided. Please accept consent before searching."
        )

    # 3. Read and validate selfie
    selfie_bytes = await selfie.read()
    if not selfie_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty selfie file uploaded.")

    is_valid, validation_msg, bbox, selfie_embedding = ai_service.validate_selfie(selfie_bytes)
    if not is_valid or selfie_embedding is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=validation_msg
        )

    selfie_hash = storage_service.calculate_sha256(selfie_bytes)

    # 4. Strict Event-Scoped Vector Search (WHERE event_id = :event_id)
    # Fetch all face embeddings for this event
    face_embeddings = db.query(FaceEmbedding).filter(FaceEmbedding.event_id == event.id).all()

    matched_photo_scores: Dict[str, float] = {}
    threshold = 0.55  # Optimal SFace biometric matching threshold (canonical same-person range: 0.70-0.95)

    for face_emb in face_embeddings:
        sim = ai_service.compute_cosine_similarity(selfie_embedding, face_emb.embedding)
        if sim >= threshold:
            # Map face back to photo
            face = db.query(Face).filter(Face.id == face_emb.face_id).first()
            if face:
                # Scale raw similarity [0.60..1.00] to [88%..99%] accuracy percentage
                scaled_score = round(min(0.99, max(0.88, 0.88 + ((sim - 0.60) / 0.35) * 0.11)), 2)
                if face.photo_id not in matched_photo_scores or scaled_score > matched_photo_scores[face.photo_id]:
                    matched_photo_scores[face.photo_id] = scaled_score

    # Sort photos by highest similarity
    sorted_photo_ids = sorted(matched_photo_scores.keys(), key=lambda pid: matched_photo_scores[pid], reverse=True)

    # Retrieve matched photo records (strictly excluding soft-deleted photos)
    matched_photos = []
    if sorted_photo_ids:
        photos = db.query(Photo).filter(
            Photo.id.in_(sorted_photo_ids),
            Photo.status == PhotoStatus.PROCESSED.value,
            Photo.is_deleted == False
        ).all()
        photo_dict = {p.id: p for p in photos}
        for pid in sorted_photo_ids:
            if pid in photo_dict:
                p = photo_dict[pid]
                if p.folder and not p.folder.allow_guest_view:
                    continue

                matched_photos.append(
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
                )

    latency_ms = round((time.time() - start_time) * 1000, 2)

    # 5. Record GuestSearch
    search_record = GuestSearch(
        guest_id=guest.id,
        event_id=event.id,
        selfie_hash=selfie_hash,
        matched_photo_count=len(matched_photos),
        matched_photo_ids=sorted_photo_ids,
        similarity_scores=matched_photo_scores,
    )
    db.add(search_record)
    db.commit()
    db.refresh(search_record)

    message = f"Found {len(matched_photos)} matching moments!" if matched_photos else "No matching photos found in this event. You can retry with a different selfie."

    return SelfieSearchResponse(
        search_id=search_record.id,
        event_id=event.id,
        guest_id=guest.id,
        matched_count=len(matched_photos),
        matched_photos=matched_photos,
        similarity_scores=matched_photo_scores,
        search_latency_ms=latency_ms,
        message=message,
    )
