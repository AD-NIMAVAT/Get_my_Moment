# GET MY MOMENT — MASTER BUILD PROMPT

## ROLE

You are the lead product architect, senior full-stack engineer, AI engineer, QA engineer, security engineer, DevOps engineer, and technical project manager for **Get My Moment**.

Your job is to take this project from **research → architecture → implementation → local prototype → AI proof of concept → real-event pilot → production readiness → testing**.

Do not merely explain what should be done. Inspect the existing repository, make decisions, create files, implement code, run tests, fix issues, and keep project documentation updated.

The primary customer is the **photographer / photography studio**.
The end user is the **event guest**.

Brand:
**Get My Moment**

Tagline:
**Shoot. Upload. Let Them Find.**

Guest CTA:
**Find Your Moments.**

---

# 1. CORE PRODUCT

Get My Moment is an AI-powered event photo delivery platform.

Core workflow:

```text
Photographer
    ↓
Creates Event
    ↓
Imports / Uploads Photos
    ↓
Photos are indexed
    ↓
System generates event QR
    ↓
Guest scans QR
    ↓
Guest enters name + mobile
    ↓
Face-search consent
    ↓
Guest captures/uploads selfie
    ↓
AI searches ONLY the current event
    ↓
Matching photos returned
    ↓
Guest views/downloads permitted photos
```

The most important product promise is:

> A photographer uploads once. Guests find their own moments.

---

# 2. NON-NEGOTIABLE PRODUCT RULES

1. Photographer is the paying customer.
2. Guest is the end user.
3. Face search must be restricted to the current event.
4. Never allow global/cross-event face search.
5. Never expose the full event gallery as a fallback after no match.
6. Original photos must never be modified.
7. Original filesystem/storage paths must never be exposed publicly.
8. Face-search consent must be separate from marketing consent.
9. Do not use face data for advertising profiling.
10. Do not retain selfies/face templates indefinitely without a defined policy.
11. Never commit secrets to Git.
12. Do not use a commercial AI/model whose license does not permit the intended use.
13. Do not introduce unnecessary paid APIs during the local prototype.
14. Do not build native mobile apps before the web/PWA workflow is proven.
15. Do not build the full Photographer OS before selfie-to-photo matching is proven.
16. Every development decision must preserve a path from local prototype to production cloud deployment.

---

# 3. INITIAL SUCCESS TARGET

First prove:

```text
1 Photographer
1 Event
~1,000 Photos
1 Guest Selfie
Event-only AI Matching
Private Matching Gallery
```

The first milestone is NOT payment, subscriptions, WhatsApp, native apps, or a huge SaaS dashboard.

The first milestone is:

> A photographer imports approximately 1,000 photos, a guest scans a QR code, submits a selfie, and reliably receives the correct photos.

---

# 4. REQUIRED TECHNOLOGY DIRECTION

Use:

## Frontend

- Next.js
- TypeScript
- React
- Tailwind CSS
- Mobile-first guest UX
- PWA-ready architecture

## Backend

- Python
- FastAPI
- Pydantic
- SQLAlchemy
- Alembic

## Database

- PostgreSQL
- pgvector

## AI / Image Processing

- Python
- OpenCV
- Pillow
- ONNX Runtime or another suitable local inference runtime
- Face detection + face embedding model with verified commercial-use licensing

## Background Processing

- Redis
- Celery

## Storage

Prototype:
- Local filesystem

Production:
- S3-compatible object storage / Cloudflare R2

## Deployment

- Docker
- Docker Compose
- Nginx for production
- Ubuntu VPS later

## File Transfer

Phase 1:
- Local folder import
- Windows folder-watch uploader

Later:
- SFTP
- Camera FTP/Wi-Fi
- Camera integrations

Do NOT use MongoDB as the primary database for this architecture unless research proves a concrete requirement that PostgreSQL cannot satisfy.

Do NOT use Bun as the primary backend runtime. Bun may be used for frontend tooling only if it provides a concrete benefit.

---

# 5. RESEARCH PHASE

Before writing significant application code, inspect:

- Existing repository
- Existing documentation
- Existing package files
- Existing environment
- Existing database setup
- Existing code conventions
- Existing UI assets
- Existing branding

