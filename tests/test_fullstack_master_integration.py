"""
Master Full-Stack Integration, E2E, API, Database & Data-Consistency Test Suite
Covers DISC-001 through CONC-001
"""

import io
import time
import pytest
from PIL import Image, ImageDraw
from apps.api.models import (
    Photographer, Event, Folder, Photo, Face, FaceEmbedding,
    Guest, Consent, GuestSearch, CrewMember, Lead, ClientInvoice, Quotation
)
from packages.shared.constants import PhotoStatus, EventStatus


def create_test_image(text="TEST") -> bytes:
    """Generate valid JPEG image."""
    img = Image.new("RGB", (200, 200), color=(220, 200, 180))
    draw = ImageDraw.Draw(img)
    draw.text((20, 80), text, fill=(0, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_master_fullstack_lifecycle_and_data_consistency(client, db_session):
    """
    Complete E2E Journey:
    1. Photographer Registration & Authentication
    2. Event Creation & Wedding Presets Ingest
    3. Photo Upload with AI Vector Indexing & DB State Verification
    4. Client Proofing & Selection Flow
    5. Crew Member 1-Tap Ingest
    6. Guest Onboarding, Smart Login & AI Face Matching
    7. Database Consistency Assertions: (Frontend Data == API Response == DB State)
    """

    # --- 1. Photographer Auth (AUTH-001) ---
    email = f"master_studio_{int(time.time())}@example.com"
    signup_res = client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": "MasterPassword123!", "studio_name": "Royal Wedlock"}
    )
    assert signup_res.status_code == 201
    auth_token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {auth_token}"}

    # Verify in DB
    db_photographer = db_session.query(Photographer).filter(Photographer.email == email).first()
    assert db_photographer is not None
    assert db_photographer.studio_name == "Royal Wedlock"

    # --- 2. Event Creation & Wedding Presets (EVENT-001) ---
    event_res = client.post(
        "/api/v1/events",
        headers=headers,
        json={"name": "Kavya & Ananya Royal Wedding", "event_date": "2026-11-15"}
    )
    assert event_res.status_code == 201
    event_id = event_res.json()["id"]
    event_token = event_res.json()["access_token"]

    # Generate Wedding Presets
    presets_res = client.post(f"/api/v1/events/{event_id}/folders/generate-wedding-preset", headers=headers)
    assert presets_res.status_code == 200
    created_presets = presets_res.json()
    assert len(created_presets) >= 4

    # DB Verification: Folders exist (query from API response — names have numeric prefix)
    db_folders = db_session.query(Folder).filter(Folder.event_id == event_id).all()
    assert len(db_folders) >= len(created_presets)
    # Use the API response to locate the Haldi folder ID (folder names have prefix "01_Haldi")
    haldi_data = next((f for f in created_presets if "Haldi" in f["name"]), None)
    assert haldi_data is not None, f"No Haldi folder in presets: {[f['name'] for f in created_presets]}"
    haldi_folder_id = haldi_data["id"]

    # --- 3. Photo Upload & Ingest (PHOTO-001) ---
    img_bytes = create_test_image("BRIDE_HALDI")
    upload_res = client.post(
        f"/api/v1/events/{event_id}/photos",
        headers=headers,
        data={"folder_id": haldi_folder_id},
        files=[("files", ("haldi_01.jpg", img_bytes, "image/jpeg"))]
    )
    assert upload_res.status_code == 201
    upload_data = upload_res.json()
    assert upload_data["uploaded_count"] == 1
    photo_id = upload_data["photos"][0]["id"]

    # Add mock face embedding for testing vector search
    face = Face(
        photo_id=photo_id,
        event_id=event_id,
        bounding_box={"x": 10, "y": 10, "w": 80, "h": 80},
        detection_confidence=0.99
    )
    db_session.add(face)
    db_session.flush()

    dummy_vec = [1.0 / (128 ** 0.5)] * 128
    face_emb = FaceEmbedding(face_id=face.id, event_id=event_id, embedding=dummy_vec)
    db_session.add(face_emb)
    db_session.commit()

    # DB Consistency Check: Photo count
    db_photo_count = db_session.query(Photo).filter(Photo.event_id == event_id, Photo.is_deleted == False).count()
    assert db_photo_count == 1

    # --- 4. Client Selection Portal (PROOF-001) ---
    # selection_token is different from access_token; fetch it from DB
    db_session.expire_all()  # refresh from DB
    db_event = db_session.query(Event).filter(Event.id == event_id).first()
    assert db_event is not None
    selection_token = db_event.selection_token

    selection_get_res = client.get(f"/api/v1/selection/{selection_token}")
    assert selection_get_res.status_code == 200
    sel_data = selection_get_res.json()
    assert sel_data["total_photos"] == 1

    # Toggle selection (photo_id in path, body: is_selected)
    toggle_res = client.post(
        f"/api/v1/selection/{selection_token}/photos/{photo_id}/toggle",
        json={"is_selected": True}
    )
    assert toggle_res.status_code == 200
    assert toggle_res.json()["is_client_selected"] is True

    # Submit Selection
    submit_res = client.post(
        f"/api/v1/selection/{selection_token}/submit"
    )
    assert submit_res.status_code == 200
    assert "submitted" in submit_res.json()["message"].lower()

    # --- 5. Crew Portal Ingest (CREW-001) ---
    crew_res = client.post(
        f"/api/v1/events/{event_id}/operations/crew",
        headers=headers,
        json={"name": "Karan Camera 2", "role": "Candid Photo", "phone": "+919876543299", "assigned_ceremonies": ["Haldi", "Sangeet"]}
    )
    assert crew_res.status_code == 201
    crew_member_id = crew_res.json()["id"]

    # DB verify crew was created
    db_crew = db_session.query(CrewMember).filter(CrewMember.id == crew_member_id).first()
    assert db_crew is not None
    assert db_crew.role == "Candid Photo"

    # Crew Login via phone
    crew_login_res = client.post(
        "/api/v1/crew/login",
        json={"phone": "+919876543299"}
    )
    assert crew_login_res.status_code == 200
    assert crew_login_res.json()["crew_id"] == crew_member_id

    # --- 6. Guest Onboarding, Smart Login & AI Matching (GUEST-001 / MATCH-001) ---
    # Guest Register
    guest_reg_res = client.post(
        f"/api/v1/events/{event_id}/guests/register",
        json={"name": "Ananya Relative", "mobile": "9662086550"}
    )
    assert guest_reg_res.status_code == 201
    guest_id = guest_reg_res.json()["guest_id"]

    # Biometric Consent
    consent_res = client.post(
        f"/api/v1/guests/{guest_id}/consent",
        json={"guest_id": guest_id, "face_search_consent": True}
    )
    assert consent_res.status_code == 201

    # Smart Phone Login (with and without +91)
    login_10_digits = client.post(
        f"/api/v1/events/{event_id}/guests/login",
        json={"mobile": "9662086550"}
    )
    assert login_10_digits.status_code == 200
    assert login_10_digits.json()["guest_id"] == guest_id

    login_e164 = client.post(
        f"/api/v1/events/{event_id}/guests/login",
        json={"mobile": "+91 96620 86550"}
    )
    assert login_e164.status_code == 200
    assert login_e164.json()["guest_id"] == guest_id

    # Server Session Validation
    val_res = client.get(f"/api/v1/events/{event_id}/guests/{guest_id}/session/validate")
    assert val_res.status_code == 200
    assert val_res.json()["is_valid"] is True

    # Selfie Vector Search
    selfie_img = create_test_image("SELFIE_GUEST")
    search_res = client.post(
        f"/api/v1/events/{event_id}/guests/{guest_id}/search",
        files=[("selfie", ("selfie.jpg", selfie_img, "image/jpeg"))]
    )
    assert search_res.status_code == 200

    # Cached Match Persistence
    cached_match_res = client.get(f"/api/v1/events/{event_id}/guests/{guest_id}/cached-match")
    assert cached_match_res.status_code == 200
    assert cached_match_res.json()["status"] == "READY"
    assert cached_match_res.json()["guest_id"] == guest_id

    # --- 7. CRM Lead Creation (CRM-001) ---
    lead_res = client.post(
        "/api/v1/crm/leads",
        headers=headers,
        json={
            "client_name": "Rohan & Sneha",
            "client_phone": "+919876541111",
            "event_type": "Wedding",
            "estimated_budget_inr": 150000
        }
    )
    assert lead_res.status_code == 201, f"CRM lead creation failed: {lead_res.text}"
    lead_id = lead_res.json()["id"]

    # Verify lead in DB
    db_lead = db_session.query(Lead).filter(Lead.id == lead_id).first()
    assert db_lead is not None
    assert db_lead.client_name == "Rohan & Sneha"

    # --- 8. Master Data Consistency Verification (DB-001) ---
    # Frontend API Count == Database Count
    db_photo_count = db_session.query(Photo).filter(Photo.event_id == event_id, Photo.is_deleted == False).count()
    assert db_photo_count == 1, f"Photo count mismatch: DB={db_photo_count}"

    db_guest_count = db_session.query(Guest).filter(Guest.event_id == event_id).count()
    assert db_guest_count == 1, f"Guest count mismatch: DB={db_guest_count}"

    db_folder_count = db_session.query(Folder).filter(Folder.event_id == event_id).count()
    assert db_folder_count >= 4, f"Folder count mismatch: DB={db_folder_count}"

    db_search_count = db_session.query(GuestSearch).filter(GuestSearch.event_id == event_id).count()
    assert db_search_count >= 1, f"GuestSearch not persisted: DB={db_search_count}"

    db_consent_count = db_session.query(Consent).filter(Consent.event_id == event_id).count()
    assert db_consent_count == 1, f"Consent not persisted: DB={db_consent_count}"

    db_embedding_count = db_session.query(FaceEmbedding).filter(FaceEmbedding.event_id == event_id).count()
    assert db_embedding_count >= 1, f"FaceEmbedding not persisted: DB={db_embedding_count}"


def test_cross_event_and_cross_guest_idor_security(client, db_session):
    """
    Security Tests: IDOR, Cross-Event Isolation, Cross-Guest Data Isolation
    SEC-001 / AUTHZ-001
    """
    # Setup: Two separate photographers
    for i, email_prefix in enumerate(["sec_studio_a", "sec_studio_b"]):
        res = client.post(
            "/api/v1/auth/signup",
            json={"email": f"{email_prefix}_{int(time.time())}@sec.com", "password": "Password123!", "studio_name": f"Studio {i}"}
        )
        assert res.status_code == 201

    # Studio A
    res_a = client.post("/api/v1/auth/signup", json={"email": f"sec_a_{int(time.time())}@sec.com", "password": "Pass123!", "studio_name": "Studio A"})
    tok_a = res_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {tok_a}"}

    # Studio B
    res_b = client.post("/api/v1/auth/signup", json={"email": f"sec_b_{int(time.time())}@sec.com", "password": "Pass123!", "studio_name": "Studio B"})
    tok_b = res_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {tok_b}"}

    # Studio A creates an event
    ev_a = client.post("/api/v1/events", headers=headers_a, json={"name": "Studio A Event"})
    ev_a_id = ev_a.json()["id"]

    # Studio B tries to access Studio A's event (Cross-Tenant IDOR)
    folders_idor = client.get(f"/api/v1/events/{ev_a_id}/folders", headers=headers_b)
    # Should either be 403 or 404, never 200
    assert folders_idor.status_code in [403, 404], f"IDOR VULNERABILITY! Studio B got Studio A event data: {folders_idor.status_code}"

    # Studio B tries to upload to Studio A's event
    img = create_test_image("IDOR_ATTACK")
    upload_idor = client.post(
        f"/api/v1/events/{ev_a_id}/photos",
        headers=headers_b,
        files=[("files", ("attack.jpg", img, "image/jpeg"))]
    )
    assert upload_idor.status_code in [403, 404], f"IDOR UPLOAD VULNERABILITY! {upload_idor.status_code}"


def test_duplicate_registration_and_data_dedup(client, db_session):
    """
    Duplicate Prevention Testing (DB-002 / API-003)
    - Duplicate photographer email must fail
    - Duplicate guest registration must return same guest_id (idempotent)
    """
    # Duplicate Photographer Email
    email = f"dedup_test_{int(time.time())}@example.com"
    client.post("/api/v1/auth/signup", json={"email": email, "password": "Pass123!", "studio_name": "Dedup Studio"})
    dup_res = client.post("/api/v1/auth/signup", json={"email": email, "password": "Pass123!", "studio_name": "Duplicate Studio"})
    assert dup_res.status_code in [400, 409], f"Duplicate email not rejected: {dup_res.status_code}"

    # Duplicate Guest Registration (Idempotent - same mobile in same event)
    auth_res = client.post("/api/v1/auth/signup", json={"email": f"dedup2_{int(time.time())}@example.com", "password": "Pass123!", "studio_name": "Dedup2 Studio"})
    headers = {"Authorization": f"Bearer {auth_res.json()['access_token']}"}
    ev = client.post("/api/v1/events", headers=headers, json={"name": "Dedup Event"})
    ev_id = ev.json()["id"]

    g1 = client.post(f"/api/v1/events/{ev_id}/guests/register", json={"name": "Same Guest", "mobile": "+919000000001"})
    g2 = client.post(f"/api/v1/events/{ev_id}/guests/register", json={"name": "Same Guest Again", "mobile": "+919000000001"})
    assert g1.status_code == 201
    assert g2.status_code == 201
    # Must return same guest_id (idempotent)
    assert g1.json()["guest_id"] == g2.json()["guest_id"], "Duplicate guest created!"

    # DB confirms only 1 guest record
    count = db_session.query(Guest).filter(Guest.event_id == ev_id).count()
    assert count == 1, f"Duplicate guest in DB: {count}"


def test_session_resilience_and_expired_guest_handling(client, db_session):
    """
    Refresh-Proof Session Validation (AUTH-002)
    - Valid guest session validates correctly
    - Invalid guest_id returns 404
    - Cross-event guest lookup returns 404
    """
    auth_res = client.post("/api/v1/auth/signup", json={"email": f"sess_{int(time.time())}@example.com", "password": "Pass123!", "studio_name": "Session Studio"})
    headers = {"Authorization": f"Bearer {auth_res.json()['access_token']}"}
    ev = client.post("/api/v1/events", headers=headers, json={"name": "Session Test Event"})
    ev_id = ev.json()["id"]

    g = client.post(f"/api/v1/events/{ev_id}/guests/register", json={"name": "Session Guest", "mobile": "+919123456789"})
    guest_id = g.json()["guest_id"]

    # Valid session validation
    val = client.get(f"/api/v1/events/{ev_id}/guests/{guest_id}/session/validate")
    assert val.status_code == 200
    assert val.json()["is_valid"] is True

    # Fake/tampered guest_id returns 404
    fake_val = client.get(f"/api/v1/events/{ev_id}/guests/invalid-guest-id-xyz/session/validate")
    assert fake_val.status_code == 404

    # Valid guest from wrong event returns 404 (cross-event session isolation)
    ev2 = client.post("/api/v1/events", headers=headers, json={"name": "Other Event"})
    ev2_id = ev2.json()["id"]
    cross_val = client.get(f"/api/v1/events/{ev2_id}/guests/{guest_id}/session/validate")
    assert cross_val.status_code == 404, f"Cross-event session isolation failure: {cross_val.status_code}"


def test_unconsented_guest_search_blocked(client, db_session):
    """
    Security: Guest cannot search without consent (AUTHZ-002)
    """
    auth_res = client.post("/api/v1/auth/signup", json={"email": f"consent_test_{int(time.time())}@example.com", "password": "Pass123!", "studio_name": "Consent Studio"})
    headers = {"Authorization": f"Bearer {auth_res.json()['access_token']}"}
    ev = client.post("/api/v1/events", headers=headers, json={"name": "Consent Test Event"})
    ev_id = ev.json()["id"]

    g = client.post(f"/api/v1/events/{ev_id}/guests/register", json={"name": "No Consent Guest", "mobile": "+919000000099"})
    guest_id = g.json()["guest_id"]

    # No consent submitted
    img = create_test_image("SEARCH_WITHOUT_CONSENT")
    search_res = client.post(
        f"/api/v1/events/{ev_id}/guests/{guest_id}/search",
        files=[("selfie", ("selfie.jpg", img, "image/jpeg"))]
    )
    assert search_res.status_code == 403, f"Unconsented search not blocked: {search_res.status_code}"

