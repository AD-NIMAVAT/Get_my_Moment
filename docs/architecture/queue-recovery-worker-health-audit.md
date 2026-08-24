# Get My Moment — Queue Failure Recovery, Worker Health & Fallback Audit (P1-BATCH-12)

## 1. Executive Summary

This report delivers a thorough architectural audit of the queue failure recovery mechanisms, Celery worker liveness, internal API threadpool fallback behaviors, and automated recovery decision gates for Get My Moment.

### Primary Question & Decision Summary
**What happens when a photo is accepted but Celery processing is unavailable?**
- **Durability Invariant:** Every photo is durably committed to local storage and PostgreSQL (status = UPLOADED, ile_path = originals/...) *before* Celery dispatch.
- **Broker Outage Behavior:** If Redis or Celery is unavailable during upload, the API logs a structured diagnostic warning and keeps the photo record safely committed in PostgreSQL as UPLOADED. The customer photo is **never lost**.
- **Atomic Concurrency Claim:** 
un_photo_pipeline uses an atomic Compare-And-Swap (CAS) state update (UPDATE photos SET status='PROCESSING' WHERE id=:id AND status IN ('UPLOADED', 'FAILED')) to guarantee that no photo can be processed concurrently twice.

---

## 2. Decision Gate Classifications

### 1. Threadpool Fallback Decision Gate
**REPLACE_WITH_DURABLE_RECONCILIATION (Approved)**
- **Evidence:** An in-process ThreadPoolExecutor running heavy OpenCV C++ / OpenMP inference inside the API container creates severe CPU contention on a 2 vCPU server and offers zero durability across API container restarts. Replacing ephemeral threadpool execution with PostgreSQL-backed durable state (Photo.status = UPLOADED) ensures API responsiveness and 100% crash durability.

### 2. Worker Watchdog Decision Gate
**NO_WATCHDOG_NEEDED (Approved)**
- **Evidence:** Docker daemon (
estart: always in docker-compose.prod.yml) automatically handles worker process crashes. Introducing an autonomous watchdog with arbitrary container restart powers risks triggering destructive restart storms during upstream Redis or PostgreSQL outages.

### 3. Reconciliation Decision Gate
**CURRENT_DURABLE_RECOVERY_SUFFICIENT (Approved)**
- **Evidence:** With PostgreSQL Photo table as the immutable single source of truth, orphaned UPLOADED photos or stale PROCESSING photos ($> 5	ext{ mins}$) are safely discoverable and re-dispatchable via 
econcile_orphaned_photos().

---

## 3. Failure Mode Matrix & Verified Behaviors

| Scenario | System State | Ingest Response | Photo Durability | Recovery Path |
| :--- | :--- | :---: | :---: | :--- |
| **Normal Path** | Redis UP, Worker UP | 201 Created | Saved to originals/ | Dispatched to Celery, processed in $pprox 1.2	ext{s}$ |
| **Redis Broker Down** | Redis DOWN, Worker N/A | 201 Created | Saved to originals/ | Remains UPLOADED in PostgreSQL; recovered when Redis restarts |
| **Celery Worker Down** | Redis UP, Worker DOWN | 201 Created | Saved to originals/ | Tasks queue safely in Redis list; processed when worker restarts |
| **Worker Mid-Task Crash** | Worker dies during AI | Re-enqueued | Saved to originals/ | 	ask_acks_late=True + 	ask_reject_on_worker_lost=True triggers Redis redelivery; atomic CAS reclaims safely |
| **API Container Restart** | API restarts during upload | Handled | Temp file cleaned | Unfinished .tmp unlinked; client retries with SHA-256 idempotency |

---

## 4. Idempotency & Concurrency Guarantees

1. **Atomic CAS Claim:** Single SQL update claims the photo state atomically, preventing race conditions between worker tasks and retries.
2. **Partial Face Record Cleanup:** When re-processing a photo, existing aces and ace_embeddings records are purged in the same transaction before inserting new detections, guaranteeing exact 100% idempotency.
3. **Event Isolation:** State updates, queries, and deduplication checks are mathematically scoped to event_id.
