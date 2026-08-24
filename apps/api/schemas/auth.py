"""
Authentication, Studio Profile & Subscription Schemas
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class PhotographerSignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password with minimum 8 characters")
    studio_name: str = Field(..., min_length=2, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    city: Optional[str] = Field(None, max_length=255)
    state: Optional[str] = Field(None, max_length=255)
    instagram_handle: Optional[str] = Field(None, max_length=255)
    portfolio_url: Optional[str] = Field(None, max_length=500)
    years_of_experience: Optional[str] = Field(None, max_length=64)
    specializations: Optional[str] = Field(None, max_length=500)
    gst_number: Optional[str] = Field(None, max_length=64)


class StudioVerificationRequest(BaseModel):
    city: str = Field(..., min_length=2, max_length=255)
    state: Optional[str] = Field(None, max_length=255)
    instagram_handle: Optional[str] = Field(None, max_length=255)
    portfolio_url: Optional[str] = Field(None, max_length=500)
    years_of_experience: str = Field(..., max_length=64)
    specializations: str = Field(..., max_length=500)
    gst_number: Optional[str] = Field(None, max_length=64)


class PhotographerProfileUpdateRequest(BaseModel):
    studio_name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    city: Optional[str] = Field(None, max_length=255)
    state: Optional[str] = Field(None, max_length=255)
    instagram_handle: Optional[str] = Field(None, max_length=255)
    portfolio_url: Optional[str] = Field(None, max_length=500)
    years_of_experience: Optional[str] = Field(None, max_length=64)
    specializations: Optional[str] = Field(None, max_length=500)
    gst_number: Optional[str] = Field(None, max_length=64)


class PlanUpgradeRequest(BaseModel):
    plan_tier: str = Field(..., description="FREE_TRIAL, SOLO_PRO, STUDIO_PRO, STUDIO_OS, ENTERPRISE_VIP")


class PhotographerLoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    photographer_id: str
    email: str
    studio_name: str
    is_verified: bool = False
    verification_status: str = "PENDING_REVIEW"
    subscription_plan: str = "SOLO_PRO"


class PhotographerResponse(BaseModel):
    id: str
    email: str
    studio_name: str
    phone: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    instagram_handle: Optional[str] = None
    portfolio_url: Optional[str] = None
    years_of_experience: Optional[str] = None
    specializations: Optional[str] = None
    gst_number: Optional[str] = None
    is_active: bool
    is_verified: bool
    verification_status: str = "PENDING_REVIEW"
    subscription_plan: str = "SOLO_PRO"
    subscription_status: str = "ACTIVE"
    subscription_valid_until: Optional[datetime] = None
    max_storage_gb: int = 100
    max_events_per_month: int = 10
    logo_url: Optional[str] = None
    signature_url: Optional[str] = None
    digital_stamp_url: Optional[str] = None
    watermark_text: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PhotographerProfileDetailResponse(BaseModel):
    id: str
    email: str
    studio_name: str
    phone: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    instagram_handle: Optional[str] = None
    portfolio_url: Optional[str] = None
    years_of_experience: Optional[str] = None
    specializations: Optional[str] = None
    gst_number: Optional[str] = None
    is_active: bool
    is_verified: bool
    verification_status: str
    verification_notes: Optional[str] = None
    verification_submitted_at: Optional[datetime] = None
    
    # Studio Branding & Client Signatures
    logo_url: Optional[str] = None
    signature_url: Optional[str] = None
    digital_stamp_url: Optional[str] = None
    watermark_text: Optional[str] = None
    created_at: datetime
    
    # Subscription & Quotas
    subscription_plan: str
    subscription_status: str
    subscription_valid_until: Optional[datetime] = None
    max_storage_gb: int
    max_events_per_month: int
    
    # Real-time Live Usage Metrics
    total_events: int
    total_photos: int
    storage_used_mb: float
    storage_used_gb: float
    monthly_events_used: int


class PhotographerBrandingUpdateRequest(BaseModel):
    watermark_text: Optional[str] = Field(None, max_length=255)
    logo_url: Optional[str] = None
    signature_url: Optional[str] = None
    digital_stamp_url: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, description="Current photographer password")
    new_password: str = Field(..., min_length=8, description="New password with minimum 8 characters")


class AdminResetPasswordRequest(BaseModel):
    new_password: Optional[str] = Field(None, min_length=8, description="Optional explicit new password. If omitted, a secure temporary password will be generated.")


class AdminResetPasswordResponse(BaseModel):
    message: str
    photographer_id: str
    email: str
    temporary_password: Optional[str] = None

