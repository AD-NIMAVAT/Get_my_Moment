"""
Photo Schemas
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class PhotoResponse(BaseModel):
    id: str
    event_id: str
    original_file_name: str
    sha256_hash: str
    file_size: int
    width: Optional[int] = None
    height: Optional[int] = None
    mime_type: str
    status: str
    error_message: Optional[str] = None
    faces_detected_count: int = 0
    thumbnail_url: Optional[str] = None
    download_url: Optional[str] = None
    is_guest_uploaded: bool = False
    uploaded_by_guest_name: Optional[str] = None
    uploaded_by_guest_phone: Optional[str] = None
    folder_id: Optional[str] = None
    folder_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PhotoBatchUploadResponse(BaseModel):
    total_received: int
    uploaded_count: int
    duplicates_count: int
    failed_count: int
    photos: List[PhotoResponse]
