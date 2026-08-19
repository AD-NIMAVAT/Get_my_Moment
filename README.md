# Get My Moment

**Tagline:** Shoot. Upload. Let Them Find.  
AI-Powered Event Photo Delivery Platform for Photographers.

## Monorepo Layout
```text
get-my-moment/
├── apps/
│   ├── api/             # FastAPI backend service
│   └── web/             # Next.js frontend application (Mobile-first PWA)
├── workers/
│   └── ai_worker/       # Celery background worker for AI & thumbnail pipeline
├── packages/
│   └── shared/          # Shared types, schemas, and utilities
├── tools/
│   └── uploader/        # Windows folder-watch auto-sync uploader
├── storage/             # Local event storage abstraction
│   └── events/<id>/     # Originals, thumbnails, processed, faces (debug), temp
├── tests/               # Unit, integration, AI benchmark, security & e2e tests
├── docker-compose.yml   # Multi-container local orchestration (Postgres+pgvector, Redis, API, Worker, Web)
├── .env.example         # Environment template
└── getmymoment/main/    # Comprehensive product & architecture documentation
```

## Quick Start (Docker)
```bash
# 1. Start all services
docker-compose up -d

# 2. View running containers
docker-compose ps

# 3. Access API and Web
# Web App: http://localhost:3000
# API Docs: http://localhost:8000/docs
```

## Documentation
See `getmymoment/main/` for:
- `REQUIREMENTS.md`
- `TECH_STACK.md`
- `TASKS.md`
- `UPDATE_PROMPT.md`
- `BUGS.md`
- `CHANGELOG.md`
