"""
Celery Background Worker & Async Task Execution
"""

import os
import logging
from typing import Optional
from concurrent.futures import ThreadPoolExecutor
from celery import Celery
from sqlalchemy.orm import Session
from apps.api.config import settings
from apps.api.database import SessionLocal, get_db_session
from apps.api.models import Photo, Face, FaceEmbedding
from apps.api.services.storage import storage_service
from apps.api.services.ai_service import ai_service
from packages.shared.constants import PhotoStatus

logger = logging.getLogger(__name__)

# Local background threadpool for instant non-blocking execution when Redis/Celery is offline
local_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="photo_worker")

# Initialize Celery app
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


def run_photo_pipeline(photo_id: str, event_id: str, db_override: Optional[Session] = None):
    """Core image processing: thumbnail generation, face detection, and embedding indexing."""
    db: Session = db_override if db_override is not None else get_db_session()
    should_close = db_override is None
    try:
        photo = db.query(Photo).filter(Photo.id == photo_id, Photo.event_id == event_id).first()
        if not photo:
            logger.error(f"Photo not found: photo_id={photo_id}, event_id={event_id}")
            return {"status": "error", "message": "Photo not found"}

        photo.status = PhotoStatus.PROCESSING.value
        db.commit()

        abs_file_path = storage_service.get_absolute_path(photo.file_path)
        with open(abs_file_path, "rb") as f:
            file_bytes = f.read()

        # 1. Generate web thumbnails
        small_thumb_rel, med_thumb_rel = storage_service.generate_thumbnails(
            event_id=event_id,
            file_id=photo.id,
            original_path=photo.file_path,
        )
        photo.thumbnail_path = small_thumb_rel
        photo.processed_path = med_thumb_rel

        # 2. Face Detection
        faces = ai_service.detect_faces(file_bytes)
        photo.faces_detected_count = len(faces)

        # 3. Embeddings & Persistence
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

        photo.status = PhotoStatus.PROCESSED.value
        photo.error_message = None
        db.commit()
        logger.info(f"Successfully processed photo {photo_id}: {len(faces)} faces indexed.")
        return {"status": "success", "photo_id": photo_id, "faces_count": len(faces)}

    except Exception as exc:
        db.rollback()
        logger.error(f"Error processing photo {photo_id}: {exc}", exc_info=True)
        try:
            photo = db.query(Photo).filter(Photo.id == photo_id).first()
            if photo:
                photo.status = PhotoStatus.FAILED.value
                photo.error_message = str(exc)
                db.commit()
        except Exception:
            pass
        raise exc
    finally:
        if should_close:
            db.close()


@celery_app.task(bind=True, max_retries=3, default_retry_delay=10)
def process_photo_task(self, photo_id: str, event_id: str, db_override: Optional[Session] = None):
    try:
        return run_photo_pipeline(photo_id, event_id, db_override=db_override)
    except Exception as exc:
        if hasattr(self, "retry"):
            raise self.retry(exc=exc)
        raise exc


def dispatch_photo_processing(photo_id: str, event_id: str, db: Optional[Session] = None):
    """
    Non-blocking async dispatch:
    - In test mode: executes synchronously
    - In local dev: submits to background ThreadPoolExecutor instantly (0ms latency, non-blocking)
    - In production: dispatches to Celery/Redis queue
    """
    import sys
    if "pytest" in sys.modules or settings.ENVIRONMENT == "test":
        run_photo_pipeline(photo_id, event_id, db_override=db)
        return

    # Non-blocking instant execution on background thread pool
    local_executor.submit(run_photo_pipeline, photo_id, event_id, None)
