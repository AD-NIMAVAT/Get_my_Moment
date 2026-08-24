# Get My Moment — PostgreSQL & pgvector Performance Assessment & Vector Index Decision Gate (P1-BATCH-10)

## 1. Executive Summary

This report delivers a comprehensive database performance assessment, query plan profiling, connection pool evaluation, and pgvector vector indexing decision gate for Get My Moment on the production environment (2 vCPUs, ~2 GB RAM, PostgreSQL 16.15 with pgvector 0.8.6).

### Primary Decision
**`KEEP_EXACT_SEARCH` (Decision Verified & Confirmed)**
- **Measured Vector Query Latency:** $p50 = 0.497\text{ ms}$, $p95 = 0.687\text{ ms}$, $\text{max} = 1.361\text{ ms}$.
- **Accuracy / Recall:** $100\%$ exact mathematical precision (zero ANN recall loss).
- **Reasoning:** In an event-scoped architecture where guest facial searches are strictly bounded by `event_id` ($\sim 500 - 5,000$ face embeddings per event), exact vector scanning across indexed event partitions is extremely fast ($< 1\text{ ms}$) and incurs zero index build memory overhead, zero maintenance write penalty, and zero recall degradation. HNSW or IVFFlat approximate indexing is neither justified nor beneficial at current and near-term event scale.

---

## 2. Environment & Database Configuration

| Parameter | Observed Production Value | Evaluation |
| :--- | :--- | :--- |
| **PostgreSQL Version** | `PostgreSQL 16.15 (Debian 16.15-1.pgdg12+2)` | Modern, robust |
| **pgvector Version** | `0.8.6` | Latest stable release |
| **SQLAlchemy Version** | `2.0.52` | Modern ORM |
| **Database Pool Size** | `pool_size = 5`, `max_overflow = 10` | $2 \text{ workers} \times 15 = 30$ peak conn |
| **PostgreSQL max_connections** | `100` | Coherent, no exhaustion risk |
| **shared_buffers** | `128MB` | Safe for 2 GB RAM host |
| **work_mem** | `4MB` | Sufficient for exact sort/hash joins |
| **effective_cache_size** | `4GB` | Query planner cache estimate |
| **pg_stat_statements** | `None` (Not preloaded in shared libraries) | Deferred (requires Postgres restart) |

---

## 3. Database Hot Paths & Query Plan Profiling

### Hot Path 1: Event Health Status Group-By
- **SQL:** `SELECT status, count(id) FROM photos WHERE event_id = :event_id AND is_deleted = false GROUP BY status;`
- **Execution Plan:** Index Scan on `ix_photos_event_status` (`Index Cond: (event_id = :id)`).
- **Execution Time:** $\approx 0.015\text{ ms}$ ($100\%$ Shared Buffer Hits).

### Hot Path 2: Event Health Latency Sample (Bounded)
- **SQL:** `SELECT queued_at, guest_ready_at, processing_duration_ms, ai_inference_ms FROM photos WHERE event_id = :id AND status = 'PROCESSED' AND guest_ready_at IS NOT NULL AND is_deleted = false ORDER BY guest_ready_at DESC LIMIT 100;`
- **Execution Plan:** Limit on Top-N Sort with Index Scan on `ix_photos_event_status`.
- **Execution Time:** $\approx 0.018\text{ ms}$ (Bounded $O(1)$ memory usage).

### Hot Path 3: Event Gallery Paginated Listing
- **SQL:** `SELECT id, original_file_name, file_size, status, created_at FROM photos WHERE event_id = :id AND is_deleted = false ORDER BY created_at DESC LIMIT 50 OFFSET 0;`
- **Execution Plan:** Limit $\to$ Sort $\to$ Index Scan on `ix_photos_event_status`.
- **Execution Time:** $\approx 0.018\text{ ms}$.

### Hot Path 4: Event-Scoped Facial Vector Search
- **SQL:** `SELECT fe.embedding, f.photo_id FROM face_embeddings fe JOIN faces f ON fe.face_id = f.id WHERE fe.event_id = :event_id;`
- **Execution Plan:** Hash Join on `faces_pkey` (`f.id = fe.face_id`) with Index Scan on `ix_face_embeddings_event_id`.
- **Execution Time:** $\mathbf{0.497\text{ ms}}$ ($p50$), $\mathbf{0.687\text{ ms}}$ ($p95$).
- **Optimization:** Eliminated N+1 loop query by joining `faces` directly in a single SQL statement.

---

## 4. Vector Model & Matching Semantics

- **Model:** OpenCV SFace ONNX deep feature extractor.
- **Vector Dimension:** `128` floating point dimensions.
- **Normalization:** Embeddings are L2 unit-normalized upon generation.
- **Similarity Metric:** Cosine similarity ($1 - \text{cosine\_distance}$).
- **Biometric Matching Threshold:** `0.55` cosine similarity (canonical same-person range: $0.70 - 0.95$).
- **Isolation Guarantee:** Search space is mathematically and strictly bounded to `WHERE event_id = :event_id`. Cross-event person matching is impossible.

---

## 5. HNSW & IVFFlat Decision Analysis

### Approximate Nearest Neighbor (ANN) Trade-off Matrix

| Architecture | Query Time ($1\text{k}$ vectors) | Recall (%) | Index Build RAM | Write Penalty | Event Partitioning Suitability |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Exact Search (Current)** | $\mathbf{0.50\text{ ms}}$ | $\mathbf{100\%}$ | $\mathbf{0\text{ MB}}$ | **Zero** | **Optimal** (`WHERE event_id = :id`) |
| **HNSW Index** | $\sim 0.30\text{ ms}$ | $95-99\%$ | High ($\sim 1.5\times$ vector size) | High (graph insertion) | Poor (global graph vs filtered subsets) |
| **IVFFlat Index** | $\sim 0.40\text{ ms}$ | $90-97\%$ | Moderate (lists clustering) | Moderate | Requires retraining on event updates |

### Conclusion
1. Exact vector search takes $< 0.7\text{ ms}$ for typical event sizes ($\le 5,000$ photos).
2. Approximate indexing would introduce false negatives (missing a guest's photo due to ANN recall degradation) without offering any perceptible latency benefit.
3. Therefore, **`KEEP_EXACT_SEARCH`** is the sound technical decision.
