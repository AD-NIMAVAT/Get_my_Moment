# Get My Moment — Open Decisions Log

**Generated Date:** 2026-08-23  

---

### Decision 1: Biometric & Photo Data Retention Policy
- **Why Required:** Compliance with India DPDP Act and international privacy standards regarding biometric facial embeddings and raw guest selfies.
- **Current Behavior:** Data is retained indefinitely until the photographer or admin manually deletes the event.
- **Options:**
  - Option A (Recommended): Retain guest selfies & face embeddings for 90 days post-event date, then auto-purge biometrics while keeping photos.
  - Option B: Retain biometrics for 180 days.
  - Option C: Retain biometrics indefinitely until studio account termination.
- **Can other work continue?** Yes (Does not block P0 backup or infrastructure tasks).

---

### Decision 2: AWS S3 Cloud Storage Migration Timeline
- **Why Required:** Production currently stores original photos on the local NVMe server disk. Transitioning to AWS S3 + CloudFront CDN provides unlimited storage and faster global delivery.
- **Current Behavior:** Local disk storage engine active. S3 adapter code ready in s3_storage.py.
- **Options:**
  - Option A (Recommended): Provision an AWS S3 bucket and CloudFront distribution in P1 for seamless multi-TB scaling.
  - Option B: Keep local storage for pilot phase and migrate when disk reaches 70% threshold.
- **Can other work continue?** Yes.

---

### Decision 3: WhatsApp Business Messaging Provider
- **Why Required:** To send automated invoice PDFs and selection links to clients via WhatsApp.
- **Current Behavior:** Manual WhatsApp sharing via deep links (https://wa.me/...).
- **Options:**
  - Option A: Interakt / AiSensy WhatsApp Business API.
  - Option B: Twilio WhatsApp Messaging API.
  - Option C: Keep manual WhatsApp deep links for now.
- **Can other work continue?** Yes.
