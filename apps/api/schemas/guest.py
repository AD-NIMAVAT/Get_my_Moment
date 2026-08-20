"""
Guest and Consent Schemas
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class GuestRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    mobile: str = Field(..., min_length=7, max_length=32)
    otp_code: Optional[str] = None


class GuestRegisterResponse(BaseModel):
    guest_id: str
    event_id: str
    name: str
    mobile: str
    otp_verified: bool
    requires_otp: bool = False
    created_at: datetime


class ConsentRequest(BaseModel):
    guest_id: str
    face_search_consent: bool = Field(..., description="Explicit consent for event facial similarity search")
    marketing_consent: bool = Field(False, description="Separate optional consent for studio communications")
    consent_version: str = "1.0"


class ConsentResponse(BaseModel):
    consent_id: str
    guest_id: str
    face_search_consent: bool
    marketing_consent: bool
    consent_version: str
    consented_at: datetime


class GuestLoginRequest(BaseModel):
    mobile: str = Field(..., min_length=7, max_length=32)
    otp_code: Optional[str] = None


class GuestLoginResponse(BaseModel):
    session_token: str
    guest_id: str
    event_id: str
    name: str
    mobile_masked: str
    otp_verified: bool
    requires_otp: bool = False
    has_consent: bool = False
    has_matched_photos: bool = False
    match_count: int = 0
    expires_at: datetime


class GuestSessionValidateResponse(BaseModel):
    is_valid: bool
    guest_id: str
    event_id: str
    name: str
    mobile_masked: str
    has_consent: bool
    has_matched_photos: bool
    match_count: int = 0
    expires_at: datetime

