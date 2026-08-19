"""
Get My Moment - Super Admin & Platform Owner Master Control Router
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, EmailStr

from apps.api.database import get_db
from apps.api.models import (
    AdminUser, Photographer, Event, Photo, Face, FaceEmbedding, 
    Guest, GuestSearch, Lead, PaymentMilestone, EventExpense, 
    Ceremony, CrewMember, EventTask, AuditLog, PlatformPaymentConfig
)
from apps.api.auth import hash_password, verify_password, create_access_token, get_current_admin

router = APIRouter(prefix="/admin", tags=["Super Admin & Platform Control"])


# --- Schemas ---

class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str


class AdminUserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime


class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str
    admin: AdminUserResponse


class AdminPlatformStats(BaseModel):
    total_photographers: int
    total_events: int
    total_photos: int
    total_faces_indexed: int
    total_guest_searches: int
    total_platform_gmv_inr: float


class PhotographerStatusUpdateRequest(BaseModel):
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None


class PhotographerSubscriptionUpdateRequest(BaseModel):
    subscription_plan: str  # FREE_TRIAL, SOLO_PRO, STUDIO_PRO, STUDIO_OS, ENTERPRISE_VIP
    subscription_status: Optional[str] = "ACTIVE"
    subscription_valid_until: Optional[datetime] = None
    max_storage_gb: Optional[int] = None
    max_events_per_month: Optional[int] = None


class PhotographerProfileUpdateRequest(BaseModel):
    studio_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None


class AdminPhotographerItem(BaseModel):
    id: str
    email: str
    studio_name: str
    phone: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    instagram_handle: Optional[str] = None
    portfolio_url: Optional[str] = None
    years_of_experience: Optional[str] = None
    specializations: Optional[str] = None
    gst_number: Optional[str] = None
    is_active: bool
    is_verified: bool
    verification_status: str
    subscription_plan: str
    subscription_status: str
    subscription_valid_until: Optional[datetime] = None
    max_storage_gb: int
    max_events_per_month: int
    total_events: int
    total_photos: int
    created_at: datetime


class PhotographerEventSummary(BaseModel):
    id: str
    name: str
    event_date: Optional[datetime] = None
    package_amount_inr: float
    status: str
    photo_count: int
    guest_count: int
    access_token: str
    created_at: datetime


class PhotographerLeadSummary(BaseModel):
    id: str
    client_name: str
    client_phone: str
    event_type: str
    budget_inr: float
    status: str
    created_at: datetime


class AdminPhotographerProfileResponse(BaseModel):
    id: str
    email: str
    studio_name: str
    phone: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    instagram_handle: Optional[str] = None
    portfolio_url: Optional[str] = None
    years_of_experience: Optional[str] = None
    specializations: Optional[str] = None
    gst_number: Optional[str] = None
    is_active: bool
    is_verified: bool
    verification_status: str
    verification_notes: Optional[str] = None
    verification_submitted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    # Subscription
    subscription_plan: str
    subscription_status: str
    subscription_valid_until: Optional[datetime] = None
    max_storage_gb: int
    max_events_per_month: int
    
    # Business Metrics
    total_events: int
    total_photos: int
    total_guests_matched: int
    total_crm_leads: int
    total_contracted_gmv_inr: float
    total_collected_revenue_inr: float
    
    # Details
    events: List[PhotographerEventSummary]
    leads: List[PhotographerLeadSummary]


class AdminEventItem(BaseModel):
    id: str
    photographer_id: str
    photographer_email: str
    studio_name: str
    name: str
    slug: str
    access_token: str
    event_date: Optional[datetime] = None
    package_amount_inr: float
    status: str
    photo_count: int
    guest_count: int
    created_at: datetime


# --- Routes ---

@router.post("/auth/login", response_model=AdminLoginResponse)
def admin_login(req: AdminLoginRequest, db: Session = Depends(get_db)):
    """Super Admin Login with isolated JWT token."""
    admin = db.query(AdminUser).filter(AdminUser.email == req.email.lower()).first()
    
    # Auto-seed initial root superadmin if no admin exists
    if not admin and req.email.lower() == "admin@getmymoment.com" and req.password == "Admin@GetMyMoment2026!":
        admin = AdminUser(
            email="admin@getmymoment.com",
            password_hash=hash_password("Admin@GetMyMoment2026!"),
            full_name="Platform Owner",
            role="SUPER_ADMIN",
            is_active=True,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

    if not admin or not verify_password(req.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Superadmin credentials."
        )

    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This Superadmin account has been deactivated."
        )

    token = create_access_token({"sub": admin.id, "is_admin": True})

    return AdminLoginResponse(
        access_token=token,
        token_type="bearer",
        admin=AdminUserResponse(
            id=admin.id,
            email=admin.email,
            full_name=admin.full_name,
            role=admin.role,
            is_active=admin.is_active,
            created_at=admin.created_at,
        )
    )


@router.get("/auth/me", response_model=AdminUserResponse)
def get_admin_me(current_admin: AdminUser = Depends(get_current_admin)):
    """Get current Superadmin identity."""
    return AdminUserResponse(
        id=current_admin.id,
        email=current_admin.email,
        full_name=current_admin.full_name,
        role=current_admin.role,
        is_active=current_admin.is_active,
        created_at=current_admin.created_at,
    )


@router.get("/stats", response_model=AdminPlatformStats)
def get_platform_stats(
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get macro platform analytics across all Indian photographer studios."""
    total_photographers = db.query(func.count(Photographer.id)).scalar() or 0
    total_events = db.query(func.count(Event.id)).scalar() or 0
    total_photos = db.query(func.count(Photo.id)).scalar() or 0
    total_faces_indexed = db.query(func.count(FaceEmbedding.id)).scalar() or 0
    total_guest_searches = db.query(func.count(GuestSearch.id)).scalar() or 0
    total_platform_gmv = db.query(func.sum(Event.package_amount_inr)).scalar() or 0.0

    return AdminPlatformStats(
        total_photographers=total_photographers,
        total_events=total_events,
        total_photos=total_photos,
        total_faces_indexed=total_faces_indexed,
        total_guest_searches=total_guest_searches,
        total_platform_gmv_inr=float(total_platform_gmv),
    )


