"""
Pytest configuration and shared test fixtures
"""

import pytest
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from apps.api.config import settings

# Force in-memory database for testing
settings.DATABASE_URL = "sqlite://"

from apps.api.main import app
from apps.api.database import Base, get_db

# Create isolated test engine
test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh schema in SQLite for each test function."""
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()

    def override_get_db():
        try:
            yield session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)
        app.dependency_overrides.pop(get_db, None)


@pytest.fixture(scope="function")
def client(db_session):
    """FastAPI test client bound to the active test database session."""
    with TestClient(app, raise_server_exceptions=True) as test_client:
        yield test_client
