"""
Atomic Storage Quota Reservation & Usage Engine
Formula: available_bytes = quota_bytes - used_bytes - reserved_bytes
"""

import os
from datetime import datetime, timedelta
from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status

from apps.api.models.photographer import Photographer
from apps.api.models.photo import Photo
from apps.api.models.event import Event
from apps.api.models.storage_reservation import StorageReservation


class QuotaEngine:
    """Enterprise Quota Enforcement with Atomic Reservations to prevent race conditions."""

    @staticmethod
    def get_studio_storage_metrics(db: Session, studio_id: str) -> Dict[str, Any]:
        """Calculate real-time quota, used, reserved, and available bytes for a studio."""
        studio = db.query(Photographer).filter(Photographer.id == studio_id).first()
        if not studio:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Studio not found.")

        # 1. Total Quota in bytes (from subscription plan)
        quota_gb = studio.max_storage_gb or 100
        quota_bytes = quota_gb * 1024 * 1024 * 1024

        # 2. Used bytes across all active events
        used_bytes_res = db.query(func.coalesce(func.sum(Photo.file_size), 0)).join(
            Event, Photo.event_id == Event.id
        ).filter(
            Event.photographer_id == studio_id,
            Photo.is_deleted == False
        ).scalar()
        used_bytes = int(used_bytes_res or 0)

        # 3. Active unexpired reservations
        now = datetime.utcnow()
        reserved_bytes_res = db.query(func.coalesce(func.sum(StorageReservation.reserved_bytes), 0)).filter(
            StorageReservation.studio_id == studio_id,
            StorageReservation.status == "ACTIVE",
            StorageReservation.expires_at > now
        ).scalar()
        reserved_bytes = int(reserved_bytes_res or 0)

        available_bytes = max(0, quota_bytes - used_bytes - reserved_bytes)
        usage_pct = round((used_bytes / quota_bytes) * 100, 2) if quota_bytes > 0 else 100.0

        return {
            "studio_id": studio_id,
            "subscription_plan": studio.subscription_plan,
            "quota_bytes": quota_bytes,
            "quota_gb": quota_gb,
            "used_bytes": used_bytes,
            "used_gb": round(used_bytes / (1024 ** 3), 3),
            "reserved_bytes": reserved_bytes,
            "available_bytes": available_bytes,
            "available_gb": round(available_bytes / (1024 ** 3), 3),
            "usage_pct": usage_pct,
            "status": "EXCEEDED" if available_bytes <= 0 else ("WARNING" if usage_pct >= 90 else "NORMAL")
        }

    @classmethod
    def check_and_reserve(cls, db: Session, studio_id: str, required_bytes: int, upload_session_id: str, expiry_minutes: int = 120) -> StorageReservation:
        """Atomically check quota and lock a reservation before upload starts."""
        metrics = cls.get_studio_storage_metrics(db, studio_id)
        if required_bytes > metrics["available_bytes"]:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail={
                    "error": "STORAGE_QUOTA_EXCEEDED",
                    "code": "QUOTA_001",
                    "message": f"Insufficient storage quota. Required {required_bytes} bytes, but only {metrics['available_bytes']} bytes available.",
                    "current_usage_pct": metrics["usage_pct"],
                    "upgrade_url": "/dashboard/profile?tab=plans"
                }
            )

        # Create atomic reservation
        reservation = StorageReservation(
            studio_id=studio_id,
            upload_session_id=upload_session_id,
            reserved_bytes=required_bytes,
            status="ACTIVE",
            expires_at=datetime.utcnow() + timedelta(minutes=expiry_minutes)
        )
        db.add(reservation)
        db.commit()
        db.refresh(reservation)
        return reservation

    @staticmethod
    def commit_reservation(db: Session, upload_session_id: str):
        """Mark reservation as COMMITTED once the upload successfully completes."""
        res = db.query(StorageReservation).filter(StorageReservation.upload_session_id == upload_session_id).first()
        if res:
            res.status = "COMMITTED"
            db.commit()

    @staticmethod
    def release_reservation(db: Session, upload_session_id: str):
        """Release reservation if upload fails or is cancelled."""
        res = db.query(StorageReservation).filter(StorageReservation.upload_session_id == upload_session_id).first()
        if res:
            res.status = "RELEASED"
            db.commit()


quota_engine = QuotaEngine()
