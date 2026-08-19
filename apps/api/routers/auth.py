import os
import io
from datetime import datetime, timedelta
from typing import Optional
from PIL import Image
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from apps.api.config import settings
from apps.api.database import get_db
from apps.api.models.photographer import Photographer
from apps.api.models.event import Event
from apps.api.models.photo import Photo
from apps.api.schemas.auth import (
    PhotographerSignupRequest,
    PhotographerLoginRequest,
    StudioVerificationRequest,
    PhotographerProfileUpdateRequest,
    PhotographerBrandingUpdateRequest,
    PlanUpgradeRequest,
    TokenResponse,
    PhotographerResponse,
    PhotographerProfileDetailResponse,
)
from apps.api.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_photographer,
)

router = APIRouter(prefix="/auth", tags=["Photographer Authentication"])

PLAN_LIMITS = {
    "FREE_TRIAL": {"storage_gb": 5, "events_per_month": 1},
    "SOLO_PRO": {"storage_gb": 100, "events_per_month": 10},
    "STUDIO_PRO": {"storage_gb": 500, "events_per_month": 30},
    "STUDIO_OS": {"storage_gb": 2048, "events_per_month": 9999},
    "ENTERPRISE_VIP": {"storage_gb": 10240, "events_per_month": 99999},
}


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(request: PhotographerSignupRequest, db: Session = Depends(get_db)):
    """Register a new photographer studio account with studio verification."""
    existing = db.query(Photographer).filter(Photographer.email == request.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    photographer = Photographer(
        email=request.email.lower(),
        password_hash=hash_password(request.password),
        studio_name=request.studio_name,
        phone=request.phone,
        city=request.city,
        state=request.state,
        instagram_handle=request.instagram_handle,
        portfolio_url=request.portfolio_url,
        years_of_experience=request.years_of_experience,
        specializations=request.specializations,
        gst_number=request.gst_number,
        is_active=True,
        is_verified=False,
        verification_status="PENDING_REVIEW",
        subscription_plan="SOLO_PRO",
        subscription_status="ACTIVE",
        subscription_valid_until=datetime.utcnow() + timedelta(days=365),
        max_storage_gb=100,
        max_events_per_month=10,
    )
    db.add(photographer)
    db.commit()
    db.refresh(photographer)

    token = create_access_token(data={"sub": photographer.id, "email": photographer.email})
    return TokenResponse(
        access_token=token,
        photographer_id=photographer.id,
        email=photographer.email,
        studio_name=photographer.studio_name,
        is_verified=photographer.is_verified,
        verification_status=photographer.verification_status,
        subscription_plan=photographer.subscription_plan,
    )


@router.post("/login", response_model=TokenResponse)
def login(request: PhotographerLoginRequest, db: Session = Depends(get_db)):
    """Log in an existing photographer and issue a JWT token."""
    photographer = db.query(Photographer).filter(Photographer.email == request.email.lower()).first()
    if not photographer or not verify_password(request.password, photographer.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )
    if not photographer.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive."
        )

    token = create_access_token(data={"sub": photographer.id, "email": photographer.email})
    return TokenResponse(
        access_token=token,
        photographer_id=photographer.id,
        email=photographer.email,
        studio_name=photographer.studio_name,
        is_verified=photographer.is_verified,
        verification_status=photographer.verification_status,
        subscription_plan=photographer.subscription_plan,
    )


