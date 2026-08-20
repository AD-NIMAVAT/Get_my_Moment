import time
import base64
import hmac
import hashlib
from typing import List, Optional, Dict
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from apps.api.database import get_db
from apps.api.models import Event, Guest, Consent, Photographer, Photo, GuestSearch
from apps.api.auth import get_current_photographer
from apps.api.schemas.guest import (
    GuestRegisterRequest,
    GuestRegisterResponse,
    ConsentRequest,
    ConsentResponse,
    GuestLoginRequest,
    GuestLoginResponse,
    GuestSessionValidateResponse,
)
from apps.api.schemas.matching import (
    OTPVerificationRequest,
    OTPVerificationResponse,
    SelfieSearchResponse,
)
from apps.api.schemas.photo import PhotoResponse
from apps.api.services.otp_service import otp_service
from apps.api.config import settings
from packages.shared.constants import EventStatus, PhotoStatus

router = APIRouter(tags=["Guest Management"])


def mask_mobile(mobile: str) -> str:
    cleaned = mobile.strip()
    if len(cleaned) <= 4:
        return cleaned
    return f"{cleaned[:3]}****{cleaned[-4:]}" if len(cleaned) >= 10 else f"{cleaned[:2]}***{cleaned[-2:]}"


def normalize_phone(raw: str) -> tuple[str, str]:
    digits = "".join(c for c in raw if c.isdigit())
    last_10 = digits[-10:] if len(digits) >= 10 else digits
    standard_e164 = f"+91{last_10}" if len(last_10) == 10 else (f"+{digits}" if digits else raw)
    return standard_e164, last_10


def generate_guest_session_token(guest_id: str, event_id: str) -> str:
    secret = getattr(settings, "SECRET_KEY", "gmm_guest_session_master_key")
    payload = f"{guest_id}:{event_id}:{int(time.time())}"
    sig = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()[:24]
    return base64.urlsafe_b64encode(f"{payload}:{sig}".encode()).decode()


@router.post("/events/{event_id}/guests/register", response_model=GuestRegisterResponse, status_code=status.HTTP_201_CREATED)
def register_guest(
    event_id: str,
    request: GuestRegisterRequest,
    db: Session = Depends(get_db)
):
    """
    Register an event guest before selfie capture.
    Supports both event ID and access token for seamless mobile QR resolution.
    """
    event = db.query(Event).filter(
        (Event.id == event_id) | (Event.access_token == event_id)
    ).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")
    if event.status != EventStatus.ACTIVE.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Event is not active.")

    standard_mobile, last_10 = normalize_phone(request.mobile)

    # Check if guest already registered for this event with same mobile
    existing_guest = db.query(Guest).filter(
        Guest.event_id == event.id,
        (Guest.mobile == request.mobile.strip()) |
        (Guest.mobile == standard_mobile) |
        (Guest.mobile == last_10) |
        (Guest.mobile.like(f"%{last_10}"))
    ).first()

    if existing_guest:
        guest = existing_guest
        guest.name = request.name.strip()
        guest.mobile = standard_mobile
    else:
        guest = Guest(
            event_id=event.id,
            name=request.name.strip(),
            mobile=standard_mobile,
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


@router.post("/events/{event_id}/guests/login", response_model=GuestLoginResponse)
def login_guest(
    event_id: str,
    request: GuestLoginRequest,
    db: Session = Depends(get_db)
):
    """
    Returning Guest Login by Mobile Number.
    Validates event existence and looks up existing guest registration.
    Issues a signed guest session token and returns match status for instant restoration.
    """
    event = db.query(Event).filter(
        (Event.id == event_id) | (Event.access_token == event_id)
    ).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")
    if event.status != EventStatus.ACTIVE.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Event is not active.")

    standard_mobile, last_10 = normalize_phone(request.mobile)

    guest = db.query(Guest).filter(
        Guest.event_id == event.id,
        (Guest.mobile == request.mobile.strip()) |
        (Guest.mobile == standard_mobile) |
        (Guest.mobile == last_10) |
        (Guest.mobile.like(f"%{last_10}"))
    ).first()

    if not guest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No guest registration found with this mobile number for this event. Please sign up."
        )

    # Check OTP requirement
    if event.require_otp and not guest.otp_verified:
        otp_service.send_otp(guest.mobile, event.name)
        session_token = generate_guest_session_token(guest.id, event.id)
        expires_at = datetime.utcnow() + timedelta(days=7)
        return GuestLoginResponse(
            session_token=session_token,
            guest_id=guest.id,
            event_id=guest.event_id,
            name=guest.name,
            mobile_masked=mask_mobile(guest.mobile),
            otp_verified=False,
            requires_otp=True,
            has_consent=bool(guest.consent and guest.consent.face_search_consent),
            has_matched_photos=False,
            match_count=0,
            expires_at=expires_at,
        )

    # Fetch latest search
    latest_search = db.query(GuestSearch).filter(
        GuestSearch.guest_id == guest.id,
        GuestSearch.event_id == event.id
    ).order_by(GuestSearch.created_at.desc()).first()

    match_count = latest_search.matched_photo_count if latest_search else 0
    has_matched = bool(latest_search and match_count > 0)
    has_consent = bool(guest.consent and guest.consent.face_search_consent)

    session_token = generate_guest_session_token(guest.id, event.id)
    expires_at = datetime.utcnow() + timedelta(days=7)

    return GuestLoginResponse(
        session_token=session_token,
        guest_id=guest.id,
        event_id=guest.event_id,
        name=guest.name,
        mobile_masked=mask_mobile(guest.mobile),
        otp_verified=True,
        requires_otp=False,
        has_consent=has_consent,
        has_matched_photos=has_matched,
        match_count=match_count,
        expires_at=expires_at,
    )


