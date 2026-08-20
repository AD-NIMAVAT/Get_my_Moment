# GET MY MOMENT — MASTER UI/UX RESPONSIVE & HARD TEST SUITE

## 0. Purpose

This document is the master implementation and execution specification for testing the complete **Get My Moment** web application across:

- Mobile
- Tablet
- Laptop
- Desktop
- 2K
- 4K
- Multiple browsers
- Multiple user roles
- Concurrent events
- Concurrent camera uploads
- Network failures
- Large photo libraries
- Accessibility
- Performance
- Security / tenant isolation
- Visual regression
- Production builds

The objective is not merely to verify that pages "look good". The objective is to prove that the application remains **usable, stable, isolated, responsive, secure, and functional under realistic and adversarial conditions**.

---

# 1. MASTER QUALITY GATES

A release is considered PASS only when all mandatory gates pass.

- [ ] Build passes
- [ ] Route smoke tests pass
- [ ] No unexpected JavaScript errors
- [ ] No unexpected API 4xx/5xx errors
- [ ] No horizontal overflow
- [ ] No clipped critical UI
- [ ] No broken images/assets
- [ ] Touch targets pass
- [ ] Keyboard navigation passes
- [ ] Accessibility smoke tests pass
- [ ] Modal/bottom-sheet tests pass
- [ ] Authentication tests pass
- [ ] Role authorization tests pass
- [ ] Tenant isolation tests pass
- [ ] Event isolation tests pass
- [ ] Photo isolation tests pass
- [ ] Upload retry/resume tests pass
- [ ] Concurrent upload tests pass
- [ ] Multi-event concurrent camera tests pass
- [ ] Visual regression passes
- [ ] Performance budgets pass
- [ ] Production build passes
- [ ] Production-mode smoke tests pass
- [ ] Final test report generated
- [ ] No unresolved P0/P1 defect remains

---

# 2. TEST ENVIRONMENT

## 2.1 Application Modes

- [ ] Development mode
- [ ] Production build
- [ ] Production server mode
- [ ] Clean browser profile
- [ ] Authenticated browser profile
- [ ] Incognito/private browser where supported

## 2.2 Browser Matrix

- [ ] Chromium / Chrome
- [ ] Firefox
- [ ] WebKit / Safari-equivalent
- [ ] Android Chromium
- [ ] iOS WebKit

## 2.3 Viewport Matrix

| Profile | Width | Height |
|---|---:|---:|
| Compact Mobile | 360 | 800 |
| Standard Mobile | 390 | 844 |
| Large Mobile | 430 | 932 |
| Tablet Portrait | 768 | 1024 |
| Tablet Landscape | 1024 | 768 |
| Laptop | 1280 | 800 |
| Desktop | 1440 | 900 |
| FHD | 1920 | 1080 |
| 2K | 2560 | 1440 |
| 4K | 3840 | 2160 |

- [ ] Every critical route tested against the full matrix
- [ ] At minimum, smoke suite runs 390x844, 768x1024, 1440x900, 1920x1080
- [ ] Full regression runs all required viewports

---

# 3. ROUTE DISCOVERY

Do not rely only on a manually maintained route list.

The test framework must:

- [ ] Discover application routes where practical
- [ ] Maintain an explicit protected-route manifest for dynamic routes
- [ ] Include dynamic routes such as `/dashboard/events/[id]`
- [ ] Include tokenized routes such as `/e/[token]`
- [ ] Include selection routes such as `/selection/[token]`
- [ ] Include role-specific routes
- [ ] Detect newly added routes where possible
- [ ] Flag routes with no test coverage

## Known Route Groups

### Public

- [ ] `/`
- [ ] `/about`
- [ ] `/contact`
- [ ] `/login`

### Studio

- [ ] `/dashboard`
- [ ] `/dashboard/events/[id]`
- [ ] `/dashboard/crm`
- [ ] `/dashboard/finance`
- [ ] `/dashboard/calendar`
- [ ] `/dashboard/profile`