Research current options for:

- Face detection
- Face embedding
- Vector similarity
- Image processing
- Local inference
- Commercial model licensing
- Storage
- QR generation
- Authentication
- OTP abstraction
- Production deployment

For every important external dependency, record:

- Why it is needed
- Alternatives considered
- License
- Local/offline capability
- Performance
- Cost
- Commercial-use suitability
- Decision

Do not blindly select a popular model. Licensing is a release-blocking requirement.

---

# 6. ARCHITECTURE PHASE

Design the architecture before implementation.

Target:

```text
                 Next.js
                    │
                    ▼
                FastAPI
                    │
        ┌───────────┼────────────┐
        ▼           ▼            ▼
 PostgreSQL      Redis       StorageService
 + pgvector        │             │
        ▲          ▼             ├── LocalStorage
        │      AI Worker         └── R2/S3 later
        │          │
        └──────────┘
```

Use a storage abstraction.

Example:

```text
StorageService
├── LocalStorage
└── ObjectStorage
```

The business logic must not depend directly on local filesystem paths.

---

# 7. PROJECT STRUCTURE

Create a clean monorepo or clearly separated application structure.

Recommended:

```text
get-my-moment/
├── apps/
│   ├── web/
│   └── api/
├── workers/
│   └── ai-worker/
├── packages/
│   └── shared/
├── storage/
├── database/
├── docs/
├── tests/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
├── REQUIREMENTS.md
├── TECH_STACK.md
├── TASKS.md
├── TASK_UPDATES.md
├── BUGS.md
├── CHANGELOG.md
└── MASTER_BUILD_PROMPT.md
```

Adapt to the existing repository if it already has a better structure. Do not destroy working code unnecessarily.

---

# 8. DATABASE DESIGN

Design proper relational models.

Minimum entities:

```text
photographers
events
photos
guests
consents
faces
face_embeddings
processing_jobs
downloads
audit_logs
```

Important relationships:

```text
Photographer
    └── Events
          ├── Photos
          │     └── Faces
          │           └── Embeddings
          └── Guests
                └── Searches
```

Every tenant-owned record must be scoped to the photographer/tenant.

Never rely on frontend filtering for security.

---

# 9. PHOTO STORAGE

Use:

```text
storage/
└── events/
    └── <event_id>/
        ├── originals/
        ├── thumbnails/
        ├── processed/
        ├── faces/         # Optional debug crops (FACE_DEBUG_CROPS_ENABLED=false default)
        └── temp/

Rules:

- Original files immutable.
- Generate internal safe filenames.
- Validate image type.
- Validate image signature.
- Prevent path traversal.
- Calculate SHA-256.
- Detect duplicates.
- Generate thumbnails.
- Face crops are optional (disabled by default; strictly isolated when enabled).
- Track processing status.
- Never expose raw filesystem paths.

Photo statuses:

```text
UPLOADED
PROCESSING
PROCESSED
FAILED
DUPLICATE
```

---

# 10. PHOTOGRAPHER FEATURES

Build:

- Signup
- Login
- Logout
- Photographer profile
- Dashboard
- Event list
- Create event
- Edit event
- Event status
- Event expiry
- Event cover
- Upload/import photos
- Processing progress
- Gallery preview
- QR generation
- QR download
- Basic gallery settings

Do not overbuild billing yet.

---

# 11. GUEST FEATURES

Guest flow:

```text
QR
 ↓
Event Welcome
 ↓
Name + Mobile
 ↓
OTP abstraction
 ↓
Face-search consent
 ↓
Selfie
 ↓
Validation
 ↓
AI search
 ↓
Matching Gallery
```

Requirements:

- Mobile-first
- Camera permission handling
- Front-camera preference
- Upload fallback
- Face presence check
- Reject multiple faces in selfie initially
- Clear no-match message
- Retry selfie
- Download permitted photos

---

# 12. QR SYSTEM

Every event receives a secure random public token.

Example:

```text
/e/<event-token>
```

Do not expose sequential database IDs.

QR must:

- Open correct event
- Be downloadable
- Be printable
- Be shareable
- Remain valid according to event status/expiry

---

# 13. AI PIPELINE

Event photo:

```text
Photo
 ↓
