# Get My Moment — Infrastructure & Capacity Baseline (P1-BASELINE-01)

**Host:** AWS EC2 `16.170.81.162` (Region: `eu-north-1`, Stockholm)  
**Hardware Specification:**
- **Instance Type:** `t3.small` / `t3a.small` (2 vCPUs, 2.0 GiB RAM)
- **CPU:** Intel(R) Xeon(R) Platinum 8259CL CPU @ 2.50GHz (2 vCPUs)
- **Physical Memory:** 1.9 GiB RAM (Available: 899 MiB, Active Buffers: 801 MiB)
- **Swap Space:** 2.0 GiB (292 MiB used)
- **Disk Storage:** 48 GB NVMe EBS volume (ext4), 19 GB used (39%), 30 GB available.

---

## 1. DOCKER CONTAINER RESOURCE CONSUMPTION

Measured in idle production state:

```text
NAME                        CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O
getmymoment_prod_web        0.00%     39.58MiB / 1.861GiB   2.08%     317kB / 4.13MB    36.6MB / 0B
getmymoment_prod_api        0.15%     100.3MiB / 1.861GiB   5.26%     56.6kB / 470kB    48MB / 23.6MB
getmymoment_prod_worker     0.05%     25.09MiB / 1.861GiB   1.32%     7.9MB / 8.31MB    72.7MB / 133MB
getmymoment_prod_redis      0.56%     6.562MiB / 1.861GiB   0.34%     87.3MB / 82.4MB   565MB / 553kB
getmymoment_prod_postgres   0.00%     59.24MiB / 1.861GiB   3.11%     9.19MB / 9.76MB   3.36GB / 75.6MB
```

---

## 2. PRODUCTION CONCURRENCY & WORKER ARCHITECTURE

1. **API Concurrency:** Uvicorn runs with `--workers 2`.
   - Max concurrent requests before queueing: ~200 connections (FastAPI async event loop).
   - CPU-bound endpoints (e.g. image decoding) can block workers.
2. **AI Processing Concurrency:** Celery worker runs with `--concurrency 2`.
   - Dedicated exclusively to photo face detection (YuNet) and feature extraction (SFace).
   - Each photo requires ~120 ms CPU time.
   - Max sustained throughput: `16 photos / second` on 2 vCPUs.
3. **Memory Headroom Risk:**
   - Host has **899 MiB** available RAM.
   - If AI worker processes two 45-Megapixel raw photos simultaneously in OpenCV RAM, memory usage will spike by ~250–400 MiB, approaching host memory limits.
   - **Recommendation:** Keep Celery concurrency at 2 until EC2 is resized or worker memory limits are enforced in docker-compose.