### Crew

- [ ] `/crew/login`
- [ ] `/crew/dashboard`

### Guest

- [ ] `/e/[token]`

### Client

- [ ] `/selection/[token]`

### Admin

- [ ] `/admin/login`
- [ ] `/admin/dashboard`

---

# 4. AUTHENTICATION TEST MATRIX

Create isolated test identities for each role.

- [ ] Studio test account
- [ ] Crew test account
- [ ] Guest test session
- [ ] Client test session
- [ ] Admin test account

Test:

- [ ] Valid login
- [ ] Invalid password
- [ ] Invalid username/email
- [ ] Empty fields
- [ ] Session creation
- [ ] Session persistence
- [ ] Session expiration
- [ ] Logout
- [ ] Direct protected URL while logged out
- [ ] Expired token
- [ ] Revoked token
- [ ] Multiple browser sessions
- [ ] Refresh while authenticated
- [ ] Back/forward navigation after logout

---

# 5. ROLE & AUTHORIZATION ISOLATION

Every role must be tested against every forbidden role area.

- [ ] Guest cannot access Studio dashboard
- [ ] Crew cannot access Studio administration
- [ ] Crew cannot access Super Admin
- [ ] Client cannot access Studio dashboard
- [ ] Studio cannot access Super Admin controls
- [ ] Non-admin cannot access admin-only endpoints
- [ ] Direct URL authorization enforced
- [ ] API authorization enforced independently of UI

---

# 6. TENANT ISOLATION

Create at least:

- [ ] Studio A
- [ ] Studio B

Each studio must have:

- [ ] Separate events
- [ ] Separate users
- [ ] Separate cameras
- [ ] Separate photos
- [ ] Separate clients
- [ ] Separate invoices
- [ ] Separate storage references

Test:

- [ ] Studio A cannot view Studio B dashboard data
- [ ] Studio A cannot access Studio B events
- [ ] Studio A cannot access Studio B photos
- [ ] Studio A cannot access Studio B invoices
- [ ] Studio A cannot access Studio B upload sessions
- [ ] Direct ID manipulation is rejected
- [ ] Token manipulation is rejected
- [ ] API object-ID manipulation is rejected

---

# 7. MULTI-EVENT ISOLATION — CRITICAL

Create:

```text
STUDIO-001
├── EVENT-A
│   ├── CAMERA-A1
│   └── CAMERA-A2
├── EVENT-B
│   ├── CAMERA-B1
│   └── CAMERA-B2
└── EVENT-C
    ├── CAMERA-C1
    └── CAMERA-C2
```

All cameras may use the same studio-level credentials.

The system must still identify each upload using event/device/session context.

- [ ] Camera A1 upload goes only to Event A
- [ ] Camera B1 upload goes only to Event B
- [ ] Camera C1 upload goes only to Event C
- [ ] No cross-event contamination
- [ ] No cross-event thumbnails
- [ ] No cross-event AI jobs
- [ ] No cross-event notifications
- [ ] No cross-event album entries
- [ ] No cross-event guest results
- [ ] No cross-event storage path collision

---

# 8. CONCURRENT CAMERA UPLOAD TEST

Simulate:

```text
Camera A1 → Event A
Camera B1 → Event B
Camera C1 → Event C
```

All upload simultaneously.

Test:

- [ ] 3 concurrent uploads
- [ ] 10 concurrent uploads
- [ ] 50 concurrent uploads
- [ ] 100 concurrent uploads where infrastructure permits

Verify:

- [ ] No application crash
- [ ] No server crash
- [ ] No duplicate records
- [ ] No lost records
- [ ] No incorrect event assignment
- [ ] No incorrect device assignment
- [ ] No incorrect processing job
- [ ] No queue corruption
- [ ] No race-condition failure

---

# 9. UPLOAD SESSION TESTING

Every upload connection should be uniquely associated with:

```text
studio_id
event_id
device_id
device_session_id
upload_session_id
```

Test:

