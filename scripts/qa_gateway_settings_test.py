"""
Get My Moment — SuperAdmin Gateway & Bank Settings Vault Automated QA Test Suite
"""

import sys
import os
import uuid

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.insert(0, r"d:\Get_my_moment")

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from fastapi.testclient import TestClient
from apps.api.main import app
from apps.api.database import SessionLocal, init_db
from apps.api.models import AdminUser, PlatformPaymentConfig, AuditLog, Photographer
from apps.api.auth import hash_password, create_access_token

client = TestClient(app)

results = []

def record(tc_id, module, desc, status, detail=""):
    results.append({
        "id": tc_id,
        "module": module,
        "description": desc,
        "status": status,
        "detail": detail
    })
    icon = "✅" if status == "PASS" else "❌"
    print(f"[{icon} {status}] {tc_id} ({module}): {desc} - {detail}")


def run_vault_test_suite():
    print("=====================================================================")
    print("   GET MY MOMENT — SUPERADMIN GATEWAY & BANK VAULT QA TEST SUITE     ")
    print("=====================================================================")

    init_db()
    db = SessionLocal()

    # Ensure SuperAdmin exists
    admin = db.query(AdminUser).filter(AdminUser.email == "admin@getmymoment.com").first()
    if not admin:
        admin = AdminUser(
            email="admin@getmymoment.com",
            password_hash=hash_password("Admin@GetMyMoment2026!"),
            full_name="Platform Owner",
            role="SUPER_ADMIN",
            is_active=True
        )
        db.add(admin)
    else:
        admin.password_hash = hash_password("Admin@GetMyMoment2026!")
    db.commit()
    db.refresh(admin)

    admin_token = create_access_token({"sub": admin.id, "is_admin": True})
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Setup Photographer
    photographer = Photographer(
        email=f"vault_test_photo_{uuid.uuid4().hex[:6]}@example.com",
        password_hash=hash_password("Pass123!"),
        studio_name="Diamond Sparkle Studio",
        phone="+919876543210",
        state="Gujarat",
        city="Surat",
        is_active=True
    )
    db.add(photographer)
    db.commit()
    db.refresh(photographer)
    photo_token = create_access_token({"sub": photographer.id, "role": "photographer"})
    photo_headers = {"Authorization": f"Bearer {photo_token}"}

    db.close()

    # 1. Unauthorized Access Rejection (No token / Photographer token)
    res_unauth = client.get("/api/v1/admin/gateway-settings")
    if res_unauth.status_code in [401, 403]:
        record("TC-VAULT-01", "Security / RBAC", "Unauthenticated GET gateway-settings blocked", "PASS", f"Status: {res_unauth.status_code}")
    else:
        record("TC-VAULT-01", "Security / RBAC", "Unauthenticated GET gateway-settings", "FAIL", f"Status: {res_unauth.status_code}")

    res_photo_access = client.get("/api/v1/admin/gateway-settings", headers=photo_headers)
    if res_photo_access.status_code in [401, 403]:
        record("TC-VAULT-02", "Security / RBAC", "Photographer token blocked from gateway-settings", "PASS", f"Status: {res_photo_access.status_code}")
    else:
        record("TC-VAULT-02", "Security / RBAC", "Photographer access blocked", "FAIL", f"Status: {res_photo_access.status_code}")

    # 2. Vault Unlock with Wrong Password
    res_unlock_fail = client.post("/api/v1/admin/gateway-settings/unlock", headers=admin_headers, json={
        "password": "WrongPassword123!"
    })
    if res_unlock_fail.status_code == 401:
        record("TC-VAULT-03", "Vault Security", "Incorrect password rejected for vault unlock", "PASS", "HTTP 401 Unauthorized")
    else:
        record("TC-VAULT-03", "Vault Security", "Incorrect password rejected", "FAIL", f"Status: {res_unlock_fail.status_code}")

    # 3. Vault Unlock with Correct SuperAdmin Password
    res_unlock_success = client.post("/api/v1/admin/gateway-settings/unlock", headers=admin_headers, json={
        "password": "Admin@GetMyMoment2026!"
    })
    if res_unlock_success.status_code == 200 and res_unlock_success.json().get("unlocked") is True:
        record("TC-VAULT-04", "Vault Security", "SuperAdmin Password unlocks Vault", "PASS", "Unlocked successfully")
    else:
        record("TC-VAULT-04", "Vault Security", "SuperAdmin Password unlock", "FAIL", res_unlock_success.text)

    # 4. Get Current Gateway & Bank Settings
    res_get_cfg = client.get("/api/v1/admin/gateway-settings", headers=admin_headers)
    cfg_data = res_get_cfg.json()
    if res_get_cfg.status_code == 200 and "account_number" in cfg_data and "key_id" in cfg_data:
        record("TC-VAULT-05", "Vault Data", "Retrieve active Bank & Gateway Config", "PASS", f"Bank: {cfg_data['bank_name']}, Key ID: {cfg_data['key_id']}")
    else:
        record("TC-VAULT-05", "Vault Data", "Retrieve Bank & Gateway Config", "FAIL", res_get_cfg.text)

    # 5. Update Gateway & Bank Settings with Wrong Password Confirmation
    res_update_fail = client.put("/api/v1/admin/gateway-settings", headers=admin_headers, json={
        "beneficiary_name": "New Owner Media Pvt Ltd",
        "bank_name": "ICICI Bank",
        "account_number": "999888777666",
        "ifsc_code": "ICIC0001234",
        "account_type": "CURRENT",
        "business_upi_id": "newowner@icici",
        "bank_branch": "Adajan Branch, Surat",
        "gateway_provider": "RAZORPAY",
        "gateway_mode": "TEST",
        "key_id": "rzp_test_NewOwnerKey123",
        "key_secret": "secret_NewOwnerSecret456",
        "webhook_secret": "whsec_NewOwnerWebhook789",
        "seller_legal_name": "New Owner Media Pvt Ltd",
        "seller_address": "505, Diamond World, Surat - 395006",
        "seller_gstin": "24BBBCG9999F1Z9",
        "seller_pan": "BBBCG9999F",
        "seller_state": "Gujarat",
        "seller_state_code": "24",
        "seller_support_email": "support@newownermedia.com",
        "seller_support_phone": "+91 99999 88888",
        "gst_rate_pct": 18.0,
        "gst_pricing_mode": "inclusive",
        "confirm_password": "WrongPasswordForConfirmation"
    })
    if res_update_fail.status_code == 401:
        record("TC-VAULT-06", "Vault Security", "Update rejected when confirmation password is wrong", "PASS", "HTTP 401 Confirmation Failed")
    else:
        record("TC-VAULT-06", "Vault Security", "Update rejected on wrong password", "FAIL", f"Status: {res_update_fail.status_code}")

    # 6. Update Gateway & Bank Settings with Correct Confirmation Password
    res_update_success = client.put("/api/v1/admin/gateway-settings", headers=admin_headers, json={
        "beneficiary_name": "Royal Media Technologies LLP",
        "bank_name": "HDFC Bank",
        "account_number": "50200088899911",
        "ifsc_code": "HDFC0004321",
        "account_type": "CURRENT",
        "business_upi_id": "royalmedia@okhdfcbank",
        "bank_branch": "Varachha Branch, Surat",
        "gateway_provider": "RAZORPAY",
        "gateway_mode": "LIVE",
        "key_id": "rzp_live_RoyalLiveKey999",
        "key_secret": "secret_RoyalLiveSecret888",
        "webhook_secret": "whsec_RoyalLiveWebhook777",
        "seller_legal_name": "Royal Media Technologies LLP",
        "seller_address": "808, Titanium Square, Surat - 395009, Gujarat",
        "seller_gstin": "24ZZZCG8888F1Z2",
        "seller_pan": "ZZZCG8888F",
        "seller_state": "Gujarat",
        "seller_state_code": "24",
        "seller_support_email": "billing@royalmedia.in",
        "seller_support_phone": "+91 98980 12345",
        "gst_rate_pct": 18.0,
        "gst_pricing_mode": "inclusive",
        "confirm_password": "Admin@GetMyMoment2026!"
    })
    if res_update_success.status_code == 200 and res_update_success.json().get("success") is True:
        record("TC-VAULT-07", "Vault Persistence", "Update Bank Account, UPI ID, Razorpay Keys & GSTIN", "PASS", "Updated and saved to DB")
    else:
        record("TC-VAULT-07", "Vault Persistence", "Update Bank & Gateway Settings", "FAIL", res_update_success.text)

    # 7. Verify Dynamic Order Creation & Invoicing Uses Updated Settings
    res_order = client.post("/api/v1/subscription/create-order", headers=photo_headers, json={
        "plan_key": "STUDIO_PRO",
        "billing_cycle": "MONTHLY"
    })
    order_data = res_order.json()
    if res_order.status_code == 200 and order_data.get("key_id") == "rzp_live_RoyalLiveKey999":
        record("TC-VAULT-08", "Dynamic Runtime", "Checkout Order dynamically uses new Gateway Key ID", "PASS", f"Key ID: {order_data['key_id']}")
    else:
        record("TC-VAULT-08", "Dynamic Runtime", "Checkout Order Key ID", "FAIL", f"{order_data.get('key_id')} != rzp_live_RoyalLiveKey999")

    # ---------------------------------------------------------
    # SUMMARY
    # ---------------------------------------------------------
    print("\n=====================================================================")
    print("                 VAULT QA TEST SUMMARY                               ")
    print("=====================================================================")
    total = len(results)
    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = total - passed
    pass_rate = (passed / total) * 100 if total > 0 else 0

    print(f"Total Tests Executed: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Pass Rate: {pass_rate:.1f}%\n")

    if failed == 0:
        print("🏆 SUPERADMIN GATEWAY & BANK VAULT SYSTEM VERIFIED (Score: 100/100)")
    else:
        print(f"⚠️ {failed} FAILURES DETECTED")

    return passed, failed

if __name__ == "__main__":
    run_vault_test_suite()
