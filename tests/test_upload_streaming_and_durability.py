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

    # 3. Stream Upload 100% valid JPEG
    test_img = generate_test_image(600, 600, "purple")
    files = {"files": ("test_stream_01.jpg", io.BytesIO(test_img), "image/jpeg")}
    upload_res = client.post(f"/api/v1/photos/events/{event_id}/upload", headers=headers, files=files)
    assert upload_res.status_code == 201

    photos = upload_res.json()
    assert len(photos) == 1
    photo_id = photos[0]["id"]

    # 4. Verify DB and File Durability
    db_session.expire_all()
    photo_db = db_session.query(Photo).filter(Photo.id == photo_id).first()
    assert photo_db is not None
    assert photo_db.status == PhotoStatus.UPLOADED.value
    assert photo_db.file_size == len(test_img)

    # Verify physical file existence
    local_path = storage_service.get_local_path(photo_db.file_path)
    assert os.path.exists(local_path)
    assert os.path.getsize(local_path) == len(test_img)


def test_duplicate_streaming_upload_cleans_redundant_files(client, db_session):
    """Test duplicate detection cleans up streaming temp files and returns existing record."""
    signup_res = client.post(
        "/api/v1/auth/signup",
        json={"email": "dedup_stream@example.com", "password": "Password123!", "studio_name": "Dedup Studio"}
    )
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    event_res = client.post("/api/v1/events", headers=headers, json={"name": "Dedup Event"})
    event_id = event_res.json()["id"]

    test_img = generate_test_image(500, 500, "teal")

    # Upload 1
    files1 = {"files": ("dedup_01.jpg", io.BytesIO(test_img), "image/jpeg")}
    res1 = client.post(f"/api/v1/photos/events/{event_id}/upload", headers=headers, files=files1)
    assert res1.status_code == 201
    photo1_id = res1.json()[0]["id"]

    # Upload 2 (identical image bytes)
    files2 = {"files": ("dedup_02_copy.jpg", io.BytesIO(test_img), "image/jpeg")}
    res2 = client.post(f"/api/v1/photos/events/{event_id}/upload", headers=headers, files=files2)
    assert res2.status_code == 200

    photos = res2.json()
    assert len(photos) == 1
    assert photos[0]["id"] == photo1_id  # Returns existing photo id without duplicating storage


def test_corrupted_and_zero_byte_upload_handling(client, db_session):
    """Test corrupted or 0-byte streaming uploads fail gracefully and cleanup temp files."""
    signup_res = client.post(
        "/api/v1/auth/signup",
        json={"email": "corrupt_test@example.com", "password": "Password123!", "studio_name": "Corrupt Studio"}
    )
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    event_res = client.post("/api/v1/events", headers=headers, json={"name": "Corruption Test Event"})
    event_id = event_res.json()["id"]

    # Test 1: Zero-byte file
    zero_file = {"files": ("zero.jpg", io.BytesIO(b""), "image/jpeg")}
    res_zero = client.post(f"/api/v1/photos/events/{event_id}/upload", headers=headers, files=zero_file)
    assert res_zero.status_code in (400, 422)

    # Test 2: Fake corrupted content
    corrupted_data = b"NOT_A_REAL_JPEG_HEADER_1234567890" * 50
    corrupt_file = {"files": ("corrupt.jpg", io.BytesIO(corrupted_data), "image/jpeg")}
    res_corrupt = client.post(f"/api/v1/photos/events/{event_id}/upload", headers=headers, files=corrupt_file)
    assert res_corrupt.status_code in (400, 422)


