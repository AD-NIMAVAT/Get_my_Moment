# QA-002: Feature Inventory & Component Catalog

| Feature ID | Feature Name | Frontend Location | API Endpoint | HTTP Method | Backend Router | DB Model | Auth Req |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FEAT-001** | Photographer Signup | `/login` | `/api/v1/auth/signup` | POST | `auth.py` | `Photographer` | No |
| **FEAT-002** | Photographer Login | `/login` | `/api/v1/auth/login` | POST | `auth.py` | `Photographer` | No |
| **FEAT-003** | Event Creation | `/dashboard` | `/api/v1/events` | POST | `events.py` | `Event` | Yes (JWT) |
| **FEAT-004** | Wedding Preset Folders | `/dashboard/events/[id]` | `/api/v1/events/{id}/folders/wedding-presets` | POST | `folders.py` | `Folder` | Yes (JWT) |
| **FEAT-005** | Ceremony Folder CRUD | `/dashboard/events/[id]` | `/api/v1/events/{id}/folders` | POST/GET | `folders.py` | `Folder` | Yes (JWT) |
| **FEAT-006** | Bulk Photo Move | `/dashboard/events/[id]` | `/api/v1/events/{id}/photos/bulk-move` | POST | `folders.py` | `Photo`, `Folder` | Yes (JWT) |
| **FEAT-007** | Photo Upload & AI Ingest | `/dashboard/events/[id]` | `/api/v1/events/{id}/photos/upload` | POST | `photos.py` | `Photo`, `Face`, `FaceEmbedding` | Yes (JWT) |
| **FEAT-008** | Client Selection Portal | `/selection/[token]` | `/api/v1/selection/{token}` | GET/POST | `selection.py` | `Photo`, `Event` | Token |
| **FEAT-009** | Client Feedback Notes | `/selection/[token]` | `/api/v1/selection/{token}/notes` | POST | `selection.py` | `Event` | Token |
| **FEAT-010** | Guest Onboarding & Sign Up | `/e/[token]` | `/api/v1/events/{id}/guests/register` | POST | `guest.py` | `Guest` | No |
| **FEAT-011** | Guest Smart Phone Login | `/e/[token]` | `/api/v1/events/{id}/guests/login` | POST | `guest.py` | `Guest` | No |
| **FEAT-012** | Guest Biometric Consent | `/e/[token]` | `/api/v1/guests/{id}/consent` | POST | `guest.py` | `Consent` | No |
| **FEAT-013** | Selfie AI Search | `/e/[token]` | `/api/v1/events/{id}/guests/{id}/search` | POST | `matching.py` | `GuestSearch`, `FaceEmbedding` | No |
| **FEAT-014** | Cached Match Restore | `/e/[token]` | `/api/v1/events/{id}/guests/{id}/cached-match` | GET | `guest.py` | `GuestSearch`, `Photo` | No |
| **FEAT-015** | Server Session Validate | `/e/[token]` | `/api/v1/events/{id}/guests/{id}/session/validate` | GET | `guest.py` | `Guest` | No |
| **FEAT-016** | Crew Login & 1-Tap Ceremony | `/crew/dashboard` | `/api/v1/crew/login`, `/active-ceremony` | POST | `crew.py` | `CrewMember` | PIN |
| **FEAT-017** | CRM Leads Pipeline | `/dashboard/crm` | `/api/v1/crm/leads` | GET/POST | `crm.py` | `Lead` | Yes (JWT) |
| **FEAT-018** | Finance Invoicing & GST | `/dashboard/finance` | `/api/v1/billing/invoices` | GET/POST | `finance.py` | `Invoice` | Yes (JWT) |
| **FEAT-019** | Booking Calendar | `/dashboard/calendar` | `/api/v1/calendar/events` | GET/POST | `calendar.py` | `CalendarEvent` | Yes (JWT) |
| **FEAT-020** | Super Admin Governance | `/admin/dashboard` | `/api/v1/admin/photographers` | GET/PATCH | `admin.py` | `Photographer` | Admin JWT |