- [ ] New device session receives unique identifier
- [ ] Reconnect does not collide with another device
- [ ] Expired session rejected
- [ ] Revoked session rejected
- [ ] Session cannot upload to another event
- [ ] Session cannot be replayed improperly
- [ ] Session state survives expected reconnects

---

# 10. IDEMPOTENCY & DUPLICATE TESTING

For every upload:

- [ ] Unique idempotency key
- [ ] Retry same request
- [ ] Retry after timeout
- [ ] Double-click upload
- [ ] Parallel duplicate request
- [ ] Same file uploaded twice
- [ ] Same filename with different content
- [ ] Same content with different filename

Expected:

- [ ] No unintended duplicate photo
- [ ] No duplicate processing job
- [ ] No duplicate notification
- [ ] Correct retry behavior

---

# 11. RESUMABLE UPLOAD TESTING

Test lifecycle:

```text
START
 ↓
20%
 ↓
NETWORK FAILURE
 ↓
RECONNECT
 ↓
RESUME
 ↓
100%
```

- [ ] Interrupted upload resumes
- [ ] Already uploaded chunks are not duplicated
- [ ] Missing chunks are retried
- [ ] Final checksum/content is correct
- [ ] Partial upload cannot appear as completed
- [ ] Failed upload is recoverable
- [ ] Cancelled upload is cleaned up correctly

---

# 12. PHOTO TEST DATA

Test:

- [ ] Portrait
- [ ] Landscape
- [ ] Square
- [ ] Small image
- [ ] High-resolution image
- [ ] Very large image
- [ ] Corrupt image
- [ ] Unsupported image
- [ ] Duplicate image
- [ ] EXIF rotation
- [ ] Missing EXIF
- [ ] Unicode filename
- [ ] Long filename
- [ ] Special-character filename

Expected:

- [ ] Correct orientation
- [ ] Correct aspect ratio
- [ ] No stretching
- [ ] No broken thumbnail
- [ ] No layout shift
- [ ] No memory crash
- [ ] Correct download
- [ ] Correct metadata handling

---

# 13. PHOTO LIBRARY SCALE TEST

Test:

- [ ] 1 photo
- [ ] 10 photos
- [ ] 100 photos
- [ ] 1,000 photos
- [ ] 10,000 photos where infrastructure permits

Verify:

- [ ] Pagination/virtualization works
- [ ] Scrolling remains usable
- [ ] Selection remains correct
- [ ] Bulk actions remain correct
- [ ] No browser freeze
- [ ] No memory runaway
- [ ] No duplicate rendering
- [ ] No stale photo state

---

# 14. PUBLIC MARKETING UI TESTS

## Mobile

- [ ] Hamburger opens
- [ ] Hamburger closes
- [ ] Navigation does not shift horizontally
- [ ] Hero text wraps correctly
- [ ] CTA buttons stack
- [ ] Touch targets are usable
- [ ] 5-step cards stack
- [ ] Comparison cards stack
- [ ] Demo modal becomes usable bottom sheet
- [ ] Pricing cards stack
- [ ] Recommended badge remains visible
- [ ] FAQ opens/closes correctly

## Desktop

- [ ] Sticky header
- [ ] Navigation alignment
- [ ] Hero dual mockup alignment
- [ ] 5-column flow
- [ ] Pricing grid
- [ ] Hover states
- [ ] No excessive whitespace
- [ ] Maximum content width enforced

---

# 15. STUDIO DASHBOARD UI TESTS

## Mobile

- [ ] MobileTabBar visible
- [ ] Safe-area padding works
- [ ] Content never hides behind bottom bar
- [ ] Event tabs scroll horizontally
- [ ] Folder pills scroll correctly
- [ ] Photo grid becomes 2-column
- [ ] Selection works
- [ ] Bulk toolbar does not overlap navigation
- [ ] Modals become usable bottom sheets
- [ ] Body scroll locks correctly when modal opens

## Desktop

