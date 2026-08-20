"""
Crew Member Portal, Phone Authentication & Ceremony-Wise Ingest Tests
"""

import pytest
import uuid
import io
from PIL import Image
from starlette.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from apps.api.database import Base, get_db
from apps.api.main import app
from apps.api.models import Photographer, Event, Folder, FolderType, Photo, Ceremony, CrewMember
from apps.api.auth import create_access_token
from apps.api.services.wireless_ingest import process_incoming_camera_photo


def make_jpeg() -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", (100, 100), color=(200, 100, 50))
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture(scope="module")
def crew_test_env():
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

    # Studio A
    studio = Photographer(
        id=str(uuid.uuid4()),
        email="studio_crew@test.com",
        password_hash="pw",
        studio_name="Prozone Studio",
        is_active=True,
    )
    db.add(studio)

    # Event 1
    event1 = Event(
        id=str(uuid.uuid4()),
        photographer_id=studio.id,
        name="Mehta Grand Wedding",
        slug="mehta-grand-wedding",
        access_token="mehta_token_123",
    )
    db.add(event1)

    # Event 2
    event2 = Event(
        id=str(uuid.uuid4()),
        photographer_id=studio.id,
        name="Sharma Reception",
        slug="sharma-reception",
        access_token="sharma_token_456",
    )
    db.add(event2)

    # Ceremonies
    mandap = Ceremony(
        id=str(uuid.uuid4()),
        event_id=event1.id,
        name="Mandap",
        order_index=1,
    )
    haldi = Ceremony(
        id=str(uuid.uuid4()),
        event_id=event1.id,
        name="Haldi",
        order_index=2,
    )
    db.add_all([mandap, haldi])

    # Folders
    folder_mandap = Folder(
        id=str(uuid.uuid4()),
        studio_id=studio.id,
        event_id=event1.id,
        name="01_Mandap",
        slug="01-mandap",
        folder_type=FolderType.CEREMONY,
        order_index=1,
    )
    folder_haldi = Folder(
        id=str(uuid.uuid4()),
        studio_id=studio.id,
        event_id=event1.id,
        name="02_Haldi",
        slug="02-haldi",
        folder_type=FolderType.CEREMONY,
        order_index=2,
    )
    db.add_all([folder_mandap, folder_haldi])

    # Crew Member assigned to Event 1 (Mandap & Haldi) and Event 2
    crew_phone = "9876543210"
    crew_member1 = CrewMember(
        id=str(uuid.uuid4()),
        event_id=event1.id,
        photographer_id=studio.id,
        name="Rahul Verma",
        role="Candid Photo",
        phone=crew_phone,
        payout_inr=15000.0,
        payout_status="PENDING",
        assigned_ceremonies=["Mandap", "Haldi"],
        camera_tag="Sony-A7IV-CamA",
    )
    crew_member2 = CrewMember(
        id=str(uuid.uuid4()),
        event_id=event2.id,
        photographer_id=studio.id,
        name="Rahul Verma",
        role="Cinematographer",
        phone=crew_phone,
        payout_inr=20000.0,
        payout_status="PAID",
        assigned_ceremonies=["Reception"],
        camera_tag="FX3-Cinema",
    )
    db.add_all([crew_member1, crew_member2])
    db.commit()

    studio_token = create_access_token(data={"sub": studio.id})

    yield {
        "client": client,
        "db": db,
        "studio": studio,
        "event1": event1,
        "event2": event2,
        "folder_mandap": folder_mandap,
        "folder_haldi": folder_haldi,
        "crew_phone": crew_phone,
        "studio_token": studio_token,
    }

    db.close()
    app.dependency_overrides.clear()


def test_crew_phone_login_and_dashboard(crew_test_env):
    client = crew_test_env["client"]
    crew_phone = crew_test_env["crew_phone"]

    # 1. Login with phone
    res = client.post("/api/v1/crew/login", json={"phone": crew_phone})
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Rahul Verma"
    assert data["total_assigned_events"] == 2
    token = data["access_token"]
    assert token

    # 2. Invalid phone fails with 404
    res_fail = client.post("/api/v1/crew/login", json={"phone": "0000000000"})
    assert res_fail.status_code == 404

    # 3. Fetch Crew Dashboard
    dash_res = client.get("/api/v1/crew/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert dash_data["crew_name"] == "Rahul Verma"
    assert len(dash_data["events"]) == 2

    # Check event details
    e1 = next(e for e in dash_data["events"] if e["event_name"] == "Mehta Grand Wedding")
    assert e1["assigned_ceremonies"] == ["Mandap", "Haldi"]
    assert e1["camera_tag"] == "Sony-A7IV-CamA"
    assert e1["payout_inr"] == 15000.0
    assert e1["camera_settings"]["username"] == "camera"
    assert e1["camera_settings"]["destination_folder"] == "/mehta_token_123"
    assert len(e1["folders"]) == 2


def test_crew_set_active_ceremony_and_upload(crew_test_env):
    client = crew_test_env["client"]
    event1 = crew_test_env["event1"]
    folder_haldi = crew_test_env["folder_haldi"]
    crew_phone = crew_test_env["crew_phone"]

    login_res = client.post("/api/v1/crew/login", json={"phone": crew_phone})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. 1-Tap switch to Haldi ceremony
    switch_res = client.post(
        f"/api/v1/crew/events/{event1.id}/set-active-ceremony",
        json={"folder_id": folder_haldi.id},
        headers=headers
    )
    assert switch_res.status_code == 200
    assert switch_res.json()["active_folder_id"] == folder_haldi.id
    assert "Haldi" in switch_res.json()["active_folder_name"]

    # 2. Upload photo directly into Haldi folder
    jpeg_data = make_jpeg()
    files = [("files", ("haldi_shot_01.jpg", jpeg_data, "image/jpeg"))]
    upload_res = client.post(
        f"/api/v1/crew/events/{event1.id}/upload-photos",
        data={"crew_name": "Rahul Verma", "folder_id": folder_haldi.id},
        files=files,
        headers=headers
    )
    assert upload_res.status_code == 200
    assert upload_res.json()["folder_id"] == folder_haldi.id
    assert upload_res.json()["uploaded_count"] == 1


def test_studio_assign_crew_with_ceremonies_and_camera_tag(crew_test_env):
    client = crew_test_env["client"]
    event1 = crew_test_env["event1"]
    studio_token = crew_test_env["studio_token"]
    headers = {"Authorization": f"Bearer {studio_token}"}

    # Assign new crew member with ceremonies and camera tag
    res = client.post(
        f"/api/v1/events/{event1.id}/operations/crew",
        json={
            "name": "Karan Pilot",
            "role": "Drone Pilot",
            "phone": "9123456780",
            "payout_inr": 12000.0,
            "assigned_ceremonies": ["Mandap"],
            "camera_tag": "DJI-Mavic-3-Pro",
        },
        headers=headers
    )
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Karan Pilot"
    assert data["assigned_ceremonies"] == ["Mandap"]
    assert data["camera_tag"] == "DJI-Mavic-3-Pro"

    # Verify in operations summary
    ops_res = client.get(f"/api/v1/events/{event1.id}/operations", headers=headers)
    ops_data = ops_res.json()
    mandap_ceremony = next(c for c in ops_data["ceremonies"] if c["name"] == "Mandap")
    assert len(mandap_ceremony["assigned_crew"]) >= 1
    assert any(cr["name"] == "Karan Pilot" for cr in mandap_ceremony["assigned_crew"])
