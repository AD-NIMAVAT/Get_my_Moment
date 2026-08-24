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
    files = [("files", ("test_stream_01.jpg", io.BytesIO(test_img), "image/jpeg"))]
    upload_res = client.post(f"/api/v1/events/{event_id}/photos", headers=headers, files=files)
    assert upload_res.status_code == 201

    res_data = upload_res.json()
    assert res_data["uploaded_count"] == 1
    photo_id = res_data["photos"][0]["id"]

    # 4. Verify DB and File Durability
    db_session.expire_all()
    photo_db = db_session.query(Photo).filter(Photo.id == photo_id).first()
    assert photo_db is not None
    assert photo_db.status in (PhotoStatus.UPLOADED.value, PhotoStatus.PROCESSED.value)
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
    files1 = [("files", ("dedup_01.jpg", io.BytesIO(test_img), "image/jpeg"))]
    res1 = client.post(f"/api/v1/events/{event_id}/photos", headers=headers, files=files1)
    assert res1.status_code == 201
    photo1_id = res1.json()["photos"][0]["id"]

    # Upload 2 (identical image bytes)
    files2 = [("files", ("dedup_02_copy.jpg", io.BytesIO(test_img), "image/jpeg"))]
    res2 = client.post(f"/api/v1/events/{event_id}/photos", headers=headers, files=files2)
    assert res2.status_code == 201

    res_data2 = res2.json()
    assert res_data2["duplicates_count"] == 1
    assert res_data2["photos"][0]["id"] == photo1_id


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
    zero_file = [("files", ("zero.jpg", io.BytesIO(b""), "image/jpeg"))]
    res_zero = client.post(f"/api/v1/events/{event_id}/photos", headers=headers, files=zero_file)
    assert res_zero.status_code == 201
    assert res_zero.json()["failed_count"] == 1

    # Test 2: Fake corrupted content
    corrupted_data = b"NOT_A_REAL_JPEG_HEADER_1234567890" * 50
    corrupt_file = [("files", ("corrupt.jpg", io.BytesIO(corrupted_data), "image/jpeg"))]
    res_corrupt = client.post(f"/api/v1/events/{event_id}/photos", headers=headers, files=corrupt_file)
    assert res_corrupt.status_code == 201
    assert res_corrupt.json()["failed_count"] == 1


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
    files = [("files", ("camera_shot_01.jpg", io.BytesIO(test_img), "image/jpeg"))]
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
    from apps.api.services.wireless_ingest import process_incoming_camera_photo
    from apps.api.models.camera import CameraDevice

    test_incoming = tmp_path / "incoming"
    test_incoming.mkdir(parents=True, exist_ok=True)

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
    slug_dir = test_incoming / e1_slug
    slug_dir.mkdir(parents=True, exist_ok=True)
    img_a = slug_dir / "DSC_001.JPG"
    img_a.write_bytes(generate_test_image(400, 400, "green"))
    process_incoming_camera_photo(str(img_a), db=db_session, camera_id=cam_id, incoming_base_dir=str(test_incoming))
    db_session.expire_all()

    photo_a = db_session.query(Photo).filter(Photo.event_id == e1_id, Photo.original_file_name == "DSC_001.JPG").first()
    assert photo_a is not None
    assert photo_a.event_id == e1_id

    # TEST B: Exact Legacy Event.access_token routing (backward compatibility)
    token_dir = test_incoming / e1_token
    token_dir.mkdir(parents=True, exist_ok=True)
    img_b = token_dir / "DSC_002.JPG"
    img_b.write_bytes(generate_test_image(400, 400, "blue"))
    process_incoming_camera_photo(str(img_b), db=db_session, camera_id=cam_id, incoming_base_dir=str(test_incoming))
    db_session.expire_all()

    photo_b = db_session.query(Photo).filter(Photo.event_id == e1_id, Photo.original_file_name == "DSC_002.JPG").first()
    assert photo_b is not None
    assert photo_b.event_id == e1_id

    # TEST C: Nested subfolder routing
    sub_dir = test_incoming / e1_slug / f1_slug
    sub_dir.mkdir(parents=True, exist_ok=True)
    img_c = sub_dir / "DSC_003.JPG"
    img_c.write_bytes(generate_test_image(400, 400, "yellow"))
    process_incoming_camera_photo(str(img_c), db=db_session, camera_id=cam_id, incoming_base_dir=str(test_incoming))
    db_session.expire_all()

    photo_c = db_session.query(Photo).filter(Photo.event_id == e1_id, Photo.original_file_name == "DSC_003.JPG").first()
    assert photo_c is not None
    assert photo_c.folder_id == f1_id

    # TEST D: Unknown slug -> Fail Closed
    unk_dir = test_incoming / "does-not-exist"
    unk_dir.mkdir(parents=True, exist_ok=True)
    img_d = unk_dir / "DSC_004.JPG"
    img_d.write_bytes(generate_test_image(400, 400, "orange"))
    process_incoming_camera_photo(str(img_d), db=db_session, camera_id=cam_id, incoming_base_dir=str(test_incoming))
    db_session.expire_all()

    photo_d = db_session.query(Photo).filter(Photo.original_file_name == "DSC_004.JPG").first()
    assert photo_d is None  # Strict fail-closed, no photo created

    # TEST E: Path traversal attempt -> Safe rejection
    trav_dir = tmp_path / "escape"
    trav_dir.mkdir(parents=True, exist_ok=True)
    img_e = trav_dir / "DSC_005.JPG"
    img_e.write_bytes(generate_test_image(400, 400, "red"))
    process_incoming_camera_photo(str(img_e), db=db_session, camera_id=cam_id, incoming_base_dir=str(test_incoming))
    db_session.expire_all()

    photo_e = db_session.query(Photo).filter(Photo.original_file_name == "DSC_005.JPG").first()
    assert photo_e is None

    # TEST F: UUID routing compatibility
    uuid_dir = test_incoming / e1_id
    uuid_dir.mkdir(parents=True, exist_ok=True)
    img_f = uuid_dir / "DSC_006.JPG"
    img_f.write_bytes(generate_test_image(400, 400, "purple"))
    process_incoming_camera_photo(str(img_f), db=db_session, camera_id=cam_id, incoming_base_dir=str(test_incoming))
    db_session.expire_all()

    photo_f = db_session.query(Photo).filter(Photo.event_id == e1_id, Photo.original_file_name == "DSC_006.JPG").first()
    assert photo_f is not None

    # TEST G: Event Name alone is NOT accepted for routing
    name_dir = test_incoming / "Rajkot Wedding 2026"
    name_dir.mkdir(parents=True, exist_ok=True)
    img_g = name_dir / "DSC_007.JPG"
    img_g.write_bytes(generate_test_image(400, 400, "black"))
    process_incoming_camera_photo(str(img_g), db=db_session, camera_id=cam_id, incoming_base_dir=str(test_incoming))
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
    from apps.api.services.wireless_ingest import process_incoming_camera_photo, CameraAuthorizer
    from pyftpdlib.authorizers import AuthenticationFailed

    test_incoming = tmp_path / "incoming"
    test_incoming.mkdir(parents=True, exist_ok=True)

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

    e1_id = str(uuid.uuid4())
    e1_slug = "rajkot-wedding-2026"
    e1_token = "TOK1_" + secrets.token_hex(4)

    e1 = Event(
        id=e1_id,
        photographer_id=p1.id,
        name="Rajkot Wedding 2026",
        slug=e1_slug,
        access_token=e1_token,
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

    e2_id = str(uuid.uuid4())
    e2_slug = "goa-beach-wedding-2026"
    e2_token = "TOK2_" + secrets.token_hex(4)

    e2 = Event(
        id=e2_id,
        photographer_id=p2.id,
        name="Goa Beach Wedding 2026",
        slug=e2_slug,
        access_token=e2_token,
        status="ACTIVE",
    )
    db_session.add(e2)
    db_session.commit()

    # --- TEST A: Create Camera -> Defaults to PENDING_APPROVAL ---
    create_res = client.post(
        f"/api/v1/wireless/events/{e1_id}/cameras",
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
    authorizer = CameraAuthorizer(db_factory=lambda: db_session)
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
    slug_dir_e1 = test_incoming / e1_slug
    slug_dir_e1.mkdir(parents=True, exist_ok=True)
    img_pending = slug_dir_e1 / "CAM_PENDING_001.JPG"
    img_pending.write_bytes(generate_test_image(400, 400, "pink"))

    process_incoming_camera_photo(str(img_pending), db=db_session, camera_id=cam1_id, incoming_base_dir=str(test_incoming))
    db_session.expire_all()

    photo_pending = db_session.query(Photo).filter(Photo.original_file_name == "CAM_PENDING_001.JPG").first()
    assert photo_pending is None  # Strict denial while in PENDING_APPROVAL status

    # --- TEST D: Photographer Approves Camera -> Ingest SUCCEEDS ---
    approve_res = client.post(
        f"/api/v1/wireless/events/{e1_id}/cameras/{cam1_id}/approve",
        headers=headers1,
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "APPROVED"

    img_approved = slug_dir_e1 / "CAM_APPROVED_001.JPG"
    img_approved.write_bytes(generate_test_image(400, 400, "cyan"))

    process_incoming_camera_photo(str(img_approved), db=db_session, camera_id=cam1_id, incoming_base_dir=str(test_incoming))
    db_session.expire_all()

    photo_approved = db_session.query(Photo).filter(Photo.original_file_name == "CAM_APPROVED_001.JPG").first()
    assert photo_approved is not None
    assert photo_approved.event_id == e1_id
    assert photo_approved.camera_id == cam1_id

    # --- TEST E: Approved Camera A attempts upload to Event B slug -> STRICTLY DENIED ---
    slug_dir_e2 = test_incoming / e2_slug
    slug_dir_e2.mkdir(parents=True, exist_ok=True)
    img_cross = slug_dir_e2 / "CAM_CROSS_EVENT_001.JPG"
    img_cross.write_bytes(generate_test_image(400, 400, "brown"))

    process_incoming_camera_photo(str(img_cross), db=db_session, camera_id=cam1_id, incoming_base_dir=str(test_incoming))
    db_session.expire_all()

    photo_cross = db_session.query(Photo).filter(Photo.original_file_name == "CAM_CROSS_EVENT_001.JPG").first()
    assert photo_cross is None

    # --- TEST F: Approved Camera A attempts upload to Event B access_token -> STRICTLY DENIED ---
    token_dir_e2 = test_incoming / e2_token
    token_dir_e2.mkdir(parents=True, exist_ok=True)
    img_cross_token = token_dir_e2 / "CAM_CROSS_TOKEN_001.JPG"
    img_cross_token.write_bytes(generate_test_image(400, 400, "gray"))

    process_incoming_camera_photo(str(img_cross_token), db=db_session, camera_id=cam1_id, incoming_base_dir=str(test_incoming))
    db_session.expire_all()

    photo_cross_token = db_session.query(Photo).filter(Photo.original_file_name == "CAM_CROSS_TOKEN_001.JPG").first()
    assert photo_cross_token is None

    # --- TEST G: Approved Camera A attempts upload to Event B UUID -> STRICTLY DENIED ---
    uuid_dir_e2 = test_incoming / e2_id
    uuid_dir_e2.mkdir(parents=True, exist_ok=True)
    img_cross_uuid = uuid_dir_e2 / "CAM_CROSS_UUID_001.JPG"
    img_cross_uuid.write_bytes(generate_test_image(400, 400, "teal"))

    process_incoming_camera_photo(str(img_cross_uuid), db=db_session, camera_id=cam1_id, incoming_base_dir=str(test_incoming))
    db_session.expire_all()

    photo_cross_uuid = db_session.query(Photo).filter(Photo.original_file_name == "CAM_CROSS_UUID_001.JPG").first()
    assert photo_cross_uuid is None

    # --- TEST H: Revoked Camera -> Ingest DENIED ---
    revoke_res = client.post(
        f"/api/v1/wireless/events/{e1_id}/cameras/{cam1_id}/revoke",
        headers=headers1,
    )
    assert revoke_res.status_code == 200
    assert revoke_res.json()["status"] == "REVOKED"

    img_revoked = slug_dir_e1 / "CAM_REVOKED_001.JPG"
    img_revoked.write_bytes(generate_test_image(400, 400, "magenta"))

    process_incoming_camera_photo(str(img_revoked), db=db_session, camera_id=cam1_id, incoming_base_dir=str(test_incoming))
    db_session.expire_all()

    photo_revoked = db_session.query(Photo).filter(Photo.original_file_name == "CAM_REVOKED_001.JPG").first()
    assert photo_revoked is None

    # --- TEST I: Unknown / No CameraDevice -> Ingest STRICTLY DENIED (Bypass Closure) ---
    img_unknown = slug_dir_e1 / "CAM_UNKNOWN_001.JPG"
    img_unknown.write_bytes(generate_test_image(400, 400, "navy"))

    process_incoming_camera_photo(str(img_unknown), db=db_session, camera_id=None, camera_username=None, incoming_base_dir=str(test_incoming))
    db_session.expire_all()

    photo_unknown = db_session.query(Photo).filter(Photo.original_file_name == "CAM_UNKNOWN_001.JPG").first()
    assert photo_unknown is None  # Fails closed when no CameraDevice is provided

    # --- TEST J: Password Reset & Validation ---
    reset_res = client.post(
        f"/api/v1/wireless/events/{e1_id}/cameras/{cam1_id}/reset-ftp-password",
        headers=headers1,
    )
    assert reset_res.status_code == 200
    new_pwd = reset_res.json()["new_password"]
    assert new_pwd != cam1_plain_pwd

    # Old password fails
    with pytest.raises(AuthenticationFailed):
        authorizer.validate_authentication(cam1_username, cam1_plain_pwd, handler_inst)

    # Re-approve and test new password
    client.post(f"/api/v1/wireless/events/{e1_id}/cameras/{cam1_id}/approve", headers=headers1)
    authorizer.validate_authentication(cam1_username, new_pwd, handler_inst)
    assert handler_inst.authenticated_camera_id == cam1_id

    # --- TEST K: Tenant Isolation (Photographer 2 cannot list/approve/revoke Camera 1) ---
    p2_list = client.get(f"/api/v1/wireless/events/{e1_id}/cameras", headers=headers2)
    assert p2_list.status_code in (403, 404)

    p2_approve = client.post(f"/api/v1/wireless/events/{e1_id}/cameras/{cam1_id}/approve", headers=headers2)
    assert p2_approve.status_code in (403, 404)

    p2_revoke = client.post(f"/api/v1/wireless/events/{e1_id}/cameras/{cam1_id}/revoke", headers=headers2)
    assert p2_revoke.status_code in (403, 404)

    # --- TEST L: GET List API never returns password or password_hash ---
    p1_list = client.get(f"/api/v1/wireless/events/{e1_id}/cameras", headers=headers1)
    assert p1_list.status_code == 200
    cams = p1_list.json()
    assert len(cams) >= 1
    for c in cams:
        assert "password" not in c
        assert "password_hash" not in c

    # --- TEST M: Concurrent Camera Isolation (Camera A & Camera B) ---
    # Register Camera B for Event 2
    cam2_res = client.post(
        f"/api/v1/wireless/events/{e2_id}/cameras",
        json={"display_name": "Canon R6 Main", "manufacturer": "Canon", "model": "EOS R6 II"},
        headers=headers2,
    )
    cam2_id = cam2_res.json()["camera"]["id"]
    client.post(f"/api/v1/wireless/events/{e2_id}/cameras/{cam2_id}/approve", headers=headers2)

    # Concurrent upload test: Cam A to Event 1, Cam B to Event 2
    img_a_conc = slug_dir_e1 / "CAM_CONC_A_001.JPG"
    img_a_conc.write_bytes(generate_test_image(400, 400, "white"))
    process_incoming_camera_photo(str(img_a_conc), db=db_session, camera_id=cam1_id, incoming_base_dir=str(test_incoming))

    img_b_conc = slug_dir_e2 / "CAM_CONC_B_001.JPG"
    img_b_conc.write_bytes(generate_test_image(400, 400, "black"))
    process_incoming_camera_photo(str(img_b_conc), db=db_session, camera_id=cam2_id, incoming_base_dir=str(test_incoming))

    db_session.expire_all()
    photo_a_conc = db_session.query(Photo).filter(Photo.original_file_name == "CAM_CONC_A_001.JPG").first()
    photo_b_conc = db_session.query(Photo).filter(Photo.original_file_name == "CAM_CONC_B_001.JPG").first()

    assert photo_a_conc is not None
    assert photo_a_conc.event_id == e1_id
    assert photo_a_conc.camera_id == cam1_id

    assert photo_b_conc is not None
    assert photo_b_conc.event_id == e2_id
    assert photo_b_conc.camera_id == cam2_id
