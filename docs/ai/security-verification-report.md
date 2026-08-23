# Get My Moment — Security Verification & Audit Report

**Audit Target:** Production Environment (AWS EC2 16.170.81.162)  
**Execution Contract:** Get_My_Moment_ANTIGRAVITY_GEMINI_Full_Development_Execution_Spec.md  
**Supporting Specification:** website_security_audit_roadmap.md  
**Date:** 2026-08-23  

---

## 1. COMPREHENSIVE SECURITY CONTROL EVALUATIONS (A to N)

### A. Attack Surface and Network Exposure
- **Current implementation:** System Nginx reverse proxies HTTPS (:443) to Next.js (:3000) and FastAPI (:8000). Camera FTP is exposed on :2121 and :30000-30100. PostgreSQL (:5432) and Redis (:6379) are isolated to internal Docker bridge.
- **Verification method:** Non-destructive host listening port scan (ss -tlpn) and Docker port bindings inspection (docker ps).
- **Result:** PostgreSQL and Redis are NOT exposed to the public internet. Only 80, 443, 22, 2121, and 30000-30100 are listening.
- **Classification:** VERIFIED_EXISTING
- **Evidence:** docker ps confirms getmymoment_prod_postgres: 5432/tcp and getmymoment_prod_redis: 6379/tcp have no host port publish.
- **Risk if failed:** Database compromise / data exfiltration if PostgreSQL port were public.
- **Remediation:** Keep internal Docker network isolation intact.
- **Production impact:** None (already isolated).
- **Required tests:** Port scan verification after any compose update.
- **Rollback:** Restore docker-compose.prod.yml port configuration.
- **Dependencies:** Docker engine.

---

### B. Authentication / Session Security
- **Current implementation:** JWT HS256 tokens for photographers and admins with bcrypt password hashing (passlib.context.CryptContext). Passwords verified with salt. Suspended accounts immediately denied (HTTP 403).
- **Verification method:** Pytest test_auth.py and test_security_pentest.py.
- **Result:** Valid tokens grant access; tampered, expired, or wrong-role tokens return 401/403.
- **Classification:** VERIFIED_EXISTING
- **Evidence:** 	ests/security/test_security_pentest.py::test_jwt_tampering_and_forgery PASSED.
- **Risk if failed:** Unauthorized studio access or privilege escalation.
- **Remediation:** Maintain secure signing keys and token expiration.
- **Production impact:** None.
- **Required tests:** pytest /app/tests/test_auth.py.
- **Rollback:** N/A.
- **Dependencies:** python-jose, passlib.

---

### C. Cross-Tenant Authorization / IDOR / BOLA
- **Current implementation:** Database queries filter by studio_id (photographer ID) and event_id. Cross-studio access returns 404/403.
- **Verification method:** pytest /app/tests/tenancy/test_tenancy_isolation.py and 	est_cross_photographer_isolation.
- **Result:** Photographer B cannot view, modify, or delete Photographer A's events, photos, folders, leads, or invoices.
- **Classification:** VERIFIED_EXISTING
- **Evidence:** 	est_cross_studio_data_isolation and 	est_idor_and_malformed_id_defense PASSED.
- **Risk if failed:** Data breach between competing photography studios.
- **Remediation:** Formalize explicit policy decorators (
equire_event_access) in P0 remediation.
- **Production impact:** Low.
- **Required tests:** Tenancy test suite.
- **Rollback:** N/A.
- **Dependencies:** SQLAlchemy query filtering.

---

### D. Event and Selection Capability-Token Security
- **Current implementation:** Public event QR tokens (ccess_token) and client album selection tokens (selection_token) are 32-character high-entropy alphanumeric strings.
- **Verification method:** Code inspection and route test verification.
- **Result:** Tokens provide access strictly to the assigned event. Cannot access other events.
- **Classification:** VERIFIED_EXISTING
- **Evidence:** pps/api/routers/selection.py and pps/api/routers/guest.py filter strictly by ccess_token / selection_token.
- **Risk if failed:** Cross-event photo discovery if tokens were predictable or sequential.
- **Remediation:** Add rate limiting to token resolution routes to prevent brute-forcing.
- **Production impact:** Positive.
- **Required tests:** Token entropy and isolation tests.
- **Rollback:** N/A.
- **Dependencies:** secrets module.

---

