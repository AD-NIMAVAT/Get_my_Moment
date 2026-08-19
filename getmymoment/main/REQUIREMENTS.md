# Get My Moment — Requirements

## 1. Objective

Build a photographer-focused platform where event guests find only their own event photos through QR + selfie-based face matching.

## 2. Users

### Photographer
- Sign up/login
- Create events
- Upload/import photos
- Monitor background processing via Celery
- Generate QR
- Manage gallery settings
- View visitors/leads (with consent flags)
- View selection/download activity

### Guest
- Open event through QR/shared link (`/e/<token>`)
- Enter name and mobile
- Verify mobile when OTP is enabled (abstracted for local MVP; SMS provider for production)
- Accept explicit face-search consent (separate from marketing consent)
- Capture/upload selfie
- Receive matching photos strictly from the selected event
- View/download permitted photos

### Admin — future
- Manage photographers
- Plans & subscriptions
- Storage/AI usage monitoring
- Abuse review
- Platform configuration

## 3. Core Architecture & MVP Components

### Photographer
- Authentication (JWT + bcrypt)
- Event creation, expiry, and status management
- Photo upload/import with async background processing
- SHA-256 duplicate detection
- Web-optimized thumbnail generation
- Asynchronous processing status via Redis + Celery
- Event QR generation and printable sheets
- Gallery and download permission settings

### Guest
- Branded QR landing page
- Name + mobile registration
- Pluggable OTP verification module (mock mode in dev, SMS provider in prod)
- Granular consent handling (face-search opt-in distinct from marketing)
- Selfie capture/upload with single-face validation
- Event-only AI vector matching
- Private result gallery
- High-res photo download

### AI & Vector Pipeline
- Index event photos asynchronously (never blocking HTTP requests)
- Detect faces (OpenCV YuNet / ONNX)
- Generate 128-d L2-normalized embeddings (SFace / ArcFace ONNX)
- Store searchable face data in PostgreSQL + pgvector (`vector(128)`)
- Compare selfie strictly against the current event (`WHERE event_id = :event_id`)
- Return matching photo IDs based on mathematically derived similarity threshold
- No-match/retry selfie handling
- Commercial model weight licensing must be verified prior to commercial release

## 4. Storage

```text
storage/
└── events/
    └── <event_id>/
        ├── originals/      # Immutable original photos
        ├── thumbnails/     # Web-optimized thumbnails
        ├── processed/      # Watermarked / preview copies
        ├── faces/          # Optional face debug crops (FACE_DEBUG_CROPS_ENABLED=false default)
        └── temp/           # Transient selfie and ingestion processing
```

Rules:
- Never modify originals.
- Never expose filesystem paths publicly.
- Keep thumbnails separate.
- Every photo belongs to exactly one event.
- Use SHA-256 for duplicate detection.
- Face crops are optional and disabled by default (`FACE_DEBUG_CROPS_ENABLED=false`).
- Transient selfies in `temp/` are purged post-processing according to retention rules.

## 5. Guest Flow

```text
QR (/e/<token>)
 ↓
Event Welcome
 ↓
Name + Mobile
 ↓
OTP Verification (when enabled / pluggable)
 ↓
Face-search Consent
 ↓
Selfie (Front camera / single face)
 ↓
Event-only AI Search (pgvector)
 ↓
Private Matching Gallery
 ↓
View / Download
```

## 6. Privacy & Security

- Face search is strictly event-scoped (`WHERE event_id = :event_id`).
- No global/cross-event face search under any circumstance.
- Explicit face-search consent required before selfie capture.
- Marketing consent is separate, optional, and defaults to OFF.
- Defined selfie and embedding retention/deletion policies.
- No advertising profiling from face data.
- Strict event and photographer tenant access control.
- Never show the full event gallery as fallback upon no match.

## 7. AI Ground-Truth Acceptance Criteria

- **Controlled Ground-Truth Dataset**: Tested against diverse person profiles (Person A, B, C) under varied lighting, angles, group settings, glasses, blur, and negative comparisons.
- **Measured Accuracy**: Precision, Recall, FPR (<0.1% target), FNR, Top-K accuracy.
- **Threshold Optimization**: Cosine distance threshold derived mathematically from ROC curve (not guessed).
- **HNSW Performance**: Vector search performance benchmarked under realistic data volume and hardware configurations rather than fixed theoretical guarantees.
- **Commercial Licensing**: Exact model files/weights verified for commercial use.
- **Scale**: ~1,000 photos imported and indexed reliably via background worker.

## 8. Initial Out of Scope

- Native mobile apps (PWA-first approach)
- Global face search
- Payments/subscriptions
- WhatsApp automated campaigns
- Custom photographer domains
- Printed album ordering
- Direct camera proprietary SDK integrations
- Full Photographer OS
