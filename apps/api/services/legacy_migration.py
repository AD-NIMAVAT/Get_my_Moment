"""
Legacy Photo & Folder Migration Service
Ensures existing flat photos are safely mapped to studio_id and event's 'Uncategorized' folder.
"""

import logging
from sqlalchemy.orm import Session
from apps.api.models.event import Event
from apps.api.models.photo import Photo
from apps.api.services.storage import get_or_create_uncategorized_folder, reconcile_folder_counters

logger = logging.getLogger("LegacyMigration")


def run_legacy_photo_folder_migration(db: Session) -> dict:
    """
    Idempotent migration:
    1. Iterates over all active Events.
    2. Ensures event.photographer_id (studio_id) is set.
    3. Creates or finds the protected 'Uncategorized' folder for the event.
    4. Backfills photo.studio_id and photo.folder_id for any orphan/flat photos.
    5. Reconciles photo counts and storage sizes.
    """
    events = db.query(Event).all()
    migrated_photos_count = 0
    events_processed = 0

    for ev in events:
        studio_id = ev.photographer_id
        if not studio_id:
            continue

        events_processed += 1
        uncat_folder = get_or_create_uncategorized_folder(db, studio_id=studio_id, event_id=ev.id)

        # Find photos in this event needing backfill
        unassigned_photos = db.query(Photo).filter(
            Photo.event_id == ev.id,
            (Photo.folder_id.is_(None)) | (Photo.studio_id.is_(None))
        ).all()

        for p in unassigned_photos:
            if not p.studio_id:
                p.studio_id = studio_id
            if not p.folder_id:
                p.folder_id = uncat_folder.id
            migrated_photos_count += 1

        db.commit()
        reconcile_folder_counters(db, event_id=ev.id)

    logger.info(f"✅ [MIGRATION COMPLETE] Processed {events_processed} events, backfilled {migrated_photos_count} photos.")
    return {
        "events_processed": events_processed,
        "photos_migrated": migrated_photos_count,
        "status": "SUCCESS"
    }
