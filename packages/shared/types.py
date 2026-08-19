"""
Get My Moment - Shared Types & Schemas
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field


class BoundingBox(BaseModel):
    x: int
    y: int
    w: int
    h: int


class FaceDetectionResult(BaseModel):
    bbox: BoundingBox
    confidence: float
    landmarks: Optional[List[List[float]]] = None
    embedding: Optional[List[float]] = None
    crop_path: Optional[str] = None


class PhotoMetadata(BaseModel):
    sha256_hash: str
    file_size: int
    width: int
    height: int
    mime_type: str
    format: str


class StoragePathInfo(BaseModel):
    event_id: str
    file_id: str
    original_rel_path: str
    thumbnail_rel_path: str
    processed_rel_path: Optional[str] = None
    face_crop_rel_path: Optional[str] = None
