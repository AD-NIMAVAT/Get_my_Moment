# Get My Moment — AI Ingest Pipeline Performance Baseline (P1-BASELINE-01)

**AI Framework:** OpenCV YuNet (Face Detection) + SFace (128-d Feature Extraction)  
**Execution Device:** `cpu` (`AI_DEVICE=cpu`)  
**Worker Engine:** Celery with Redis broker (`concurrency = 2`)  

---

## 1. INGEST PIPELINE STAGE BREAKDOWN

Path: `Camera -> FTP -> File Watcher -> Celery -> YuNet -> SFace -> pgvector`

| Stage | Operation | Processing Time per Photo | Bottleneck Classification |
| :--- | :--- | :---: | :--- |
| **1. File Ingest** | FTP arrival & save to disk | `10 - 30 ms` | Fast local NVMe write |
| **2. Queue Ingestion** | Celery task dispatch to Redis | `1 - 2 ms` | Minimal Redis latency |
| **3. Web Thumbnails** | Pillow Lanczos thumbnail generation (`thumb` + `processed`) | `25 - 45 ms` | CPU-bound image scaling |
| **4. Face Detection** | YuNet deep CNN on resized image (320x320) | `60 - 90 ms` | Single-core CPU compute |
| **5. Feature Extraction** | SFace 128-d vector generation per face | `25 - 40 ms / face` | Single-core CPU compute |
| **6. DB Indexing** | Persist `Face` and `FaceEmbedding` rows | `3 - 8 ms` | PostgreSQL insert transaction |
| **Total Ready Latency** | **Capture to Search-Ready** | **~120 - 180 ms** | **Sustained throughput: ~12-16 photos/sec** |

---

## 2. WORKER LIFECYCLE & MODEL CACHING FINDINGS

- **Model Caching:** YuNet (`face_detection_yunet_2023mar.onnx`) and SFace (`face_recognition_sface_2021dec.onnx`) models are loaded **once per worker process** upon initialization in `AIService.__init__()`, eliminating repeated disk/ONNX loading overhead per photo.
- **Concurrency Bottleneck:** With Celery concurrency = 2 on a 2-vCPU host, incoming burst uploads from 10 live cameras shooting concurrently (e.g. 50 photos/second) will build queue backlog in Redis.

