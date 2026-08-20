"""
Master Studio-Wise Folder, Event, Photo & Storage Management Architecture
Comprehensive End-to-End Verification Test Suite
"""

import pytest
import uuid
import io
import os
import zipfile
import random
from PIL import Image
from starlette.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from apps.api.database import Base, get_db
from apps.api.main import app
from apps.api.models import Photographer, Event, Folder, FolderType, Photo, Ceremony
from apps.api.auth import create_access_token
from apps.api.services.storage import storage_service, get_or_create_uncategorized_folder, reconcile_folder_counters
from apps.api.services.legacy_migration import run_legacy_photo_folder_migration


def make_jpeg(r=100, g=150, b=200) -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", (200, 200), color=(r, g, b))
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture(scope="module")
def suite_env():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    db = TestingSessionLocal()

    # Studio 1 (Alpha)
    studio1 = Photographer(
        id=str(uuid.uuid4()),
        email="alpha_studio@test.com",
        password_hash="pw_alpha",
        studio_name="Alpha Studios",
        is_active=True,
    )
    # Studio 2 (Beta)
    studio2 = Photographer(
        id=str(uuid.uuid4()),
        email="beta_studio@test.com",
        password_hash="pw_beta",
        studio_name="Beta Studios",
        is_active=True,
    )
    db.add(studio1)
    db.add(studio2)
    db.commit()

    # Event 1 (Studio 1)
    event1 = Event(
        id=str(uuid.uuid4()),
        photographer_id=studio1.id,
        name="Mehta Grand Wedding 2026",
        slug="mehta-grand-wedding-2026",
        selection_token="mehta-proof-token-123",
        access_token="mehta-guest-token-123",
    )
    # Event 2 (Studio 2)
    event2 = Event(
        id=str(uuid.uuid4()),
        photographer_id=studio2.id,
        name="Sharma Wedding 2026",
        slug="sharma-wedding-2026",
    )
    db.add(event1)
    db.add(event2)
    db.commit()

    token1 = create_access_token(data={"sub": studio1.id})
    token2 = create_access_token(data={"sub": studio2.id})

    yield {
        "client": client,
        "db": db,
        "studio1": studio1,
        "studio2": studio2,
        "event1": event1,
        "event2": event2,
        "token1": token1,
        "token2": token2,
    }

    db.close()
    app.dependency_overrides.clear()


# =============================================================================
# 1. Multi-Tenant Isolation & Zero Cross-Studio Leakage
# =============================================================================

def test_master_multi_tenant_isolation(suite_env):
    client = suite_env["client"]
    token2 = suite_env["token2"]
    event1 = suite_env["event1"]

    headers_beta = {"Authorization": f"Bearer {token2}"}

    # Studio Beta attempts to list Studio Alpha's folders -> 404
    res = client.get(f"/api/v1/events/{event1.id}/folders", headers=headers_beta)
    assert res.status_code == 404

    # Studio Beta attempts to upload photo into Studio Alpha's event -> 404
    files = [("files", ("exploit.jpg", make_jpeg(10, 20, 30), "image/jpeg"))]
    res_up = client.post(f"/api/v1/events/{event1.id}/photos", files=files, headers=headers_beta)
    assert res_up.status_code == 404


# =============================================================================
# 2. Idempotent Wedding Preset Generator
# =============================================================================

def test_master_wedding_preset_generation(suite_env):
    client = suite_env["client"]
    token1 = suite_env["token1"]
    event1 = suite_env["event1"]

    headers = {"Authorization": f"Bearer {token1}"}

    # Trigger 1-click Wedding Presets
    res = client.post(f"/api/v1/events/{event1.id}/folders/generate-wedding-preset", headers=headers)
    assert res.status_code == 200
    folders = res.json()
    names = [f["name"] for f in folders]

    assert "01_Haldi" in names
    assert "02_Mehendi" in names
    assert "03_Sangeet" in names
    assert "04_Wedding" in names
    assert "05_Reception" in names
    assert "06_Guest_Uploads" in names

    count_first_run = len(folders)

    # Click a second time (Must be 100% idempotent)
    res_repeat = client.post(f"/api/v1/events/{event1.id}/folders/generate-wedding-preset", headers=headers)
    assert res_repeat.status_code == 200
    assert len(res_repeat.json()) == count_first_run


# =============================================================================
# 3. Target Folder Photo Ingestion & Uncategorized Fallback
# =============================================================================