- [ ] Event header
- [ ] Guest QR controls
- [ ] Album proofing controls
- [ ] 4–6 column photo grid
- [ ] Hover states
- [ ] Keyboard navigation
- [ ] GST invoice print layout
- [ ] CRM Kanban
- [ ] Drag/drop stage changes

---

# 16. CREW PORTAL TESTS

- [ ] Crew login
- [ ] Numeric phone keyboard
- [ ] Auto-focus
- [ ] Ceremony switcher
- [ ] Large touch targets
- [ ] Camera host copy
- [ ] Port copy
- [ ] Username copy
- [ ] Password copy
- [ ] Remote path copy
- [ ] Copy confirmation
- [ ] Camera roll/file picker
- [ ] Upload progress
- [ ] Upload retry
- [ ] `/crew/*` does not expose Studio MobileTabBar
- [ ] Crew cannot access forbidden dashboard functions

---

# 17. GUEST AI SELFIE PORTAL

- [ ] Camera permission request
- [ ] Permission denied state
- [ ] Permission revoked state
- [ ] Front camera selection
- [ ] Webcam fallback
- [ ] Circular selfie viewport
- [ ] Consent UI
- [ ] Privacy language visible
- [ ] Scanning animation
- [ ] Search progress
- [ ] No-match state
- [ ] Match state
- [ ] Photo download
- [ ] WhatsApp/share action
- [ ] Expired event token
- [ ] Invalid token
- [ ] Event isolation

---

# 18. CLIENT ALBUM PROOFING

- [ ] Photo heart selection
- [ ] Selection counter
- [ ] Sticky counter
- [ ] Designer notes
- [ ] Long notes
- [ ] Empty notes
- [ ] Save notes
- [ ] Final confirmation
- [ ] Submission lock
- [ ] Refresh after submission
- [ ] Duplicate submission protection
- [ ] Mobile usability
- [ ] Desktop usability

---

# 19. SUPER ADMIN

- [ ] Login
- [ ] Platform statistics
- [ ] Photographer management
- [ ] KYC controls
- [ ] Subscription controls
- [ ] Storage controls
- [ ] Bank vault
- [ ] Payment configuration
- [ ] GST configuration
- [ ] Stamp/signature upload
- [ ] Forbidden user access rejected
- [ ] Sensitive values masked
- [ ] Audit trail generated

---

# 20. RESPONSIVE AUTOMATED ASSERTIONS

Automated Playwright tests should verify:

## Horizontal Overflow

```text
document.documentElement.scrollWidth <= window.innerWidth
```

Also inspect:

- [ ] Fixed elements
- [ ] Absolute elements
- [ ] Transformed elements
- [ ] Tables
- [ ] Images
- [ ] Long text
- [ ] Modals
- [ ] Bottom sheets

## Touch Targets

On mobile:

- [ ] Buttons >= 44x44 CSS px where practical
- [ ] Links have usable tap area
- [ ] Icon-only controls have accessible names
- [ ] Adjacent controls have sufficient spacing

## Modal Visibility

- [ ] Modal within viewport
- [ ] Bottom sheet not clipped
- [ ] Close control reachable
- [ ] Content scrollable
- [ ] Keyboard does not hide controls
- [ ] Escape works on desktop
- [ ] Body scroll lock works

## Layout Stability

- [ ] No unexpected horizontal shift
- [ ] No critical content jumps
- [ ] Images reserve appropriate space
- [ ] Font loading does not destroy layout

---

# 21. ACCESSIBILITY TESTING

- [ ] Keyboard-only navigation
- [ ] Visible focus
- [ ] Logical tab order
- [ ] Enter activation
- [ ] Space activation
- [ ] Escape modal close
- [ ] Accessible labels
- [ ] Form labels
- [ ] Dialog semantics
- [ ] ARIA correctness
- [ ] Heading hierarchy
- [ ] Image alt text
- [ ] Contrast
- [ ] Error messaging
- [ ] Focus restoration after modal close

Run automated accessibility scanning where available.

---

# 22. NETWORK CONDITION TESTING

Test:

