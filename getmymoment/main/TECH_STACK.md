# Get My Moment — Tech Stack

## Core Architecture

```text
Next.js (Frontend / PWA)
   │
   ▼
FastAPI (REST API)
   │
   ├──► PostgreSQL + pgvector (Relational Data & 128-d Vector Index)
   ├──► Redis (Message Broker & Cache)
   │      │
   │      ▼
   │    Celery Background Workers (Non-Blocking Ingestion & AI Pipeline)
   │      ├──► Thumbnails & SHA-256 Hashing
   │      ├──► Face Detection (YuNet / ONNX)
   │      └──► Face Embedding (SFace / ArcFace ONNX)
   │
   └──► StorageService Abstraction
          ├──► LocalStorage (Local Prototype)
          └──► S3 / Cloudflare R2 (Production Object Storage)
```

## 1. Frontend
- **Framework**: Next.js 14+ (React 18+, TypeScript)
- **Styling**: Tailwind CSS / Vanilla CSS
- **UX/Design**: Mobile-first, responsive, PWA-ready architecture for guest workflow and photographer studio.
- **Key Modules**: HTML5 Camera API (`getUserMedia`), QR Code Scanner/Viewer, Canvas-based image manipulation.

## 2. Backend
- **Framework**: FastAPI (Python 3.10+)
- **ORM / Migrations**: SQLAlchemy 2.0+ & Alembic
- **Validation & Settings**: Pydantic v2 & Pydantic-Settings
- **Security**: JWT (python-jose), Passlib (bcrypt), strict CORS, rate limiting.
- **Rule**: No Bun backend runtime; FastAPI + Python is the standard.

## 3. Database & Vector Search
- **Primary Database**: PostgreSQL 16
- **Vector Extension**: `pgvector`
- **Vector Representation**: 128-dimensional L2-normalized float arrays (`vector(128)`).
- **Indexing**: HNSW / IVFFlat cosine distance indexing (`vector_cosine_ops`).
- **Performance Evaluation**: HNSW/pgvector performance must be benchmarked under the actual expected dataset and hardware configurations (no theoretical fixed `<5ms` guarantees).
- **Partitioning / Scoping**: All vector queries strictly scoped by `WHERE event_id = :event_id`.
- **Rule**: No MongoDB. PostgreSQL satisfies relational, JSONB, and vector requirements.

## 4. Asynchronous Queue & Workers
- **Message Broker**: Redis 7+
- **Task Queue**: Celery
- **Worker Pipeline**:
  - `generate_thumbnails`: Web-optimized 400px and 1200px image generation.
  - `detect_faces`: Asynchronous face bounding box and landmark extraction.
  - `generate_embeddings`: Asynchronous vector calculation and database insertion.
  - `cleanup_expired`: Routine maintenance of transient selfies and expired event data.
- **Rule**: Long-running photo and AI processing must never block normal HTTP requests.

## 5. AI & Image Processing
- **Image Manipulation**: Pillow & OpenCV (Headless)
- **Face Detection**: OpenCV YuNet (`libfacedetection` / ONNX)
- **Face Recognition / Embeddings**: OpenCV SFace / ArcFace ONNX (128-dim / 512-dim)
- **Runtime**: ONNX Runtime / OpenCV CPU inference (GPU-ready).
- **Licensing Audit**:
  - Separate code/library license (Apache 2.0 / BSD) from pretrained model weight license.
  - Current status: **REQUIRES FINAL COMMERCIAL LICENSE VERIFICATION** for exact model weight files.
  - Release-blocking rule: Commercial deployment cannot use an AI model until its exact model/weight licensing has been verified for the intended commercial use.
- **Ground-Truth Evaluation**: Model threshold derived mathematically from ROC curve on a controlled multi-condition test dataset (Person A, B, C under various lighting, angles, group photos, glasses, blur, and negative comparisons).

## 6. Storage Engine
- **Abstraction**: `StorageService` interface with `LocalStorage` driver and future `ObjectStorage` (S3 / Cloudflare R2) driver.
- **Structure**:
  ```text
  storage/events/<event_id>/
  ├── originals/      # Immutable original uploads
  ├── thumbnails/     # Web-optimized thumbnails
  ├── processed/      # Watermarked / preview copies
  ├── faces/          # Optional face debug crops (FACE_DEBUG_CROPS_ENABLED=false)
  └── temp/           # Transient selfie processing buffer
  ```
- **Security**: UUIDv4 internal naming, magic byte MIME validation, path traversal defenses, tenant isolation.

## 7. Authentication & OTP Abstraction
- **Photographers**: Email + Password with bcrypt hashing and JWT bearer tokens.
- **Guests**: Name + Mobile registration with pluggable OTP abstraction:
  - Local MVP: Mock OTP provider / development verification mode.
  - Production: SMS provider (e.g. MSG91) with DLT-aligned templates.

## 8. Containers & Local Tooling
- **Containerization**: Docker Compose (`frontend`, `backend`, `postgres`, `redis`, `worker`).
- **Live Ingestion Tool**: Windows Folder-Watch uploader (`watchdog` + `requests` with retry queue).