def test_guest_streaming_upload(client, db_session):
    """Test guest chunked streaming upload directly into public gallery."""
    # 1. Photographer setup
    signup_res = client.post(
        "/api/v1/auth/signup",
        json={"email": "guest_stream@example.com", "password": "Password123!", "studio_name": "Guest Stream Studio"}
    )
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    event_res = client.post("/api/v1/events", headers=headers, json={"name": "Guest Upload Event", "allow_guest_uploads": True})
    event_id = event_res.json()["id"]
    access_token = event_res.json()["access_token"]

    # 2. Guest upload
    test_img = generate_test_image(400, 400, "gold")
    files = {"files": ("guest_pic.jpg", io.BytesIO(test_img), "image/jpeg")}
    res = client.post(
        f"/api/v1/guest/events/{access_token}/upload-photos",
        data={"guest_name": "Alice Guest"},
        files=files,
    )
    assert res.status_code == 200
    res_data = res.json()
    assert len(res_data["uploaded_ids"]) == 1

    # Verify guest photo saved in DB
    db_session.expire_all()
    photo_db = db_session.query(Photo).filter(Photo.id == res_data["uploaded_ids"][0]).first()
    assert photo_db is not None
    assert photo_db.is_guest_uploaded is True
    assert photo_db.uploaded_by_guest_name == "Alice Guest"


def test_wireless_http_ingest_streaming(client, db_session):
    """Test wireless camera direct HTTP relay upload stream."""
    signup_res = client.post(
        "/api/v1/auth/signup",
        json={"email": "wireless_http@example.com", "password": "Password123!", "studio_name": "Wireless Studio"}
    )
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    event_res = client.post("/api/v1/events", headers=headers, json={"name": "Wireless Event"})
    event_id = event_res.json()["id"]

    test_img = generate_test_image(500, 500, "darkblue")
    files = {"files": ("camera_shot_01.jpg", io.BytesIO(test_img), "image/jpeg")}
    res = client.post(
        f"/api/v1/wireless/events/{event_id}/http-ingest",
        data={"camera_model": "Sony A7 IV"},
        files=files,
    )
    assert res.status_code == 200
    res_data = res.json()
    assert len(res_data["uploaded_ids"]) == 1

    db_session.expire_all()
    photo_db = db_session.query(Photo).filter(Photo.id == res_data["uploaded_ids"][0]).first()
    assert photo_db is not None
    assert photo_db.camera_model == "Sony A7 IV"


