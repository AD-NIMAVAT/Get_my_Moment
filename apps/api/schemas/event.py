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
    closed_at: Optional[datetime] = None
    archived_at: Optional[datetime] = None


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
    closed_at: Optional[datetime] = None
    archived_at: Optional[datetime] = None
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


class EventHealthResponse(BaseModel):
    event_id: str
    event_name: str
    status: str
    pipeline_health: str
    photos_total: int
    photos_uploaded: int
    photos_processing: int
    photos_ready: int
    photos_failed: int
    queue_depth: Optional[int] = None
    queue_metrics_unavailable: bool = False
    oldest_queue_age_seconds: Optional[int] = None
    avg_processing_duration_ms: Optional[int] = None
    p95_processing_duration_ms: Optional[int] = None
    avg_ai_inference_ms: Optional[int] = None
    last_photo_received_at: Optional[datetime] = None
    last_guest_ready_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
