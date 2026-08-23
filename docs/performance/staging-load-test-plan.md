# Get My Moment — Staging Load Test Plan (P1-BASELINE-01)

**Status:** `STAGING_ENVIRONMENT_MISSING — PROPOSED SPECIFICATION`  
**Purpose:** Safely benchmark simulated wedding workloads without risking production availability or customer data.

---

## 1. SIMULATION WORKLOAD TARGETS

- **Synthetic Event Dataset:** 1 Event, 5,000 synthetic high-resolution wedding photos (4.5 MB average).
- **Ingest Load:** 10 simulated concurrent camera uploads (50 photos / second burst).
- **Guest Search Load:** 100 concurrent guest registrations and 50 facial searches / minute.
- **Gallery Delivery Load:** 250 concurrent thumbnail requests / second.

---

## 2. MONITORING & SUCCESS CRITERIA

1. **AI Ingest Queue:** Redis Celery queue backlog must not exceed 200 tasks; 95% of photos indexed within 30 seconds of upload.
2. **Face Search Latency:** p95 search response time < 250 ms.
3. **API Availability:** 0% HTTP 5xx errors; HTTP 429 rate limiting gracefully throttles abusive bursts.
4. **Memory Stability:** Peak RAM usage stays within container limits with zero OOM restarts.

