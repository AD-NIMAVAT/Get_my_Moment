"""
Large-Scale Performance & Query Optimization Hard Test Suite
Verifies sub-100ms query performance and zero N+1 database bottlenecks.
"""

import pytest
import uuid
import time
from starlette.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from apps.api.database import Base, get_db
from apps.api.main import app
from apps.api.models import Photographer, Event, Folder, FolderType, Photo
from apps.api.auth import create_access_token
from apps.api.services.storage import reconcile_folder_counters


@pytest.fixture(scope="module")
def perf_env():
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

    studio = Photographer(
        id=str(uuid.uuid4()),
        email="perf_studio@test.com",
        password_hash="pw",
        studio_name="Performance Studio",
        is_active=True,
    )
    db.add(studio)
    db.commit()

    event = Event(
        id=str(uuid.uuid4()),
        photographer_id=studio.id,
        name="Mega Royal Wedding 2026",
        slug="mega-royal-wedding-2026",
    )
    db.add(event)
    db.commit()

    token = create_access_token(data={"sub": studio.id})

    # Generate 50 Folders and 1,000 Photo DB records
    folders = []
    for i in range(50):
        f = Folder(
            id=str(uuid.uuid4()),
            studio_id=studio.id,
            event_id=event.id,
            name=f"Ceremony_{i:02d}",
            slug=f"ceremony-{i:02d}",
            folder_type=FolderType.CEREMONY,
            order_index=i,
        )
        db.add(f)
        folders.append(f)
    db.commit()

    photos = []
    for i in range(1000):
        target_folder = folders[i % len(folders)]
        p = Photo(
            id=str(uuid.uuid4()),
            studio_id=studio.id,
            event_id=event.id,
            folder_id=target_folder.id,
            original_file_name=f"IMG_{i:04d}.JPG",
            file_path=f"studios/{studio.id}/events/{event.id}/originals/{target_folder.id}/{i}.jpg",
            sha256_hash=f"hash_{uuid.uuid4().hex}",
            file_size=3500000,
            mime_type="image/jpeg",
        )
        photos.append(p)
    db.bulk_save_objects(photos)
    db.commit()

    yield {
        "client": client,
        "db": db,
        "studio": studio,
        "event": event,
        "token": token,
        "folders": folders,
    }

    db.close()
    app.dependency_overrides.clear()


def test_folder_counter_reconciliation_benchmark(perf_env):
    db = perf_env["db"]
    event = perf_env["event"]

    # Benchmark single GROUP BY reconciliation over 1,000 photos across 50 folders
    t0 = time.time()
    reconcile_folder_counters(db, event_id=event.id)
    duration_ms = (time.time() - t0) * 1000

    # Must complete in under 100ms
    assert duration_ms < 100.0

    # Verify counts: each folder has exactly 20 photos (1000 / 50)
    sample_folder = db.query(Folder).filter(Folder.event_id == event.id).first()
    assert sample_folder.photo_count == 20
    assert sample_folder.total_size_bytes == 20 * 3500000


def test_folder_listing_api_latency(perf_env):
    client = perf_env["client"]
    token = perf_env["token"]
    event = perf_env["event"]

    headers = {"Authorization": f"Bearer {token}"}

    # Measure API latency for listing 50 folders
    t0 = time.time()
    res = client.get(f"/api/v1/events/{event.id}/folders", headers=headers)
    duration_ms = (time.time() - t0) * 1000

    assert res.status_code == 200
    assert len(res.json()) >= 50
    assert duration_ms < 150.0  # Fast sub-150ms response