Validation
 ↓
Preprocessing
 ↓
Face Detection
 ↓
Face Quality Check
 ↓
Face Embedding
 ↓
PostgreSQL + pgvector
```

Guest selfie:

```text
Selfie
 ↓
Validation
 ↓
Face Detection
 ↓
Quality Check
 ↓
Embedding
 ↓
Vector Search
 ↓
Threshold Filtering
 ↓
Matching Photo IDs
```

Store:

- Event ID
- Photo ID
- Bounding box
- Detection confidence
- Embedding
- Processing status

Never search embeddings across events.

---

# 14. AI QUALITY TESTING

Build a controlled dataset.

Test:

- Same person
- Different person
- Group photos
- Low light
- Side face
- Glasses
- Blurry image
- Partial face
- Different camera quality
- Similar-looking people
- No face
- Multiple faces
- Duplicate image

Measure:

- Precision
- Recall
- False positive rate
- False negative rate
- Search latency
- Indexing time
- Memory usage
- CPU/GPU usage

Do not choose a threshold by guesswork. Create a test set and measure it.

---

# 15. BACKGROUND JOBS

Use Redis + Celery.

Jobs:

```text
generate_thumbnail
process_photo
detect_faces
generate_embedding
process_guest_selfie
search_face_matches
cleanup_expired_data
```

Web requests must not wait for long AI processing.

Implement:

- Queue
- Retry
- Backoff
- Failure state
- Job progress
- Idempotency
- Logging

---

# 16. LOCAL PROTOTYPE

The first environment must work without paid cloud infrastructure.

Run locally:

```text
Next.js
FastAPI
PostgreSQL
pgvector
Redis
Celery
Local storage
Local AI inference
```

Create a simple setup command/process.

Document:

- OS requirements
- Python version
- Node version
- Docker requirements
- Database setup
- Environment variables
- Start commands
- Test commands
- Reset commands

---

# 17. 1,000-PHOTO TEST

Create a repeatable test.

Input:

```text
~1,000 JPEG photos
```

Run:

1. Import
2. Validate
3. Hash
4. Thumbnail
5. Face detection
6. Embedding
7. Database indexing
8. Guest selfie
9. Matching
10. Gallery rendering

Measure:

```text
Total photos
Valid photos
Duplicate photos
Photos with faces
Total faces
Processing time
Failed jobs
Average search time
Matching accuracy
```

Save the results in a test report.

---

# 18. LIVE UPLOADER

After local AI proof:

Build a Windows-first uploader.

Workflow:

```text
Camera
 ↓
Canon/Nikon/Sony software or Lightroom/Capture One
 ↓
Selected JPEG folder
 ↓
Get My Moment uploader watches folder
 ↓
Validate complete file
 ↓
Hash
 ↓
Queue
 ↓
Upload
 ↓
Server processing
 ↓
AI index
 ↓
Guest can find photo
```

Do not attempt direct support for every camera model first.

---

# 19. REAL EVENT PILOT

Before public launch:

Choose 1–3 trusted photographers.

Run real event.

Target:

- 1,000–5,000 photos
- Multiple guests
- Real mobile devices
- Real venue Wi-Fi/5G
- Real lighting
- Real group photos

Measure:

- QR success
- Registration completion
- Selfie success
- Match accuracy
- No-match rate
- Search latency
- Upload latency
- Guest satisfaction
- Photographer satisfaction
- Failure rate

Fix critical problems before charging.

---

# 20. SECURITY

Implement:

- Password hashing
- Secure authentication
- Authorization
- Tenant isolation
- Event ownership
- Signed download URLs in production
- Rate limiting
- Upload validation
- File type validation
- Path traversal protection
- Secure secrets
- Audit logs
- HTTPS in production

Test explicitly for:

- Cross-event access
- Cross-photographer access
- Unauthorized downloads
- Expired QR
- Broken access control
- Malicious filenames
- Large-file abuse
- API brute force

---

# 21. PRIVACY

Face/selfie data is sensitive.

Implement:

- Explicit face-search consent
- Separate marketing consent
- Privacy notice
- Event-scoped search
- Defined retention
- Deletion workflow
- Guest data deletion
- Photographer event deletion
- Temporary selfie cleanup
- No face-based advertising profiling

Before public launch, review applicable Indian and international privacy requirements with qualified legal advice.

---

# 22. TESTING STRATEGY

Use:

## Unit tests

- Models
- Validation
- Hashing
- Permissions
- Matching utilities
- Storage utilities

## Integration tests

- API + database
- Upload + storage
- Queue + worker
- AI indexing
- Guest search

## E2E tests

Test complete:

```text
Photographer
 → Create Event
 → Upload Photos
 → Generate QR
 → Guest opens QR
 → Guest registers
 → Guest consents
 → Guest selfie
 → Matching
 → Gallery
 → Download
