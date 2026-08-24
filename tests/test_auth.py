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


def test_photographer_self_service_change_password(client):
    # 1. Signup
    signup_res = client.post(
        "/api/v1/auth/signup",
        json={
            "email": "pwd_change@studio.com",
            "password": "OldPassword123!",
            "studio_name": "Change Pwd Studio",
        }
    )
    assert signup_res.status_code == 201
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Incorrect current password fails
    bad_res = client.post(
        "/api/v1/auth/change-password",
        json={
            "current_password": "WrongOldPassword!",
            "new_password": "NewSecretPassword123!"
        },
        headers=headers
    )
    assert bad_res.status_code == 400
    assert "Incorrect current password" in bad_res.json()["detail"]

    # 3. Identical password fails
    same_res = client.post(
        "/api/v1/auth/change-password",
        json={
            "current_password": "OldPassword123!",
            "new_password": "OldPassword123!"
        },
        headers=headers
    )
    assert same_res.status_code == 400
    assert "different from current password" in same_res.json()["detail"]

    # 4. Short password fails
    short_res = client.post(
        "/api/v1/auth/change-password",
        json={
            "current_password": "OldPassword123!",
            "new_password": "short"
        },
        headers=headers
    )
    assert short_res.status_code == 422 or short_res.status_code == 400

    # 5. Successful password change
    good_res = client.post(
        "/api/v1/auth/change-password",
        json={
            "current_password": "OldPassword123!",
            "new_password": "BrandNewPassword123!"
        },
        headers=headers
    )
    assert good_res.status_code == 200
    assert "successfully" in good_res.json()["message"]

    # 6. Verify old password no longer works
    old_login = client.post(
        "/api/v1/auth/login",
        json={
            "email": "pwd_change@studio.com",
            "password": "OldPassword123!"
        }
    )
    assert old_login.status_code == 401

    # 7. Verify new password logs in successfully
    new_login = client.post(
        "/api/v1/auth/login",
        json={
            "email": "pwd_change@studio.com",
            "password": "BrandNewPassword123!"
        }
    )
    assert new_login.status_code == 200
    assert "access_token" in new_login.json()