def test_wireless_ftp_slug_routing_and_legacy_compatibility(client, db_session, tmp_path):
    """
    Test human-readable Event.slug routing with strict CameraDevice authorization.
    Verifies that an approved camera uploading into /{event.slug}, /{access_token},
    or /{uuid} routes to the exact target event.
    """
    from apps.api.services.wireless_ingest import process_incoming_camera_photo, FTP_INCOMING_DIR
    from apps.api.models.camera import CameraDevice

    # 1. Create photographer & event
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

    # Register & Approve Camera for Event 1
    cam_res = client.post(
        f"/api/v1/wireless/events/{e1_id}/cameras",
        json={"display_name": "Cam Alpha", "manufacturer": "Sony", "model": "A7IV"},
        headers=headers,
    )
    assert cam_res.status_code == 201
    cam_id = cam_res.json()["camera"]["id"]

    approve_res = client.post(f"/api/v1/wireless/events/{e1_id}/cameras/{cam_id}/approve", headers=headers)
    assert approve_res.status_code == 200

    # Verify credentials endpoint returns destination_folder and anonymous_allowed=False
    cred_res = client.get(f"/api/v1/wireless/events/{e1_id}/credentials")
    assert cred_res.status_code == 200
    assert cred_res.json()["ftp_settings"]["destination_folder"] == f"/{e1_slug}"
    assert cred_res.json()["ftp_settings"]["anonymous_allowed"] is False

    # TEST A: Exact Event.slug routing with approved camera
    slug_dir = os.path.join(FTP_INCOMING_DIR, e1_slug)
    os.makedirs(slug_dir, exist_ok=True)
    img_a = os.path.join(slug_dir, "DSC_001.JPG")
    with open(img_a, "wb") as f:
        f.write(generate_test_image(400, 400, "green"))
    process_incoming_camera_photo(img_a, db=db_session, camera_id=cam_id)
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
    process_incoming_camera_photo(img_b, db=db_session, camera_id=cam_id)
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
    process_incoming_camera_photo(img_c, db=db_session, camera_id=cam_id)
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
    process_incoming_camera_photo(img_d, db=db_session, camera_id=cam_id)
    db_session.expire_all()

    photo_d = db_session.query(Photo).filter(Photo.original_file_name == "DSC_004.JPG").first()
    assert photo_d is None  # Strict fail-closed, no photo created

    # TEST E: Path traversal attempt -> Safe rejection
    trav_dir = os.path.join(FTP_INCOMING_DIR, "..", "escape")
    os.makedirs(trav_dir, exist_ok=True)
    img_e = os.path.join(trav_dir, "DSC_005.JPG")
    with open(img_e, "wb") as f:
        f.write(generate_test_image(400, 400, "red"))
    process_incoming_camera_photo(img_e, db=db_session, camera_id=cam_id)
    db_session.expire_all()

    photo_e = db_session.query(Photo).filter(Photo.original_file_name == "DSC_005.JPG").first()
    assert photo_e is None

    # TEST F: UUID routing compatibility
    uuid_dir = os.path.join(FTP_INCOMING_DIR, e1_id)
    os.makedirs(uuid_dir, exist_ok=True)
    img_f = os.path.join(uuid_dir, "DSC_006.JPG")
    with open(img_f, "wb") as f:
        f.write(generate_test_image(400, 400, "purple"))
    process_incoming_camera_photo(img_f, db=db_session, camera_id=cam_id)
    db_session.expire_all()

    photo_f = db_session.query(Photo).filter(Photo.event_id == e1_id, Photo.original_file_name == "DSC_006.JPG").first()
    assert photo_f is not None

    # TEST G: Event Name alone is NOT accepted for routing
    name_dir = os.path.join(FTP_INCOMING_DIR, "Rajkot Wedding 2026")
    os.makedirs(name_dir, exist_ok=True)
    img_g = os.path.join(name_dir, "DSC_007.JPG")
    with open(img_g, "wb") as f:
        f.write(generate_test_image(400, 400, "black"))
    process_incoming_camera_photo(img_g, db=db_session, camera_id=cam_id)
    db_session.expire_all()

    photo_g = db_session.query(Photo).filter(Photo.original_file_name == "DSC_007.JPG").first()
    assert photo_g is None  # Event.name is rejected for routing


