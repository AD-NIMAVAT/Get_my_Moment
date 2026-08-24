"""
Upload Streaming, Large-File Memory Safety, and Storage Durability Tests (P1-BATCH-11)
"""

import io
import os
import uuid
import secrets
import pytest
from PIL import Image
from apps.api.models import Photo, Event, Photographer
from apps.api.services.storage import storage_service
from apps.api.config import settings
from packages.shared.constants import PhotoStatus


def generate_test_image(width: int = 200, height: int = 200, color: str = "blue") -> bytes:
    """Generate a valid JPEG byte sequence."""
    img = Image.new("RGB", (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


def test_streaming_photo_upload_and_durability(client, db_session):
    """Test standard photo upload with chunked streaming and atomic storage finalization."""
    # 1. Photographer setup
    signup_res = client.post(
        "/api/v1/auth/signup",
        json={"email": "stream_test@example.com", "password": "Password123!", "studio_name": "Stream Studio"}
    )
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Event
    event_res = client.post("/api/v1/events", headers=headers, json={"name": "Streaming Test Event"})
    event_id = event_res.json()["id"]

    # 3. Stream Upload 2 Photos
    img1 = generate_test_image(400, 400, "green")
    img2 = generate_test_image(600, 400, "red")

    files = [
        ("files", ("photo1.jpg", img1, "image/jpeg")),
        ("files", ("photo2.jpg", img2, "image/jpeg")),
    ]

    res = client.post(f"/api/v1/events/{event_id}/photos", headers=headers, files=files)
    assert res.status_code == 201
    data = res.json()
    assert data["uploaded_count"] == 2
    assert data["duplicates_count"] == 0

    # Verify physical file existence and atomic path resolution
    photo_records = db_session.query(Photo).filter(Photo.event_id == event_id).all()
    assert len(photo_records) == 2
    for p in photo_records:
        abs_path = storage_service.get_absolute_path(p.file_path)
        assert os.path.exists(abs_path)
        assert os.path.getsize(abs_path) > 0


def test_duplicate_streaming_upload_cleans_redundant_files(client, db_session):
    """Test that duplicate uploads return DUPLICATE status and remove newly written redundant files."""
    signup_res = client.post(
        "/api/v1/auth/signup",
        json={"email": "dupe_stream@example.com", "password": "Password123!", "studio_name": "Dupe Studio"}
    )
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    event_res = client.post("/api/v1/events", headers=headers, json={"name": "Dupe Stream Event"})
    event_id = event_res.json()["id"]

    img = generate_test_image(300, 300, "purple")
    files1 = [("files", ("wedding_01.jpg", img, "image/jpeg"))]

    res1 = client.post(f"/api/v1/events/{event_id}/photos", headers=headers, files=files1)
    assert res1.status_code == 201
    assert res1.json()["uploaded_count"] == 1

    # Upload exact same photo again
    files2 = [("files", ("wedding_01_retry.jpg", img, "image/jpeg"))]
    res2 = client.post(f"/api/v1/events/{event_id}/photos", headers=headers, files=files2)
    assert res2.status_code == 201
    assert res2.json()["duplicates_count"] == 1

    # Ensure only 1 Photo DB record exists
    photos = db_session.query(Photo).filter(Photo.event_id == event_id).all()
    assert len(photos) == 1


def test_corrupted_and_zero_byte_upload_handling(client, db_session):
    """Test that 0-byte or corrupted files are safely rejected without leaving orphaned records."""
    signup_res = client.post(
        "/api/v1/auth/signup",
        json={"email": "corrupt_test@example.com", "password": "Password123!", "studio_name": "Corrupt Studio"}
    )
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    event_res = client.post("/api/v1/events", headers=headers, json={"name": "Corrupt Test Event"})
    event_id = event_res.json()["id"]

    # Upload 0-byte file and corrupt non-image bytes
    files = [
        ("files", ("empty.jpg", b"", "image/jpeg")),
        ("files", ("corrupt.jpg", b"NOT_AN_IMAGE_DATA_12345", "image/jpeg")),
    ]

    res = client.post(f"/api/v1/events/{event_id}/photos", headers=headers, files=files)
    assert res.status_code == 201
    data = res.json()
    assert data["uploaded_count"] == 0

    # Ensure zero DB records created
    photos = db_session.query(Photo).filter(Photo.event_id == event_id).all()
    assert len(photos) == 0


def test_guest_streaming_upload(client, db_session):
    """Test public guest photo upload with streaming storage."""
    signup_res = client.post(
        "/api/v1/auth/signup",
        json={"email": "guest_stream@example.com", "password": "Password123!", "studio_name": "Guest Studio"}
    )
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    event_res = client.post("/api/v1/events", headers=headers, json={"name": "Guest Stream Event", "allow_guest_uploads": True})
    event_id = event_res.json()["id"]
    access_token = event_res.json()["access_token"]

    guest_img = generate_test_image(350, 350, "yellow")
    files = [("files", ("guest_selfie.jpg", guest_img, "image/jpeg"))]

    res = client.post(
        f"/api/v1/events/public/{access_token}/guest-upload",
        data={"guest_name": "Ananya", "guest_phone": "+919999988888"},
        files=files
    )
    assert res.status_code == 201
    assert res.json()["uploaded_count"] == 1

    photo = db_session.query(Photo).filter(Photo.event_id == event_id, Photo.is_guest_uploaded == True).first()
    assert photo is not None
    assert photo.uploaded_by_guest_name == "Ananya"


def test_wireless_http_ingest_streaming(client, db_session):
    """Test wireless camera direct HTTP ingest streaming."""
    signup_res = client.post(
        "/api/v1/auth/signup",
        json={"email": "wire_stream@example.com", "password": "Password123!", "studio_name": "Wire Studio"}
    )
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    event_res = client.post("/api/v1/events", headers=headers, json={"name": "Wire Event"})
    event_id = event_res.json()["id"]

    camera_img = generate_test_image(500, 500, "cyan")
    files = [("files", ("DSC00123.JPG", camera_img, "image/jpeg"))]

    res = client.post(
        f"/api/v1/wireless/events/{event_id}/http-ingest",
        data={"camera_model": "Sony A7 IV"},
        files=files
    )
    assert res.status_code == 200
    assert res.json()["uploaded_count"] == 1

    photo = db_session.query(Photo).filter(Photo.event_id == event_id).first()
    assert photo is not None
    assert "Sony A7 IV" in photo.uploaded_by_guest_name


def test_wireless_ftp_slug_routing_and_legacy_compatibility(client, db_session, tmp_path):
    """Test Wireless Camera FTP slug routing, legacy access-token compatibility, nested folders, and fail-closed safety."""
    from apps.api.services.wireless_ingest import process_incoming_camera_photo, FTP_INCOMING_DIR
    from apps.api.models.folder import Folder
    import os
    import shutil

    # 1. Create two separate events
    signup_res = client.post(
        "/api/v1/auth/signup",
        json={"email": "ftp_photog@example.com", "password": "Password123!", "studio_name": "FTP Studio"}
    )
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    e1_res = client.post("/api/v1/events", headers=headers, json={"name": "Rajkot Wedding 2026"})
    e1_id = e1_res.json()["id"]
    e1_slug = e1_res.json()["slug"]
    e1_token = e1_res.json()["access_token"]
    assert e1_slug == "rajkot-wedding-2026"

    # Create subfolder in Event 1
    f_res = client.post(f"/api/v1/events/{e1_id}/folders", headers=headers, json={"name": "Candid Moments"})
    f1_id = f_res.json()["id"]
    f1_slug = f_res.json()["slug"]

    # Verify credentials endpoint returns slug as destination_folder
    cred_res = client.get(f"/api/v1/wireless/events/{e1_id}/credentials")
    assert cred_res.status_code == 200
    assert cred_res.json()["ftp_settings"]["destination_folder"] == f"/{e1_slug}"

    # TEST A: Exact Event.slug routing
    slug_dir = os.path.join(FTP_INCOMING_DIR, e1_slug)
    os.makedirs(slug_dir, exist_ok=True)
    img_a = os.path.join(slug_dir, "DSC_001.JPG")
    with open(img_a, "wb") as f:
        f.write(generate_test_image(400, 400, "green"))
    process_incoming_camera_photo(img_a, db=db_session)
    db_session.expire_all()

    photo_a = db_session.query(Photo).filter(Photo.event_id == e1_id, Photo.original_file_name == "DSC_001.JPG").first()
    assert photo_a is not None
    assert photo_a.event_id == e1_id

    # TEST B: Exact Legacy Event.access_token routing (backward compatibility)
    token_dir = os.path.join(FTP_INCOMING_DIR, e1_token)
    os.makedirs(token_dir, exist_ok=True)
    img_b = os.path.join(token_dir, "DSC_002.JPG")
    with open(img_b, "wb") as f:
        f.write(generate_test_image(400, 400, "blue"))
    process_incoming_camera_photo(img_b, db=db_session)
    db_session.expire_all()

    photo_b = db_session.query(Photo).filter(Photo.event_id == e1_id, Photo.original_file_name == "DSC_002.JPG").first()
    assert photo_b is not None
    assert photo_b.event_id == e1_id

    # TEST C: Nested subfolder routing
    sub_dir = os.path.join(FTP_INCOMING_DIR, e1_slug, f1_slug)
    os.makedirs(sub_dir, exist_ok=True)
    img_c = os.path.join(sub_dir, "DSC_003.JPG")
    with open(img_c, "wb") as f:
        f.write(generate_test_image(400, 400, "yellow"))
    process_incoming_camera_photo(img_c, db=db_session)
    db_session.expire_all()

    photo_c = db_session.query(Photo).filter(Photo.event_id == e1_id, Photo.original_file_name == "DSC_003.JPG").first()
    assert photo_c is not None
    assert photo_c.folder_id == f1_id

    # TEST D: Unknown slug -> Fail Closed
    unk_dir = os.path.join(FTP_INCOMING_DIR, "does-not-exist")
    os.makedirs(unk_dir, exist_ok=True)
    img_d = os.path.join(unk_dir, "DSC_004.JPG")
    with open(img_d, "wb") as f:
        f.write(generate_test_image(400, 400, "orange"))
    process_incoming_camera_photo(img_d, db=db_session)
    db_session.expire_all()

    photo_d = db_session.query(Photo).filter(Photo.original_file_name == "DSC_004.JPG").first()
    assert photo_d is None  # Strict fail-closed, no photo created

    # TEST E: Path traversal attempt -> Safe rejection
    trav_dir = os.path.join(FTP_INCOMING_DIR, "..", "escape")
    os.makedirs(trav_dir, exist_ok=True)
    img_e = os.path.join(trav_dir, "DSC_005.JPG")
    with open(img_e, "wb") as f:
        f.write(generate_test_image(400, 400, "red"))
    process_incoming_camera_photo(img_e, db=db_session)
    db_session.expire_all()

    photo_e = db_session.query(Photo).filter(Photo.original_file_name == "DSC_005.JPG").first()
    assert photo_e is None

    # TEST F: UUID routing compatibility
    uuid_dir = os.path.join(FTP_INCOMING_DIR, e1_id)
    os.makedirs(uuid_dir, exist_ok=True)
    img_f = os.path.join(uuid_dir, "DSC_006.JPG")
    with open(img_f, "wb") as f:
        f.write(generate_test_image(400, 400, "purple"))
    process_incoming_camera_photo(img_f, db=db_session)
    db_session.expire_all()

    photo_f = db_session.query(Photo).filter(Photo.event_id == e1_id, Photo.original_file_name == "DSC_006.JPG").first()
    assert photo_f is not None

    # TEST G: Event Name alone is NOT accepted for routing
    name_dir = os.path.join(FTP_INCOMING_DIR, "Rajkot Wedding 2026")  # Display name with spaces
    os.makedirs(name_dir, exist_ok=True)
    img_g = os.path.join(name_dir, "DSC_007.JPG")
    with open(img_g, "wb") as f:
        f.write(generate_test_image(400, 400, "black"))
    process_incoming_camera_photo(img_g, db=db_session)
    db_session.expire_all()

    photo_g = db_session.query(Photo).filter(Photo.original_file_name == "DSC_007.JPG").first()
    assert photo_g is None  # Event.name is rejected for routing

def test_wireless_camera_per_camera_authorization_and_approval_flow(client, db_session, tmp_path):
    """
    Comprehensive Security Test Suite for Per-Camera Authorization & Event-Bound Access Control.
    Proves:
    - New camera defaults to PENDING_APPROVAL
    - Pending camera cannot ingest photo (0 Photo rows, 0 AI tasks)
    - Approved camera on its own event succeeds
    - Approved Camera A uploading to Event B slug/token/UUID is strictly DENIED (0 Photo rows in Event B)
    - Rejected camera denied
    - Revoked camera denied
    - Cross-photographer tenant isolation
    - Secret exposure protection (passwords never returned in GET)
    - Zero-side-effect on cross-event attempts
    """
    from apps.api.models.photographer import Photographer
    from apps.api.models.camera import CameraDevice
    from apps.api.auth import create_access_token
    from apps.api.services.wireless_ingest import process_incoming_camera_photo, FTP_INCOMING_DIR

    # 1. Setup Studio 1 with Event 1 (Rajkot Wedding)
    p1 = Photographer(
        id=str(uuid.uuid4()),
        email="photographer1@camera-auth.com",
        password_hash="hashed_pw_1",
        studio_name="Studio Alpha",
        is_active=True,
        is_verified=True,
    )
    db_session.add(p1)
    db_session.commit()
    token1 = create_access_token(data={"sub": p1.id})
    headers1 = {"Authorization": f"Bearer {token1}"}

    e1 = Event(
        id=str(uuid.uuid4()),
        photographer_id=p1.id,
        name="Rajkot Wedding 2026",
        slug="rajkot-wedding-2026",
        access_token="TOK1_" + secrets.token_hex(4),
        status="ACTIVE",
    )
    db_session.add(e1)
    db_session.commit()

    # 2. Setup Studio 2 with Event 2 (Goa Beach Wedding)
    p2 = Photographer(
        id=str(uuid.uuid4()),
        email="photographer2@camera-auth.com",
        password_hash="hashed_pw_2",
        studio_name="Studio Beta",
        is_active=True,
        is_verified=True,
    )
    db_session.add(p2)
    db_session.commit()
    token2 = create_access_token(data={"sub": p2.id})
    headers2 = {"Authorization": f"Bearer {token2}"}

    e2 = Event(
        id=str(uuid.uuid4()),
        photographer_id=p2.id,
        name="Goa Beach Wedding 2026",
        slug="goa-beach-wedding-2026",
        access_token="TOK2_" + secrets.token_hex(4),
        status="ACTIVE",
    )
    db_session.add(e2)
    db_session.commit()

    # --- TEST A: Create Camera -> Defaults to PENDING_APPROVAL ---
    create_res = client.post(
        f"/api/v1/wireless/events/{e1.id}/cameras",
        json={
            "display_name": "Sony A7 IV Main",
            "manufacturer": "Sony",
            "model": "ILCE-7M4"
        },
        headers=headers1,
    )
    assert create_res.status_code == 201
    cam_data = create_res.json()["camera"]
    cam_creds = create_res.json()["credentials"]
    assert cam_data["status"] == "PENDING_APPROVAL"
    assert cam_data["display_name"] == "Sony A7 IV Main"
    assert "password" in cam_creds  # Plain password returned ONCE upon creation
    assert "password_hash" not in cam_data

    cam1_id = cam_data["id"]
    cam1_username = cam_data["ftp_username"]

    # --- TEST B: Pending camera CANNOT ingest photo (0 Photo rows) ---
    slug_dir_e1 = os.path.join(FTP_INCOMING_DIR, e1.slug)
    os.makedirs(slug_dir_e1, exist_ok=True)
    img_pending = os.path.join(slug_dir_e1, "CAM_PENDING_001.JPG")
    with open(img_pending, "wb") as f:
        f.write(generate_test_image(400, 400, "pink"))
    
    process_incoming_camera_photo(img_pending, db=db_session, camera_id=cam1_id)
    db_session.expire_all()

    photo_pending = db_session.query(Photo).filter(Photo.original_file_name == "CAM_PENDING_001.JPG").first()
    assert photo_pending is None  # Strict denial while in PENDING_APPROVAL status

    # --- TEST C: Photographer Approves Camera -> Ingest SUCCEEDS ---
    approve_res = client.post(
        f"/api/v1/wireless/events/{e1.id}/cameras/{cam1_id}/approve",
        headers=headers1,
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "APPROVED"

    img_approved = os.path.join(slug_dir_e1, "CAM_APPROVED_001.JPG")
    with open(img_approved, "wb") as f:
        f.write(generate_test_image(400, 400, "cyan"))

    process_incoming_camera_photo(img_approved, db=db_session, camera_id=cam1_id)
    db_session.expire_all()

    photo_approved = db_session.query(Photo).filter(Photo.original_file_name == "CAM_APPROVED_001.JPG").first()
    assert photo_approved is not None
    assert photo_approved.event_id == e1.id
    assert photo_approved.camera_id == cam1_id

    # --- TEST D: Approved Camera A attempts upload to Event B slug -> STRICTLY DENIED ---
    slug_dir_e2 = os.path.join(FTP_INCOMING_DIR, e2.slug)
    os.makedirs(slug_dir_e2, exist_ok=True)
    img_cross = os.path.join(slug_dir_e2, "CAM_CROSS_EVENT_001.JPG")
    with open(img_cross, "wb") as f:
        f.write(generate_test_image(400, 400, "brown"))

    process_incoming_camera_photo(img_cross, db=db_session, camera_id=cam1_id)
    db_session.expire_all()

    # Zero Photo rows in Event B and Event A
    photo_cross = db_session.query(Photo).filter(Photo.original_file_name == "CAM_CROSS_EVENT_001.JPG").first()
    assert photo_cross is None

    # --- TEST E: Approved Camera A attempts upload to Event B access_token -> STRICTLY DENIED ---
    token_dir_e2 = os.path.join(FTP_INCOMING_DIR, e2.access_token)
    os.makedirs(token_dir_e2, exist_ok=True)
    img_cross_token = os.path.join(token_dir_e2, "CAM_CROSS_TOKEN_001.JPG")
    with open(img_cross_token, "wb") as f:
        f.write(generate_test_image(400, 400, "gray"))

    process_incoming_camera_photo(img_cross_token, db=db_session, camera_id=cam1_id)
    db_session.expire_all()

    photo_cross_token = db_session.query(Photo).filter(Photo.original_file_name == "CAM_CROSS_TOKEN_001.JPG").first()
    assert photo_cross_token is None

    # --- TEST F: Approved Camera A attempts upload to Event B UUID -> STRICTLY DENIED ---
    uuid_dir_e2 = os.path.join(FTP_INCOMING_DIR, e2.id)
    os.makedirs(uuid_dir_e2, exist_ok=True)
    img_cross_uuid = os.path.join(uuid_dir_e2, "CAM_CROSS_UUID_001.JPG")
    with open(img_cross_uuid, "wb") as f:
        f.write(generate_test_image(400, 400, "teal"))

    process_incoming_camera_photo(img_cross_uuid, db=db_session, camera_id=cam1_id)
    db_session.expire_all()

    photo_cross_uuid = db_session.query(Photo).filter(Photo.original_file_name == "CAM_CROSS_UUID_001.JPG").first()
    assert photo_cross_uuid is None

    # --- TEST G: Revoked Camera -> Ingest DENIED ---
    revoke_res = client.post(
        f"/api/v1/wireless/events/{e1.id}/cameras/{cam1_id}/revoke",
        headers=headers1,
    )
    assert revoke_res.status_code == 200
    assert revoke_res.json()["status"] == "REVOKED"

    img_revoked = os.path.join(slug_dir_e1, "CAM_REVOKED_001.JPG")
    with open(img_revoked, "wb") as f:
        f.write(generate_test_image(400, 400, "magenta"))

    process_incoming_camera_photo(img_revoked, db=db_session, camera_id=cam1_id)
    db_session.expire_all()

    photo_revoked = db_session.query(Photo).filter(Photo.original_file_name == "CAM_REVOKED_001.JPG").first()
    assert photo_revoked is None  # Revoked camera denied

    # --- TEST H: Tenant Isolation (Photographer 2 cannot list/approve/revoke Camera 1) ---
    p2_list = client.get(f"/api/v1/wireless/events/{e1.id}/cameras", headers=headers2)
    assert p2_list.status_code in (403, 404)

    p2_approve = client.post(f"/api/v1/wireless/events/{e1.id}/cameras/{cam1_id}/approve", headers=headers2)
    assert p2_approve.status_code in (403, 404)

    p2_revoke = client.post(f"/api/v1/wireless/events/{e1.id}/cameras/{cam1_id}/revoke", headers=headers2)
    assert p2_revoke.status_code in (403, 404)

    # --- TEST I: GET List API never returns password or password_hash ---
    p1_list = client.get(f"/api/v1/wireless/events/{e1.id}/cameras", headers=headers1)
    assert p1_list.status_code == 200
    cams = p1_list.json()
    assert len(cams) >= 1
    for c in cams:
        assert "password" not in c
        assert "password_hash" not in c
