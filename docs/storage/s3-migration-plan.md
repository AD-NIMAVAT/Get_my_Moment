# Get My Moment — Historical Media S3 Migration Plan (P1-BATCH-01)

**Execution Phase:** `PHASE E (Deferred until Phase D Pilot is Successful)`  
**Scope:** Reversible, non-destructive background migration of historical local photos to AWS S3.

---

## 1. MIGRATION INVARIANTS & INTEGRITY RULES

1. **Non-Destructive Copy First:** Historical local files in `data/events/` and `storage/` are **NEVER deleted** during the migration phase. They are retained until S3 verification is 100% complete.
2. **SHA-256 Parity Verification:** Every migrated file is hashed upon upload to S3; the checksum is verified against `photos.sha256_hash` in PostgreSQL before updating the record.
3. **Chunked Background Execution:** Migration runs as a low-priority background Celery task or batch CLI script (`scripts/migrate_media_to_s3.py`) processing 50 photos per batch to avoid CPU/network starvation.
4. **Idempotency:** Re-running the migration script safely skips photos already migrated and verified in S3 (`head_object`).

---

## 2. PROPOSED MIGRATION CLI SCRIPT SPECIFICATION

```bash
# Dry-run mode (Inspects counts and sizes only, zero writes)
python scripts/migrate_media_to_s3.py --dry-run

# Live execution with batching
python scripts/migrate_media_to_s3.py --batch-size 50 --verify-checksums
```

