# Get My Moment — Canonical Production Performance Baseline

## 1. Metric Definitions
- **Queue Wait:** Time spent waiting in Redis queue: processing_started_at - queued_at
- **Worker Processing:** Time spent in worker pipeline: guest_ready_at - processing_started_at
- **AI Inference:** Pure OpenCV YuNet + SFace inference time
- **Capture-to-Guest:** Total turnaround time from queue ingestion to guest readiness: guest_ready_at - queued_at

---

## 2. Reconciled Benchmark Evidence (2 vCPU / 2GB RAM Host)

| Ingest Profile | Queue Wait (p50) | Worker Processing (p50) | AI Inference (p50) | Capture-to-Guest (p50) | Queue Drain | Peak CPU | Peak RAM |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1-Photo Baseline** | 12 ms | 671 ms | 480 ms | 683 ms | < 1 s | 48% | 58% |
| **5-Photo Sequential** | 15 ms | 837 ms | 560 ms | 852 ms | ~4.2 s | 62% | 64% |
| **10-Photo Burst** | 7.1 s | 1,440 ms | 1,120 ms | 8.54 s | 14.2 s | 88% | 72% |
| **25-Photo Burst** | 12.4 s | 1,755 ms | 1,240 ms | 14.15 s | 26.0 s | 96% | 80% |

*Note: Peak Capture-to-Guest under 25-photo burst was 26.51s; queue drained safely in 26.0s.*

---

## 3. Measured Facts vs Inferences

- **Measured Fact:** Celery concurrency=2 processes 25-photo bursts safely without OOM or task loss on 2GB RAM.
- **Measured Fact:** Exact vector search query latency is < 1.0ms for current event embedding counts.
- **Measured Fact:** HTTP application streaming read buffer is 64KB per chunk.
- **Inference:** Concurrency 3 or 4 on 2GB RAM would increase CPU contention and swap thrashing unless RAM is upgraded.
