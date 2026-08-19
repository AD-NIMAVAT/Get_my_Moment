"""
Guest Registration, Privacy Consent, and OTP Router
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from apps.api.database import get_db
from apps.api.models import Event, Guest, Consent, Photographer
from apps.api.auth import get_current_photographer
from apps.api.schemas.guest import (
    GuestRegisterRequest,
    GuestRegisterResponse,
    ConsentRequest,
    ConsentResponse,
)
from apps.api.schemas.matching import (
    OTPVerificationRequest,
    OTPVerificationResponse,
)
from apps.api.services.otp_service import otp_service
from packages.shared.constants import EventStatus

router = APIRouter(tags=["Guest Management"])


@router.post("/events/{event_id}/guests/register", response_model=GuestRegisterResponse, status_code=status.HTTP_201_CREATED)
def register_guest(
    event_id: str,
    request: GuestRegisterRequest,
    db: Session = Depends(get_db)
):
    """
    Register an event guest before selfie capture.
    If event requires OTP, triggers verification workflow.
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")
    if event.status != EventStatus.ACTIVE.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Event is not active.")

    # Check if guest already registered for this event with same mobile
    existing_guest = db.query(Guest).filter(
        Guest.event_id == event.id,
        Guest.mobile == request.mobile.strip()
    ).first()

    if existing_guest:
        guest = existing_guest
        guest.name = request.name.strip()
    else:
        guest = Guest(
            event_id=event.id,
            name=request.name.strip(),
            mobile=request.mobile.strip(),
            otp_verified=not event.require_otp,
        )
        db.add(guest)
        db.commit()
        db.refresh(guest)

    if event.require_otp and not guest.otp_verified:
        otp_service.send_otp(guest.mobile, event.name)
        return GuestRegisterResponse(
            guest_id=guest.id,
            event_id=guest.event_id,
            name=guest.name,
            mobile=guest.mobile,
            otp_verified=False,
            requires_otp=True,
            created_at=guest.created_at,
        )

    return GuestRegisterResponse(
        guest_id=guest.id,
        event_id=guest.event_id,
        name=guest.name,
        mobile=guest.mobile,
        otp_verified=guest.otp_verified,
        requires_otp=False,
        created_at=guest.created_at,
    )


@router.post("/guests/{guest_id}/otp/verify", response_model=OTPVerificationResponse)
def verify_guest_otp(
    guest_id: str,
    request: OTPVerificationRequest,
    db: Session = Depends(get_db)
):
    """Verify submitted OTP code for a registered guest."""
    guest = db.query(Guest).filter(Guest.id == guest_id).first()
    if not guest:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guest record not found.")

    is_valid = otp_service.verify_otp(guest.mobile, request.otp_code.strip())
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP code.")

    guest.otp_verified = True
    db.commit()

    return OTPVerificationResponse(
        guest_id=guest.id,
        verified=True,
        message="Mobile number successfully verified."
    )


@router.post("/guests/{guest_id}/consent", response_model=ConsentResponse, status_code=status.HTTP_201_CREATED)
def record_guest_consent(
    guest_id: str,
    consent_data: ConsentRequest,
    req: Request,
    db: Session = Depends(get_db)
):
    """
    Record explicit, separate privacy consent before face matching.
    face_search_consent is mandatory for AI matching; marketing_consent is strictly optional.
    """
    guest = db.query(Guest).filter(Guest.id == guest_id).first()
    if not guest:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guest record not found.")

    if not consent_data.face_search_consent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Face-search consent is required to process selfie and find your event photos."
        )

    existing_consent = db.query(Consent).filter(Consent.guest_id == guest.id).first()
    client_ip = req.client.host if req.client else None
    user_agent = req.headers.get("user-agent", "")

    if existing_consent:
        consent = existing_consent
        consent.face_search_consent = consent_data.face_search_consent
        consent.marketing_consent = consent_data.marketing_consent
        consent.consent_version = consent_data.consent_version
        consent.ip_address = client_ip
        consent.user_agent = user_agent
    else:
        consent = Consent(
            guest_id=guest.id,
            event_id=guest.event_id,
            face_search_consent=consent_data.face_search_consent,
            marketing_consent=consent_data.marketing_consent,
            consent_version=consent_data.consent_version,
            ip_address=client_ip,
            user_agent=user_agent,
        )
        db.add(consent)

    db.commit()
    db.refresh(consent)

    return ConsentResponse(
        consent_id=consent.id,
        guest_id=consent.guest_id,
        face_search_consent=consent.face_search_consent,
        marketing_consent=consent.marketing_consent,
        consent_version=consent.consent_version,
        consented_at=consent.consented_at,
    )


# Photographer Lead Review Endpoint
@router.get("/events/{event_id}/leads")
def get_event_leads(
    event_id: str,
    current_photographer: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """
    Photographer view of registered event visitors and marketing-consented leads.
    """
    event = db.query(Event).filter(Event.id == event_id, Event.photographer_id == current_photographer.id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    guests = db.query(Guest).filter(Guest.event_id == event_id).order_by(Guest.created_at.desc()).all()
    leads = []
    for g in guests:
        consent = g.consent
        leads.append({
            "guest_id": g.id,
            "name": g.name,
            "mobile": g.mobile,
            "otp_verified": g.otp_verified,
            "face_search_consent": consent.face_search_consent if consent else False,
            "marketing_consent": consent.marketing_consent if consent else False,
            "searches_count": len(g.searches),
            "registered_at": g.created_at,
        })
    return leads
