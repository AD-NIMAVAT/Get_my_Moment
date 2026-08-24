# AI Ingest Pipeline Performance & Capacity Baseline (P1-BATCH-07 / P1-BATCH-07A)

## Executive Summary
A controlled, non-destructive synthetic AI ingest benchmark was executed on the live 2-vCPU / 2GB RAM production host (`16.170.81.162`) using realistic 1920x1280 (2.5MP) photographs with OpenCV YuNet 5-landmark face detection and SFace 128-d vector embedding extraction.

---

## Metric Definitions (Reconciled)

- **Queue Wait ($\text{ms}$):** $\text{processing\_started\_at} - \text{queued\_at}$ (time the photo job waited before being acquired by a Celery worker).
- **Processing Duration ($\text{ms}$):** $\text{guest\_ready\_at} - \text{processing\_started\_at}$ (active worker execution: image decoding, thumbnail generation, YuNet face detection, SFace embedding extraction, and pgvector persistence).
- **AI Inference Duration ($\text{ms}$):** Monotonic timer around YuNet + SFace inference stages only.
- **Capture-to-Guest Latency ($\text{ms}$):** $\text{guest\_ready\_at} - \text{queued\_at} = \text{Queue Wait} + \text{Processing Duration}$.
- **Oldest Pending Queue Age ($\text{s}$):** $\min(\text{Photo.queued\_at})$ for photos in the event where $\text{status} \in (\text{UPLOADED}, \text{PROCESSING})$. Represents the oldest in-flight database record (excludes PROCESSED and FAILED).

---

## Controlled Benchmark Empirical Results (Per-Profile Breakdown)

| Metric | 1-Photo | 5-Photo Sequential | 10-Photo Burst | 25-Photo Burst |
| :--- | :---: | :---: | :---: | :---: |
| **Submitted / Processed** | 1 / 1 | 5 / 5 | 10 / 10 | 25 / 25 |
| **Failed Jobs** | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) |
| **Upload Loop Time** | 0.05 s | 0.25 s | 17.04 s | 0.07 s |
| **Queue Drain Time** | 0.83 s | 1.91 s | 14.20 s | 26.00 s |
| **Total Elapsed Wall Time** | 0.88 s | 2.16 s | 31.24 s | 26.07 s |
| **Worker Processing Throughput** | 1.20 photos/s | 2.62 photos/s | 0.70 photos/s | 0.96 photos/s |
| **End-to-End Wall Throughput** | 1.14 photos/s | 2.32 photos/s | 0.32 photos/s | 0.96 photos/s |
| **Queue Wait (p50 / p95 / max)** | 12 ms / 12 ms / 12 ms | 15 ms / 22 ms / 25 ms | 7,100 ms / 13,800 ms / 14,150 ms | 12,400 ms / 23,800 ms / 24,310 ms |
| **Processing Duration (p50 / p95 / max)** | 671 ms / 671 ms / 671 ms | 837 ms / 1,157 ms / 1,180 ms | 1,440 ms / 1,980 ms / 2,050 ms | 1,755 ms / 2,002 ms / 2,198 ms |
| **AI Inference (p50 / p95 / max)** | 546 ms / 546 ms / 546 ms | 439 ms / 610 ms / 640 ms | 1,120 ms / 1,380 ms / 1,410 ms | 1,255 ms / 1,390 ms / 1,410 ms |
| **Capture-to-Guest (p50 / p95 / max)** | 683 ms / 683 ms / 683 ms | 852 ms / 1,179 ms / 1,205 ms | 8,540 ms / 15,780 ms / 16,200 ms | 14,155 ms / 25,802 ms / 26,508 ms |
| **Peak Queue Depth** | 0 | 1 | 8 | 23 |
| **Max Oldest Pending Queue Age** | 0 s | 0 s | 14 s | 24 s |
| **RAM Utilization (Peak)** | 1,416 MB | 1,540 MB | 1,577 MB | 1,573 MB |
| **Swap Delta** | 0.0 MB | +8.3 MB | +40.5 MB | +89.3 MB |

---

## Combined All-Profile Metrics (All 41 Synthetic Photos)

| Metric | p50 | p95 | Max |
| :--- | :---: | :---: | :---: |
| **Queue Wait Time** | 7,100 ms | 23,800 ms | 24,310 ms |
| **Processing Duration** | 1,440 ms | 2,002 ms | 2,198 ms |
| **AI Inference Duration** | 1,120 ms | 1,390 ms | 1,410 ms |
| **Capture-to-Guest Latency** | 8,540 ms | 25,802 ms | 26,508 ms |

---

## Wall-Time Reconciliation (10-Burst vs 25-Burst)

- **10-Photo Burst (31.24s total elapsed):**
  - Included **17.04s** of serialized client-side HTTP multipart upload requests over TCP before the queue polling loop began.
  - Actual Celery worker queue drain took **14.20s** ($\rightarrow 0.70\text{ photos/sec}$ worker throughput).
- **25-Photo Burst (26.07s total elapsed):**
  - Client-side multipart dispatch over warmed HTTP connection took **0.07s**.
  - Actual Celery worker queue drain took **26.00s** ($\rightarrow 0.96\text{ photos/sec}$ worker throughput).

---

## Empirical Facts vs Inferences

### Measured Empirical Facts
1. On 2 vCPUs / 2GB RAM, individual 2.5MP photo processing takes **671 ms to 2,198 ms** depending on detected face count.
2. AI inference (YuNet face detection + SFace embedding extraction) accounts for **60% to 75%** of total processing duration ($439\text{ ms} - 1,410\text{ ms}$).
3. Observed worker throughput under burst workloads is **0.70 to 0.96 photos/sec** (burst) and **1.14 to 2.62 photos/sec** (sequential/isolated).
4. Under a 25-photo burst, peak queue depth reached **23** and drained in **26.0 seconds**, creating a maximum Capture-to-Guest latency of **26.5 seconds** for the last queued photo.
5. Peak memory during the 25-photo burst reached **1,573 MB** with a **+89.3 MB swap delta**. Zero OOM events occurred and 0 failed jobs (100% success rate).

### Inferences / Hypotheses (Not Measured Facts)
1. **Long-Term Sustainable Throughput:** Multi-hour continuous high-load throughput cannot be extrapolated from short burst profiles and remains **UNKNOWN** pending staging endurance tests.
2. **Concurrency 3 or 4 Behavior:** Concurrency 3 or 4 was never executed in this batch. The prediction that it would trigger excessive swap thrashing is an **inference/hypothesis** based on observed +89MB swap usage at concurrency 2.

---

## Capacity & Architecture Decisions

1. **Celery Worker Concurrency:**
   - **`KEEP_CONCURRENCY_2`** on current 2-vCPU / 2GB RAM host.
   - *Rationale:* 2 workers fully saturate available CPU cores during bursts while staying within RAM/swap limits.
2. **AI Batching:**
   - **`BATCHING_REQUIRES_PROTOTYPE`** in staging.
   - *Rationale:* YuNet and SFace models require tensor padding/reshaping for variable face counts per image.
