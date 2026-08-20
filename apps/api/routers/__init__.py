"""
API Routers Export
"""

from apps.api.routers.auth import router as auth_router
from apps.api.routers.events import router as events_router
from apps.api.routers.photos import router as photos_router
from apps.api.routers.guest import router as guest_router
from apps.api.routers.matching import router as matching_router
from apps.api.routers.telemetry import router as telemetry_router
from apps.api.routers.health import router as health_router
from apps.api.routers.crm import router as crm_router
from apps.api.routers.finance import router as finance_router
from apps.api.routers.operations import router as operations_router
from apps.api.routers.selection import router as selection_router
from apps.api.routers.calendar import router as calendar_router
from apps.api.routers.admin import router as admin_router
from apps.api.routers.crew import router as crew_router
from apps.api.routers.wireless import router as wireless_router
from apps.api.routers.subscription import router as subscription_router
from apps.api.routers.client_billing import router as client_billing_router
from apps.api.routers.folders import router as folders_router
from apps.api.routers.contact import router as contact_router
from apps.api.routers import chunked_uploads

__all__ = [
    "auth_router",
    "events_router",
    "folders_router",
    "photos_router",
    "guest_router",
    "matching_router",
    "telemetry_router",
    "health_router",
    "crm_router",
    "finance_router",
    "operations_router",
    "selection_router",
    "calendar_router",
    "admin_router",
    "crew_router",
    "wireless_router",
    "subscription_router",
    "client_billing_router",
    "contact_router",
    "chunked_uploads",
]
