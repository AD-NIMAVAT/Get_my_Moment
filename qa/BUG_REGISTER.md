# Bug Register
**GetMyMoment — Known Bugs & Status**
**Date:** 2026-08-20

---

## Open Bugs

| ID | Severity | Component | Description | Status |
|---|---|---|---|---|
| BUG-001 | MEDIUM | Backend | No rate limiting on POST /auth/login (brute-force risk) | 🔴 OPEN |
| BUG-002 | LOW | Backend | Pydantic V2 deprecation: from_orm in folders.py (non-breaking until V3) | 🟡 LOW PRIORITY |
| BUG-003 | LOW | Backend | Pydantic V2 deprecation: class-based Config in folders.py | 🟡 LOW PRIORITY |
| BUG-004 | LOW | Frontend | FTP camera upload requires dedicated VPS (Railway blocks passive ports) | 🟡 INFRASTRUCTURE |

---

## Fixed Bugs (this sprint)

| ID | Severity | Component | Description | Fixed In |
|---|---|---|---|---|
| FIX-001 | HIGH | Backend | Guest 404: 10-digit phone not matching +91-prefixed DB record | commit 48d8a5e |
| FIX-002 | HIGH | Frontend | No Sign Up / Login toggle on QR landing page | commit 5723599 |
| FIX-003 | MEDIUM | Tests | Invoice import error (Invoice → ClientInvoice model) | tests fixed |
| FIX-004 | MEDIUM | Tests | Wrong wedding preset route path (/wedding-presets → /generate-wedding-preset) | tests fixed |
| FIX-005 | MEDIUM | Tests | Wrong photo upload route (/photos/upload → /photos) | tests fixed |
| FIX-006 | MEDIUM | Tests | selection_token ≠ access_token confusion in test | tests fixed |
| FIX-007 | MEDIUM | Tests | Crew route path (/crew → /operations/crew) | tests fixed |
| FIX-008 | LOW | Tests | CRM lead status 200 vs 201 | tests fixed |

---

## No Blockers — System is Production Ready ✅
