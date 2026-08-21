# QA-001: GetMyMoment Project Architecture Document

## 1. System Overview
GetMyMoment is an AI-powered event photography delivery and studio management platform built for professional wedding photographers, studio crews, event guests, and clients.

```text
[ Physical Camera / FTP / Mobile / Web ]
                 ↓
[ FastAPI Backend (Python 3.11) + Uvicorn ]
    ├── Authentication: JWT Bearer + PBKDF2 Password Hashing
    ├── Storage: Local / Cloud File System with SHA-256 Dedup & UUID Paths
    ├── Database: SQLite (Dev/Test) / PostgreSQL (Production) + SQLAlchemy 2.0 ORM
    ├── AI Engine: InsightFace + MobileFaceNet (128-d Vector Cosine Search)
    └── Wireless Server: PyFtpdLib (TCP Port 2121)
                 ↓
[ Next.js 14 Web Frontend (TypeScript / React 18 / Tailwind CSS) ]
    ├── Public Landing & Features (`/`, `/about`, `/contact`)
    ├── Photographer Portal (`/dashboard`, `/events/[id]`, `/crm`, `/finance`, `/calendar`, `/profile`)
    ├── Guest Experience Portal (`/e/[token]`)
    ├── Client Selection & Proofing (`/selection/[token]`)
    ├── Crew Mobile Ingest (`/crew/login`, `/crew/dashboard`)
    └── Super Admin Governance (`/admin/login`, `/admin/dashboard`)
```

## 2. Technology Stack Manifest

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 14 (App Router) | High-performance React 18 SSR/SSG application |
| **Frontend Styling** | Tailwind CSS + Warm Neomorphic Theme | Luxury wedding aesthetics (`#F3F1EC`, `#FAF9F7`, `#E86A5B`) |
| **Backend Framework** | FastAPI 0.115+ / Starlette | High-throughput asynchronous REST API |
| **ORM & Database** | SQLAlchemy 2.0 / Alembic / SQLite / PostgreSQL | Robust ACID relational data models |
| **AI / Computer Vision** | InsightFace, MobileFaceNet, OpenCV, NumPy | Facial detection, 128-d vector embeddings & cosine matching |
| **File Storage** | StorageService (Local / Object Storage) | SHA-256 deduplicated, UUID-path safe image storage |
| **Wireless Ingest** | pyftpdlib FTP Server | Direct camera-to-cloud automated wireless ingest |
| **Testing Stack** | Pytest 9.1+, AnyIO, Next.js Compiler Build | Automated integration, security, and concurrency suites |
