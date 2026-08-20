"""
Concurrency, Race Conditions & Bulk Operations Hard Test Suite
Simulates multi-threaded concurrent uploads, simultaneous moves, and counter synchronization.
"""

import pytest
import uuid
import io
import os
import random
import tempfile
import concurrent.futures
from PIL import Image
from starlette.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from apps.api.database import Base, get_db
from apps.api.main import app
from apps.api.models import Photographer, Event, Folder, FolderType, Photo
from apps.api.auth import create_access_token
from apps.api.services.storage import reconcile_folder_counters


def make_random_jpeg() -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", (150, 150), color=(random.randint(0, 255), random.randint(0, 255), random.randint(0, 255)))
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture(scope="module")
def conc_env():
    # Use temporary file-backed SQLite with WAL mode for true multi-threaded concurrency
    temp_dir = tempfile.mkdtemp()
    db_path = os.path.join(temp_dir, "test_concurrency.db")
    engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False, "timeout": 30},
    )

    with engine.connect() as conn:
        conn.exec_driver_sql("PRAGMA journal_mode=WAL")
        conn.exec_driver_sql("PRAGMA busy_timeout=30000")

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

    studio = Photographer(
        id=str(uuid.uuid4()),
        email="conc_studio@test.com",
        password_hash="pw",
        studio_name="Concurrency Studio",
        is_active=True,
    )
    db.add(studio)
    db.commit()

    event = Event(
        id=str(uuid.uuid4()),
        photographer_id=studio.id,
        name="Concurrent Wedding Shoot",
        slug="concurrent-wedding-shoot",
    )
    db.add(event)
    db.commit()

    token = create_access_token(data={"sub": studio.id})

    yield {
        "client": client,
        "db": db,
        "studio": studio,
        "event": event,
        "token": token,
    }

    db.close()
    app.dependency_overrides.clear()
    try:
        if os.path.exists(db_path):
            os.remove(db_path)
    except Exception:
        pass


def test_concurrent_preset_generation(conc_env):
    client = conc_env["client"]
    token = conc_env["token"]
    event = conc_env["event"]

    headers = {"Authorization": f"Bearer {token}"}

    # Run preset generation across 6 simultaneous threads
    def run_preset():
        return client.post(f"/api/v1/events/{event.id}/folders/generate-wedding-preset", headers=headers)

    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        futures = [executor.submit(run_preset) for _ in range(6)]
        results = [f.result() for f in futures]

    for r in results:
        assert r.status_code == 200

    # Verify no duplicate folders exist in DB
    list_res = client.get(f"/api/v1/events/{event.id}/folders", headers=headers)
    folders = list_res.json()
    names = [f["name"] for f in folders]
    assert len(names) == len(set(names))  # All unique!


def test_concurrent_photo_uploads_and_moves(conc_env):
    client = conc_env["client"]
    token = conc_env["token"]
    event = conc_env["event"]
    db = conc_env["db"]

    headers = {"Authorization": f"Bearer {token}"}

    # Ensure presets exist
    client.post(f"/api/v1/events/{event.id}/folders/generate-wedding-preset", headers=headers)

    # Fetch folders
    list_res = client.get(f"/api/v1/events/{event.id}/folders", headers=headers)
    folders = list_res.json()
    haldi = next(f for f in folders if "Haldi" in f["name"])
    reception = next(f for f in folders if "Reception" in f["name"])

    # Upload 10 unique photos concurrently
    def upload_single_photo(idx):
        img_bytes = make_random_jpeg()
        files = [("files", (f"shot_{idx}_{uuid.uuid4().hex[:4]}.jpg", img_bytes, "image/jpeg"))]
        return client.post(
            f"/api/v1/events/{event.id}/photos",
            files=files,
            data={"folder_id": haldi["id"]},
            headers=headers,
        )

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        futures = [executor.submit(upload_single_photo, i) for i in range(10)]
        results = [f.result() for f in futures]

    for r in results:
        assert r.status_code == 201

    # Reconcile counters
    reconcile_folder_counters(db, event_id=event.id)

    # Check total uploaded in Haldi
    res_after = client.get(f"/api/v1/events/{event.id}/folders", headers=headers)
    haldi_after = next(f for f in res_after.json() if f["id"] == haldi["id"])
    assert haldi_after["photo_count"] == 10

    # Concurrently move photos from Haldi to Reception in chunks
    db.expire_all()
    photos = db.query(Photo).filter(Photo.folder_id == haldi["id"]).all()
    chunk1 = [p.id for p in photos[:5]]
    chunk2 = [p.id for p in photos[5:]]

    def move_chunk(pids):
        return client.post(
            f"/api/v1/events/{event.id}/folders/move-photos",
            json={"photo_ids": pids, "destination_folder_id": reception["id"]},
            headers=headers,
        )

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(move_chunk, chunk1)
        f2 = executor.submit(move_chunk, chunk2)
        r1, r2 = f1.result(), f2.result()

    assert r1.status_code == 200
    assert r2.status_code == 200

    # Check final reconciled counters
    res_final = client.get(f"/api/v1/events/{event.id}/folders", headers=headers)
    haldi_final = next(f for f in res_final.json() if f["id"] == haldi["id"])
    reception_final = next(f for f in res_final.json() if f["id"] == reception["id"])

    assert haldi_final["photo_count"] == 0
    assert reception_final["photo_count"] == 10
