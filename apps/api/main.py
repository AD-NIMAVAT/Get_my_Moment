"""
Get My Moment - Main FastAPI Application
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from apps.api.config import settings
from apps.api.database import init_db
from apps.api.routers import (
    auth_router,
    events_router,
    photos_router,
    guest_router,
    matching_router,
    telemetry_router,
    health_router,
    crm_router,
    finance_router,
    operations_router,
    selection_router,
    calendar_router,
    admin_router,
    crew_router,
    wireless_router,
    subscription_router,
)

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("getmymoment")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for startup and shutdown routines."""
    try:
        init_db()
    except Exception as db_err:
        logger.warning(f"Database initialization warning (will retry on demand): {db_err}")

    def delayed_start_wireless():
        try:
            import time
            time.sleep(2.0)
            from apps.api.services.wireless_ingest import wireless_server
            wireless_server.start()
        except Exception as e:
            logger.warning(f"Could not auto-start wireless camera server: {e}")

    import threading
    threading.Thread(target=delayed_start_wireless, daemon=True).start()

    logger.info("Get My Moment backend started successfully.")
    yield
    logger.info("Shutting down Get My Moment backend...")
    try:
        from apps.api.services.wireless_ingest import wireless_server
        wireless_server.stop()
    except Exception:
        pass


app = FastAPI(
    title="Get My Moment API",
    description="AI-Powered Event Photo Delivery Platform for Photographers",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.ENVIRONMENT != "production" else settings.BACKEND_CORS_ORIGINS,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please try again later."}
    )

# OWASP Recommended Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(self), microphone=(), geolocation=()"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

from apps.api.routers import (
    health_router,
    auth_router,
    events_router,
    photos_router,
    guest_router,
    matching_router,
    telemetry_router,
    crm_router,
    finance_router,
    operations_router,
    selection_router,
    calendar_router,
    admin_router,
    crew_router,
    wireless_router,
    subscription_router,
    client_billing_router,
    contact_router,
    chunked_uploads,
)

# Include Routers
app.include_router(health_router, prefix=settings.API_V1_PREFIX)
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(events_router, prefix=settings.API_V1_PREFIX)
app.include_router(photos_router, prefix=settings.API_V1_PREFIX)
app.include_router(chunked_uploads.router, prefix=settings.API_V1_PREFIX)
app.include_router(guest_router, prefix=settings.API_V1_PREFIX)
app.include_router(matching_router, prefix=settings.API_V1_PREFIX)
app.include_router(telemetry_router, prefix=settings.API_V1_PREFIX)
app.include_router(crm_router, prefix=settings.API_V1_PREFIX)
app.include_router(finance_router, prefix=settings.API_V1_PREFIX)
app.include_router(operations_router, prefix=settings.API_V1_PREFIX)
app.include_router(selection_router, prefix=settings.API_V1_PREFIX)
app.include_router(calendar_router, prefix=settings.API_V1_PREFIX)
app.include_router(admin_router, prefix=settings.API_V1_PREFIX)
app.include_router(crew_router, prefix=settings.API_V1_PREFIX)
app.include_router(wireless_router, prefix=settings.API_V1_PREFIX)
app.include_router(subscription_router, prefix=settings.API_V1_PREFIX)
app.include_router(client_billing_router, prefix=settings.API_V1_PREFIX)
app.include_router(contact_router, prefix=settings.API_V1_PREFIX)


@app.get("/")
def root():
    return {
        "brand": "Get My Moment",
        "tagline": "Shoot. Upload. Let Them Find.",
        "version": "0.1.0",
        "docs": "/docs",
    }