### E. Photographer Camera / FTP Upload Isolation
- **Current implementation:** pyftpdlib FTP server on port 2121 with sandbox directory data/wireless_incoming. Path matching uses event access token (/incoming/{access_token}/{folder_slug}/IMG_0001.JPG).
- **Verification method:** Code inspection and camera ingest test.
- **Result:** FTP authorizer defines user accounts (sony, canon, 
ikon, uji, camera) with shared passwords and anonymous write access. pyftpdlib limits filesystem access to FTP_INCOMING_DIR.
- **Classification:** PARTIALLY_IMPLEMENTED
- **Evidence:** pps/api/services/wireless_ingest.py lines 291-298.
- **Risk if failed:** An unauthorized party on the local Wi-Fi could upload unauthenticated files to the incoming queue.
- **Remediation:** Ensure all files undergo strict PIL image verification and decompression bomb checks before processing; sanitize all incoming filenames.
- **Production impact:** Must NOT break camera firmware compatibility.
- **Required tests:** 	est_phase4_camera_ingest.py.
- **Rollback:** Preserve wireless_ingest.py.
- **Dependencies:** pyftpdlib, Pillow.

---

### F. Browser Upload Validation
- **Current implementation:** Chunked and multipart upload endpoints validate magic bytes via Pillow Image.open(), img.verify(), and img.load(). Decompression bombs and non-image binaries are rejected with HTTP 400.
- **Verification method:** 	est_magic_byte_validation_rejects_fake_images.
- **Result:** Executables and corrupt files disguised as .jpg/.png are immediately rejected.
- **Classification:** VERIFIED_EXISTING
- **Evidence:** 	ests/test_security_privacy.py::test_magic_byte_validation_rejects_fake_images PASSED.
- **Risk if failed:** Malicious file execution or server denial of service.
- **Remediation:** Keep Pillow decode checks enabled on all ingest pathways.
- **Production impact:** None.
- **Required tests:** Upload security tests.
- **Rollback:** N/A.
- **Dependencies:** Pillow.

---

### G. Original Photo Access Control
- **Current implementation:** GET /photos/{photo_id}/download allows download if 	oken matches event.access_token or event.selection_token. If 	oken is omitted, no auth check was enforced if UUID was known.
- **Verification method:** Inspection of pps/api/routers/photos.py:255-273.
- **Result:** Omission of token parameter bypasses event token check when photographer auth header is missing.
- **Classification:** NEEDS_REFACTOR (P0 Finding)
- **Evidence:** pps/api/routers/photos.py lines 266-272: if token: ... lacks an else branch enforcing photographer/admin JWT auth.
- **Risk if failed:** IDOR: An unauthenticated caller possessing a raw Photo UUID could download high-resolution originals.
- **Remediation:** Enforce that GET /photos/{photo_id}/download requires EITHER a valid event capability token OR authenticated photographer ownership of the photo.
- **Production impact:** High security improvement; zero impact on authorized guests and photographers.
- **Required tests:** Authorization negative test with unauthenticated request lacking token.
- **Rollback:** Revert router check.
- **Dependencies:** pps/api/auth.py.

---

### H. Guest Selfie / Biometric / Face-Search Isolation
- **Current implementation:** Face search endpoint (POST /events/{event_id}/guests/{guest_id}/search) strictly queries FaceEmbedding.filter(FaceEmbedding.event_id == event.id). Unconsented guests are rejected with HTTP 403.
- **Verification method:** 	est_unconsented_guest_search_blocked and code verification of candidate query.
- **Result:** Global cross-event facial matching is technically impossible because the query strictly filters by event_id.
- **Classification:** VERIFIED_EXISTING
- **Evidence:** pps/api/routers/matching.py line 74: FaceEmbedding.event_id == event.id.
- **Risk if failed:** Cross-event facial privacy violation.
- **Remediation:** Maintain strict event-scoping on all vector similarity operations.
- **Production impact:** None.
- **Required tests:** 	ests/ai/test_ai_scoping_privacy.py.
- **Rollback:** N/A.
- **Dependencies:** OpenCV, pgvector.

---

### I. Redis / PostgreSQL / Celery / Internal Service Exposure
- **Current implementation:** All backing services run inside Docker bridge network without exposed ports to the host interface.
- **Verification method:** docker ps and ss -tlpn.
- **Result:** No direct external network access to Redis or PostgreSQL.
- **Classification:** VERIFIED_EXISTING
- **Evidence:** Host ss -tlpn shows 0.0.0.0:5432 and 0.0.0.0:6379 are NOT present.
- **Risk if failed:** Remote code execution / full database takeover.
- **Remediation:** Maintain docker-compose.prod.yml network isolation.
- **Production impact:** None.
- **Required tests:** Post-deployment port inspection.
- **Rollback:** N/A.
- **Dependencies:** Docker Compose.

---

