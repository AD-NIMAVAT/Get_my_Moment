# Get My Moment — Current Repository Map

**Generated Date:** 2026-08-23  
**Target Environment:** Production Live on AWS EC2 (16.170.81.162)  
**Domain:** https://getmymoment.fun / https://www.getmymoment.fun  

---

## 1. PROJECT STRUCTURE OVERVIEW

`	ext
Get_my_Moment/
├── apps/
│   ├── api/                     # FastAPI Backend (Python 3.11, SQLAlchemy, Uvicorn)
│   │   ├── Dockerfile
│   │   ├── requirements.txt
│   │   ├── database.py          # PostgreSQL engine & session setup
│   │   ├── main.py              # Application entrypoint & security middleware
│   │   ├── models_ai/           # Pre-trained ONNX models (YuNet, SFace)
│   │   │   ├── face_detection_yunet_2023mar.onnx
│   │   │   └── face_recognition_sface_2021dec.onnx
│   │   ├── models/              # 18 SQLAlchemy Model Files (38 Tables)
│   │   │   ├── admin.py
│   │   │   ├── audit_log.py
│   │   │   ├── calendar.py
│   │   │   ├── consent.py
│   │   │   ├── crm.py
│   │   │   ├── event.py
│   │   │   ├── face.py
│   │   │   ├── finance.py
│   │   │   ├── folder.py
│   │   │   ├── guest.py
│   │   │   ├── guest_search.py
│   │   │   ├── operations.py
│   │   │   ├── photo.py
│   │   │   ├── photographer.py
│   │   │   ├── platform_settings.py
│   │   │   ├── storage_reservation.py
│   │   │   ├── subscription.py
│   │   │   └── upload_session.py
│   │   ├── routers/             # 20 API Router Files (65+ Endpoints)
│   │   │   ├── admin.py
│   │   │   ├── auth.py
│   │   │   ├── calendar.py
│   │   │   ├── chunked_uploads.py
│   │   │   ├── client_billing.py
│   │   │   ├── contact.py
│   │   │   ├── crew.py
│   │   │   ├── crm.py
│   │   │   ├── events.py
│   │   │   ├── finance.py
│   │   │   ├── folders.py
│   │   │   ├── guest.py
│   │   │   ├── health.py
│   │   │   ├── matching.py
│   │   │   ├── operations.py
│   │   │   ├── photos.py
│   │   │   ├── selection.py
│   │   │   ├── subscription.py
│   │   │   ├── telemetry.py
│   │   │   └── wireless.py
│   │   └── services/            # 12 Business & Infrastructure Services
│   │       ├── ai_service.py
│   │       ├── client_invoice_service.py
│   │       ├── legacy_migration.py
│   │       ├── otp_service.py
│   │       ├── payment_gateway.py
│   │       ├── qr_service.py
│   │       ├── quota_engine.py
│   │       ├── s3_storage.py
│   │       ├── storage.py
│   │       ├── subscription_service.py
│   │       ├── tax_engine.py
│   │       └── wireless_ingest.py
│   └── web/                     # Next.js 14 Frontend (App Router, Tailwind CSS, TypeScript)
│       ├── Dockerfile
│       ├── package.json
│       ├── tsconfig.json
│       ├── tailwind.config.js
│       └── src/
│           ├── app/             # 13 Application Routes
│           │   ├── page.tsx (Landing)
│           │   ├── about/page.tsx
│           │   ├── contact/page.tsx
│           │   ├── login/page.tsx
│           │   ├── dashboard/page.tsx (Studio OS)
│           │   ├── dashboard/events/[id]/page.tsx (Event Media & Folders)
│           │   ├── dashboard/crm/page.tsx (CRM & Leads)
│           │   ├── dashboard/finance/page.tsx (Invoicing & GST)
│           │   ├── dashboard/calendar/page.tsx (Bookings)
│           │   ├── dashboard/profile/page.tsx (Settings)
│           │   ├── crew/login & dashboard/page.tsx (Crew Portal)
│           │   ├── admin/login & dashboard/page.tsx (SuperAdmin Vault)
│           │   ├── e/[token]/page.tsx (Guest Portal & Selfie Match)
│           │   ├── selection/[token]/page.tsx (Client Album Selection)
│           │   └── i/[token]/page.tsx (Client Invoice View)
│           └── components/      # UI, Modals, Camera Connect, Layouts
├── workers/                     # Celery AI Worker
│   └── ai_worker/
│       ├── Dockerfile
│       ├── requirements.txt
│       └── worker.py            # Asynchronous face detection & vector indexing
├── scripts/                     # QA Validation & Utility Scripts
│   ├── qa_master_test_suite.py
│   ├── qa_client_billing_test_suite.py
│   ├── qa_subscription_test_suite.py
│   ├── qa_gateway_settings_test.py
│   └── qa_concurrency_and_stress.py
├── tests/                       # 72 Pytest Scenarios (Security, Tenancy, Chaos, Benchmarks)
├── docker-compose.prod.yml      # Production Multi-Container Orchestration
└── docs/ai/                     # Master AI Documentation & Runbooks
`

---

## 2. COMPONENT INVENTORY & VERIFICATION

| Area | Component | Source Path | Live Status |
| :--- | :--- | :--- | :---: |
| **Frontend** | Next.js 14 App Router | pps/web/ | **VERIFIED_EXISTING** |
| **Backend** | FastAPI REST Server | pps/api/ | **VERIFIED_EXISTING** |
| **Worker** | Celery AI Pipeline | workers/ai_worker/ | **VERIFIED_EXISTING** |
| **Database** | PostgreSQL 16 + pgvector | Docker getmymoment_prod_postgres | **VERIFIED_EXISTING** |
| **Cache/Queue** | Redis 7 Queue | Docker getmymoment_prod_redis | **VERIFIED_EXISTING** |
| **Camera Ingest** | pyftpdlib FTP Server | pps/api/services/wireless_ingest.py | **VERIFIED_EXISTING** |
| **AI Models** | OpenCV YuNet + SFace | pps/api/models_ai/ | **VERIFIED_EXISTING** |
| **Web Server** | Nginx Reverse Proxy + SSL | Host /etc/nginx/ | **VERIFIED_EXISTING** |
