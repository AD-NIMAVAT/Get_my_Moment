# Runbook: Photo Processing & Pipeline Health Monitoring

## Health Endpoint
Photographers can check the real-time health of any event via:
```http
GET /api/v1/events/{event_id}/health
Authorization: Bearer <photographer_jwt>
```

## Response Fields
- `pipeline_health`: `HEALTHY` | `PROCESSING` | `BACKLOG` | `ATTENTION_REQUIRED`
- `photos_total`: Total photos in event.
- `photos_ready`: Photos processed and searchable.
- `photos_processing`: Photos currently undergoing AI detection.
- `photos_failed`: Photos that encountered processing errors.
- `queue_depth`: Tasks in Redis backlog.
- `avg_processing_duration_ms`: Rolling average processing time per photo.
- `p95_processing_duration_ms`: 95th percentile latency per photo.
- `last_photo_received_at`: Timestamp of newest upload.
- `last_guest_ready_at`: Timestamp of newest completed photo.

## Remediation Actions
1. **Backlog > 100:** Check Celery worker status via `docker compose -f docker-compose.prod.yml ps`.
2. **Photos Failed > 0:** Inspect failure category in database via `SELECT id, original_file_name, failure_category, error_message FROM photos WHERE event_id = :id AND status = 'FAILED';`.
