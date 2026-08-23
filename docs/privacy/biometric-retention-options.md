# Get My Moment — Biometric Data Retention Policy Options (SEC-04)

**Status:** `NEEDS_DECISION — PENDING PRODUCT OWNER APPROVAL`  
**Execution Context:** Assessment & Design Gate Only (Zero data deleted).  

---

## 1. CANONICAL RETENTION ANCHOR SELECTION

The current `Event` model contains the following temporal fields:
- `created_at`: Event registration date.
- `event_date`: Scheduled date of wedding/event ceremonies.
- `expires_at`: Optional studio-defined expiration deadline.
- `is_deleted` & `deleted_at`: Soft-deletion state.

**Recommended Canonical Retention Anchor:**
`event.expires_at` (if set) OR `event.event_date + INTERVAL '90 days'`.

---

## 2. POLICY COMPARISON MATRIX

| Dimension | Option A: Privacy-First (Aggressive) | Option B: Balanced Lifecycle (RECOMMENDED) | Option C: Long-Lived Archive |
| :--- | :--- | :--- | :--- |
| **Guest Raw Selfie** | Transient in RAM (0 sec) | Transient in RAM (0 sec) | Transient in RAM (0 sec) |
| **Guest Query Embedding** | Transient in RAM (0 sec) | Transient in RAM (0 sec) | Transient in RAM (0 sec) |
| **Guest Search Match Cache** | Purged **14 days** after event | Purged **90 days** after event (or on `expires_at`) | Retained for **1 year** |
| **Event Photo Embeddings** | Purged **30 days** after event | Retained while event is `ACTIVE` (purged on `ARCHIVED` / `EXPIRED`) | Retained indefinitely with photos |
| **Consent Audit Records** | Retained **3 years** (DPDP statutory requirement) | Retained **3 years** (DPDP statutory requirement) | Retained **3 years** (DPDP statutory requirement) |
| **Original Photos & Previews** | Unaffected (managed by studio plan) | Unaffected (managed by studio plan) | Unaffected (managed by studio plan) |
| **Privacy / Legal Posture** | **Maximum** (minimal data at rest) | **High & Balanced** (satisfies Indian DPDP Act 2023 & GDPR) | **Moderate** (increased long-term liability) |
| **Product Impact** | Guests cannot search for new photos 30 days post-event | Guests have 90 days to find all moments; studio can re-index if needed | Long-term guest matching available |
| **Returning Guest Experience** | Matches expire quickly; guest must re-register after 14 days | Frictionless for 90 days across full wedding delivery cycle | Frictionless for 1 year |
| **Storage & Compute Cost** | Vector database stays ultra-lean | Linear growth bounded by active wedding season | Continuous vector table growth |
| **Backup Sensitivity** | Backups older than 30 days contain no active embeddings | Backups contain only active seasonal embeddings | Backups contain all historical biometric vectors |

---

## 3. DETAILED OPTION EVALUATIONS

### OPTION A: Privacy-First (Aggressive Purge)
- **Concept:** Purge all search session caches after 14 days; purge all event photo face embeddings (`face_embeddings` table) 30 days after `event_date`.
- **Pros:** Strongest privacy posture. Guarantees zero residual biometric vector retention once wedding deliverables are completed.
- **Cons:** If a photographer uploads late/extra ceremony edits after 30 days, guests cannot run facial searches without full studio re-indexing.

---

### OPTION B: Balanced Lifecycle (RECOMMENDED)
- **Concept:** 
  1. `GuestSearch` match cache retained for **90 days** post-event (or until studio marks event `ARCHIVED`/`EXPIRED`).
  2. `FaceEmbedding` records retained for the duration of the event's active proofing lifecycle (90 days). Upon event expiration/archival, embeddings are purged while high-resolution photos, client favorites, and client selection albums remain 100% intact.
  3. Consent audit logs (`consents`) preserved for regulatory defense.
- **Pros:** Matches the natural Indian wedding photography delivery lifecycle (shoot -> proofs -> raw selection -> album design). Eliminates biometric liability after the operational window closes.
- **Cons:** Requires batch purge execution to clean up expired events.

---

### OPTION C: Long-Lived Archive
- **Concept:** Keep `FaceEmbedding` and `GuestSearch` records for 1 full year or indefinitely as long as the photographer maintains their studio subscription.
- **Pros:** Guests can return years later and search wedding galleries.
- **Cons:** Creates perpetual biometric data storage liability under Section 8(7) of the Digital Personal Data Protection (DPDP) Act 2023 (mandating data erasure when the specified purpose is fulfilled).

---

## 4. RECOMMENDATION STATEMENT
> [!TIP]
> **Recommendation:** Adopt **Option B (Balanced Lifecycle)** with a 90-day retention window anchored to `event.event_date` (or explicit `event.expires_at`). This ensures smooth client experience during active photo proofing while strictly fulfilling data minimization mandates under Indian privacy regulations.

