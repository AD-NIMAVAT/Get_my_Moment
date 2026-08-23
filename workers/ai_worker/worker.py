"""
Celery Background Worker & Async Task Execution
"""

import os
import logging
from typing import Optional
from concurrent.futures import ThreadPoolExecutor
from sqlalchemy.orm import Session
from apps.api.config import settings
from apps.api.database import SessionLocal, get_db_session
from apps.api.models import Photo, Face, FaceEmbedding
from apps.api.services.storage import storage_service
from apps.api.services.ai_service import ai_service
from packages.shared.constants import PhotoStatus

logger = logging.getLogger(__name__)

# Local background threadpool for instant non-blocking execution
local_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="photo_worker")

# Graceful Celery initialization (optional: falls back to ThreadPoolExecutor if Celery/Redis is not installed)
try:
    from celery import Celery
    HAS_CELERY = True
    celery_app = Celery(
        "getmymoment_worker",
        broker=settings.CELERY_BROKER_URL,
        backend=settings.CELERY_RESULT_BACKEND,
    )
    celery_app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
        enable_utc=True,
        task_track_started=True,
        broker_connection_timeout=0.2,
        broker_connection_retry_on_startup=False,
    )
except ImportError:
    HAS_CELERY = False
    celery_app = None


import time
from datetime import datetime


def run_photo_pipeline(photo_id: str, event_id: str, db_override: Optional[Session] = None):
    """Core image processing with microsecond telemetry: thumbnail generation, face detection, and embedding indexing."""
    t_start = time.perf_counter()
    now_utc = datetime.utcnow()
    db: Session = db_override if db_override is not None else get_db_session()
    should_close = db_override is None
    stage = "INITIALIZE"

    try:
        photo = db.query(Photo).filter(Photo.id == photo_id, Photo.event_id == event_id).first()
        if not photo:
            logger.error(f"Photo not found: photo_id={photo_id}, event_id={event_id}")
            return {"status": "error", "message": "Photo not found"}

        photo.status = PhotoStatus.PROCESSING.value
        photo.processing_started_at = now_utc
        db.commit()

        # 1. Read file bytes
        stage = "DECODE"
        abs_file_path = storage_service.get_absolute_path(photo.file_path)
        with open(abs_file_path, "rb") as f:
            file_bytes = f.read()

        # 2. Generate web thumbnails
        stage = "THUMBNAILS"
        small_thumb_rel, med_thumb_rel = storage_service.generate_thumbnails(
            event_id=event_id,
            file_id=photo.id,
            original_path=photo.file_path,
        )
        photo.thumbnail_path = small_thumb_rel
        photo.processed_path = med_thumb_rel

        # 3. AI Face Detection & Embedding (Monotonic Timer)
        stage = "AI_INFERENCE"
        t_ai_start = time.perf_counter()
        faces = ai_service.detect_faces(file_bytes)
        photo.faces_detected_count = len(faces)

        # 4. Embeddings & Persistence
        stage = "EMBEDDINGS"
        for detection in faces:
            crop_path = None
            if settings.FACE_DEBUG_CROPS_ENABLED:
                pass

            face_record = Face(
                photo_id=photo.id,
                event_id=event_id,
                bounding_box={
                    "x": detection.bbox.x,
                    "y": detection.bbox.y,
                    "w": detection.bbox.w,
                    "h": detection.bbox.h,
                },
                detection_confidence=detection.confidence,
                quality_score=1.0,
                crop_path=crop_path,
            )
            db.add(face_record)
            db.flush()

            # Generate 128-d L2 normalized embedding
            embedding_vector = ai_service.extract_face_embedding(file_bytes, detection.bbox)
            face_embedding_record = FaceEmbedding(
                face_id=face_record.id,
                event_id=event_id,
                embedding=embedding_vector,
            )
            db.add(face_embedding_record)

        ai_duration_ms = int((time.perf_counter() - t_ai_start) * 1000)
        total_duration_ms = int((time.perf_counter() - t_start) * 1000)
        completed_at = datetime.utcnow()

        stage = "FINALIZE"
        db.query(Photo).filter(Photo.id == photo_id).update(
            {
                "status": PhotoStatus.PROCESSED.value,
                "error_message": None,
                "failure_category": None,
                "guest_ready_at": completed_at,
                "processing_duration_ms": total_duration_ms,
                "ai_inference_ms": ai_duration_ms,
            },
            synchronize_session=False
        )
        db.commit()
        logger.info(f"⚡ [PIPELINE TELEMETRY] Photo {photo_id} GUEST_READY in {total_duration_ms}ms (AI: {ai_duration_ms}ms, Faces: {len(faces)})")
        return {
            "status": "success",
            "photo_id": photo_id,
            "faces_count": len(faces),
            "duration_ms": total_duration_ms,
            "ai_ms": ai_duration_ms
        }

    except Exception as exc:
        db.rollback()
        fail_cat = "UNKNOWN_FAILURE"
        if stage == "DECODE":
            fail_cat = "DECODE_FAILED"
        elif stage == "THUMBNAILS":
            fail_cat = "THUMBNAIL_FAILED"
        elif stage == "AI_INFERENCE":
            fail_cat = "FACE_DETECTION_FAILED"
        elif stage == "EMBEDDINGS":
            fail_cat = "EMBEDDING_FAILED"
        elif stage == "FINALIZE":
            fail_cat = "DB_FAILED"

        logger.error(f"❌ [PIPELINE ERROR] [{fail_cat}] photo {photo_id}: {exc}", exc_info=True)
        try:
            total_duration_ms = int((time.perf_counter() - t_start) * 1000)
            db.query(Photo).filter(Photo.id == photo_id).update(
                {
                    "status": PhotoStatus.FAILED.value,
                    "error_message": str(exc),
                    "failure_category": fail_cat,
                    "processing_duration_ms": total_duration_ms,
                },
                synchronize_session=False
            )
            db.commit()
        except Exception:
            pass
        raise exc
    finally:
        if should_close:
            db.close()


# Task wrapper
def process_photo_task(photo_id: str, event_id: str, db_override: Optional[Session] = None):
    return run_photo_pipeline(photo_id, event_id, db_override=db_override)

if celery_app is not None:
    process_photo_task = celery_app.task(bind=True, max_retries=3, default_retry_delay=10)(process_photo_task)


def dispatch_photo_processing(photo_id: str, event_id: str, db: Optional[Session] = None):
    """
    Non-blocking async dispatch:
    - Sets queued_at timestamp
    - In test mode: executes synchronously
    - In local dev: submits to background ThreadPoolExecutor instantly (0ms latency, non-blocking)
    - In production: dispatches to Celery/Redis queue
    """
    now_utc = datetime.utcnow()
    # Update queued_at timestamp
    try:
        active_db = db if db is not None else get_db_session()
        active_db.query(Photo).filter(Photo.id == photo_id).update(
            {"queued_at": now_utc},
            synchronize_session=False
        )
        active_db.commit()
        if db is None:
            active_db.close()
    except Exception as e:
        logger.debug(f"Could not update queued_at for photo {photo_id}: {e}")

    import sys
    if "pytest" in sys.modules or settings.ENVIRONMENT == "test":
        run_photo_pipeline(photo_id, event_id, db_override=db)
        return

    # Non-blocking instant execution on background thread pool
    local_executor.submit(run_photo_pipeline, photo_id, event_id, None)
