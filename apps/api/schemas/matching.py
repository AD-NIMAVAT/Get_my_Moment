"""
Matching and Selfie Search Schemas
"""

from typing import List, Optional, Dict
from datetime import datetime
from pydantic import BaseModel
from apps.api.schemas.photo import PhotoResponse


class SelfieSearchResponse(BaseModel):
    search_id: str
    event_id: str
    guest_id: str
    matched_count: int
    matched_photos: List[PhotoResponse]
    similarity_scores: Dict[str, float]
    search_latency_ms: float
    message: str


class OTPVerificationRequest(BaseModel):
    guest_id: str
    otp_code: str


class OTPVerificationResponse(BaseModel):
    guest_id: str
    verified: bool
    message: str
