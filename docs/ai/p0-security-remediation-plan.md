# Get My Moment — P0 Security Remediation Plan

**Target Phase:** P0 Security Foundation & Verification  
**Strategy:** Minimal, safe, reversible, non-disruptive remediation batches  
**Execution Status:** `P0-BATCH-1A (FIXED)`, `P0-BATCH-1B (FIXED)`, `P0-BATCH-1C (VERIFIED)`  

---

## 1. COMPLETED REMEDIATION BATCHES

### P0-BATCH-1A: Original Photo Download Authorization Hardening (SEC-01)
- **Status:** `FIXED & PRODUCTION VERIFIED`
- **Files Affected:** `apps/api/routers/photos.py`, `tests/security/test_download_auth.py`
- **Implementation:** Server-side fail-closed authorization requiring valid capability token or photographer/admin JWT. Unauthenticated requests return HTTP 401.
- **Verification:** 12/12 automated test cases passed. Verified live on EC2.

---

### P0-BATCH-1B: Redis-Backed Atomic Rate Limiting (SEC-02)
- **Status:** `FIXED & PRODUCTION VERIFIED`
- **Files Affected:** `apps/api/services/rate_limiter.py`, `apps/api/config.py`, routers (`auth.py`, `admin.py`, `guest.py`, `matching.py`, `events.py`, `photos.py`)
- **Implementation:** Atomic Redis Lua sliding window with thread-safe in-memory fallback, trusted proxy client IP extraction, and SHA-256 privacy hashing.
- **Verification:** 9/9 automated rate limit tests passed. Full test suite (93 tests) passed. Verified live on EC2.

---

### P0-BATCH-1C: PostgreSQL Backup & Restore Foundation (SEC-03)
- **Status:** `FIXED & PRODUCTION VERIFIED`
- **Files Affected:** `scripts/backup_database.sh`, `scripts/verify_restore.sh`, `docs/runbooks/backup-restore.md`, `tests/security/test_backup_restore.py`
- **Implementation:** Production-safe PostgreSQL custom-format dump (`-F c`) with lockfile collision protection, SHA-256 checksums, and non-destructive isolated sandbox restore script.
- **Verification:** Live isolated restore drill into sandbox database `gmm_restore_test_*` passed with 100% row-count parity across all 9 critical tables. Full suite (98 tests) passed.

---

## 2. PROPOSED NEXT BATCH: P0-BATCH-1D (BACKUP AUTOMATION ACTIVATION)

*(Awaiting User Approval — Not Yet Implemented)*

- **Objective:** Activate local daily automated backup cron based on approved 03:00 UTC schedule.
- **Files Affected:** `/etc/cron.d/gmm-db-backup`, `scripts/backup_database.sh` (retention rotation logic).
- **Scope:**
  1. Install cron entry: `0 3 * * * ubuntu /home/ubuntu/Get_my_Moment/scripts/backup_database.sh >> /var/log/gmm_backup.log 2>&1`.
  2. Implement rolling 7-successful-backup local retention cleanup.
  3. Verify disk space safeguard (minimum 1 GB free).
  4. Perform dry-run and single live manual invocation test.
- **Rollback:** `rm -f /etc/cron.d/gmm-db-backup`.
