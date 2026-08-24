# Get My Moment — Operational Incident Runbook

## 1. Diagnostic Health States & Actions

### READY
- **Symptom:** Queue depth 0, pending photos 0, no failed photos.
- **Action:** Normal operation.

### PROCESSING
- **Symptom:** Photos arriving and processing normally.
- **Action:** Monitor queue depth and oldest queue age.

### WARNING
- **Symptom:** Pending photos > 25 or queue age > 30 seconds.
- **Safe Action:** Check Celery worker logs: docker logs --tail 100 getmymoment_prod_worker.

### CRITICAL
- **Symptom:** Pending photos > 100, queue age > 120 seconds, or failed photos > 0.
- **Safe Action:**
  1. Inspect worker logs: docker logs --tail 200 getmymoment_prod_worker.
  2. Inspect PostgreSQL load: docker exec getmymoment_prod_postgres pg_isready.
  3. Inspect Redis status: docker exec getmymoment_prod_redis redis-cli ping.
  4. Trigger manual reconciliation if backlog is stalled: invoke /api/v1/health or restart Celery worker if deadlocked.

### TELEMETRY_UNAVAILABLE
- **Symptom:** Redis is unreachable.
- **Safe Action:**
  1. Check Redis container: docker ps | grep redis.
  2. Restart Redis container: docker compose -f docker-compose.prod.yml restart redis.
  3. All photos remain safely stored in PostgreSQL and local storage.