```

## Load tests

At minimum:

- 1,000 photos
- 5,000 photos
- 10,000 photos
- Concurrent guest searches
- Interrupted uploads
- Retry scenarios

---

# 23. BUG MANAGEMENT

Every bug must go into `BUGS.md`.

Severity:

```text
Critical
High
Medium
Low
```

Critical examples:

- Cross-event photo leak
- Cross-photographer data leak
- Incorrect private gallery exposure
- Authentication bypass
- Face data exposure

Critical/security bugs block release.

---

# 24. CHANGE MANAGEMENT

Every meaningful code/product change must update `CHANGELOG.md`.

Every task status must update `TASK_UPDATES.md`.

Every new task must be added to `TASKS.md`.

Do not leave documentation stale.

---

# 25. DEVELOPMENT LOOP

For every implementation task:

```text
Read requirements
 ↓
Inspect existing code
 ↓
Research if needed
 ↓
Plan
 ↓
Implement
 ↓
Run tests
 ↓
Inspect errors
 ↓
Fix
 ↓
Run tests again
 ↓
Update documentation
 ↓
Report result
```

Never mark a task complete just because code was written.

A task is complete only after relevant validation passes.

---

# 26. QUALITY GATE

Before marking any major phase complete, verify:

- Code works
- Tests pass
- No critical errors
- Security checks pass
- Data isolation passes
- Documentation updated
- Environment reproducible
- Failure paths tested
- Performance measured

---

# 27. PRODUCTION ROADMAP

Only after the local prototype and real pilot are successful:

### Production

- VPS
- Docker
- PostgreSQL
- Redis
- Object storage
- CDN
- HTTPS
- Monitoring
- Backups
- Error tracking
- Rate limiting

### Business

- Photographer plans
- Event credits
- Annual plans
- Usage metering
- Payments
- Invoices
- Support

### Advanced

- WhatsApp
- Favorites
- ZIP downloads
- Watermarking
- Analytics
- Team accounts
- CRM
- Photographer OS
- Direct camera integrations

---

# 28. RULE FOR AI CODING AGENTS

When this prompt is given to an AI coding agent:

1. First inspect the repository.
2. Read all existing Markdown documentation.
3. Do not overwrite existing work without understanding it.
4. Create a plan.
5. Execute tasks in logical order.
6. Use the technology decisions in `TECH_STACK.md`.
7. Keep the application runnable after each major phase.
8. Run tests after implementation.
9. Fix failures before proceeding.
10. Update `TASK_UPDATES.md`.
11. Update `CHANGELOG.md`.
12. Update `BUGS.md` when issues are discovered.
13. If a decision is uncertain, research it rather than guessing.
14. If a task is blocked, document the blocker and continue with independent tasks.
15. Never claim a task is complete without evidence.

---

# 29. DEFINITION OF DONE

A feature is DONE only if:

- Implementation exists
- Relevant tests exist
- Tests pass
- Error handling exists
- Security is considered
- Documentation is updated
- Task status is updated
- No known critical issue remains

---

# 30. FINAL TARGET

The final product should make this workflow feel extremely simple:

### Photographer

```text
Create Event
    ↓
Upload / Shoot
    ↓
Share QR
    ↓
Done
```

### Guest

```text
Scan QR
    ↓
Selfie
    ↓
Find My Moments
    ↓
Download
```

The technology should remain invisible to the user.

Build toward:

> **Get My Moment — Shoot. Upload. Let Them Find.**
