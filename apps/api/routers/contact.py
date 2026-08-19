"""
Contact Us & In-App Studio Support Ticket Router
"""

import uuid
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from apps.api.database import get_db
from apps.api.models import Photographer
from apps.api.auth import get_current_photographer
from apps.api.schemas.contact import (
    PublicContactRequest,
    PhotographerSupportTicketRequest,
    ContactResponse,
)

logger = logging.getLogger("getmymoment")
router = APIRouter(prefix="/contact", tags=["Contact & Support"])


@router.post("/submit", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
def submit_public_contact(
    req: PublicContactRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Public Contact Form Endpoint.
    Accepts customer, visitor, or photographer general inquiries.
    """
    ticket_id = f"INQ-{uuid.uuid4().hex[:8].upper()}"
    client_ip = request.client.host if request.client else "unknown"

    logger.info(
        f"[CONTACT INQUIRY] ID={ticket_id} | Name={req.name} | Email={req.email} | "
        f"Phone={req.phone} | Studio={req.studio_name} | Category={req.category} | "
        f"Subject={req.subject} | IP={client_ip}"
    )

    return ContactResponse(
        success=True,
        ticket_id=ticket_id,
        message=f"Thank you, {req.name}! Your inquiry (Reference: {ticket_id}) has been received. Our team will contact you within 2-4 business hours.",
        created_at=datetime.utcnow(),
    )


@router.post("/photographer-ticket", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
def submit_photographer_support_ticket(
    req: PhotographerSupportTicketRequest,
    photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """
    In-App Studio Help & Issue Desk Endpoint.
    Directly links to the authenticated studio with plan and tier priority.
    """
    ticket_id = f"GMM-TKT-{uuid.uuid4().hex[:8].upper()}"
    
    logger.info(
        f"[STUDIO SUPPORT TICKET] ID={ticket_id} | Studio={photographer.studio_name} "
        f"(ID={photographer.id}) | Plan={photographer.subscription_plan} | "
        f"Category={req.category} | Urgency={req.urgency} | Subject={req.subject} | "
        f"EventRef={req.event_reference_id}"
    )

    return ContactResponse(
        success=True,
        ticket_id=ticket_id,
        message=f"Support Ticket #{ticket_id} logged for {photographer.studio_name}. Priority Level: {req.urgency}. Our engineering team is reviewing your report.",
        created_at=datetime.utcnow(),
    )
