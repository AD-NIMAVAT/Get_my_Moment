"""
Event Management & QR API Tests
"""

import pytest


def get_auth_token(client):
    signup_res = client.post(
        "/api/v1/auth/signup",
        json={
            "email": "event_owner@studio.com",
            "password": "Password123!",
            "studio_name": "Royal Photography",
        }
    )
    return signup_res.json()["access_token"]


def test_create_and_list_events(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    create_res = client.post(
        "/api/v1/events",
        headers=headers,
        json={
            "name": "Summer Beach Wedding 2026",
            "allow_downloads": True,
            "require_otp": False,
            "settings": {"accent_color": "#0369a1"}
        }
    )
    assert create_res.status_code == 201
    event_data = create_res.json()
    assert event_data["name"] == "Summer Beach Wedding 2026"
    assert event_data["slug"] == "summer-beach-wedding-2026"
    assert event_data["access_token"] is not None
    assert len(event_data["access_token"]) >= 12

    # List events
    list_res = client.get("/api/v1/events", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1


def test_public_event_by_token(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    create_res = client.post(
        "/api/v1/events",
        headers=headers,
        json={
            "name": "Tech Expo Gala",
        }
    )
    access_token = create_res.json()["access_token"]

    # Public lookup without auth header
    public_res = client.get(f"/api/v1/events/public/by-token/{access_token}")
    assert public_res.status_code == 200
    public_data = public_res.json()
    assert public_data["name"] == "Tech Expo Gala"
    assert public_data["studio_name"] == "Royal Photography"


def test_qr_code_generation(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    create_res = client.post(
        "/api/v1/events",
        headers=headers,
        json={"name": "QR Test Event"}
    )
    event_id = create_res.json()["id"]

    qr_res = client.get(f"/api/v1/events/{event_id}/qr", headers=headers)
    assert qr_res.status_code == 200
    assert qr_res.headers["content-type"] == "image/png"
    assert len(qr_res.content) > 100