### J. SuperAdmin / Payment-Secret Controls
- **Current implementation:** SuperAdmin vault endpoints (/admin/gateway-settings) require valid admin JWT AND explicit password verification via /admin/gateway-settings/unlock to view or modify Razorpay API keys and bank account details.
- **Verification method:** scripts/qa_gateway_settings_test.py.
- **Result:** Direct access returns 401 Unauthorized until unlocked with valid admin password. Wrong password returns 401.
- **Classification:** VERIFIED_EXISTING
- **Evidence:** 8/8 tests passed in qa_gateway_settings_test.py.
- **Risk if failed:** Exfiltration of Razorpay master API secrets.
- **Remediation:** Keep password verification gate active.
- **Production impact:** None.
- **Required tests:** Gateway settings test suite.
- **Rollback:** N/A.
- **Dependencies:** Admin auth module.

---

### K. Razorpay Webhook Validation / Idempotency
- **Current implementation:** POST /api/v1/subscription/webhook verifies HMAC-SHA256 signature using payment_gateway.verify_webhook_signature and logs events in SubscriptionWebhookEvent to skip duplicates.
- **Verification method:** scripts/qa_subscription_test_suite.py.
- **Result:** Invalid signatures are rejected with 400 Bad Request; duplicate webhooks are skipped idempotently.
- **Classification:** VERIFIED_EXISTING
- **Evidence:** 11/11 tests passed in qa_subscription_test_suite.py.
- **Risk if failed:** Fake payment confirmations or double-activation of subscriptions.
- **Remediation:** Maintain HMAC signature check and event table deduplication.
- **Production impact:** None.
- **Required tests:** Webhook idempotency test suite.
- **Rollback:** N/A.
- **Dependencies:** pps/api/services/subscription_service.py.

---

### L. Backup / Restore Security
- **Current implementation:** Manual database snapshot exists at /home/ubuntu/backups/baseline_getmymoment_.sql. Automated recurring cron and encrypted S3 cloud replication are not yet configured.
- **Verification method:** Server inspection (crontab -l, ls /home/ubuntu/backups/).
- **Result:** Database backup exists locally on EC2, but lacks automated daily scheduling, encryption at rest, and cloud offloading.
- **Classification:** PARTIALLY_IMPLEMENTED (NEEDS_DECISION on RPO/RTO & retention)
- **Evidence:** crontab -l returned no active cron. Local file aseline_getmymoment_.sql verified (103 KB).
- **Risk if failed:** Data loss in case of EC2 hardware/disk failure.
- **Remediation:** Implement automated daily backup script to encrypted storage once retention policy is approved.
- **Production impact:** High reliability benefit.
- **Required tests:** Full database restore test to a non-production test container.
- **Rollback:** Preserve baseline snapshot.
- **Dependencies:** pg_dump, cron.

---

### M. Logging / Secrets / Sensitive-Data Leakage
- **Current implementation:** Passwords, full JWT tokens, raw biometric embeddings, and secrets are excluded from logs. Security headers middleware applies HSTS, X-Content-Type-Options, X-Frame-Options, and Referrer-Policy.
- **Verification method:** Log inspection and header curl validation.
- **Result:** No sensitive secrets logged. Security headers verified on live domain.
- **Classification:** VERIFIED_EXISTING
- **Evidence:** curl -sI https://www.getmymoment.fun/api/v1/health returns 
osniff, SAMEORIGIN, strict-transport-security.
- **Risk if failed:** Token or credential exfiltration via server logs.
- **Remediation:** Maintain logging sanitization rules.
- **Production impact:** None.
- **Required tests:** Security header test.
- **Rollback:** N/A.
- **Dependencies:** FastAPI middleware.

---

### N. Rate Limiting / Abuse Controls
- **Current implementation:** Standard FastAPI router structure without explicit per-endpoint rate limiting middleware.
- **Verification method:** Codebase grep and endpoint request loops.
- **Result:** No rate limiting currently active on authentication, OTP, selfie search, or public token lookups.
- **Classification:** MISSING (P0 Finding)
- **Evidence:** Grep for limiter / slowapi yielded zero matches in pps/api/.
- **Risk if failed:** Brute-force attacks against /auth/login, OTP exhaustion, or CPU denial-of-service via automated selfie searches.
- **Remediation:** Integrate slowapi with Redis backend and apply endpoint-specific tier limits.
- **Production impact:** High security improvement; protects server CPU and prevents brute-force.
- **Required tests:** Rate limit violation test (verify HTTP 429 Too Many Requests).
- **Rollback:** Remove limiter decorator.
- **Dependencies:** slowapi, 
edis.
