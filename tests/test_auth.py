"""
Photographer Authentication API Tests
"""

import pytest


def test_signup_photographer(client):
    response = client.post(
        "/api/v1/auth/signup",
        json={
            "email": "lead@studio.com",
            "password": "Password123!",
            "studio_name": "Antigravity Studios",
            "phone": "+919876543210"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["email"] == "lead@studio.com"
    assert data["studio_name"] == "Antigravity Studios"


def test_signup_duplicate_email_fails(client):
    client.post(
        "/api/v1/auth/signup",
        json={
            "email": "duplicate@studio.com",
            "password": "Password123!",
            "studio_name": "Studio A",
        }
    )
    # Duplicate attempt
    response = client.post(
        "/api/v1/auth/signup",
        json={
            "email": "duplicate@studio.com",
            "password": "Password456!",
            "studio_name": "Studio B",
        }
    )
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


def test_login_success_and_me(client):
    client.post(
        "/api/v1/auth/signup",
        json={
            "email": "login@studio.com",
            "password": "CorrectPassword123!",
            "studio_name": "Login Studios",
        }
    )

    # Login
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "login@studio.com",
            "password": "CorrectPassword123!"
        }
    )
    assert response.status_code == 200
    token = response.json()["access_token"]

    # Profile check with Bearer token
    profile_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert profile_res.status_code == 200
    profile_data = profile_res.json()
    assert profile_data["email"] == "login@studio.com"
    assert profile_data["studio_name"] == "Login Studios"


def test_login_invalid_credentials_fails(client):
    client.post(
        "/api/v1/auth/signup",
        json={
            "email": "secure@studio.com",
            "password": "CorrectPassword123!",
            "studio_name": "Secure Studios",
        }
    )
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "secure@studio.com",
            "password": "WrongPassword!"
        }
    )
    assert response.status_code == 401