- [ ] Offline
- [ ] Slow 3G
- [ ] Fast 3G
- [ ] 4G
- [ ] 5G
- [ ] Request timeout
- [ ] API 429
- [ ] API 500
- [ ] API 502
- [ ] API 503
- [ ] Connection drop during upload
- [ ] Connection drop during navigation
- [ ] Reconnect
- [ ] Retry
- [ ] Resume

---

# 23. CONSOLE & NETWORK FAILURE MONITORING

Fail tests for unexpected:

- [ ] `console.error`
- [ ] `pageerror`
- [ ] Unhandled promise rejection
- [ ] Failed critical API
- [ ] HTTP 500
- [ ] HTTP 502
- [ ] HTTP 503
- [ ] Broken JavaScript
- [ ] Broken CSS
- [ ] Broken image
- [ ] Hydration mismatch

Intentional negative-test errors must be explicitly allow-listed.

---

# 24. VISUAL REGRESSION TESTING

Generate baseline screenshots for critical routes.

Test:

- [ ] Mobile baseline
- [ ] Tablet baseline
- [ ] Desktop baseline
- [ ] 2K baseline
- [ ] 4K baseline

Compare:

- [ ] Typography
- [ ] Spacing
- [ ] Alignment
- [ ] Colors
- [ ] Borders
- [ ] Shadows
- [ ] Icons
- [ ] Images
- [ ] Modal position
- [ ] Bottom navigation
- [ ] Sticky elements

Mask dynamic content where required:

- [ ] Timestamp
- [ ] Random IDs
- [ ] Live counters
- [ ] Dynamic avatars
- [ ] Dynamic photo thumbnails

---

# 25. PERFORMANCE TESTING

Measure:

- [ ] Page load
- [ ] LCP
- [ ] INP
- [ ] CLS
- [ ] JavaScript size
- [ ] Image payload
- [ ] API latency
- [ ] Time to interactive
- [ ] Memory behavior during large photo grids

Test dashboard scale:

- [ ] 1 event
- [ ] 10 events
- [ ] 100 events
- [ ] 1,000 events where supported

Performance regression must be reported separately from functional failure.

---

# 26. MOBILE-SPECIFIC HARD TESTS

- [ ] iOS safe-area top
- [ ] iOS safe-area bottom
- [ ] Android navigation area
- [ ] 100dvh behavior
- [ ] Virtual keyboard open
- [ ] Virtual keyboard close
- [ ] Input focus
- [ ] Bottom sheet + keyboard
- [ ] Orientation portrait
- [ ] Orientation landscape
- [ ] Notch
- [ ] Browser address bar collapse/expand
- [ ] Pull-to-refresh behavior
- [ ] Overscroll
- [ ] Long event name
- [ ] Long venue name
- [ ] Gujarati text
- [ ] Hindi text
- [ ] Unicode text

---

# 27. DESKTOP-SPECIFIC HARD TESTS

- [ ] 1280 width
- [ ] 1440 width
- [ ] 1920 width
- [ ] 2560 width
- [ ] 3840 width
- [ ] Excessive whitespace check
- [ ] Maximum content width
- [ ] Sidebar behavior
- [ ] Multi-column grids
- [ ] Keyboard navigation
- [ ] Hover states
- [ ] Right-click behavior where relevant
- [ ] Browser zoom 80%
- [ ] Browser zoom 100%
- [ ] Browser zoom 125%
- [ ] Browser zoom 200%

---

# 28. FORM TESTING

For every form:

- [ ] Required fields
- [ ] Optional fields
- [ ] Invalid data
- [ ] Boundary values
- [ ] Long values
- [ ] Unicode
- [ ] Paste
- [ ] Copy
- [ ] Keyboard navigation
- [ ] Submit by Enter
- [ ] Double submit
- [ ] Loading state
- [ ] API failure
- [ ] Validation message
- [ ] Recovery after error
- [ ] Successful submission
- [ ] Refresh behavior

---

# 29. SECURITY UI/ROUTE SMOKE TESTS

