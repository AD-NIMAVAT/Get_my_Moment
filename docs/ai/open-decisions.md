# Get My Moment — Open Decisions Log

**Last Updated:** 2026-08-23  
**Status:** Managed Operational Decision Register  

---

### Decision 1: Biometric Data Retention Policy & Canonical Anchor (SEC-04)
- **Why Required:** Compliance with India DPDP Act 2023 Section 8(7) regarding purposeful data erasure for biometric facial vectors.
- **Current Behavior:** Raw selfies and query vectors are transient in RAM (0 seconds). `FaceEmbedding` and `GuestSearch` records are persisted indefinitely until manual event deletion.
- **Options:**
  - **Option A (Privacy-First):** Purge `GuestSearch` caches after 14 days; purge `FaceEmbedding` records 30 days post-event.
  - **Option B (Balanced Lifecycle — RECOMMENDED):** Retain `GuestSearch` match cache and `FaceEmbedding` records for **90 days** post-`event_date` (or until `expires_at`), then auto-purge biometrics while preserving original high-resolution photos, client proofing selections, and statutory consent logs.
  - **Option C (Long-Lived):** Retain embeddings for 1 year or indefinitely with active subscription.
- **Can other work continue?** Yes (Does not block P0 sign-off or P1 planning).

---

### Decision 2: Production Database Backup Schedule & Retention (SEC-03)
- **Why Required:** Formalizing backup frequency, RPO, RTO, and retention policies.
- **Current Behavior:** Production tooling `scripts/backup_database.sh` and `scripts/verify_restore.sh` verified on EC2. Schedule is `READY_NOT_ENABLED`.
- **Options:**
  - **Recommendation (NOT YET APPROVED):** Daily backup at `03:00 UTC`, 24-hour RPO, <30-minute RTO, 7 local daily backups retained on EC2.
- **Can other work continue?** Yes.

---

### Decision 3: AWS S3 Cloud Backup & Storage Provisioning
- **Why Required:** Offsite disaster-recovery copies and media scaling.
- **Current Behavior:** Backups and photos stored on local NVMe disk with 30 GB free space (39% utilized).
- **Options:**
  - **Option A (Recommended):** Provision private S3 backup bucket with SSE-S3 encryption and 30-day lifecycle rule; attach least-privilege IAM role to EC2.
  - **Option B:** Maintain local backups until disk reaches 70% threshold.
- **Can other work continue?** Yes.

---

### Decision 4: WhatsApp Business Messaging Provider (P3)
- **Why Required:** Automated client invoice PDFs and event QR delivery.
- **Current Behavior:** Client-side WhatsApp deep links (`https://wa.me/...`).
- **Options:**
  - **Option A:** Interakt / AiSensy WhatsApp Business API.
  - **Option B:** Twilio WhatsApp Messaging API.
  - **Option C:** Maintain deep links until P3 phase.
- **Can other work continue?** Yes.
