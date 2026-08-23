# Get My Moment - P0 Security Remediation Plan

**Target Phase:** P0 Security Foundation
**Strategy:** Minimal, safe, reversible, non-disruptive remediation batches

---

## 1. FIRST SAFE REMEDIATION BATCH (P0-BATCH-1)

### Remediation Item 1: Original Photo Download Authorization Hardening (SEC-01)
- **Files Affected:** pps/api/routers/photos.py
- **Current Behavior:** If 	oken query param is not provided, the route streams the file without verifying photographer JWT or event token.
- **Proposed Change:** Require either:
  1. A valid 	oken matching event.access_token or event.selection_token (with event.allow_downloads == True), OR
  2. An authenticated Photographer / AdminUser owning the event containing the photo.
  3. If neither condition is met, return HTTP 401 Unauthorized / HTTP 403 Forbidden.
- **Database Impact:** None.
- **Infrastructure Impact:** None.
- **Production Impact:** High security improvement. Zero impact on legitimate users.
- **Required Tests:** Negative test verifying that unauthenticated request without token returns 401/403.
- **Rollback:** Revert pps/api/routers/photos.py.

---

### Remediation Item 2: Rate Limiting Middleware Implementation (SEC-02)
- **Files Affected:** pps/api/main.py, pps/api/routers/auth.py, pps/api/routers/guest.py, pps/api/routers/matching.py, pps/api/routers/admin.py
- **Current Behavior:** No rate limiting on expensive or brute-force-sensitive endpoints.
- **Proposed Tier Limits:**
  - POST /api/v1/auth/login: 5 req/min per IP
  - POST /api/v1/admin/login: 3 req/5 min per IP
  - POST /api/v1/admin/gateway-settings/unlock: 3 req/5 min per IP
  - POST /api/v1/events/{id}/guests/register: 5 req/min per IP
  - POST /api/v1/guests/{id}/otp/verify: 3 req/min per IP
  - POST /api/v1/events/{id}/guests/{id}/search: 10 req/min per guest
  - GET /api/v1/events/public/{token}: 20 req/min per IP
  - GET /api/v1/photos/{id}/download: 30 req/min per token
- **Database Impact:** None (uses Redis backend).
- **Infrastructure Impact:** Minimal Redis memory footprint.
- **Production Impact:** Prevents brute-force, OTP exhaustion, and CPU overload during live events.
- **Required Tests:** Automated rate limit violation test verifying HTTP 429 response.
- **Rollback:** Remove limiter decorators.

---

### Remediation Item 3: Automated Daily Database Backup Script & Runbook (SEC-03)
- **Files Affected:** scripts/backup_database.sh, docs/runbooks/backup-restore.md
- **Current Behavior:** Manual baseline backup exists. No automated scheduling or encryption.
- **Proposed Change:** Create a standardized, non-destructive backup shell script with timestamping, gzip compression, and integrity check.
- **Database Impact:** Read-only snapshot (pg_dump); zero production disruption.
- **Infrastructure Impact:** Minimal CPU/disk during scheduled off-peak hours (03:00 AM UTC).
- **Production Impact:** High disaster-recovery reliability.
- **Required Tests:** Test restoration into a temporary PostgreSQL database container.
- **Rollback:** Remove cron entry.