- [ ] Direct protected route blocked
- [ ] Expired session blocked
- [ ] Revoked session blocked
- [ ] Cross-tenant ID manipulation blocked
- [ ] Cross-event ID manipulation blocked
- [ ] Token manipulation blocked
- [ ] Unauthorized API request blocked
- [ ] Sensitive data not rendered to unauthorized roles
- [ ] Passwords/tokens not exposed in UI
- [ ] Sensitive credentials not logged to console

---

# 30. ERROR STATE TESTING

Every major page should have verified:

- [ ] Loading state
- [ ] Empty state
- [ ] Error state
- [ ] Retry state
- [ ] Permission denied state
- [ ] Session expired state
- [ ] Offline state
- [ ] Not found state
- [ ] Server failure state
- [ ] Partial data state

No page should show an infinite spinner without recovery.

---

# 31. AUTOMATED TEST PROJECT STRUCTURE

Recommended structure:

```text
tests/
├── e2e/
│   ├── public/
│   ├── studio/
│   ├── crew/
│   ├── guest/
│   ├── client/
│   └── admin/
│
├── responsive/
│   ├── route-layout.spec.ts
│   ├── overflow.spec.ts
│   ├── touch-targets.spec.ts
│   ├── modals.spec.ts
│   └── navigation.spec.ts
│
├── accessibility/
│   └── accessibility.spec.ts
│
├── security/
│   ├── auth.spec.ts
│   ├── authorization.spec.ts
│   ├── tenant-isolation.spec.ts
│   └── event-isolation.spec.ts
│
├── uploads/
│   ├── upload.spec.ts
│   ├── retry.spec.ts
│   ├── resumable.spec.ts
│   ├── idempotency.spec.ts
│   └── concurrent-events.spec.ts
│
├── performance/
│   └── performance.spec.ts
│
├── visual/
│   └── visual-regression.spec.ts
│
├── fixtures/
├── helpers/
├── auth/
└── reports/
```

---

# 32. PLAYWRIGHT CONFIGURATION REQUIREMENTS

The configuration should support:

- [ ] Chromium
- [ ] Firefox
- [ ] WebKit
- [ ] Mobile viewport
- [ ] Tablet viewport
- [ ] Desktop viewport
- [ ] Screenshot on failure
- [ ] Video on failure where useful
- [ ] Trace on retry/failure
- [ ] HTML report
- [ ] JSON report
- [ ] JUnit report where CI requires it
- [ ] Authenticated storage states
- [ ] Environment-based base URL
- [ ] CI/headless execution
- [ ] Parallel workers where safe
- [ ] Serial execution for race-condition tests

---

# 33. TEST DATA ISOLATION

Tests must not depend on production data.

Create dedicated test fixtures:

```text
TEST-STUDIO-A
TEST-STUDIO-B

TEST-EVENT-A
TEST-EVENT-B
TEST-EVENT-C

TEST-CAMERA-A
TEST-CAMERA-B
TEST-CAMERA-C
```

- [ ] Test data can be created automatically
- [ ] Test data can be cleaned automatically
- [ ] Tests are repeatable
- [ ] Tests do not modify real customer data
- [ ] Parallel test workers use isolated data where necessary

---

# 34. TEST EXECUTION COMMANDS

The implementation should expose predictable commands such as:

```bash
npm run test
npm run test:e2e
npm run test:responsive
npm run test:accessibility
npm run test:visual
npm run test:security
npm run test:uploads
npm run test:concurrency
npm run test:performance
npm run test:all
npm run test:report
npm run build
```

If the project uses Python-based Playwright, equivalent commands may be provided through `pytest`.

Do not assume both ecosystems are required. Follow the actual project stack.

---

# 35. HARD FAILURE POLICY

## P0 — Release Blocker

Examples:

- Cross-tenant data leak
- Cross-event photo leak
- Unauthorized admin access
- Payment/security-critical failure
- Data corruption
- Application-wide crash

Result:

