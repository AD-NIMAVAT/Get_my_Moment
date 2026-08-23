# Get My Moment — Biometric Data Classification & Storage Map (SEC-04)

**Document Version:** `1.0.0-PROD`  
**Classification Date:** `2026-08-23`  
**Scope:** Biometric features, facial embeddings, guest identifiers, and storage mappings across PostgreSQL and local storage.

---

## 1. COMPREHENSIVE DATA INVENTORY & CLASSIFICATION

| # | Data Category | Database Table | Columns / Storage Path | Created When | Purpose | Security Sensitivity | Retention / Current Lifecycle | Can be Independently Deleted? | Deletion Side Effects | Included in DB Backup? |
| :-: | :--- | :--- | :--- | :--- | :--- | :---: | :--- | :---: | :--- | :---: |
| **1** | **Guest Raw Selfie Image** | *None (Transient)* | In-memory RAM buffer only | On guest selfie search request | AI facial feature extraction | **HIGH** | `0 seconds` (Discarded immediately after embedding extraction) | **YES** | None (already discarded) | **NO** |
| **2** | **Guest Selfie Query Embedding** | *None (Transient)* | In-memory 128-d vector | During search execution | Cosine similarity comparison against event photos | **HIGH** | `0 seconds` (Discarded upon HTTP response completion) | **YES** | None (already discarded) | **NO** |
| **3** | **Guest Search & Match Record** | `guest_searches` | `id`, `guest_id`, `event_id`, `selfie_hash`, `matched_photo_ids` (JSON), `similarity_scores` (JSON), `created_at` | Search request completion | Cached match retrieval for returning guests | **MEDIUM** | Persisted indefinitely until event deletion | **YES** | Returning guest must upload new selfie to find photos | **YES** |
| **4** | **Consent Audit Record** | `consents` | `id`, `guest_id`, `event_id`, `face_search_consent`, `marketing_consent`, `consent_version`, `ip_address`, `user_agent`, `consented_at` | Prior to selfie upload | Legal / regulatory proof of consent (DPDP Act / GDPR) | **MEDIUM** | Persisted for statutory audit compliance | **NO** (Must be retained for legal compliance) | Loss of legal proof of consent | **YES** |
| **5** | **Guest Contact Information** | `guests` | `id`, `event_id`, `name`, `mobile`, `otp_verified`, `created_at`, `updated_at` | Guest event registration | Session token lookup, OTP verification, gallery delivery | **MEDIUM-HIGH** (PII) | Persisted with event lifecycle | **YES** (With soft/hard guest removal) | Guest cannot login via mobile OTP | **YES** |
| **6** | **Face Crop Debug Images** | `faces.crop_path` | `data/crops/{event_id}/{face_id}.jpg` (if enabled) | AI worker photo ingest (if `FACE_DEBUG_CROPS_ENABLED=true`) | Visual AI debugging (DISABLED in production) | **HIGH** | `0 bytes` (Disabled in production) | **YES** | None in production | **NO** |
| **7** | **Face Detection Metadata** | `faces` | `id`, `photo_id`, `event_id`, `bounding_box` (JSON), `detection_confidence`, `quality_score`, `crop_path`, `created_at` | Photo AI processing | Links detected faces to photo UUID; bounding box display | **LOW** | Persisted with photo lifecycle | **YES** | Disables face bounding box display | **YES** |
| **8** | **Event Photo Face Embeddings** | `face_embeddings` | `id`, `face_id`, `event_id`, `embedding` (128-d Vector), `created_at` | Photo AI processing | Core facial recognition index for guest matching | **HIGH** | Persisted with event lifecycle | **YES** | Guest facial search becomes unavailable until re-indexed | **YES** |
| **9** | **Original Photographer Photos** | `photos` | `data/events/{event_id}/{folder_slug}/{photo_id}.jpg` | Photographer / Crew upload | Primary photography deliverable & master assets | **HIGH (Business)** | Governed by photographer contract & storage plan | **NO** (Never deleted by biometric purge) | Master media loss | **NO (Filesystem only)** |
| **10** | **Web Thumbnails & Previews** | `photos.thumbnail_path` | `data/events/{event_id}/thumbnails/{photo_id}_thumb.jpg` | Photo ingest | Fast web gallery rendering & client proofing | **MEDIUM** | Persisted with photo lifecycle | **NO** (Never deleted by biometric purge) | Web gallery broken | **NO (Filesystem only)** |
| **11** | **Audit & Security Logs** | `audit_logs` | `id`, `event_id`, `photographer_id`, `action`, `details`, `ip_address`, `created_at` | Administrative & security actions | Security forensics & platform audit trail | **MEDIUM** | Immutable audit log | **NO** | Loss of forensic security history | **YES** |
| **12** | **Database Backup Archives** | *Host filesystem* | `/home/ubuntu/backups/gmm_backup_*.dump` | Periodic backup execution (`scripts/backup_database.sh`) | Disaster recovery | **HIGH** | Managed by backup retention policy | **NO** (Managed by backup rotation) | Restoring old backup restores previously purged rows | **N/A** |

---

## 2. KEY ARCHITECTURAL DISCOVERY: TRANSIENT GUEST SELFIE LIFECYCLE

Inspection of [`apps/api/routers/matching.py`](file:///d:/Get_my_moment/apps/api/routers/matching.py) confirms:
1. **Raw Selfie Bytes:** Uploaded as an `UploadFile` stream, read directly into memory (`await selfie.read()`), passed to OpenCV YuNet/SFace in RAM, and immediately discarded when the search completes. **Raw selfies are NEVER saved to local disk or S3.**
2. **Query Vector Embeddings:** The 128-d query vector generated from the selfie is held in memory for cosine similarity comparisons against the `FaceEmbedding` table (`WHERE event_id = :event_id`), and is **NEVER persisted to PostgreSQL**.
3. **Persisted Search State:** The backend stores only `GuestSearch` metadata: the SHA-256 hash string of the selfie (`selfie_hash`) and the array of matching photo UUIDs (`matched_photo_ids`). This allows returning guests to reopen their gallery without uploading another selfie.

