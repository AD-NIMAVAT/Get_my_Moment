"""
Get My Moment - Automated Rate Limiting & Abuse Protection Test Suite (SEC-02)
Validates Redis/memory sliding window rate limits, key scoping, privacy,
HTTP 429 response structure, Retry-After header, and tenant/session isolation.
"""

import io
import time
import uuid
import pytest
from PIL import Image
from starlette.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from apps.api.database import Base, get_db
from apps.api.main import app
from apps.api.config import settings
from apps.api.models import Photographer, Event, Folder, FolderType, Photo, AdminUser, Guest, Consent
from apps.api.auth import hash_password, create_access_token
from apps.api.services.rate_limiter import rate_limiter, hash_identifier, parse_rate_limit, get_client_ip


def create_dummy_jpeg():
    buf = io.BytesIO()
    img = Image.new("RGB", (100, 100), color=(150, 75, 75))
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture(scope="module")
def rate_limit_env():
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

    # Clear rate limiter memory store before test run
    rate_limiter._memory_fallback.clear()

    # Seed Photographer & Events
    uid = uuid.uuid4().hex[:6]
    p = Photographer(
        email=f"ratelimit_studio_{uid}@test.com",
        password_hash=hash_password("ValidPassword123!"),
        studio_name="RateLimit Studio",
        is_active=True,
    )
    admin = AdminUser(
        email=f"ratelimit_admin_{uid}@gmm.com",
        password_hash=hash_password("AdminPass123!"),
        full_name="Admin RateLimit",
        role="SUPER_ADMIN",
        is_active=True,
    )
    db.add_all([p, admin])
    db.commit()
    db.refresh(p)
    db.refresh(admin)

    evt_a = Event(
        photographer_id=p.id,
        name="RateLimit Event A",
        slug=f"rl-event-a-{uid}",
        access_token=f"rl_tok_a_{uuid.uuid4().hex[:12]}",
        status="ACTIVE",
    )
    evt_b = Event(
        photographer_id=p.id,
        name="RateLimit Event B",
        slug=f"rl-event-b-{uid}",
        access_token=f"rl_tok_b_{uuid.uuid4().hex[:12]}",
        status="ACTIVE",
    )
    db.add_all([evt_a, evt_b])
    db.commit()
    db.refresh(evt_a)
    db.refresh(evt_b)

    # Register Guest with Consent on Event A
    guest_a = Guest(
        event_id=evt_a.id,
        name="Alice Guest",
        mobile="+919876543210",
        otp_verified=True,
    )
    db.add(guest_a)
    db.commit()
    db.refresh(guest_a)

    consent = Consent(
        guest_id=guest_a.id,
        event_id=evt_a.id,
        face_search_consent=True,
        marketing_consent=True,
    )
    db.add(consent)
    db.commit()

    data = {
        "client": client,
        "db": db,
        "photographer": p,
        "admin": admin,
        "event_a": evt_a,
        "event_b": evt_b,
        "guest_a": guest_a,
    }
    yield data
    app.dependency_overrides.clear()
    db.close()


def test_1_photographer_login_normal_request(rate_limit_env):
    """1. Normal photographer login requests succeed within rate limits."""
    client = rate_limit_env["client"]
    p = rate_limit_env["photographer"]
    res = client.post("/api/v1/auth/login", json={
        "email": p.email,
        "password": "ValidPassword123!"
    })
    assert res.status_code == 200
    assert "access_token" in res.json()


def test_2_photographer_login_threshold_exceeded(rate_limit_env):
    """2. Photographer login exceeding limit returns HTTP 429 with Retry-After header."""
    client = rate_limit_env["client"]
    email = f"brute_force_{uuid.uuid4().hex[:6]}@test.com"
    
    # Send requests up to configured limit (5 per minute)
    hit_429 = False
    for _ in range(8):
        res = client.post("/api/v1/auth/login", json={
            "email": email,
            "password": "WrongPassword999!"
        })
        if res.status_code == 429:
            hit_429 = True
            assert "Retry-After" in res.headers
            assert "Too many requests" in res.json()["detail"]
            break
    assert hit_429 is True


def test_3_admin_login_threshold_exceeded(rate_limit_env):
    """3. Admin login exceeding limit (3 per 5 min) returns HTTP 429."""
    client = rate_limit_env["client"]
    email = f"admin_probe_{uuid.uuid4().hex[:6]}@gmm.com"

    hit_429 = False
    for _ in range(6):
        res = client.post("/api/v1/admin/auth/login", json={
            "email": email,
            "password": "WrongAdminPass!"
        })
        if res.status_code == 429:
            hit_429 = True
            assert "Retry-After" in res.headers
            break
    assert hit_429 is True


def test_4_guest_registration_normal_burst(rate_limit_env):
    """4. Normal guest registration works within configured limits."""
    client = rate_limit_env["client"]
    evt_b = rate_limit_env["event_b"]

    res = client.post(f"/api/v1/events/{evt_b.id}/guests/register", json={
        "name": "Bob Guest",
        "mobile": "+919123456789"
    })
    assert res.status_code == 201
    assert "guest_id" in res.json()


def test_5_guest_registration_threshold_exceeded(rate_limit_env):
    """5. Guest registration flood on single event returns HTTP 429."""
    client = rate_limit_env["client"]
    evt_a = rate_limit_env["event_a"]

    hit_429 = False
    for i in range(15):
        res = client.post(f"/api/v1/events/{evt_a.id}/guests/register", json={
            "name": f"Flood Guest {i}",
            "mobile": f"+9198700000{i:02d}"
        })
        if res.status_code == 429:
            hit_429 = True
            assert "Retry-After" in res.headers
            break
    assert hit_429 is True


def test_6_public_event_token_lookup_rate_limit(rate_limit_env):
    """6. Public event token lookup is throttled against high-frequency enumeration."""
    client = rate_limit_env["client"]
    test_token = f"probe_token_{uuid.uuid4().hex[:8]}"

    hit_429 = False
    for _ in range(40):
        res = client.get(f"/api/v1/events/public/by-token/{test_token}")
        if res.status_code == 429:
            hit_429 = True
            assert "Retry-After" in res.headers
            break
    assert hit_429 is True


def test_7_rate_limit_scoping_isolation(rate_limit_env):
    """7. Event A limiter scope does not exhaust Event B scope for different tokens/IPs."""
    client = rate_limit_env["client"]
    token_fresh = f"fresh_token_{uuid.uuid4().hex[:8]}"

    # Request fresh token from simulated different client IP
    res = client.get(
        f"/api/v1/events/public/by-token/{token_fresh}",
        headers={"X-Forwarded-For": "203.0.113.199"}
    )
    # Must NOT be 429 because it is a distinct client IP and token
    assert res.status_code in [200, 404]


def test_8_rate_limit_key_privacy():
    """8. Rate limit keys must NOT contain raw sensitive plaintext tokens or passwords."""
    raw_secret = "SuperSecretEventToken123456789"
    hashed = hash_identifier(raw_secret)
    assert raw_secret not in hashed
    assert len(hashed) == 16


def test_9_parse_rate_limit_helper():
    """9. parse_rate_limit helper correctly handles all standard expressions."""
    assert parse_rate_limit("5/minute") == (5, 60)
    assert parse_rate_limit("3/5minute") == (3, 300)
    assert parse_rate_limit("10/second") == (10, 1)
    assert parse_rate_limit("100/hour") == (100, 3600)