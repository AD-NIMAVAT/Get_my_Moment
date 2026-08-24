"""
Get My Moment - Configuration Settings
"""

from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
import json
import os


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "info"
    SECRET_KEY: str = "dev-secret-key-getmymoment-local-testing-token-2026-32chars"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    API_V1_PREFIX: str = "/api/v1"
    
    BACKEND_CORS_ORIGINS: List[str] = [
        "https://getmymoment.fun",
        "https://www.getmymoment.fun",
        "https://api.getmymoment.fun",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, str):
            return json.loads(v)
        return v

    # Database (Defaults to SQLite for instant plug-and-play, or PostgreSQL if DATABASE_URL is set)
    DATABASE_URL: str = "sqlite:///./getmymoment.db"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def fix_postgres_prefix(cls, v: str) -> str:
        if isinstance(v, str) and v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql://", 1)
        return v

    # Redis & Celery Deployment / Capacity Settings (Hardware-Portable)
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    CELERY_WORKER_CONCURRENCY: int = 2
    CELERY_WORKER_PREFETCH_MULTIPLIER: int = 1
    CELERY_TASK_ACKS_LATE: bool = True
    CELERY_TASK_REJECT_ON_WORKER_LOST: bool = True

    # Ingest Backlog Observability & Health Thresholds (Provisional / Configurable)
    AI_BACKLOG_WARNING_THRESHOLD: int = 25
    AI_BACKLOG_CRITICAL_THRESHOLD: int = 100
    AI_QUEUE_AGE_WARNING_SECONDS: int = 30
    AI_QUEUE_AGE_CRITICAL_SECONDS: int = 120

    # Durable Queue Recovery & Reconciliation (P1-BATCH-13)
    RECONCILIATION_INTERVAL_SECONDS: int = 60
    RECONCILIATION_GRACE_PERIOD_SECONDS: int = 60
    RECONCILIATION_STALE_PROCESSING_SECONDS: int = 300
    RECONCILIATION_BATCH_SIZE: int = 50

    # Storage
    STORAGE_DRIVER: str = "local"
    STORAGE_LOCAL_ROOT: str = "./storage"
    MAX_UPLOAD_SIZE_MB: int = 50
    UPLOAD_STREAM_CHUNK_SIZE_KB: int = 64
    ALLOWED_EXTENSIONS: List[str] = ["jpg", "jpeg", "png", "webp"]

    # Face Debug Crops (Privacy Protection: disabled by default)
    FACE_DEBUG_CROPS_ENABLED: bool = False

    # AI & Face Matching
    AI_DETECTION_MODEL: str = "yunet"
    AI_RECOGNITION_MODEL: str = "sface"
    AI_DEVICE: str = "cpu"
    AI_COSINE_SIMILARITY_THRESHOLD: float = 0.45

    # Guest OTP Provider
    OTP_PROVIDER: str = "mock"
    OTP_EXPIRY_SECONDS: int = 300

    # Payment Gateway & Subscription Billing
    PAYMENT_GATEWAY: str = "razorpay"
    PAYMENT_MODE: str = "test"  # test or live
    RAZORPAY_KEY_ID: str = "rzp_test_GMM2026StudioPay"
    RAZORPAY_KEY_SECRET: str = "secret_GMM2026StudioKeySec"
    RAZORPAY_WEBHOOK_SECRET: str = "whsec_GMM2026WebhookSec"
    
    # Indian GST & Invoicing Settings
    GST_RATE_PCT: float = 18.0
    GST_PRICING_MODE: str = "inclusive"  # "inclusive" (MRP) or "exclusive"
    SELLER_LEGAL_NAME: str = "Get My Moment Media Technologies Pvt Ltd"
    SELLER_ADDRESS: str = "104, Royal Sapphire Hub, Surat - 395007, Gujarat, India"
    SELLER_GSTIN: str = "24AAACG1234F1Z5"
    SELLER_PAN: str = "AAACG1234F"
    SELLER_STATE: str = "Gujarat"
    SELLER_STATE_CODE: str = "24"
    SELLER_SUPPORT_EMAIL: str = "billing@getmymoment.com"

    # Public URLs
    NEXT_PUBLIC_API_URL: str = "https://www.getmymoment.fun/api/v1"
    NEXT_PUBLIC_APP_URL: str = "https://www.getmymoment.fun"

    # Initial Tunable Endpoint Rate Limits (Configurable via Environment)
    RATE_LIMIT_AUTH_LOGIN: str = "5/minute"
    RATE_LIMIT_ADMIN_LOGIN: str = "3/5minute"
    RATE_LIMIT_ADMIN_UNLOCK: str = "3/5minute"
    RATE_LIMIT_GUEST_REGISTER: str = "10/minute"
    RATE_LIMIT_OTP_SEND: str = "3/minute"
    RATE_LIMIT_OTP_VERIFY: str = "5/minute"
    RATE_LIMIT_PUBLIC_TOKEN: str = "30/minute"
    RATE_LIMIT_FACE_SEARCH: str = "10/minute"
    RATE_LIMIT_PHOTO_DOWNLOAD: str = "40/minute"
    RATE_LIMIT_ZIP_DOWNLOAD: str = "5/minute"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
