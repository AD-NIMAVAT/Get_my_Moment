"""
Get My Moment - API Schemas
"""

from apps.api.schemas.auth import (
    PhotographerSignupRequest,
    PhotographerLoginRequest,
    TokenResponse,
    PhotographerResponse,
)
from apps.api.schemas.event import (
    EventCreateRequest,
    EventUpdateRequest,
    EventResponse,
    PublicEventResponse,
)
from apps.api.schemas.photo import (
    PhotoResponse,
    PhotoBatchUploadResponse,
)
from apps.api.schemas.guest import (
    GuestRegisterRequest,
    GuestRegisterResponse,
    ConsentRequest,
    ConsentResponse,
)
from apps.api.schemas.matching import (
    SelfieSearchResponse,
    OTPVerificationRequest,
    OTPVerificationResponse,
)

from apps.api.schemas.camera import (
    CreateCameraRequest,
    UpdateCameraRequest,
    CameraResponse,
    CameraCreatedResponse,
)

__all__ = [
    "PhotographerSignupRequest",
    "PhotographerLoginRequest",
    "TokenResponse",
    "PhotographerResponse",
    "EventCreateRequest",
    "EventUpdateRequest",
    "EventResponse",
    "PublicEventResponse",
    "PhotoResponse",
    "PhotoBatchUploadResponse",
    "GuestRegisterRequest",
    "GuestRegisterResponse",
    "ConsentRequest",
    "ConsentResponse",
    "SelfieSearchResponse",
    "OTPVerificationRequest",
    "OTPVerificationResponse",
    "CreateCameraRequest",
    "UpdateCameraRequest",
    "CameraResponse",
    "CameraCreatedResponse",
]
