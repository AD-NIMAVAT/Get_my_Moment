# Get My Moment — Task Updates

## Current Stage

**Planning → Architecture Blueprint & Sequential Plan (P01–P30)**

| Phase | Description | Status |
|---|---|---|
| P01 | Research & Repository Inspection | Completed |
| P02 | Architecture Confirmation | Completed |
| P03 | Monorepo Scaffolding | Pending (Awaiting Approval) |
| P04–P07 | Backend Foundation, Database & Migrations | Planned |
| P08–P12 | Auth, Events, Storage Engine & Ingestion | Planned |
| P13 | Redis + Celery Background Processing | Planned (Pre-AI) |
| P14 | QR Engine | Planned |
| P15–P18 | AI Licensing, Face Detection, Embeddings & Vector Search | Planned |
| P19–P21 | Photographer Dashboard, Guest UI & Private Gallery | Planned |
| P22–P24 | 1,000-Photo & AI Accuracy Benchmarks, Folder Watcher | Planned |
| P25–P27 | Security, Privacy, E2E & Load Testing | Planned |
| P28–P30 | Real Pilot, Production Infra & Release Readiness | Planned |

---

## Completed Architecture Decisions

- [x] **Brand & Identity**: Get My Moment ("Shoot. Upload. Let Them Find.").
- [x] **Roles**: Photographer = paying customer; Guest = end user.
- [x] **Sequential Phases**: Unified single 30-phase sequence (P01 – P30).
- [x] **AI Model Licensing Rule**: Requires final commercial license verification for exact model weights before commercial deployment.
- [x] **Asynchronous Architecture**: Redis + Celery worker established before AI processing (P13) to ensure non-blocking HTTP requests.
- [x] **Vector Performance Benchmark**: Replaced fixed `<5ms` guarantee with requirement to benchmark HNSW/pgvector under realistic dataset scales.
- [x] **Face Debug Crops**: Set to optional with `FACE_DEBUG_CROPS_ENABLED=false` default.
- [x] **Controlled Ground-Truth AI Dataset**: Multi-condition dataset and mathematical threshold derivation via ROC.
- [x] **Local MVP OTP Abstraction**: Development mock mode allowing seamless plug-in of production SMS providers later.
- [x] **Event-Only Face Search**: Mandatory strict event boundary (`WHERE event_id = :event_id`).
- [x] **Tech Stack**: Next.js (TypeScript) + FastAPI (Python) + PostgreSQL (pgvector) + Redis + Celery + Local Storage.

---

## Log of Updates

### 2026-08-16
- Standardized phase numbering to P01–P30 across all documentation.
- Integrated release-blocking AI model weight licensing verification requirement.
- Scheduled Celery background workers (P13) prior to AI inference phases.
- Formulated AI ground-truth benchmarking criteria and ROC threshold optimization.
- Made face debug crops optional (`FACE_DEBUG_CROPS_ENABLED=false`).
- Configured local OTP abstraction for zero-cost MVP development.
- Confirmed: Documentation updated, no application source code created.

---

## Update Rule

Whenever work changes:
1. Update `TASKS.md`.
2. Add a dated entry here.
3. Add new bugs to `BUGS.md`.
4. Add meaningful behavior/code changes to `CHANGELOG.md`.
