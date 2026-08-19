"""
Unit tests for Studio Calendar, Availability Checker, and Notes
"""

import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from apps.api.main import app
from apps.api.models import Photographer, Event, Lead, CalendarNote
from apps.api.auth import create_access_token


def test_calendar_full_lifecycle(db_session, client):
    # 0. Create test photographer
    photographer = Photographer(
        email="aditya_calendar@getmymoment.test",
        password_hash="hashed_pw_123",
        studio_name="Nimavat Photography",
        phone="9876543210",
    )
    db_session.add(photographer)
    db_session.commit()

    token = create_access_token({"sub": photographer.id})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create an event in 2026-08
    event = Event(
        photographer_id=photographer.id,
        name="Viraj & Ananya Wedding",
        slug="viraj-ananya-20260820",
        event_date=datetime(2026, 8, 20),
        package_amount_inr=150000.0,
        client_name="Viraj Shah",
        venue="Taj Palace",
        city="Udaipur",
        status="ACTIVE",
    )
    db_session.add(event)
    db_session.commit()

    # 2. Get calendar month for August 2026
    res = client.get("/api/v1/calendar/month?year=2026&month=8", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["year"] == 2026
    assert data["month"] == 8
    assert data["month_name"] == "August"
    assert len(data["days"]) == 31
    assert data["total_events_in_month"] >= 1
    assert data["total_revenue_in_month"] >= 150000.0

    # Day 20 should be BUSY with 1 event
    day20 = next(d for d in data["days"] if d["day_of_month"] == 20)
    assert day20["availability_status"] == "BUSY"
    assert len(day20["events"]) == 1
    assert day20["events"][0]["name"] == "Viraj & Ananya Wedding"

    # Day 15 should be AVAILABLE
    day15 = next(d for d in data["days"] if d["day_of_month"] == 15)
    assert day15["availability_status"] == "AVAILABLE"

    # 3. Add personal note & block day 15 (e.g. Personal Leave)
    note_payload = {
        "date_str": "2026-08-15",
        "title": "Family Trip to Goa",
        "description": "Unavailable for wedding shoots",
        "category": "BLOCKED"
    }
    res_note = client.post("/api/v1/calendar/notes", json=note_payload, headers=headers)
    assert res_note.status_code == 201
    note_data = res_note.json()
    assert note_data["title"] == "Family Trip to Goa"
    assert note_data["category"] == "BLOCKED"
    note_id = note_data["id"]

    # 4. Fetch month calendar again - Day 15 should now be BLOCKED
    res_updated = client.get("/api/v1/calendar/month?year=2026&month=8", headers=headers)
    data_updated = res_updated.json()
    day15_updated = next(d for d in data_updated["days"] if d["day_of_month"] == 15)
    assert day15_updated["availability_status"] == "BLOCKED"
    assert len(day15_updated["notes"]) == 1

    # 5. Delete note and verify Day 15 becomes AVAILABLE again
    res_del = client.delete(f"/api/v1/calendar/notes/{note_id}", headers=headers)
    assert res_del.status_code == 204

    res_final = client.get("/api/v1/calendar/month?year=2026&month=8", headers=headers)
    day15_final = next(d for d in res_final.json()["days"] if d["day_of_month"] == 15)
    assert day15_final["availability_status"] == "AVAILABLE"
