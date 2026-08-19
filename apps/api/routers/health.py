"""
Health and Diagnostic Router
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from apps.api.database import get_db
from apps.api.config import settings

router = APIRouter(tags=["Health & Status"])


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    """System health check endpoint."""
    db_status = "ok"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "healthy",
        "service": "Get My Moment API",
        "environment": settings.ENVIRONMENT,
        "database": db_status,
        "storage_driver": settings.STORAGE_DRIVER,
        "ai_device": settings.AI_DEVICE,
        "face_debug_crops": settings.FACE_DEBUG_CROPS_ENABLED,
    }
