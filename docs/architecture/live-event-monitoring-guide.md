# Get My Moment - Live Event Performance Monitoring & Operational Dashboard Guide

## 1. Overview & Architecture

The **Live Event Performance Monitoring** layer provides real-time, event-scoped operational visibility into photo ingestion, Celery worker processing, queue depth, and guest-ready delivery latency.

## 2. Event Health Metrics Specification

| Metric Field | Type | Source | Aggregation Scope | Null / Zero Semantics |
| :--- | :---: | :--- | :--- | :--- |
| **photos_total** | int | PostgreSQL photos | All active photos in the event | 0 when event has no photos |
| **photos_uploaded** | int | PostgreSQL photos | Photos with status = UPLOADED | 0 when queue is empty |
| **photos_processing** | int | PostgreSQL photos | Photos with status = PROCESSING | 0 when no worker is active |
| **photos_ready** | int | PostgreSQL photos | Photos with status = PROCESSED | 0 until first photo is ready |
| **photos_failed** | int | PostgreSQL photos | Photos with status = FAILED | 0 under normal operation |
| **database_pending_count** | int | PostgreSQL photos | photos_uploaded + photos_processing | 0 when all photos are processed |
| **queue_depth** | Optional[int] | Redis LLEN celery | Global Redis List length | None when Redis is unreachable |
| **queue_metrics_unavailable** | bool | Redis connection check | Real-time broker connectivity | True when Redis is down/unreachable |
| **oldest_queue_age_seconds** | Optional[int] | PostgreSQL photos | now - min(queued_at) for pending photos | None when 0 photos are pending |
| **capture_to_guest_p50_ms** | Optional[int] | PostgreSQL photos | guest_ready_at - queued_at over latest 100 processed | None when 0 processed photos exist |
| **capture_to_guest_p95_ms** | Optional[int] | PostgreSQL photos | guest_ready_at - queued_at over latest 100 processed | None when 0 processed photos exist |
| **processing_p50_ms** | Optional[int] | PostgreSQL photos | processing_duration_ms over latest 100 processed | None when 0 processed photos exist |
| **processing_p95_ms** | Optional[int] | PostgreSQL photos | processing_duration_ms over latest 100 processed | None when 0 processed photos exist |
| **ai_inference_p50_ms** | Optional[int] | PostgreSQL photos | ai_inference_ms over latest 100 processed | None when 0 processed photos exist |
| **ai_inference_p95_ms** | Optional[int] | PostgreSQL photos | ai_inference_ms over latest 100 processed | None when 0 processed photos exist |
| **photos_received_recently** | int | PostgreSQL photos | Photos created within past 15-minute window | 0 when no photos in window |
| **photos_completed_recently** | int | PostgreSQL photos | Photos processed within past 15-minute window | 0 when no photos in window |
| **health_reasons** | List[str] | Backend rule engine | State diagnostics | [IDLE] or [PROCESSING_NORMALLY] |
| **health_message** | str | Backend rule engine | Human-readable photographer guidance | Concise status explanation |

## 3. Metric Formulations & Semantics

### True Capture-to-Guest Latency
Capture-to-Guest = guest_ready_at - queued_at
- **Correct Formulation:** Measures the complete end-to-end duration from when the photo was acknowledged and queued by the server to when the AI worker persisted face embeddings and marked it guest-ready.
- **Worker Execution Only:** processing_duration_ms = guest_ready_at - processing_started_at.
- **Queue Wait:** queue_wait_ms = processing_started_at - queued_at.

## 4. Pipeline Health State Transitions

| Health State | Trigger Conditions | Dashboard Visual | Action Required |
| :--- | :--- | :--- | :--- |
| **READY** | 0 pending, 0 failed, queue depth 0 | Emerald pill, CheckCircle2 | Normal standby |
| **PROCESSING** | Pending <= 25, queue age <= 30s, 0 failed | Blue pill, Activity (pulse) | Ingestion active |
| **WARNING** | Pending > 25 OR queue age > 30s OR failed > 0 | Amber pill, AlertTriangle | Backlog developing |
| **CRITICAL** | Pending > 100 OR queue age > 120s | Rose pill, AlertCircle | Significant backlog |
| **TELEMETRY_UNAVAILABLE** | Redis unreachable (q_depth is None) | Purple pill, Clock | Inspect Redis broker |

## 5. UI Polling Strategy & Database Safety

1. **Visibility-Aware Polling:** Polling interval is set to 3.0 seconds when the browser tab is active and pauses immediately when the tab is hidden.
2. **Single Shared Query:** Event command center polls a single endpoint (GET /api/v1/events/{id}/health) rather than separate queries per metric card.
3. **Bounded Latency Window:** Latency percentiles (p50/p95) are computed strictly across the latest 100 processed photos (LIMIT 100), ensuring O(1) query overhead regardless of event size.
4. **Tenant Isolation:** Every health request validates photographer ownership (Event.photographer_id == current_photographer.id), preventing cross-tenant information exposure.