```text
FAIL — Release blocked
```

## P1 — Major

Examples:

- Upload failure
- Critical dashboard workflow broken
- Major mobile layout unusable
- Authentication workflow broken

Result:

```text
FAIL — Release blocked until resolved
```

## P2 — Medium

Examples:

- Non-critical layout defect
- Minor responsive issue
- Secondary workflow issue

Result:

```text
Conditional review
```

## P3 — Cosmetic

Examples:

- Minor spacing
- Small visual inconsistency
- Non-critical animation issue

Result:

```text
Can be deferred if documented
```

---

# 36. FINAL REPORT REQUIREMENTS

Generate:

```text
reports/
├── html/
├── screenshots/
├── videos/
├── traces/
├── json/
├── junit/
└── summary/
```

Final report must include:

- [ ] Total tests
- [ ] Passed
- [ ] Failed
- [ ] Skipped
- [ ] Flaky
- [ ] P0
- [ ] P1
- [ ] P2
- [ ] P3
- [ ] Browser results
- [ ] Viewport results
- [ ] Role results
- [ ] Security results
- [ ] Upload results
- [ ] Concurrency results
- [ ] Accessibility results
- [ ] Performance results
- [ ] Visual regression results
- [ ] Failed screenshots
- [ ] Trace links/artifacts
- [ ] Root cause
- [ ] Fix recommendation
- [ ] Final PASS/FAIL

---

# 37. CI/CD QUALITY GATE

Before merge/release:

```text
Code
 ↓
Lint
 ↓
Unit Tests
 ↓
Build
 ↓
Route Smoke
 ↓
Responsive
 ↓
Accessibility
 ↓
Functional
 ↓
Security
 ↓
Upload
 ↓
Concurrency
 ↓
Visual
 ↓
Performance
 ↓
Production Smoke
 ↓
FINAL GATE
```

- [ ] No mandatory gate may be silently skipped
- [ ] Failed P0/P1 tests block release
- [ ] Test artifacts retained
- [ ] Flaky tests tracked separately
- [ ] Test failures cannot be hidden by changing the expected result
- [ ] Baseline changes require review

---

# 38. ONE-TIME PERMISSION / CONTINUOUS EXECUTION RULE

When this test suite is executed as an implementation task:

- [ ] Ask for implementation permission only once at the beginning
- [ ] Do not repeatedly ask permission for each test category
- [ ] Continue automatically through all planned stages
- [ ] Fix safe, deterministic defects automatically when authorized
- [ ] Re-run failed tests after fixes
- [ ] Continue until the complete mandatory checklist is exhausted
- [ ] Never declare PASS because one subset passed
- [ ] Never stop after finding the first defect
- [ ] Maintain a defect ledger throughout execution
- [ ] Re-test affected areas after every fix
- [ ] Perform final regression after all fixes

---

# 39. DEFINITION OF DONE

The task is complete only when:

- [ ] All critical routes are covered
- [ ] All required viewports are covered
- [ ] All supported browsers are covered
- [ ] All user roles are covered
- [ ] Tenant isolation passes
- [ ] Event isolation passes
- [ ] Concurrent camera upload passes
- [ ] Upload retry/resume passes
- [ ] Idempotency passes
- [ ] Accessibility passes
- [ ] Visual regression passes
- [ ] Performance passes
- [ ] Production build passes
- [ ] Production smoke passes
- [ ] No P0/P1 remains
- [ ] Test report generated
- [ ] All failures documented
- [ ] Final PASS/FAIL decision recorded

---

# 40. MASTER SUCCESS CRITERIA

The final system must prove:

> **Every important Get My Moment screen works correctly on every supported device class, every critical user role remains isolated, every event remains isolated, concurrent camera uploads remain safe, interrupted uploads recover correctly, large photo libraries remain usable, accessibility requirements are respected, visual regressions are detected, and production builds remain stable.**

**This is the master QA gate for Get My Moment Responsive, Functional, Security, Upload, Concurrency and Production Testing.**
