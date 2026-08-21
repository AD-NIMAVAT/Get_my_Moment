# Database Integration Report
**GetMyMoment — Database Consistency & Integrity Audit**
**Date:** 2026-08-20

---

## Database Engine

| Environment | Engine | Dialect |
|---|---|---|
| Production (Railway) | PostgreSQL 15+ | psycopg2 |
| Testing | SQLite (StaticPool) | aiosqlite |

---

## Schema Overview

### Models & Tables

| Model | Table | Primary Key | Multi-Tenant | Soft Delete |
|---|---|---|---|---|
| Photographer | photographers | UUID | N/A (root) | ❌ |
| Event | events | UUID | photographer_id | ❌ |
| Folder | folders | UUID | event_id + studio_id | ✅ deleted_at |
| Photo | photos | UUID | event_id | ✅ is_deleted |
| Face | faces | UUID | event_id | ❌ |
| FaceEmbedding | face_embeddings | UUID | event_id | ❌ |
| Guest | guests | UUID | event_id | ❌ |
| Consent | consents | UUID | event_id | ❌ |
| GuestSearch | guest_searches | UUID | event_id | ❌ |
| CrewMember | crew_members | UUID | event_id + photographer_id | ❌ |
| Lead | leads | UUID | photographer_id | ❌ |
| ClientInvoice | client_invoices | UUID | photographer_id | ❌ |
| PaymentMilestone | payment_milestones | UUID | event_id | ❌ |
| UploadSession | upload_sessions | UUID | event_id | ❌ |

---

## Key Constraints & Indexes

### Uniqueness Constraints
- Photographer.email — UNIQUE
- Event.access_token — UNIQUE INDEX
- Event.selection_token — UNIQUE INDEX
- Guest (event_id, mobile) — Compound UNIQUE INDEX (prevents duplicate registration)
- Photo.sha256_hash per event — prevents duplicate uploads

### Foreign Key Relationships
`
Photographer → Event (1:N)
Event → Folder (1:N)
Event → Photo (1:N)
Event → Guest (1:N)
Photo → Face (1:N)
Face → FaceEmbedding (1:1)
Guest → Consent (1:1)
Guest → GuestSearch (1:N)
Event → CrewMember (1:N)
Photographer → Lead (1:N)
Lead → ClientInvoice (1:N)
`

---

## Data Consistency Verification Results

| Test | Check | Result |
|---|---|---|
| Photo Upload | API uploaded_count == DB Photo count | ✅ PASS |
| Folder Presets | API preset count == DB Folder count | ✅ PASS |
| Guest Register | API 201 → DB Guest exists | ✅ PASS |
| Consent Submit | API 201 → DB Consent exists | ✅ PASS |
| Face Indexing | AI worker runs → DB FaceEmbedding exists | ✅ PASS |
| Search Record | Guest search → DB GuestSearch persisted | ✅ PASS |
| Lead Creation | API 201 → DB Lead exists, correct fields | ✅ PASS |
| Crew Assign | API 201 → DB CrewMember exists | ✅ PASS |
| Soft Delete | Photo deleted → is_deleted=True, not NULL | ✅ PASS |
| Duplicate Guest | Same mobile same event → 1 row only | ✅ PASS |

---

## Transaction Integrity

- All write operations use db.add() → db.commit() pattern
- No bare session.execute() for writes (all use ORM)
- Folder counter reconciliation is atomic (threading.Lock)
- Photo upload batch: all files or none (exception rollback)
- Chaos recovery test confirms transaction rollback preserves consistency ✅

---

## Performance (Testing Baseline)

| Operation | Time (SQLite test) | Estimated (PostgreSQL prod) |
|---|---|---|
| Signup + Event + 6 Folders | ~25ms | ~15ms |
| Photo upload + AI index | ~200ms | ~100ms |
| Guest search (cosine sim) | ~50ms | ~20ms |
| Full E2E lifecycle | ~850ms | ~400ms |

---

## Verdict: DATABASE INTEGRATION HEALTHY ✅
