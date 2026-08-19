"""
Get My Moment - Database Engine & Session Management
"""

import logging
from typing import Generator
from sqlalchemy import create_engine, text, event
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from apps.api.config import settings

logger = logging.getLogger(__name__)

# Base model
Base = declarative_base()

def get_engine():
    """Get active SQLAlchemy engine based on current settings."""
    is_sqlite = settings.DATABASE_URL.startswith("sqlite")
    connect_args = {}
    if is_sqlite:
        connect_args["check_same_thread"] = False
    return create_engine(
        settings.DATABASE_URL,
        connect_args=connect_args,
        pool_pre_ping=True,
    )


engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db_session() -> Session:
    """Helper to get a fresh DB session using current engine/settings."""
    local_engine = get_engine()
    session_factory = sessionmaker(autocommit=False, autoflush=False, bind=local_engine)
    return session_factory()


def init_db():
    """Initialize database extensions and schema tables."""
    active_engine = get_engine()
    is_sqlite = settings.DATABASE_URL.startswith("sqlite")
    if not is_sqlite:
        try:
            with active_engine.connect() as conn:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
                conn.commit()
                logger.info("pgvector extension initialized successfully.")
        except Exception as e:
            logger.warning(f"Could not initialize pgvector extension (database may be offline or in test mode): {e}")

    try:
        # Create tables
        Base.metadata.create_all(bind=active_engine)
        
        # SQLite Column Auto-Migration
        if is_sqlite:
            with active_engine.connect() as conn:
                # Check events table columns
                res = conn.execute(text("PRAGMA table_info(events)"))
                existing_event_cols = [row[1] for row in res.fetchall()]
                event_cols_to_add = [
                    ("allow_guest_uploads", "BOOLEAN DEFAULT 1 NOT NULL"),
                    ("package_amount_inr", "FLOAT DEFAULT 0.0 NOT NULL"),
                    ("client_name", "VARCHAR(255)"),
                    ("client_phone", "VARCHAR(32)"),
                    ("client_email", "VARCHAR(255)"),
                    ("venue", "VARCHAR(255)"),
                    ("city", "VARCHAR(255)"),
                    ("selection_token", "VARCHAR(64)"),
                ]
                for c_name, c_type in event_cols_to_add:
                    if c_name not in existing_event_cols:
                        try:
                            conn.execute(text(f"ALTER TABLE events ADD COLUMN {c_name} {c_type}"))
                            conn.commit()
                        except Exception:
                            pass

                # Check photos table columns
                res_p = conn.execute(text("PRAGMA table_info(photos)"))
                existing_photo_cols = [row[1] for row in res_p.fetchall()]
                photo_cols_to_add = [
                    ("ceremony_id", "VARCHAR(36)"),
                    ("is_client_selected", "BOOLEAN DEFAULT 0 NOT NULL"),
                    ("client_comment", "TEXT"),
                    ("is_guest_uploaded", "BOOLEAN DEFAULT 0 NOT NULL"),
                    ("uploaded_by_guest_name", "VARCHAR(255)"),
                    ("uploaded_by_guest_phone", "VARCHAR(50)"),
                    ("camera_id", "VARCHAR(100)"),
                    ("camera_model", "VARCHAR(100)"),
                    ("upload_session_id", "VARCHAR(64)"),
                    ("idempotency_key", "VARCHAR(128)"),
                ]
                # Check events table columns for soft-delete
                res_ev = conn.execute(text("PRAGMA table_info(events)"))
                existing_ev_cols = [row[1] for row in res_ev.fetchall()]
                ev_cols_to_add = [
                    ("is_deleted", "BOOLEAN DEFAULT 0 NOT NULL"),
                    ("deleted_at", "DATETIME"),
                ]
                for c_name, c_type in ev_cols_to_add:
                    if c_name not in existing_ev_cols:
                        try:
                            conn.execute(text(f"ALTER TABLE events ADD COLUMN {c_name} {c_type}"))
                            conn.commit()
                        except Exception:
                            pass

                # Check photos table columns for soft-delete
                photo_soft_cols = [
                    ("is_deleted", "BOOLEAN DEFAULT 0 NOT NULL"),
                    ("deleted_at", "DATETIME"),
                    ("storage_object_id", "VARCHAR(36)"),
                ]
                for c_name, c_type in photo_soft_cols:
                    if c_name not in existing_photo_cols:
                        try:
                            conn.execute(text(f"ALTER TABLE photos ADD COLUMN {c_name} {c_type}"))
                            conn.commit()
                        except Exception:
                            pass

                for c_name, c_type in photo_cols_to_add:
                    if c_name not in existing_photo_cols:
                        try:
                            conn.execute(text(f"ALTER TABLE photos ADD COLUMN {c_name} {c_type}"))
                            conn.commit()
                        except Exception:
                            pass

                # Check photographers table columns
                res_ph = conn.execute(text("PRAGMA table_info(photographers)"))
                existing_photographer_cols = [row[1] for row in res_ph.fetchall()]
                photographer_cols_to_add = [
                    ("subscription_plan", "VARCHAR(64) DEFAULT 'SOLO_PRO' NOT NULL"),
                    ("subscription_status", "VARCHAR(32) DEFAULT 'ACTIVE' NOT NULL"),
                    ("subscription_valid_until", "DATETIME"),
                    ("max_storage_gb", "INTEGER DEFAULT 100 NOT NULL"),
                    ("max_events_per_month", "INTEGER DEFAULT 10 NOT NULL"),
                    ("city", "VARCHAR(255)"),
                    ("state", "VARCHAR(255)"),
                    ("instagram_handle", "VARCHAR(255)"),
                    ("portfolio_url", "VARCHAR(500)"),
                    ("years_of_experience", "VARCHAR(64)"),
                    ("specializations", "TEXT"),
                    ("gst_number", "VARCHAR(64)"),
                    ("verification_status", "VARCHAR(32) DEFAULT 'PENDING_REVIEW' NOT NULL"),
                    ("verification_notes", "TEXT"),
                    ("verification_submitted_at", "DATETIME"),
                    ("gst_status", "VARCHAR(32) DEFAULT 'UNREGISTERED' NOT NULL"),
                    ("gst_legal_name", "VARCHAR(255)"),
                    ("gstin", "VARCHAR(32)"),
                    ("gst_state", "VARCHAR(128)"),
                    ("gst_state_code", "VARCHAR(10)"),
                    ("gst_pincode", "VARCHAR(20)"),
                    ("gst_address", "TEXT"),
                    ("default_tax_mode", "VARCHAR(32) DEFAULT 'WITHOUT_GST' NOT NULL"),
                    ("bank_name", "VARCHAR(255)"),
                    ("bank_account_number", "VARCHAR(64)"),
                    ("bank_ifsc", "VARCHAR(32)"),
                    ("bank_account_type", "VARCHAR(32) DEFAULT 'CURRENT'"),
                    ("upi_id", "VARCHAR(255)"),
                    ("logo_url", "VARCHAR(1024)"),
                    ("signature_url", "VARCHAR(1024)"),
                    ("digital_stamp_url", "VARCHAR(1024)"),
                    ("watermark_text", "VARCHAR(255)"),
                ]
                for c_name, c_type in photographer_cols_to_add:
                    if c_name not in existing_photographer_cols:
                        try:
                            conn.execute(text(f"ALTER TABLE photographers ADD COLUMN {c_name} {c_type}"))
                            conn.commit()
                        except Exception:
                            pass

                # Check quotations table columns
                res_q = conn.execute(text("PRAGMA table_info(quotations)"))
                existing_quotation_cols = [row[1] for row in res_q.fetchall()]
                quotation_cols_to_add = [
                    ("quotation_number", "VARCHAR(64)"),
                    ("client_name", "VARCHAR(255)"),
                    ("client_phone", "VARCHAR(32)"),
                    ("client_email", "VARCHAR(255)"),
                    ("event_type", "VARCHAR(64) DEFAULT 'Wedding'"),
                    ("event_date", "DATETIME"),
                    ("venue_city", "VARCHAR(255)"),
                    ("subtotal_inr", "FLOAT DEFAULT 0.0 NOT NULL"),
                    ("discount_inr", "FLOAT DEFAULT 0.0 NOT NULL"),
                    ("tax_mode", "VARCHAR(32) DEFAULT 'WITHOUT_GST' NOT NULL"),
                    ("tax_amount_inr", "FLOAT DEFAULT 0.0 NOT NULL"),
                    ("converted_invoice_id", "VARCHAR(36)"),
                    ("notes", "TEXT"),
                    ("terms_conditions", "TEXT"),
                    ("updated_at", "DATETIME"),
                ]
                for c_name, c_type in quotation_cols_to_add:
                    if c_name not in existing_quotation_cols:
                        try:
                            conn.execute(text(f"ALTER TABLE quotations ADD COLUMN {c_name} {c_type}"))
                            conn.commit()
                        except Exception:
                            pass

                # Check platform_payment_configs table columns
                res_cfg = conn.execute(text("PRAGMA table_info(platform_payment_configs)"))
                existing_cfg_cols = [row[1] for row in res_cfg.fetchall()]
                cfg_cols_to_add = [
                    ("authorized_signatory_name", "VARCHAR(255) DEFAULT 'Aryan Patel'"),
                    ("authorized_signatory_designation", "VARCHAR(255) DEFAULT 'Managing Director & Founder'"),
                    ("digital_stamp_url", "TEXT"),
                    ("digital_signature_url", "TEXT"),
                ]
                for c_name, c_type in cfg_cols_to_add:
                    if c_name not in existing_cfg_cols:
                        try:
                            conn.execute(text(f"ALTER TABLE platform_payment_configs ADD COLUMN {c_name} {c_type}"))
                            conn.commit()
                        except Exception:
                            pass
    except Exception as e:
        logger.warning(f"Base.metadata.create_all notice: {e}")


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