@router.get("/events/{event_id}/guests/{guest_id}/session/validate", response_model=GuestSessionValidateResponse)
def validate_guest_session(
    event_id: str,
    guest_id: str,
    db: Session = Depends(get_db)
):
    """
    Server-side Source-of-Truth Session Validation.
    Validates that guest exists, belongs strictly to event_id, and returns live status.
    """
    event = db.query(Event).filter(
        (Event.id == event_id) | (Event.access_token == event_id)
    ).first()
    if not event or event.status != EventStatus.ACTIVE.value:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event inactive or not found.")

    guest = db.query(Guest).filter(Guest.id == guest_id, Guest.event_id == event.id).first()
    if not guest:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guest session invalid or expired.")

    latest_search = db.query(GuestSearch).filter(
        GuestSearch.guest_id == guest.id,
        GuestSearch.event_id == event.id
    ).order_by(GuestSearch.created_at.desc()).first()

    match_count = latest_search.matched_photo_count if latest_search else 0
    has_matched = bool(latest_search and match_count > 0)
    has_consent = bool(guest.consent and guest.consent.face_search_consent)
    expires_at = datetime.utcnow() + timedelta(days=7)

    return GuestSessionValidateResponse(
        is_valid=True,
        guest_id=guest.id,
        event_id=guest.event_id,
        name=guest.name,
        mobile_masked=mask_mobile(guest.mobile),
        has_consent=has_consent,
        has_matched_photos=has_matched,
        match_count=match_count,
        expires_at=expires_at,
    )


@router.get("/events/{event_id}/guests/{guest_id}/cached-match")
def get_cached_guest_match(
    event_id: str,
    guest_id: str,
    db: Session = Depends(get_db)
):
    """
    Retrieve cached AI facial match results for a valid guest session.
    Strictly event-scoped and guest-scoped.
    """
    event = db.query(Event).filter(
        (Event.id == event_id) | (Event.access_token == event_id)
    ).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    guest = db.query(Guest).filter(Guest.id == guest_id, Guest.event_id == event.id).first()
    if not guest:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guest record not found.")

    latest_search = db.query(GuestSearch).filter(
        GuestSearch.guest_id == guest.id,
        GuestSearch.event_id == event.id
    ).order_by(GuestSearch.created_at.desc()).first()

    if not latest_search:
        return {
            "status": "NOT_FOUND",
            "search_id": None,
            "event_id": event.id,
            "guest_id": guest.id,
            "matched_count": 0,
            "matched_photos": [],
            "similarity_scores": {},
            "message": "No selfie match on record. Please capture a selfie."
        }

    photo_ids = latest_search.matched_photo_ids or []
    similarity_scores = latest_search.similarity_scores or {}

    matched_photos = []
    if photo_ids:
        photos = db.query(Photo).filter(
            Photo.id.in_(photo_ids),
            Photo.status == PhotoStatus.PROCESSED.value,
            Photo.is_deleted == False
        ).all()
        photo_dict = {p.id: p for p in photos}

        for pid in photo_ids:
            if pid in photo_dict:
                p = photo_dict[pid]
                if p.folder and not p.folder.allow_guest_view:
                    continue

                matched_photos.append({
                    "id": p.id,
                    "event_id": p.event_id,
                    "original_file_name": p.original_file_name,
                    "sha256_hash": p.sha256_hash,
                    "file_size": p.file_size,
                    "width": p.width,
                    "height": p.height,
                    "mime_type": p.mime_type,
                    "status": p.status,
                    "faces_detected_count": p.faces_detected_count,
                    "thumbnail_url": f"/api/v1/photos/{p.id}/thumbnail",
                    "download_url": f"/api/v1/photos/{p.id}/download",
                    "is_guest_uploaded": bool(p.is_guest_uploaded),
                    "uploaded_by_guest_name": p.uploaded_by_guest_name,
                    "uploaded_by_guest_phone": p.uploaded_by_guest_phone,
                    "folder_id": p.folder_id,
                    "folder_name": p.folder.name if p.folder else None,
                    "created_at": p.created_at.isoformat() if p.created_at else None,
                })

    return {
        "status": "READY",
        "search_id": latest_search.id,
        "event_id": event.id,
        "guest_id": guest.id,
        "matched_count": len(matched_photos),
        "matched_photos": matched_photos,
        "similarity_scores": similarity_scores,
        "created_at": latest_search.created_at.isoformat() if latest_search.created_at else None,
        "message": f"Found {len(matched_photos)} matching moments!" if matched_photos else "No matching photos found in this event."
    }


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

