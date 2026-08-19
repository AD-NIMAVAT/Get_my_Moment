"""
Unit tests for Super Admin & Platform Owner Master Control
"""

import pytest
from apps.api.models import Photographer, Event, AdminUser
from apps.api.auth import hash_password


def test_super_admin_full_flow(db_session, client):
    # 1. Create a photographer with an event
    photographer = Photographer(
        email="studio_admin_test@getmymoment.test",
        password_hash=hash_password("Secret123!"),
        studio_name="Royal Studio",
        phone="9988776655",
    )
    db_session.add(photographer)
    db_session.commit()

    event = Event(
        photographer_id=photographer.id,
        name="Royal Udaipur Wedding",
        slug="royal-udaipur-wedding",
        package_amount_inr=250000.0,
        status="ACTIVE",
    )
    db_session.add(event)

    from apps.api.models import Lead
    lead = Lead(
        photographer_id=photographer.id,
        client_name="Karan Johar",
        client_phone="9876543210",
        event_type="Wedding",
        estimated_budget_inr=150000.0,
        stage="NEW_LEAD",
    )
    db_session.add(lead)
    db_session.commit()

    # 2. Super Admin Login
    login_res = client.post(
        "/api/v1/admin/auth/login",
        json={"email": "admin@getmymoment.com", "password": "Admin@GetMyMoment2026!"}
    )
    assert login_res.status_code == 200
    token_data = login_res.json()
    admin_token = token_data["access_token"]
    assert token_data["admin"]["role"] == "SUPER_ADMIN"

    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 3. Test /admin/auth/me
    me_res = client.get("/api/v1/admin/auth/me", headers=admin_headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "admin@getmymoment.com"

    # 4. Test Platform Stats
    stats_res = client.get("/api/v1/admin/stats", headers=admin_headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_photographers"] >= 1
    assert stats["total_events"] >= 1
    assert stats["total_platform_gmv_inr"] >= 250000.0

    # 5. List Photographers
    photographers_res = client.get("/api/v1/admin/photographers", headers=admin_headers)
    assert photographers_res.status_code == 200
    p_list = photographers_res.json()
    assert len(p_list) >= 1
    p_item = next(p for p in p_list if p["id"] == photographer.id)
    assert p_item["studio_name"] == "Royal Studio"

    # 6. Update Photographer Status (e.g. verify studio)
    patch_res = client.patch(
        f"/api/v1/admin/photographers/{photographer.id}/status",
        json={"is_verified": True},
        headers=admin_headers
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["is_verified"] is True

    # 6b. Get Photographer Full Profile
    profile_res = client.get(f"/api/v1/admin/photographers/{photographer.id}/profile", headers=admin_headers)
    assert profile_res.status_code == 200
    profile_data = profile_res.json()
    assert profile_data["studio_name"] == "Royal Studio"
    assert profile_data["subscription_plan"] == "SOLO_PRO"
    assert len(profile_data["events"]) == 1

    # 6c. Super Admin Upgrade Photographer Plan to STUDIO_OS
    sub_res = client.patch(
        f"/api/v1/admin/photographers/{photographer.id}/subscription",
        json={"subscription_plan": "STUDIO_OS", "subscription_status": "ACTIVE"},
        headers=admin_headers
    )
    assert sub_res.status_code == 200
    assert sub_res.json()["subscription_plan"] == "STUDIO_OS"
    assert sub_res.json()["max_storage_gb"] == 2000

    # 7. List Events Master
    events_res = client.get("/api/v1/admin/events", headers=admin_headers)
    assert events_res.status_code == 200
    e_list = events_res.json()
    assert len(e_list) >= 1
    assert e_list[0]["studio_name"] == "Royal Studio"

    # 8. Test Telemetry
    telem_res = client.get("/api/v1/admin/telemetry", headers=admin_headers)
    assert telem_res.status_code == 200
    assert telem_res.json()["status"] == "OPERATIONAL"

    # 9. Admin delete event
    del_res = client.delete(f"/api/v1/admin/events/{event.id}", headers=admin_headers)
    assert del_res.status_code == 204