@router.post("/verify", response_model=PhotographerResponse)
def submit_studio_verification(
    request: StudioVerificationRequest,
    current_user: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Submit or update studio KYC verification details."""
    current_user.city = request.city
    current_user.state = request.state
    current_user.instagram_handle = request.instagram_handle
    current_user.portfolio_url = request.portfolio_url
    current_user.years_of_experience = request.years_of_experience
    current_user.specializations = request.specializations
    current_user.gst_number = request.gst_number
    current_user.verification_status = "PENDING_REVIEW"
    
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/me", response_model=PhotographerResponse)
def get_current_user_profile(current_user: Photographer = Depends(get_current_photographer)):
    """Get the authenticated photographer's profile."""
    return current_user


@router.get("/profile", response_model=PhotographerProfileDetailResponse)
def get_detailed_studio_profile(
    current_user: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Get comprehensive studio profile with live quota metrics and plan details."""
    events = db.query(Event).filter(Event.photographer_id == current_user.id).all()
    total_events = len(events)
    
    # Calculate total photos & storage
    photo_stats = db.query(
        func.count(Photo.id),
        func.sum(Photo.file_size)
    ).join(Event).filter(Event.photographer_id == current_user.id).first()
    
    total_photos = photo_stats[0] or 0
    total_bytes = photo_stats[1] or 0
    storage_used_mb = round(total_bytes / (1024 * 1024), 2)
    storage_used_gb = round(total_bytes / (1024 * 1024 * 1024), 3)

    # Monthly events count (created in current calendar month)
    now = datetime.utcnow()
    month_start = datetime(now.year, now.month, 1)
    monthly_events = db.query(func.count(Event.id)).filter(
        Event.photographer_id == current_user.id,
        Event.created_at >= month_start
    ).scalar() or 0

    return PhotographerProfileDetailResponse(
        id=current_user.id,
        email=current_user.email,
        studio_name=current_user.studio_name,
        phone=current_user.phone,
        city=current_user.city,
        state=current_user.state,
        instagram_handle=current_user.instagram_handle,
        portfolio_url=current_user.portfolio_url,
        years_of_experience=current_user.years_of_experience,
        specializations=current_user.specializations,
        gst_number=current_user.gst_number,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        verification_status=current_user.verification_status or ("VERIFIED" if current_user.is_verified else "PENDING_REVIEW"),
        verification_notes=current_user.verification_notes,
        verification_submitted_at=current_user.verification_submitted_at,
        created_at=current_user.created_at,
        logo_url=current_user.logo_url,
        signature_url=current_user.signature_url,
        digital_stamp_url=current_user.digital_stamp_url,
        watermark_text=current_user.watermark_text,
        subscription_plan=current_user.subscription_plan or "SOLO_PRO",
        subscription_status=current_user.subscription_status or "ACTIVE",
        subscription_valid_until=current_user.subscription_valid_until,
        max_storage_gb=current_user.max_storage_gb or 100,
        max_events_per_month=current_user.max_events_per_month or 10,
        total_events=total_events,
        total_photos=total_photos,
        storage_used_mb=storage_used_mb,
        storage_used_gb=storage_used_gb,
        monthly_events_used=monthly_events,
    )


@router.patch("/profile", response_model=PhotographerProfileDetailResponse)
def update_studio_profile(
    req: PhotographerProfileUpdateRequest,
    current_user: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Photographer self-update studio profile info."""
    if req.studio_name is not None:
        current_user.studio_name = req.studio_name
    if req.phone is not None:
        current_user.phone = req.phone
    if req.city is not None:
        current_user.city = req.city
    if req.state is not None:
        current_user.state = req.state
    if req.instagram_handle is not None:
        current_user.instagram_handle = req.instagram_handle
    if req.portfolio_url is not None:
        current_user.portfolio_url = req.portfolio_url
    if req.years_of_experience is not None:
        current_user.years_of_experience = req.years_of_experience
    if req.specializations is not None:
        current_user.specializations = req.specializations
    if req.gst_number is not None:
        current_user.gst_number = req.gst_number

    db.commit()
    db.refresh(current_user)
    return get_detailed_studio_profile(current_user, db)


@router.post("/upgrade-plan", response_model=PhotographerProfileDetailResponse)
def upgrade_photographer_plan(
    req: PlanUpgradeRequest,
    current_user: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Photographer self-service plan upgrade / tier selection."""
    tier = req.plan_tier.upper()
    if tier not in PLAN_LIMITS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan tier. Choose from: {list(PLAN_LIMITS.keys())}"
        )

    limits = PLAN_LIMITS[tier]
    current_user.subscription_plan = tier
    current_user.subscription_status = "ACTIVE"
    current_user.subscription_valid_until = datetime.utcnow() + timedelta(days=365)
    current_user.max_storage_gb = limits["storage_gb"]
    current_user.max_events_per_month = limits["events_per_month"]

    db.commit()
    db.refresh(current_user)
    return get_detailed_studio_profile(current_user, db)


# =============================================================================
# STUDIO BRANDING: LOGO, DIGITAL SIGNATURE / STAMP & WATERMARK ENDPOINTS
# =============================================================================

@router.post("/branding/logo")
async def upload_studio_logo(
    file: UploadFile = File(...),
    current_user: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Upload studio's official logo for client galleries, invoices, and quotations."""
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Logo file exceeds 10MB.")

    # Validate image format
    try:
        with Image.open(io.BytesIO(contents)) as img:
            img_format = (img.format or "PNG").lower()
            if img_format not in ["jpeg", "jpg", "png", "webp"]:
                raise ValueError("Supported formats: PNG, JPG, JPEG, WEBP")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid image file: {e}")

    # Create studio branding directory
    branding_dir = os.path.join(settings.STORAGE_LOCAL_ROOT, "studios", current_user.id, "branding")
    os.makedirs(branding_dir, exist_ok=True)

    ext = "png" if img_format == "png" else ("webp" if img_format == "webp" else "jpg")
    file_path = os.path.join(branding_dir, f"logo.{ext}")

    with open(file_path, "wb") as f:
        f.write(contents)

    logo_url = f"/api/v1/auth/branding/logo/{current_user.id}"
    current_user.logo_url = logo_url
    db.commit()
    db.refresh(current_user)

    return {
        "success": True,
        "logo_url": logo_url,
        "message": "Studio logo uploaded successfully."
    }


@router.post("/branding/signature")
async def upload_studio_signature(
    file: UploadFile = File(...),
    current_user: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Upload studio authorized signatory stamp / digital signature for billing & estimates."""
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Signature file exceeds 10MB.")

    try:
        with Image.open(io.BytesIO(contents)) as img:
            img_format = (img.format or "PNG").lower()
            if img_format not in ["jpeg", "jpg", "png", "webp"]:
                raise ValueError("Supported formats: PNG, JPG, JPEG, WEBP")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid image file: {e}")

    branding_dir = os.path.join(settings.STORAGE_LOCAL_ROOT, "studios", current_user.id, "branding")
    os.makedirs(branding_dir, exist_ok=True)

    ext = "png" if img_format == "png" else ("webp" if img_format == "webp" else "jpg")
    file_path = os.path.join(branding_dir, f"signature.{ext}")

    with open(file_path, "wb") as f:
        f.write(contents)

    sig_url = f"/api/v1/auth/branding/signature/{current_user.id}"
    current_user.signature_url = sig_url
    current_user.digital_stamp_url = sig_url
    db.commit()
    db.refresh(current_user)

    return {
        "success": True,
        "signature_url": sig_url,
        "message": "Authorized signature & stamp uploaded successfully."
    }


@router.delete("/branding/logo")
def delete_studio_logo(
    current_user: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Delete studio custom logo and revert to default branding."""
    current_user.logo_url = None
    db.commit()
    return {"success": True, "message": "Studio logo removed."}


@router.delete("/branding/signature")
def delete_studio_signature(
    current_user: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Delete studio digital signature and stamp."""
    current_user.signature_url = None
    current_user.digital_stamp_url = None
    db.commit()
    return {"success": True, "message": "Authorized signature removed."}


@router.patch("/branding/settings")
def update_branding_settings(
    req: PhotographerBrandingUpdateRequest,
    current_user: Photographer = Depends(get_current_photographer),
    db: Session = Depends(get_db)
):
    """Update watermark text and additional branding preferences."""
    if req.watermark_text is not None:
        current_user.watermark_text = req.watermark_text
    db.commit()
    db.refresh(current_user)
    return {
        "success": True,
        "watermark_text": current_user.watermark_text,
        "logo_url": current_user.logo_url,
        "signature_url": current_user.signature_url
    }


@router.get("/branding/logo/{photographer_id}")
def serve_studio_logo(photographer_id: str, db: Session = Depends(get_db)):
    """Public asset server: Serve studio custom logo for client gallery & invoice rendering."""
    branding_dir = os.path.join(settings.STORAGE_LOCAL_ROOT, "studios", photographer_id, "branding")
    for ext in ["png", "webp", "jpg", "jpeg"]:
        target = os.path.join(branding_dir, f"logo.{ext}")
        if os.path.exists(target):
            media_type = f"image/{'png' if ext=='png' else ('webp' if ext=='webp' else 'jpeg')}"
            return FileResponse(target, media_type=media_type)
    
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Studio logo not found.")


@router.get("/branding/signature/{photographer_id}")
def serve_studio_signature(photographer_id: str, db: Session = Depends(get_db)):
    """Public asset server: Serve studio authorized signature & stamp."""
    branding_dir = os.path.join(settings.STORAGE_LOCAL_ROOT, "studios", photographer_id, "branding")
    for ext in ["png", "webp", "jpg", "jpeg"]:
        target = os.path.join(branding_dir, f"signature.{ext}")
        if os.path.exists(target):
            media_type = f"image/{'png' if ext=='png' else ('webp' if ext=='webp' else 'jpeg')}"
            return FileResponse(target, media_type=media_type)
    
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Studio signature not found.")