@router.get("/photographers", response_model=List[AdminPhotographerItem])
def list_all_photographers(
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """List all registered photographer studios on Get My Moment."""
    photographers = db.query(Photographer).order_by(Photographer.created_at.desc()).all()
    results = []

    for p in photographers:
        event_count = db.query(func.count(Event.id)).filter(Event.photographer_id == p.id).scalar() or 0
        photo_count = db.query(func.count(Photo.id)).join(Event).filter(Event.photographer_id == p.id).scalar() or 0
        results.append(
            AdminPhotographerItem(
                id=p.id,
                email=p.email,
                studio_name=p.studio_name,
                phone=p.phone,
                city=p.city,
                state=p.state,
                instagram_handle=p.instagram_handle,
                portfolio_url=p.portfolio_url,
                years_of_experience=p.years_of_experience,
                specializations=p.specializations,
                gst_number=p.gst_number,
                is_active=p.is_active,
                is_verified=p.is_verified,
                verification_status=p.verification_status or ("VERIFIED" if p.is_verified else "PENDING_REVIEW"),
                subscription_plan=p.subscription_plan or "SOLO_PRO",
                subscription_status=p.subscription_status or "ACTIVE",
                subscription_valid_until=p.subscription_valid_until,
                max_storage_gb=p.max_storage_gb or 100,
                max_events_per_month=p.max_events_per_month or 10,
                total_events=event_count,
                total_photos=photo_count,
                created_at=p.created_at,
            )
        )
    return results


@router.get("/photographers/{photographer_id}/profile", response_model=AdminPhotographerProfileResponse)
def get_photographer_profile(
    photographer_id: str,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Fetch complete photographer profile, active subscription plan, and business metrics."""
    p = db.query(Photographer).filter(Photographer.id == photographer_id).first()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photographer not found.")

    events = db.query(Event).filter(Event.photographer_id == photographer_id).order_by(Event.created_at.desc()).all()
    event_summaries = []
    total_photos = 0
    total_guests = 0
    total_gmv = 0.0

    for ev in events:
        p_count = db.query(func.count(Photo.id)).filter(Photo.event_id == ev.id).scalar() or 0
        g_count = db.query(func.count(Guest.id)).filter(Guest.event_id == ev.id).scalar() or 0
        total_photos += p_count
        total_guests += g_count
        total_gmv += (ev.package_amount_inr or 0.0)

        event_summaries.append(
            PhotographerEventSummary(
                id=ev.id,
                name=ev.name,
                event_date=ev.event_date,
                package_amount_inr=ev.package_amount_inr or 0.0,
                status=ev.status,
                photo_count=p_count,
                guest_count=g_count,
                access_token=ev.access_token,
                created_at=ev.created_at,
            )
        )

    # Leads summary
    leads = db.query(Lead).filter(Lead.photographer_id == photographer_id).order_by(Lead.created_at.desc()).all()
    lead_summaries = [
        PhotographerLeadSummary(
            id=l.id,
            client_name=l.client_name,
            client_phone=l.client_phone,
            event_type=l.event_type,
            budget_inr=l.estimated_budget_inr or 0.0,
            status=l.stage,
            created_at=l.created_at,
        )
        for l in leads
    ]

    # Revenue collected from payment milestones
    total_collected = db.query(func.sum(PaymentMilestone.amount_inr)).join(Event).filter(
        Event.photographer_id == photographer_id,
        PaymentMilestone.status == "PAID"
    ).scalar() or 0.0

    return AdminPhotographerProfileResponse(
        id=p.id,
        email=p.email,
        studio_name=p.studio_name,
        phone=p.phone,
        city=p.city,
        state=p.state,
        instagram_handle=p.instagram_handle,
        portfolio_url=p.portfolio_url,
        years_of_experience=p.years_of_experience,
        specializations=p.specializations,
        gst_number=p.gst_number,
        is_active=p.is_active,
        is_verified=p.is_verified,
        verification_status=p.verification_status or ("VERIFIED" if p.is_verified else "PENDING_REVIEW"),
        verification_notes=p.verification_notes,
        verification_submitted_at=p.verification_submitted_at,
        created_at=p.created_at,
        updated_at=p.updated_at,
        subscription_plan=p.subscription_plan or "SOLO_PRO",
        subscription_status=p.subscription_status or "ACTIVE",
        subscription_valid_until=p.subscription_valid_until,
        max_storage_gb=p.max_storage_gb or 100,
        max_events_per_month=p.max_events_per_month or 10,
        total_events=len(events),
        total_photos=total_photos,
        total_guests_matched=total_guests,
        total_crm_leads=len(leads),
        total_contracted_gmv_inr=float(total_gmv),
        total_collected_revenue_inr=float(total_collected),
        events=event_summaries,
        leads=lead_summaries,
    )


@router.patch("/photographers/{photographer_id}/subscription")
def update_photographer_subscription(
    photographer_id: str,
    req: PhotographerSubscriptionUpdateRequest,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Super Admin upgrade or modify photographer's subscription plan & quotas."""
    p = db.query(Photographer).filter(Photographer.id == photographer_id).first()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photographer not found.")

    p.subscription_plan = req.subscription_plan.upper()
    if req.subscription_status:
        p.subscription_status = req.subscription_status.upper()
    if req.subscription_valid_until is not None:
        p.subscription_valid_until = req.subscription_valid_until

    # Set plan storage & quota defaults if not custom provided
    plan_upper = req.subscription_plan.upper()
    if req.max_storage_gb is not None:
        p.max_storage_gb = req.max_storage_gb
    else:
        if plan_upper == "FREE_TRIAL":
            p.max_storage_gb = 20
            p.max_events_per_month = 3
        elif plan_upper == "SOLO_PRO":
            p.max_storage_gb = 100
            p.max_events_per_month = 10
        elif plan_upper == "STUDIO_PRO":
            p.max_storage_gb = 500
            p.max_events_per_month = 30
        elif plan_upper == "STUDIO_OS":
            p.max_storage_gb = 2000
            p.max_events_per_month = 100
        elif plan_upper == "ENTERPRISE_VIP":
            p.max_storage_gb = 10000
            p.max_events_per_month = 1000

    if req.max_events_per_month is not None:
        p.max_events_per_month = req.max_events_per_month

    db.commit()
    return {
        "message": f"Successfully updated subscription to {p.subscription_plan}",
        "subscription_plan": p.subscription_plan,
        "subscription_status": p.subscription_status,
        "subscription_valid_until": p.subscription_valid_until,
        "max_storage_gb": p.max_storage_gb,
        "max_events_per_month": p.max_events_per_month,
    }


@router.patch("/photographers/{photographer_id}/profile")
def update_photographer_profile(
    photographer_id: str,
    req: PhotographerProfileUpdateRequest,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Super Admin edit photographer studio details."""
    p = db.query(Photographer).filter(Photographer.id == photographer_id).first()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photographer not found.")

    if req.studio_name is not None:
        p.studio_name = req.studio_name
    if req.email is not None:
        p.email = req.email.lower()
    if req.phone is not None:
        p.phone = req.phone
    if req.is_active is not None:
        p.is_active = req.is_active
    if req.is_verified is not None:
        p.is_verified = req.is_verified

    db.commit()
    return {"message": "Photographer profile updated successfully"}


@router.patch("/photographers/{photographer_id}/status")
def update_photographer_status(
    photographer_id: str,
    req: PhotographerStatusUpdateRequest,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Toggle photographer active status or studio verification badge."""
    p = db.query(Photographer).filter(Photographer.id == photographer_id).first()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photographer not found.")

    if req.is_active is not None:
        p.is_active = req.is_active
    if req.is_verified is not None:
        p.is_verified = req.is_verified
        p.verification_status = "VERIFIED" if req.is_verified else "PENDING_REVIEW"

    db.commit()
    return {"message": "Photographer status updated successfully", "is_active": p.is_active, "is_verified": p.is_verified, "verification_status": p.verification_status}


@router.patch("/photographers/{photographer_id}/verify-decision")
def verify_photographer_decision(
    photographer_id: str,
    decision: str,  # APPROVE, REJECT, PENDING
    notes: Optional[str] = None,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Approve or reject photographer studio verification application."""
    p = db.query(Photographer).filter(Photographer.id == photographer_id).first()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photographer not found.")

    decision_upper = decision.upper()
    if decision_upper == "APPROVE":
        p.is_verified = True
        p.verification_status = "VERIFIED"
    elif decision_upper == "REJECT":
        p.is_verified = False
        p.verification_status = "REJECTED"
    else:
        p.is_verified = False
        p.verification_status = "PENDING_REVIEW"

    if notes:
        p.verification_notes = notes

    db.commit()
    return {
        "message": f"Verification status updated to {p.verification_status}",
        "is_verified": p.is_verified,
        "verification_status": p.verification_status,
        "verification_notes": p.verification_notes,
    }


from apps.api.models import (
    AdminUser, Photographer, Event, Photo, Face, FaceEmbedding, 
    Guest, GuestSearch, Lead, Quotation, PaymentMilestone, EventExpense, 
    Ceremony, CrewMember, EventTask, CalendarNote
)

@router.delete("/photographers/{photographer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_photographer_account(
    photographer_id: str,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Super Admin force deletion of a photographer account and all their event workspaces."""
    p = db.query(Photographer).filter(Photographer.id == photographer_id).first()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photographer not found.")

    # 1. Delete calendar notes
    db.query(CalendarNote).filter(CalendarNote.photographer_id == photographer_id).delete(synchronize_session=False)

    # 2. Delete quotations & leads
    photographer_leads = db.query(Lead).filter(Lead.photographer_id == photographer_id).all()
    for ld in photographer_leads:
        db.query(Quotation).filter(Quotation.lead_id == ld.id).delete(synchronize_session=False)
        db.delete(ld)
    db.flush()

    # 3. Find all events owned by photographer and delete child records
    events = db.query(Event).filter(Event.photographer_id == photographer_id).all()
    for ev in events:
        db.query(PaymentMilestone).filter(PaymentMilestone.event_id == ev.id).delete(synchronize_session=False)
        db.query(EventExpense).filter(EventExpense.event_id == ev.id).delete(synchronize_session=False)
        db.query(CrewMember).filter(CrewMember.event_id == ev.id).delete(synchronize_session=False)
        db.query(EventTask).filter(EventTask.event_id == ev.id).delete(synchronize_session=False)
        db.query(Ceremony).filter(Ceremony.event_id == ev.id).delete(synchronize_session=False)
        db.query(FaceEmbedding).filter(FaceEmbedding.event_id == ev.id).delete(synchronize_session=False)
        db.query(Face).filter(Face.event_id == ev.id).delete(synchronize_session=False)
        db.query(GuestSearch).filter(GuestSearch.event_id == ev.id).delete(synchronize_session=False)
        db.query(Photo).filter(Photo.event_id == ev.id).delete(synchronize_session=False)
        db.query(Guest).filter(Guest.event_id == ev.id).delete(synchronize_session=False)
        db.delete(ev)

    db.delete(p)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/events", response_model=List[AdminEventItem])
def list_all_events(
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Master list of all events across the entire platform."""
    events = db.query(Event).order_by(Event.created_at.desc()).all()
    results = []

    for ev in events:
        p = db.query(Photographer).filter(Photographer.id == ev.photographer_id).first()
        photo_count = db.query(func.count(Photo.id)).filter(Photo.event_id == ev.id).scalar() or 0
        guest_count = db.query(func.count(Guest.id)).filter(Guest.event_id == ev.id).scalar() or 0
        results.append(
            AdminEventItem(
                id=ev.id,
                photographer_id=ev.photographer_id,
                photographer_email=p.email if p else "unknown",
                studio_name=p.studio_name if p else "Unknown Studio",
                name=ev.name,
                slug=ev.slug,
                access_token=ev.access_token,
                event_date=ev.event_date,
                package_amount_inr=ev.package_amount_inr or 0.0,
                status=ev.status,
                photo_count=photo_count,
                guest_count=guest_count,
                created_at=ev.created_at,
            )
        )
    return results


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_event(
    event_id: str,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Super Admin force deletion of an event."""
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    db.query(Lead).filter(Lead.converted_event_id == event_id).update({"converted_event_id": None})
    db.query(PaymentMilestone).filter(PaymentMilestone.event_id == event_id).delete(synchronize_session=False)
    db.query(EventExpense).filter(EventExpense.event_id == event_id).delete(synchronize_session=False)
    db.query(CrewMember).filter(CrewMember.event_id == event_id).delete(synchronize_session=False)
    db.query(EventTask).filter(EventTask.event_id == event_id).delete(synchronize_session=False)
    db.query(Ceremony).filter(Ceremony.event_id == event_id).delete(synchronize_session=False)
    db.query(FaceEmbedding).filter(FaceEmbedding.event_id == event_id).delete(synchronize_session=False)
    db.query(Face).filter(Face.event_id == event_id).delete(synchronize_session=False)
    db.query(GuestSearch).filter(GuestSearch.event_id == event_id).delete(synchronize_session=False)
    db.query(Photo).filter(Photo.event_id == event_id).delete(synchronize_session=False)
    db.query(Guest).filter(Guest.event_id == event_id).delete(synchronize_session=False)

    db.delete(ev)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/telemetry")
def get_ai_system_telemetry(
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Real-time AI engine health, face recognition metrics, and vector index load."""
    total_embeddings = db.query(func.count(FaceEmbedding.id)).scalar() or 0
    total_searches = db.query(func.count(GuestSearch.id)).scalar() or 0
    
    return {
        "status": "OPERATIONAL",
        "detector_model": "YuNet CNN (ONNX)",
        "recognizer_model": "SFace 128-d (ONNX)",
        "vector_search_engine": "Cosine Distance",
        "total_embeddings_stored": total_embeddings,
        "total_guest_searches_served": total_searches,
        "system_time": datetime.utcnow().isoformat(),
    }


# --- PASSWORD-PROTECTED GATEWAY & BANK SETTINGS VAULT ---

class UnlockVaultRequest(BaseModel):
    password: str


class UpdateGatewaySettingsRequest(BaseModel):
    # Owner Bank Details
    beneficiary_name: str
    bank_name: str
    account_number: str
    ifsc_code: str
    account_type: str = "CURRENT"
    business_upi_id: str
    bank_branch: Optional[str] = None
    
    # Gateway Credentials
    gateway_provider: str = "RAZORPAY"
    gateway_mode: str = "TEST"
    key_id: str
    key_secret: str
    webhook_secret: str
    
    # GST Invoicing & Seller Info
    seller_legal_name: str
    seller_address: str
    seller_gstin: str
    seller_pan: str
    seller_state: str = "Gujarat"
    seller_state_code: str = "24"
    seller_support_email: str
    seller_support_phone: Optional[str] = None
    gst_rate_pct: float = 18.0
    gst_pricing_mode: str = "inclusive"
    
    # Digital Stamp & Signatory
    authorized_signatory_name: Optional[str] = "Aryan Patel"
    authorized_signatory_designation: Optional[str] = "Managing Director & Founder"
    digital_stamp_url: Optional[str] = None
    digital_signature_url: Optional[str] = None
    
    # Security Confirmation
    confirm_password: str


@router.post("/gateway-settings/unlock")
def unlock_gateway_vault(
    req: UnlockVaultRequest,
    current_admin: AdminUser = Depends(get_current_admin)
):
    """
    Verify SuperAdmin security password to unlock the Bank Account & Gateway configuration vault.
    """
    if not verify_password(req.password, current_admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect SuperAdmin security password. Access to Bank & Gateway Vault denied."
        )
    
    return {
        "unlocked": True,
        "message": "Vault successfully unlocked.",
        "admin_name": current_admin.full_name,
        "unlocked_at": datetime.utcnow().isoformat()
    }


@router.get("/gateway-settings")
def get_gateway_and_bank_settings(
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Retrieve current Website Owner Bank Account, Payment Gateway, and GST Invoicing settings.
    """
    cfg = db.query(PlatformPaymentConfig).first()
    if not cfg:
        cfg = PlatformPaymentConfig()
        db.add(cfg)
        db.commit()
        db.refresh(cfg)

    return {
        "id": cfg.id,
        "beneficiary_name": cfg.beneficiary_name,
        "bank_name": cfg.bank_name,
        "account_number": cfg.account_number,
        "ifsc_code": cfg.ifsc_code,
        "account_type": cfg.account_type,
        "business_upi_id": cfg.business_upi_id,
        "bank_branch": cfg.bank_branch,
        "gateway_provider": cfg.gateway_provider,
        "gateway_mode": cfg.gateway_mode,
        "key_id": cfg.key_id,
        "key_secret": cfg.key_secret,
        "webhook_secret": cfg.webhook_secret,
        "seller_legal_name": cfg.seller_legal_name,
        "seller_address": cfg.seller_address,
        "seller_gstin": cfg.seller_gstin,
        "seller_pan": cfg.seller_pan,
        "seller_state": cfg.seller_state,
        "seller_state_code": cfg.seller_state_code,
        "seller_support_email": cfg.seller_support_email,
        "seller_support_phone": cfg.seller_support_phone,
        "gst_rate_pct": float(cfg.gst_rate_pct),
        "gst_pricing_mode": cfg.gst_pricing_mode,
        "authorized_signatory_name": cfg.authorized_signatory_name or "Aryan Patel",
        "authorized_signatory_designation": cfg.authorized_signatory_designation or "Managing Director & Founder",
        "digital_stamp_url": cfg.digital_stamp_url,
        "digital_signature_url": cfg.digital_signature_url,
        "last_updated_by": cfg.last_updated_by,
        "updated_at": cfg.updated_at.isoformat() if cfg.updated_at else datetime.utcnow().isoformat()
    }


@router.put("/gateway-settings")
def update_gateway_and_bank_settings(
    req: UpdateGatewaySettingsRequest,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Update Website Owner Bank Details, Payment Gateway Credentials, and GST settings.
    Requires password re-verification for tamper-proofing.
    """
    if not verify_password(req.confirm_password, current_admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password confirmation failed. Changes were rejected for security."
        )

    cfg = db.query(PlatformPaymentConfig).first()
    if not cfg:
        cfg = PlatformPaymentConfig()
        db.add(cfg)

    from decimal import Decimal
    cfg.beneficiary_name = req.beneficiary_name.strip()
    cfg.bank_name = req.bank_name.strip()
    cfg.account_number = req.account_number.strip()
    cfg.ifsc_code = req.ifsc_code.strip().upper()
    cfg.account_type = req.account_type.strip().upper()
    cfg.business_upi_id = req.business_upi_id.strip()
    cfg.bank_branch = req.bank_branch.strip() if req.bank_branch else None

    cfg.gateway_provider = req.gateway_provider.strip().upper()
    cfg.gateway_mode = req.gateway_mode.strip().upper()
    cfg.key_id = req.key_id.strip()
    cfg.key_secret = req.key_secret.strip()
    cfg.webhook_secret = req.webhook_secret.strip()

    cfg.seller_legal_name = req.seller_legal_name.strip()
    cfg.seller_address = req.seller_address.strip()
    cfg.seller_gstin = req.seller_gstin.strip().upper()
    cfg.seller_pan = req.seller_pan.strip().upper()
    cfg.seller_state = req.seller_state.strip()
    cfg.seller_state_code = req.seller_state_code.strip()
    cfg.seller_support_email = req.seller_support_email.strip()
    cfg.seller_support_phone = req.seller_support_phone.strip() if req.seller_support_phone else None
    cfg.gst_rate_pct = Decimal(str(req.gst_rate_pct))
    cfg.gst_pricing_mode = req.gst_pricing_mode.strip().lower()

    if req.authorized_signatory_name:
        cfg.authorized_signatory_name = req.authorized_signatory_name.strip()
    if req.authorized_signatory_designation:
        cfg.authorized_signatory_designation = req.authorized_signatory_designation.strip()
    if req.digital_stamp_url is not None:
        cfg.digital_stamp_url = req.digital_stamp_url.strip() if req.digital_stamp_url else None
    if req.digital_signature_url is not None:
        cfg.digital_signature_url = req.digital_signature_url.strip() if req.digital_signature_url else None

    cfg.last_updated_by = f"{current_admin.full_name} ({current_admin.email})"
    cfg.updated_at = datetime.utcnow()

    # Log action in AuditLog
    audit = AuditLog(
        actor_type="SUPER_ADMIN",
        actor_id=current_admin.id,
        action="UPDATE_PAYMENT_GATEWAY_AND_BANK_CONFIG",
        details={
            "bank_name": cfg.bank_name,
            "account_number_masked": f"******{cfg.account_number[-4:]}" if len(cfg.account_number) >= 4 else cfg.account_number,
            "business_upi_id": cfg.business_upi_id,
            "gateway_mode": cfg.gateway_mode,
            "key_id": cfg.key_id,
            "seller_gstin": cfg.seller_gstin,
        }
    )
    db.add(audit)
    db.commit()
    db.refresh(cfg)

    return {
        "success": True,
        "message": "Payment Gateway, Owner Bank Details, and GST Settings updated successfully!",
        "updated_at": cfg.updated_at.isoformat()
    }
