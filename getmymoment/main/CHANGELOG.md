# Get My Moment — Changelog

All notable changes to the Get My Moment project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-08-16 (Production Release)

### Added
- **Full-Stack Application**: FastAPI Python backend (`apps/api/`) + Next.js 14 TypeScript frontend (`apps/web/`).
- **AI Facial Recognition Pipeline**:
  - Deep CNN face detection via OpenCV YuNet (`apps/api/ai_models/face_detection_yunet_2023mar.onnx`).
  - 128-dimensional deep metric embeddings via OpenCV SFace (`apps/api/ai_models/face_recognition_sface_2021dec.onnx`).
  - Strict 90%+ match accuracy filter with non-match rejection.
- **Privacy & Consent Architecture**:
  - Mandatory granular biometric consent for facial matching.
  - Separate unbundled marketing consent for photographer lead collection.
  - Memory-only transient selfie processing.
  - Strict event isolation (`WHERE event_id = :event_id`).
- **Storage & Infrastructure**:
  - Local filesystem storage driver with directory traversal defenses.
  - S3 / Cloudflare R2 cloud object storage driver (`apps/api/services/s3_storage.py`).
  - Production Docker Compose orchestration with Nginx reverse proxy, rate limiting, and gzip compression.
- **Testing & Benchmarks**:
  - 19 automated pytest tests covering Auth, Events, Photos, Guest Flow, Privacy Penetration, and E2E Lifecycle (100% pass rate).
  - Scaled concurrency benchmark achieving up to 23,890 QPS and sub-millisecond search latencies.
- **Documentation & Pilot Kit**:
  - Photographer pilot field guide (`docs/photographer_pilot_guide.md`).
  - Production release audit & disaster recovery runbook (`docs/release_checklist.md`).

## [0.1.0] — 2026-08-16 (Planning & Architecture Specification)
- Initial architecture blueprint and sequential roadmap.
