"""
Get My Moment - Contact & Support Ticket Schemas
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class PublicContactRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Full Name of the inquirer")
    email: EmailStr = Field(..., description="Email address for reply")
    phone: Optional[str] = Field(None, max_length=30, description="Mobile / WhatsApp number")
    studio_name: Optional[str] = Field(None, max_length=150, description="Photography studio or brand name")
    category: str = Field("GENERAL", description="Inquiry category: GENERAL, STUDIO_DEMO, PRICING, TECH_SUPPORT, PARTNERSHIP")
    subject: str = Field(..., min_length=3, max_length=200, description="Brief subject")
    message: str = Field(..., min_length=10, max_length=3000, description="Detailed message / query")


class PhotographerSupportTicketRequest(BaseModel):
    category: str = Field(..., description="UPLOAD_SYNC, AI_FACE_SEARCH, BILLING_GST, FEATURE_REQUEST, URGENT_SHOOT_HELP, OTHER")
    urgency: str = Field("NORMAL", description="NORMAL, HIGH, URGENT")
    subject: str = Field(..., min_length=3, max_length=200, description="Brief issue title")
    description: str = Field(..., min_length=10, max_length=3000, description="Steps to reproduce, error description, or request")
    event_reference_id: Optional[str] = Field(None, description="Optional Event ID or token involved in the issue")


class ContactResponse(BaseModel):
    success: bool
    ticket_id: str
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    support_phone: str = "+91 98765 43210"
    support_email: str = "support@getmymoment.in"
