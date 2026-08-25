"""
Pydantic schemas for Camera Device management and Wi-Fi / FTP ingestion.
"""

from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class CreateCameraRequest(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=255, description="Display name / label for the camera")
    manufacturer: Optional[str] = Field(None, max_length=100, description="Camera manufacturer / brand")
    model: Optional[str] = Field(None, max_length=100, description="Camera model name")
    auto_approve: Optional[bool] = Field(False, description="Automatically approve this camera for immediate upload access")


class UpdateCameraRequest(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=255)
    manufacturer: Optional[str] = Field(None, max_length=100)
    model: Optional[str] = Field(None, max_length=100)


class CameraResponse(BaseModel):
    id: str
    event_id: str
    photographer_id: str
    display_name: str
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    ftp_username: str
    status: str
    first_seen_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None
    last_upload_at: Optional[datetime] = None
    last_source_ip: Optional[str] = None
    created_at: datetime
    approved_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CameraCreatedResponse(BaseModel):
    camera: CameraResponse
    credentials: Dict[str, Any]
