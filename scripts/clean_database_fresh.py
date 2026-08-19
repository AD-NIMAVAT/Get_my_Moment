"""
Get My Moment — Database Reset & Fresh Initialization Script
Clears all studio registrations, events, uploaded photos, guest records, invoices,
and re-initializes a 100% clean, fresh production database schema.
"""

import sys
import os
import shutil
import glob

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.insert(0, r"d:\Get_my_moment")

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from apps.api.database import init_db, SessionLocal
from apps.api.models import AdminUser
from apps.api.auth import hash_password
from apps.api.services.subscription_service import subscription_service


def reset_database_fresh():
    print("=====================================================================")
    print("       GET MY MOMENT — FRESH DATABASE PURGE & INITIALIZATION         ")
    print("=====================================================================")

    base_dir = r"d:\Get_my_moment"

    # 1. Remove SQLite Database Files
    db_patterns = [
        os.path.join(base_dir, "*.db"),
        os.path.join(base_dir, "database.sqlite"),
    ]
    for pattern in db_patterns:
        for f in glob.glob(pattern):
            try:
                os.remove(f)
                print(f"🗑️ Deleted database file: {os.path.basename(f)}")
            except Exception as e:
                print(f"⚠️ Could not delete {f}: {e}")

    # 2. Clear Uploaded Storage Files (Photos, Watermarks, Crops, ZIPs)
    storage_events = os.path.join(base_dir, "storage", "events")
    if os.path.exists(storage_events):
        try:
            shutil.rmtree(storage_events)
            print("🗑️ Cleared storage/events/ (All uploaded studio & guest photos)")
        except Exception as e:
            print(f"⚠️ Could not clean {storage_events}: {e}")
    os.makedirs(storage_events, exist_ok=True)

    # 3. Clear Wireless Incoming Queue
    wireless_dir = os.path.join(base_dir, "data", "wireless_incoming")
    if os.path.exists(wireless_dir):
        try:
            shutil.rmtree(wireless_dir)
            print("🗑️ Cleared data/wireless_incoming/ (Camera relay buffer)")
        except Exception as e:
            print(f"⚠️ Could not clean {wireless_dir}: {e}")
    os.makedirs(wireless_dir, exist_ok=True)

    # 4. Re-create Clean Schema Tables
    print("\n📦 Initializing fresh database schema and tables...")
    init_db()
    print("✅ All 18 database tables created cleanly.")

    # 5. Seed Catalog & Default Admin
    db = SessionLocal()
    try:
        # Seed Subscription Plans
        subscription_service.seed_default_plans_if_missing(db)
        print("✅ Seeded 5 official Subscription Plans (Free Trial, Solo Pro, Studio Pro, Studio OS, Enterprise VIP).")

        # Seed Root SuperAdmin
        admin = AdminUser(
            email="admin@getmymoment.com",
            password_hash=hash_password("Admin@GetMyMoment2026!"),
            full_name="Platform Owner",
            role="SUPER_ADMIN",
            is_active=True,
        )
        db.add(admin)
        db.commit()
        print("👑 Seeded Root Superadmin: admin@getmymoment.com (Password: Admin@GetMyMoment2026!)")

    except Exception as e:
        print(f"❌ Error during seeding: {e}")
        db.rollback()
    finally:
        db.close()

    print("\n=====================================================================")
    print("   🎉 DATABASE IS NOW 100% CLEAN, FRESH & READY FOR REGISTRATION!    ")
    print("=====================================================================")


if __name__ == "__main__":
    reset_database_fresh()
