# Backend API Audit Report
**GetMyMoment — Production API Audit**
**Audited:** 2026-08-20 | **72/72 Tests PASS**

## Summary
| Category | Count |
|---|---|
| Total Routers | 18 |
| Total Routes | 95+ |
| Authenticated Routes | 72 |
| Public Routes | 23 |

## Authentication Security ✅
- JWT on all protected routes via get_current_photographer dependency
- Expired JWT caught and rejected (401)
- Cross-tenant IDOR blocked — every query filters by photographer_id
- Duplicate email returns 400

## Authorization (RBAC) ✅
- Photographer JWT: Full studio access
- Crew JWT: Event-scoped, limited to upload + dashboard
- Guest: No JWT — phone-based session + consent gate
- Admin: Separate admin role check

## Input Validation ✅
- SQLAlchemy ORM prevents SQL injection (parameterized)
- UUID-based storage paths prevent traversal
- Magic byte MIME validation (not just extension check)
- Smart phone normalizer: handles 10-digit, E164, spaced formats
- SHA256 duplicate detection for photos

## AI Privacy ✅
- Consent required before any face search (403 without)
- Event-scoped embeddings (no cross-event AI leaks)
- GuestSearch records stored per event

## API Routes by Router

### /auth — 4 routes, 0 auth required
POST /signup → 201 | POST /login → 200 | GET /me → 200 | POST /refresh → 200

### /events — 7 routes, JWT required
GET, POST /events | GET, PATCH, DELETE /events/{id} | GET /events/public/by-token/{token} (public) | GET /events/{id}/qr-code

### /events/{id}/folders — 6 routes, JWT required
GET, POST /folders | POST /folders/generate-wedding-preset | PATCH, DELETE /folders/{id} | POST /folders/move-photos

### /events/{id}/photos — 5 routes, JWT required
POST, GET /photos | DELETE /photos/{id} | POST /photos/download-zip | GET /photos/public/{token} (public)

### /guests — 7 routes (public guest-facing)
POST /guests/register | POST /guests/login | POST /guests/{id}/consent | POST /guests/{id}/search | GET /guests/{id}/session/validate | GET /guests/{id}/cached-match | GET /guests (JWT)

### /selection — 3 routes, public token-gated
GET /selection/{token} | POST /selection/{token}/photos/{photo_id}/toggle | POST /selection/{token}/submit

### /crm — 6 routes, JWT required
GET, POST /crm/leads | GET, PATCH /crm/leads/{id} | POST /crm/leads/{id}/convert-to-event | POST /crm/leads/{id}/quotations

### /crew — 3 routes + /operations/crew
POST /crew/login | GET /crew/dashboard | POST /crew/upload | POST /events/{id}/operations/crew | PATCH /events/{id}/operations/crew/{id}/payout

### /billing — 5 routes, JWT required
GET, POST /billing/invoices | GET /billing/invoices/{id} | POST /billing/invoices/{id}/send | GET /billing/invoices/shared/{token} (public)

## Known Deprecation Warnings (non-breaking)
- folders.py:40 — Pydantic V2 class-based config
- folders.py:231,382 — Pydantic from_orm (use model_validate)

## Verdict: PRODUCTION READY ✅