def test_master_photo_ingest_and_folder_routing(suite_env):
    client = suite_env["client"]
    token1 = suite_env["token1"]
    event1 = suite_env["event1"]
    db = suite_env["db"]

    headers = {"Authorization": f"Bearer {token1}"}

    # Fetch Haldi folder
    haldi = db.query(Folder).filter(Folder.event_id == event1.id, Folder.name == "01_Haldi").first()
    assert haldi is not None

    # Upload 2 photos directly to Haldi folder
    files = [
        ("files", ("Haldi_01.jpg", make_jpeg(250, 200, 50), "image/jpeg")),
        ("files", ("Haldi_02.jpg", make_jpeg(240, 190, 40), "image/jpeg")),
    ]
    res = client.post(
        f"/api/v1/events/{event1.id}/photos",
        files=files,
        data={"folder_id": haldi.id},
        headers=headers,
    )
    assert res.status_code == 201
    assert res.json()["uploaded_count"] == 2

    # Upload 1 photo without folder_id -> Must route to Uncategorized
    unassigned_file = [("files", ("Drone_Raw.jpg", make_jpeg(10, 80, 200), "image/jpeg"))]
    res_uncat = client.post(
        f"/api/v1/events/{event1.id}/photos",
        files=unassigned_file,
        headers=headers,
    )
    assert res_uncat.status_code == 201
    uncat_photo = res_uncat.json()["photos"][0]
    assert uncat_photo["folder_name"] == "Uncategorized"

    # Verify folder counters
    res_folders = client.get(f"/api/v1/events/{event1.id}/folders", headers=headers)
    all_f = res_folders.json()
    haldi_f = next(f for f in all_f if f["id"] == haldi.id)
    uncat_f = next(f for f in all_f if f["name"] == "Uncategorized")

    assert haldi_f["photo_count"] == 2
    assert uncat_f["photo_count"] == 1


# =============================================================================
# 4. Atomic Bulk Photo Move
# =============================================================================

def test_master_bulk_photo_move(suite_env):
    client = suite_env["client"]
    token1 = suite_env["token1"]
    event1 = suite_env["event1"]
    db = suite_env["db"]

    headers = {"Authorization": f"Bearer {token1}"}

    haldi = db.query(Folder).filter(Folder.event_id == event1.id, Folder.name == "01_Haldi").first()
    wedding = db.query(Folder).filter(Folder.event_id == event1.id, Folder.name == "04_Wedding").first()

    # Find photos in Haldi
    haldi_photos = db.query(Photo).filter(Photo.folder_id == haldi.id).all()
    photo_ids = [p.id for p in haldi_photos]
    assert len(photo_ids) == 2

    # Bulk Move photos from Haldi -> Wedding
    move_res = client.post(
        f"/api/v1/events/{event1.id}/folders/move-photos",
        json={"photo_ids": photo_ids, "destination_folder_id": wedding.id},
        headers=headers,
    )
    assert move_res.status_code == 200
    assert move_res.json()["moved_count"] == 2

    # Verify counts: Haldi=0, Wedding=2
    res_folders = client.get(f"/api/v1/events/{event1.id}/folders", headers=headers)
    all_f = res_folders.json()
    haldi_f = next(f for f in all_f if f["id"] == haldi.id)
    wedding_f = next(f for f in all_f if f["id"] == wedding.id)

    assert haldi_f["photo_count"] == 0
    assert wedding_f["photo_count"] == 2


# =============================================================================
# 5. Protected Uncategorized System Folder
# =============================================================================

def test_master_uncategorized_protection(suite_env):
    client = suite_env["client"]
    token1 = suite_env["token1"]
    event1 = suite_env["event1"]
    db = suite_env["db"]

    headers = {"Authorization": f"Bearer {token1}"}

    uncat = db.query(Folder).filter(
        Folder.event_id == event1.id,
        Folder.folder_type == FolderType.UNCATEGORIZED
    ).first()
    assert uncat is not None
    assert uncat.is_system is True

    # Attempt to delete Uncategorized folder -> 400 Bad Request
    res_del = client.delete(f"/api/v1/events/{event1.id}/folders/{uncat.id}", headers=headers)
    assert res_del.status_code == 400
    assert "protected" in res_del.json()["detail"]


# =============================================================================
# 6. Nested Folder ZIP Export
# =============================================================================

def test_master_nested_zip_export(suite_env):
    client = suite_env["client"]
    event1 = suite_env["event1"]

    # Download All ZIP with structured folders
    res = client.get(f"/api/v1/events/{event1.id}/download-all-zip?token={event1.access_token}")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/zip"

    # Inspect ZIP structure
    zip_bytes = io.BytesIO(res.content)
    with zipfile.ZipFile(zip_bytes, "r") as zf:
        file_names = zf.namelist()
        assert len(file_names) >= 3
        # Verify folder prefix in archive paths
        assert any(name.startswith("04_Wedding/") for name in file_names)
        assert any(name.startswith("Uncategorized/") for name in file_names)


# =============================================================================
# 7. Legacy Photo Migration Runner
# =============================================================================

def test_master_legacy_photo_migration(suite_env):
    db = suite_env["db"]
    studio1 = suite_env["studio1"]
    event1 = suite_env["event1"]

    # Insert an unassigned orphan photo
    orphan_photo = Photo(
        id=str(uuid.uuid4()),
        event_id=event1.id,
        original_file_name="Legacy_Orphan_01.jpg",
        file_path=f"events/{event1.id}/originals/orphan.jpg",
        sha256_hash=f"hash_{uuid.uuid4().hex}",
        file_size=1500000,
        mime_type="image/jpeg",
        folder_id=None,
        studio_id=None,
    )
    db.add(orphan_photo)
    db.commit()

    # Run migration
    result = run_legacy_photo_folder_migration(db)
    assert result["status"] == "SUCCESS"

    db.refresh(orphan_photo)
    assert orphan_photo.studio_id == studio1.id
    assert orphan_photo.folder_id is not None
    assert orphan_photo.folder.name == "Uncategorized"
