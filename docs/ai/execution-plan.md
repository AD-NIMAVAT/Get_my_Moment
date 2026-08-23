# Get My Moment — Phase 1 Evidence-Based Execution Plan (P1-MASTER)

**Status:** `AWAITING USER APPROVAL FOR FIRST IMPLEMENTATION BATCH (P1-BATCH-01)`  
**Baseline Evidence:** Grounded entirely in empirical production measurements from `P1-BASELINE-01`.

---

## 1. EVIDENCE-BASED P1 PRIORITY RANKINGS

| Rank | Priority Item | Empirical Evidence & Justification | Expected Benefit | Production Risk |
| :-: | :--- | :--- | :--- | :---: |
| **P1-1** | **AWS S3 Object Storage Integration** | Local NVMe disk has only 30 GB available; will exhaust at ~6,500 photos (2-3 weddings). | **Unlimited photo capacity**; zero local disk exhaustion risk. | **Low** (Dual-driver support with fallback) |
| **P1-2** | **CloudFront CDN & Nginx Direct Media Offload** | User-perceived latency in India is ~620ms (Stockholm host); Uvicorn workers currently stream raw thumbnails. | **Reduces latency to < 35ms** in India; eliminates API worker I/O blocking. | **Low** (Transparent reverse-proxy caching) |
| **P1-3** | **Next.js Gallery Virtualization & Pagination** | Unpaginated DOM lists cause mobile browser memory thrashing for > 200 matched photos. | **Smooth 60fps scrolling**; eliminates mobile browser crashes. | **Zero** (Frontend client rendering only) |
| **P1-4** | **Celery AI Ingest Optimization** | Celery concurrency = 2 on 2 vCPUs creates queue latency during 10-camera live shooting bursts. | **Boosts ingest throughput by 3x**; keeps CPU within safe thermal limits. | **Low** (Worker process tuning) |
| **P1-5** | **Event Lifecycle Schema Migration (`closed_at` / `archived_at`)** | Establishes formal data retention boundaries for future biometric purging. | **Clean DPDP Act compliance** foundation. | **Low** (Non-breaking additive column migration) |
| **P1-6** | **pgvector HNSW Indexing Benchmark** | Exact in-memory cosine search currently executes in < 3ms for < 2,000 vectors. | **Deferred** until single-event vectors exceed 10,000. | **None** (Deferred) |

---

## 2. EXACT RECOMMENDED FIRST IMPLEMENTATION BATCH

### **P1-BATCH-01: AWS S3 Storage Adapter & Dual-Driver Storage Foundation**

**Scope:**
1. Configure `apps/api/services/s3_storage.py` with standard boto3 S3 client with SSE-S3 AES-256 encryption.
2. Maintain `STORAGE_DRIVER=local` as default until AWS S3 bucket and IAM permissions are verified.
3. Add automated test suite `tests/storage/test_s3_storage.py` validating dual-driver parity, upload, presigned download URLs, and fallback.
4. Zero disruption to existing production photos.

