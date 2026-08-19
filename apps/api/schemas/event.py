"""
Event Schemas
"""

from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from packages.shared.constants import EventStatus


class EventCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    event_date: Optional[datetime] = None
    allow_downloads: bool = True
    allow_guest_uploads: bool = True
    require_otp: bool = False
    settings: Dict[str, Any] = Field(default_factory=dict)


class EventUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    event_date: Optional[datetime] = None
    status: Optional[EventStatus] = None
    allow_downloads: Optional[bool] = None
    allow_guest_uploads: Optional[bool] = None
    require_otp: Optional[bool] = None
    settings: Optional[Dict[str, Any]] = None


class EventResponse(BaseModel):
    id: str
    photographer_id: str
    name: str
    slug: str
    access_token: str
    event_date: Optional[datetime] = None
    cover_image_url: Optional[str] = None
    status: str
    expires_at: Optional[datetime] = None
    allow_downloads: bool
    allow_guest_uploads: bool = True
    require_otp: bool
    settings: Dict[str, Any]
    photo_count: int = 0
    guest_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PublicEventResponse(BaseModel):
    id: str
    name: str
    slug: str
    access_token: str
    event_date: Optional[datetime] = None
    cover_image_url: Optional[str] = None
    status: str
    allow_downloads: bool
    allow_guest_uploads: bool = True
    require_otp: bool
    studio_name: str
    studio_logo_url: Optional[str] = None
    studio_phone: Optional[str] = None
    photo_count: int = 0

    model_config = ConfigDict(from_attributes=True)
