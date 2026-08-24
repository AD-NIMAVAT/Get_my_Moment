# Get My Moment — Canonical Production Performance Baseline

## 1. Metric Definitions (Strictly Monotonic & Reconciled)
- **Queue Wait:** Time spent waiting in Redis queue: `processing_started_at - queued_at`
- **Worker Processing:** Active worker execution time: `guest_ready_at - processing_started_at`
- **AI Inference:** Monotonic measured YuNet face detection + SFace embedding extraction region
- **Capture-to-Guest:** Total turnaround time from queue ingestion to guest readiness: `guest_ready_at - queued_at`
- **Client Upload Phase:** Time taken to transfer multipart photo payload over HTTP network socket
- **Queue Drain Time:** Total duration from first job processing start until last job completes in Celery

---

## 2. Reconciled Benchmark Evidence (2 vCPU / ~2GB RAM Host)

### Per-Profile Empirical Breakdown

| Ingest Profile | Submitted / Processed | Client Upload Phase | Queue Drain Time | Total Elapsed Wall Time | Queue Wait (p50 / p95 / max) | Worker Processing (p50 / p95 / max) | AI Inference (p50 / p95 / max) | Capture-to-Guest (p50 / p95 / max) | Peak Queue Depth | RAM Peak | Swap Delta (Burst) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1-Photo Baseline** | 1 / 1 | 0.05 s | 0.83 s | 0.88 s | 12 ms / 12 ms / 12 ms | 671 ms / 671 ms / 671 ms | 546 ms / 546 ms / 546 ms | 683 ms / 683 ms / 683 ms | 0 | 1,416 MB | 0.0 MB |
| **5-Photo Sequential** | 5 / 5 | 0.25 s | 1.91 s | 2.16 s | 15 ms / 22 ms / 25 ms | 837 ms / 1,157 ms / 1,180 ms | 439 ms / 610 ms / 640 ms | 852 ms / 1,179 ms / 1,205 ms | 1 | 1,540 MB | +8.3 MB |
| **10-Photo Burst** | 10 / 10 | 17.04 s | 14.20 s | 31.24 s | 7,100 ms / 13,800 ms / 14,150 ms | 1,440 ms / 1,980 ms / 2,050 ms | 1,120 ms / 1,380 ms / 1,410 ms | 8,540 ms / 15,780 ms / 16,200 ms | 8 | 1,577 MB | +40.5 MB |
| **25-Photo Burst** | 25 / 25 | 0.07 s | 26.00 s | 26.07 s | 12,400 ms / 23,800 ms / 24,310 ms | 1,755 ms / 2,002 ms / 2,198 ms | 1,255 ms / 1,390 ms / 1,410 ms | 14,155 ms / 25,802 ms / 26,508 ms | 23 | 1,573 MB | +89.3 MB |

*Note: The authorized 25-photo synthetic burst completed with 0 failed jobs and 0 OOM events; observed queue drain was 26.00s and maximum Capture-to-Guest latency was 26.508s.*

---

## 3. Discrepancy Reconciliation Summary

1. **AI Inference Metrics:** Reconciled to primary empirical measurements ($546\text{ms}, 439\text{ms}, 1,120\text{ms}, 1,255\text{ms}$ p50).
2. **Swap Usage Discrepancy:**
   - **Benchmark Burst Swap Delta:** Measured at $+89.3\text{MB}$ during the 25-photo burst under Celery concurrency=2.
   - **Idle / Standard Operation Swap:** Measured at $0.0\text{MB}$ during steady state.
   - **Container Build Swap:** Temporary minor swap allocations during multi-stage Docker builds.
3. **Queue Drain vs Wall Time (5-Photo):** Reconciled: client upload was $0.25\text{s}$, Celery queue drain was $1.91\text{s}$, total wall time was $2.16\text{s}$.

---

## 4. Measured Facts vs Inferences

### Measured Facts
- Celery concurrency=2 processes 25-photo bursts safely without OOM or task loss on 2GB RAM.
- Exact vector search query latency is $< 1.0\text{ms}$ on current production embedding counts.
- HTTP application stream read buffer is $64\text{KB}$ per chunk.
- Background reconciliation loop runs every $60\text{s}$ in API lifespan with `@worker_ready.connect` hook in Celery.

### Inferences / Hypotheses
- Concurrency 3 or 4 would increase CPU contention and swap thrashing on a 2GB RAM host (inferred from $+89.3\text{MB}$ swap at concurrency 2).
- Multi-hour continuous endurance throughput is **UNKNOWN** pending staging load testing.
