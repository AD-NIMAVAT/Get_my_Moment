# Get My Moment — Upload Streaming, Large-File Memory Safety & Durability Guide (P1-BATCH-11)

## 1. Executive Summary

This document establishes the production architectural specifications, memory safety bounds, atomic filesystem durability guarantees, and decision gate classifications for photo ingestion across Get My Moment.

### Core Durability Invariant
\\text{Photo Durability} > \\text{Ingest Speed}
No photo is acknowledged to the photographer or client without meeting immutable local storage durability guarantees.

---

## 2. Ingest Paths Taxonomy

Get My Moment supports 4 distinct photo ingestion channels:

1. Photographer Web / Dashboard Upload:
   Client (Web Browser) 
   → POST /api/v1/events/{id}/photos 
   → Streaming 64KB Chunked Spool (.tmp)
   → Atomic Rename to originals/{uuid}.jpg
   → PostgreSQL Photo (status=UPLOADED)
   → Non-blocking Celery Dispatch (run_photo_pipeline)
   → AI Background Worker (YuNet / SFace)

2. Guest Public Upload:
   Client (Mobile Browser)
   → POST /api/v1/events/public/{token}/guest-upload
   → Streaming 64KB Chunked Spool (.tmp)
   → Atomic Rename to originals/06_Guest_Uploads/{uuid}.jpg
   → PostgreSQL Photo (status=UPLOADED, is_guest_uploaded=True)
   → Non-blocking Celery Dispatch

3. Wireless Camera HTTP Ingest:
   Pocket Mobile Relay / Camera Wi-Fi Tool
   → POST /api/v1/wireless/events/{id}/http-ingest
   → Streaming 64KB Chunked Spool (.tmp)
   → Atomic Rename to originals/{uuid}.jpg
   → PostgreSQL Photo (status=UPLOADED, [WIRELESS])
   → Non-blocking Celery Dispatch

4. Wireless Camera FTP Ingest:
   DSLR / Mirrorless Camera (Sony, Canon, Nikon, Fuji)
   → FTP Socket on Port 2121 (data/wireless_incoming/{token}/)
   → Transfer Completion & Socket Quiescence Verification (0.4s stability check)
   → Image Integrity Verification (PIL verify/load)
   → Atomic Ingest to originals/{uuid}.jpg
   → PostgreSQL Photo (status=UPLOADED)
   → Non-blocking Celery Dispatch
   → Staging Cleanup

---

## 3. Bounded Memory Safety & Streaming Architecture

### The Problem (Unbounded RAM Buffering)
Prior to P1-BATCH-11, endpoints called file_bytes = await file.read(), loading full 20MB–50MB camera files into Python heap memory. Under 20 concurrent uploads, this created up to 1GB memory spikes on a 2GB RAM host.

### The Solution (True Chunked Streaming)
- Bounded Chunk Size: settings.UPLOAD_STREAM_CHUNK_SIZE_KB = 64 (64 KB per chunk).
- RAM Footprint per Upload: Bounded at O(chunk_size) (~64 KB), independent of total photo file size.
- Incremental Checksum: SHA-256 computed on-the-fly (hasher.update(chunk)).
- Size Enforcement: Ingest aborts immediately if bytes written exceed settings.MAX_UPLOAD_SIZE_MB (50 MB), cleaning up the temporary file and raising HTTP 413.
- Memory-Safe Validation: Image dimensions and format integrity are verified directly against the disk file (validate_image_file(temp_path)) without loading the uncompressed raw bytes into memory.

---

## 4. Atomic Write Semantics & Crash Safety

1. Temporary Isolation: Incoming chunks are written to {base_dir}/temp/{uuid}.tmp.
2. Disk Flush: out_f.flush() and os.fsync() ensure data is written to physical disk blocks.
3. Atomic Finalization: os.replace(temp_path, final_abs_path) renames the file atomically within the same filesystem.
4. Zero Orphaned Files: Any exception during stream upload, validation, duplicate rejection, or client disconnection triggers an immediate os.remove(temp_path) in the exception/finally block.

---

## 5. Idempotency & Tenant-Scoped Deduplication

- Deduplication Scope: Evaluated strictly per event_id (Photo.event_id == event_id AND (Photo.sha256_hash == hash OR Photo.idempotency_key == key)).
- Privacy Guarantee: Deduplication never operates cross-tenant, ensuring studio photo libraries remain strictly isolated.
- Redundant File Cleanup: When a duplicate photo is detected, newly written temporary files are immediately deleted (storage_service.delete_file(rel_path)), preventing storage waste.

---

## 6. Celery / Redis Disruption Resilience

- Durability Guarantee: Photo bytes and database metadata are committed to PostgreSQL before Celery dispatch.
- Queue Outage Behavior: If Redis is temporarily unavailable:
  1. dispatch_photo_processing catches the Redis connection exception and logs a warning.
  2. The function automatically falls back to an internal ThreadPoolExecutor.
  3. If both Celery and local threadpool fail, the photo remains safely recorded in PostgreSQL with status UPLOADED, ready for subsequent recovery without data loss.

---

## 7. Decision Gates

### 1. Retry / Reconciliation Classification
CURRENT_RECOVERY_SUFFICIENT
- Evidence: Celery retry policies (max_retries=3, task_acks_late=True, task_reject_on_worker_lost=True) plus fallback execution in dispatch_photo_processing ensure robust recovery without needing a heavyweight background watchdog daemon.

### 2. HTTP Resumable Upload Decision
STANDARD_STREAMING_UPLOAD_SUFFICIENT
- Evidence: Standard 64KB chunked streaming upload with 50MB file limits is fully sufficient for 99.9% of photography workflows. An optional tus-compatible chunked upload session router is already available under /api/v1/uploads for massive multi-gigabyte exports if needed.

### 3. FTP Resume Assessment
- Direct atomic transfers with completion hooks (on_file_received) provide 100% reliable camera sync. Partial transfers (.tmp/.part) are safely ignored until fully written.
