# Celery & Redis Queue Observability

## Queue Architecture
Get My Moment uses Redis as the Celery message broker on port `6379`.
Tasks are placed on the default queue (`celery`).

## Monitored Metrics
- **Queue Depth (`queue_depth`):** Number of pending tasks waiting in Redis (`LLEN celery`).
- **Pipeline Health Status:**
  - `HEALTHY`: 0 errors and queue depth < 10.
  - `PROCESSING`: Active worker processing or queue depth > 0.
  - `BACKLOG`: Queue depth > 50 tasks.
  - `ATTENTION_REQUIRED`: 1 or more failed tasks in event.

## Safe Failure Categories
When an AI processing task fails, the worker categorizes the failure into structured, non-sensitive strings:
- `DECODE_FAILED`: Corrupted image or invalid format.
- `THUMBNAIL_FAILED`: Thumbnail generation failed.
- `FACE_DETECTION_FAILED`: OpenCV YuNet inference failed.
- `EMBEDDING_FAILED`: SFace model embedding failed.
- `DB_FAILED`: Database transaction commit error.
- `UNKNOWN_FAILURE`: Unhandled exception.