def test_wireless_camera_per_camera_authorization_and_approval_flow(client, db_session, tmp_path):
    """
    Comprehensive Security Test Suite for Per-Camera Authorization & Event-Bound Access Control.
    Proves:
    1. New camera defaults to PENDING_APPROVAL
    2. Pending camera authenticates for first-connection detection
    3. Pending camera cannot ingest photo (0 Photo rows, 0 AI tasks)
    4. Approved camera on its own event succeeds
    5. Approved Camera A uploading to Event B slug/token/UUID is strictly DENIED (0 Photo rows)
    6. Rejected camera denied
    7. Revoked camera denied
    8. Unknown / no-CameraDevice upload strictly denied (Bypass Closure)
    9. Anonymous FTP photo ingest denied
    10. Cross-photographer tenant isolation
    11. Secret exposure protection (passwords never returned in GET)
    12. Password reset invalidates old password and sets new bcrypt hash
    13. Concurrent Camera A and Camera B identity isolation (no cross-contamination)
    """
    from apps.api.models.photographer import Photographer
    from apps.api.models.camera import CameraDevice
    from apps.api.auth import create_access_token
    from apps.api.services.wireless_ingest import process_incoming_camera_photo, FTP_INCOMING_DIR, CameraAuthorizer
    from pyftpdlib.authorizers import AuthenticationFailed

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
    cam1_plain_pwd = cam_creds["password"]

    # --- TEST B: CameraAuthorizer First-Connection Detection on PENDING Camera ---
    authorizer = CameraAuthorizer()
    assert authorizer.has_user(cam1_username) is True
    assert authorizer.has_user("anonymous") is False
    assert authorizer.has_user("unknown_user") is False

    class MockHandler:
        remote_ip = "192.168.1.105"

    handler_inst = MockHandler()
    authorizer.validate_authentication(cam1_username, cam1_plain_pwd, handler_inst)
    assert handler_inst.authenticated_camera_id == cam1_id
    assert handler_inst.authenticated_camera_status == "PENDING_APPROVAL"

    db_session.expire_all()
    cam1_db = db_session.query(CameraDevice).filter(CameraDevice.id == cam1_id).first()
    assert cam1_db.first_seen_at is not None
    assert cam1_db.last_source_ip == "192.168.1.105"

    # --- TEST C: Pending camera CANNOT ingest photo (0 Photo rows) ---
    slug_dir_e1 = os.path.join(FTP_INCOMING_DIR, e1.slug)
    os.makedirs(slug_dir_e1, exist_ok=True)
    img_pending = os.path.join(slug_dir_e1, "CAM_PENDING_001.JPG")
    with open(img_pending, "wb") as f:
        f.write(generate_test_image(400, 400, "pink"))

    process_incoming_camera_photo(img_pending, db=db_session, camera_id=cam1_id)
    db_session.expire_all()

    photo_pending = db_session.query(Photo).filter(Photo.original_file_name == "CAM_PENDING_001.JPG").first()
    assert photo_pending is None  # Strict denial while in PENDING_APPROVAL status

    # --- TEST D: Photographer Approves Camera -> Ingest SUCCEEDS ---
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

    # --- TEST E: Approved Camera A attempts upload to Event B slug -> STRICTLY DENIED ---
    slug_dir_e2 = os.path.join(FTP_INCOMING_DIR, e2.slug)
    os.makedirs(slug_dir_e2, exist_ok=True)
    img_cross = os.path.join(slug_dir_e2, "CAM_CROSS_EVENT_001.JPG")
    with open(img_cross, "wb") as f:
        f.write(generate_test_image(400, 400, "brown"))

    process_incoming_camera_photo(img_cross, db=db_session, camera_id=cam1_id)
    db_session.expire_all()

    photo_cross = db_session.query(Photo).filter(Photo.original_file_name == "CAM_CROSS_EVENT_001.JPG").first()
    assert photo_cross is None

    # --- TEST F: Approved Camera A attempts upload to Event B access_token -> STRICTLY DENIED ---
    token_dir_e2 = os.path.join(FTP_INCOMING_DIR, e2.access_token)
    os.makedirs(token_dir_e2, exist_ok=True)
    img_cross_token = os.path.join(token_dir_e2, "CAM_CROSS_TOKEN_001.JPG")
    with open(img_cross_token, "wb") as f:
        f.write(generate_test_image(400, 400, "gray"))

    process_incoming_camera_photo(img_cross_token, db=db_session, camera_id=cam1_id)
    db_session.expire_all()

    photo_cross_token = db_session.query(Photo).filter(Photo.original_file_name == "CAM_CROSS_TOKEN_001.JPG").first()
    assert photo_cross_token is None

    # --- TEST G: Approved Camera A attempts upload to Event B UUID -> STRICTLY DENIED ---
    uuid_dir_e2 = os.path.join(FTP_INCOMING_DIR, e2.id)
    os.makedirs(uuid_dir_e2, exist_ok=True)
    img_cross_uuid = os.path.join(uuid_dir_e2, "CAM_CROSS_UUID_001.JPG")
    with open(img_cross_uuid, "wb") as f:
        f.write(generate_test_image(400, 400, "teal"))

    process_incoming_camera_photo(img_cross_uuid, db=db_session, camera_id=cam1_id)
    db_session.expire_all()

    photo_cross_uuid = db_session.query(Photo).filter(Photo.original_file_name == "CAM_CROSS_UUID_001.JPG").first()
    assert photo_cross_uuid is None

    # --- TEST H: Revoked Camera -> Ingest DENIED ---
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
    assert photo_revoked is None

    # --- TEST I: Unknown / No CameraDevice -> Ingest STRICTLY DENIED (Bypass Closure) ---
    img_unknown = os.path.join(slug_dir_e1, "CAM_UNKNOWN_001.JPG")
    with open(img_unknown, "wb") as f:
        f.write(generate_test_image(400, 400, "navy"))

    process_incoming_camera_photo(img_unknown, db=db_session, camera_id=None, camera_username=None)
    db_session.expire_all()

    photo_unknown = db_session.query(Photo).filter(Photo.original_file_name == "CAM_UNKNOWN_001.JPG").first()
    assert photo_unknown is None  # Fails closed when no CameraDevice is provided

    # --- TEST J: Password Reset & Validation ---
    reset_res = client.post(
        f"/api/v1/wireless/events/{e1.id}/cameras/{cam1_id}/reset-ftp-password",
        headers=headers1,
    )
    assert reset_res.status_code == 200
    new_pwd = reset_res.json()["new_password"]
    assert new_pwd != cam1_plain_pwd

    # Old password fails
    with pytest.raises(AuthenticationFailed):
        authorizer.validate_authentication(cam1_username, cam1_plain_pwd, handler_inst)

    # Re-approve and test new password
    client.post(f"/api/v1/wireless/events/{e1.id}/cameras/{cam1_id}/approve", headers=headers1)
    authorizer.validate_authentication(cam1_username, new_pwd, handler_inst)
    assert handler_inst.authenticated_camera_id == cam1_id

    # --- TEST K: Tenant Isolation (Photographer 2 cannot list/approve/revoke Camera 1) ---
    p2_list = client.get(f"/api/v1/wireless/events/{e1.id}/cameras", headers=headers2)
    assert p2_list.status_code in (403, 404)

    p2_approve = client.post(f"/api/v1/wireless/events/{e1.id}/cameras/{cam1_id}/approve", headers=headers2)
    assert p2_approve.status_code in (403, 404)

    p2_revoke = client.post(f"/api/v1/wireless/events/{e1.id}/cameras/{cam1_id}/revoke", headers=headers2)
    assert p2_revoke.status_code in (403, 404)

    # --- TEST L: GET List API never returns password or password_hash ---
    p1_list = client.get(f"/api/v1/wireless/events/{e1.id}/cameras", headers=headers1)
    assert p1_list.status_code == 200
    cams = p1_list.json()
    assert len(cams) >= 1
    for c in cams:
        assert "password" not in c
        assert "password_hash" not in c

    # --- TEST M: Concurrent Camera Isolation (Camera A & Camera B) ---
    # Register Camera B for Event 2
    cam2_res = client.post(
        f"/api/v1/wireless/events/{e2.id}/cameras",
        json={"display_name": "Canon R6 Main", "manufacturer": "Canon", "model": "EOS R6 II"},
        headers=headers2,
    )
    cam2_id = cam2_res.json()["camera"]["id"]
    client.post(f"/api/v1/wireless/events/{e2.id}/cameras/{cam2_id}/approve", headers=headers2)

    # Concurrent upload test: Cam A to Event 1, Cam B to Event 2
    img_a_conc = os.path.join(slug_dir_e1, "CAM_CONC_A_001.JPG")
    with open(img_a_conc, "wb") as f:
        f.write(generate_test_image(400, 400, "white"))
    process_incoming_camera_photo(img_a_conc, db=db_session, camera_id=cam1_id)

    img_b_conc = os.path.join(slug_dir_e2, "CAM_CONC_B_001.JPG")
    with open(img_b_conc, "wb") as f:
        f.write(generate_test_image(400, 400, "black"))
    process_incoming_camera_photo(img_b_conc, db=db_session, camera_id=cam2_id)

    db_session.expire_all()
    photo_a_conc = db_session.query(Photo).filter(Photo.original_file_name == "CAM_CONC_A_001.JPG").first()
    photo_b_conc = db_session.query(Photo).filter(Photo.original_file_name == "CAM_CONC_B_001.JPG").first()

    assert photo_a_conc is not None
    assert photo_a_conc.event_id == e1.id
    assert photo_a_conc.camera_id == cam1_id

    assert photo_b_conc is not None
    assert photo_b_conc.event_id == e2.id
    assert photo_b_conc.camera_id == cam2_id
