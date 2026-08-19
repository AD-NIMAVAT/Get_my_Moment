"""
Get My Moment — Master Client Billing & Invoicing Automated QA Test Suite
Tests:
- TC-CB-01: TaxEngine Intra/Inter-state & Non-GST calculations
- TC-CB-02: Photographer Tax & Banking Profile CRUD + GSTIN validation
- TC-CB-03: Client Invoice Creation with Line Items & Immutable Snapshots
- TC-CB-04: Multi-Payment & Milestone tracking (Advance, Partial, Full settlement)
- TC-CB-05: Quotation Creation & 1-Click Convert to Invoice
- TC-CB-06: Strict IDOR Protection across Photographers
- TC-CB-07: Invoice Immutability against Profile Changes
- TC-CB-08: Public Secure Share Token & WhatsApp Click-to-Chat Payload
- TC-CB-09: Printable A4 HTML Invoice rendering
- TC-CB-10: GSTR-1 / Accounting CSV Export
"""

import sys
import os
import uuid
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.insert(0, r"d:\Get_my_moment")

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from fastapi.testclient import TestClient
from apps.api.main import app
from apps.api.database import get_db, SessionLocal, init_db
from apps.api.models.photographer import Photographer
from apps.api.models.finance import ClientInvoice, ClientPaymentRecord
from apps.api.models.crm import Quotation
from apps.api.auth import hash_password, create_access_token
from apps.api.services.tax_engine import tax_engine

client = TestClient(app)

TOTAL_TESTS = 0
PASSED_TESTS = 0
FAILED_TESTS = 0


def log_test(test_id: str, description: str, passed: bool, details: str = ""):
    global TOTAL_TESTS, PASSED_TESTS, FAILED_TESTS
    TOTAL_TESTS += 1
    if passed:
        PASSED_TESTS += 1
        print(f"  [PASS] {test_id}: {description}")
    else:
        FAILED_TESTS += 1
        print(f"  [FAIL] {test_id}: {description} --> {details}")


def run_qa_suite():
    global TOTAL_TESTS, PASSED_TESTS, FAILED_TESTS
    print("=====================================================================")
    print("   GET MY MOMENT — MASTER CLIENT BILLING & GST QA TEST SUITE         ")
    print("=====================================================================")

    init_db()
    db = SessionLocal()

    # 1. Setup Test Photographers (Photographer A & Photographer B)
    email_a = f"photographer_a_{uuid.uuid4().hex[:6]}@test.com"
    email_b = f"photographer_b_{uuid.uuid4().hex[:6]}@test.com"

    photo_a = Photographer(
        email=email_a,
        password_hash=hash_password("Pass@123"),
        studio_name="Aura Cinematic Weddings",
        phone="9876543210",
        city="Ahmedabad",
        state="Gujarat",
        gst_status="REGISTERED",
        gst_legal_name="Aura Studio LLP",
        gstin="24ABCDE1234F1Z5",
        gst_state="Gujarat",
        default_tax_mode="WITH_GST",
        bank_name="HDFC Bank",
        bank_account_number="50200012345678",
        bank_ifsc="HDFC0001234",
        upi_id="auraweddings@hdfcbank",
    )
    photo_b = Photographer(
        email=email_b,
        password_hash=hash_password("Pass@123"),
        studio_name="Rustic Lens Studio",
        phone="9123456789",
        city="Mumbai",
        state="Maharashtra",
        gst_status="UNREGISTERED",
        default_tax_mode="WITHOUT_GST",
    )

    db.add_all([photo_a, photo_b])
    db.commit()
    db.refresh(photo_a)
    db.refresh(photo_b)

    token_a = create_access_token(data={"sub": photo_a.id})
    token_b = create_access_token(data={"sub": photo_b.id})

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # -------------------------------------------------------------
    # TC-CB-01: TaxEngine Unit Tests
    # -------------------------------------------------------------
    print("\n>>> Running TC-CB-01: Tax Engine Validation...")
    # Test 1a: Intra-state 18% GST (Gujarat to Gujarat) -> CGST 9% + SGST 9%
    res_intra = tax_engine.calculate_tax(
        subtotal=100000.0,
        discount=10000.0,
        gst_status="REGISTERED",
        tax_mode="WITH_GST",
        seller_state="Gujarat",
        buyer_state="Gujarat",
        tax_rate_pct=18.0
    )
    log_test(
        "TC-CB-01a",
        "Intra-State GST (CGST 9% + SGST 9%) on taxable ₹90,000",
        res_intra["taxable_amount_inr"] == 90000.0 and
        res_intra["cgst_amount_inr"] == 8100.0 and
        res_intra["sgst_amount_inr"] == 8100.0 and
        res_intra["igst_amount_inr"] == 0.0 and
        res_intra["grand_total_inr"] == 106200.0 and
        res_intra["document_type"] == "TAX_INVOICE"
    )

    # Test 1b: Inter-state 18% GST (Gujarat to Maharashtra) -> IGST 18%
    res_inter = tax_engine.calculate_tax(
        subtotal=50000.0,
        discount=0.0,
        gst_status="REGISTERED",
        tax_mode="WITH_GST",
        seller_state="Gujarat",
        buyer_state="Maharashtra",
        tax_rate_pct=18.0
    )
    log_test(
        "TC-CB-01b",
        "Inter-State GST (IGST 18%) on taxable ₹50,000",
        res_inter["taxable_amount_inr"] == 50000.0 and
        res_inter["igst_amount_inr"] == 9000.0 and
        res_inter["cgst_amount_inr"] == 0.0 and
        res_inter["grand_total_inr"] == 59000.0
    )

    # Test 1c: Unregistered Seller -> COMMERCIAL_INVOICE, 0 tax
    res_unreg = tax_engine.calculate_tax(
        subtotal=40000.0,
        discount=0.0,
        gst_status="UNREGISTERED",
        tax_mode="WITH_GST",  # Even if requested, server rejects
    )
    log_test(
        "TC-CB-01c",
        "Unregistered Seller enforces Commercial Invoice and 0 GST",
        res_unreg["gst_applied"] is False and
        res_unreg["total_tax_inr"] == 0.0 and
        res_unreg["grand_total_inr"] == 40000.0 and
        res_unreg["document_type"] == "COMMERCIAL_INVOICE"
    )

    # Test 1d: GSTIN regex format validation
    log_test(
        "TC-CB-01d",
        "GSTIN validation regex (Valid vs Invalid)",
        tax_engine.validate_gstin("24ABCDE1234F1Z5") is True and
        tax_engine.validate_gstin("INVALID123") is False
    )

    # -------------------------------------------------------------
    # TC-CB-02: Photographer Tax & Banking Profile
    # -------------------------------------------------------------
    print("\n>>> Running TC-CB-02: Photographer Tax & Bank Profile...")
    r = client.get("/api/v1/billing/tax-profile", headers=headers_a)
    log_test("TC-CB-02a", "GET /billing/tax-profile returns 200 and masked account", r.status_code == 200 and "bank_account_number_masked" in r.json())

    # Update tax profile with invalid GSTIN should fail
    r_bad = client.put("/api/v1/billing/tax-profile", headers=headers_a, json={
        "gst_status": "REGISTERED",
        "gstin": "BAD_GSTIN_123",
        "default_tax_mode": "WITH_GST"
    })
    log_test("TC-CB-02b", "PUT /billing/tax-profile rejects invalid GSTIN with 400", r_bad.status_code == 400)

    # Update with valid GSTIN and banking details
    r_ok = client.put("/api/v1/billing/tax-profile", headers=headers_a, json={
        "gst_status": "REGISTERED",
        "gst_legal_name": "Aura Cinematic Weddings LLP",
        "gstin": "24ABCDE1234F1Z5",
        "gst_state": "Gujarat",
        "default_tax_mode": "WITH_GST",
        "bank_name": "HDFC Bank",
        "bank_account_number": "50200099887766",
        "bank_ifsc": "HDFC0001234",
        "upi_id": "auraphotos@hdfcbank",
    })
    log_test("TC-CB-02c", "PUT /billing/tax-profile updates profile successfully", r_ok.status_code == 200)

    # -------------------------------------------------------------
    # TC-CB-03: Client Invoice Creation with Line Items
    # -------------------------------------------------------------
    print("\n>>> Running TC-CB-03: Client Invoice Creation...")
    inv_payload = {
        "client_name": "Rahul & Priya Sharma",
        "client_phone": "9898989898",
        "client_email": "rahul.priya@gmail.com",
        "client_city": "Ahmedabad",
        "client_state": "Gujarat",
        "event_name": "Grand Wedding Celebration",
        "event_date": "2026-11-20T10:00:00",
        "event_venue": "Courtyard Marriott, Ahmedabad",
        "tax_mode": "WITH_GST",
        "gst_rate_pct": 18.0,
        "discount_inr": 5000.0,
        "items": [
            {
                "service_type": "PHOTOGRAPHY",
                "description": "2 Days Traditional + Candid Photography",
                "quantity": 1,
                "unit_price_inr": 80000.0,
            },
            {
                "service_type": "VIDEOGRAPHY",
                "description": "Cinematic 4K Wedding Film + Teaser",
                "quantity": 1,
                "unit_price_inr": 70000.0,
            },
            {
                "service_type": "ALBUM_PRINTING",
                "description": "2 Premium Leather Flushmount Photobooks (35x45)",
                "quantity": 2,
                "unit_price_inr": 15000.0,
            }
        ],
        "milestones": [
            {"title": "Booking Advance (20%)", "percentage": 20.0},
            {"title": "Wedding Day (50%)", "percentage": 50.0},
            {"title": "Final Album Delivery (30%)", "percentage": 30.0},
        ],
        "advance_paid_inr": 30000.0,
        "advance_payment_mode": "UPI",
        "advance_reference_no": "UPI-UTR-998877",
        "finalize": True,
    }

    r_inv = client.post("/api/v1/billing/invoices", headers=headers_a, json=inv_payload)
    inv_data = r_inv.json()
    invoice_id = inv_data.get("invoice_id")
    inv_num = inv_data.get("invoice_number")

    # Subtotal = 80k + 70k + 30k = 180k. Discount = 5k. Taxable = 175k.
    # 18% GST (CGST 9% = 15,750, SGST 9% = 15,750). Grand Total = 206,500.
    # Advance Paid = 30,000. Balance Due = 176,500.
    log_test(
        "TC-CB-03a",
        f"POST /billing/invoices created {inv_num} with exact tax & status PARTIALLY_PAID",
        r_inv.status_code == 201 and
        inv_data["grand_total_inr"] == 206500.0 and
        inv_data["amount_paid_inr"] == 30000.0 and
        inv_data["balance_due_inr"] == 176500.0 and
        inv_data["status"] == "PARTIALLY_PAID" and
        inv_data["secure_share_token"] is not None
    )

    # -------------------------------------------------------------
    # TC-CB-04: Multi-Payment & Milestone Settlement
    # -------------------------------------------------------------
    print("\n>>> Running TC-CB-04: Multi-Payment & Balance Settlement...")
    # Record Second Payment of ₹100,000
    r_pay1 = client.post(f"/api/v1/billing/invoices/{invoice_id}/record-payment", headers=headers_a, json={
        "amount_inr": 100000.0,
        "payment_mode": "BANK_TRANSFER",
        "reference_no": "NEFT-HDFC-112233",
        "notes": "Wedding Day Stage Payment"
    })
    log_test("TC-CB-04a", "Record 2nd payment of ₹100,000", r_pay1.status_code == 200 and "receipt_number" in r_pay1.json())

    # Verify balance due is now ₹76,500
    r_chk1 = client.get(f"/api/v1/billing/invoices/{invoice_id}", headers=headers_a)
    chk1_data = r_chk1.json()
    log_test(
        "TC-CB-04b",
        "Verify balance due reduced to ₹76,500 and status remains PARTIALLY_PAID",
        chk1_data["amount_paid_inr"] == 130000.0 and
        chk1_data["balance_due_inr"] == 76500.0 and
        chk1_data["status"] == "PARTIALLY_PAID" and
        len(chk1_data["payments"]) == 2
    )

    # Record Final Payment of remaining ₹76,500
    r_pay2 = client.post(f"/api/v1/billing/invoices/{invoice_id}/record-payment", headers=headers_a, json={
        "amount_inr": 76500.0,
        "payment_mode": "UPI",
        "reference_no": "UPI-FINAL-556677",
        "notes": "Final Handover Settlement"
    })
    r_chk2 = client.get(f"/api/v1/billing/invoices/{invoice_id}", headers=headers_a)
    chk2_data = r_chk2.json()
    log_test(
        "TC-CB-04c",
        "Full settlement changes status to PAID and balance due to ₹0.00",
        chk2_data["amount_paid_inr"] == 206500.0 and
        chk2_data["balance_due_inr"] == 0.0 and
        chk2_data["status"] == "PAID"
    )

    # -------------------------------------------------------------
    # TC-CB-05: Quotations & 1-Click Conversion
    # -------------------------------------------------------------
    print("\n>>> Running TC-CB-05: Quotation to Invoice Conversion...")
    q_payload = {
        "package_name": "Pre-Wedding + Reception Luxury Package",
        "client_name": "Karan Mehta",
        "client_phone": "9900112233",
        "client_email": "karan.mehta@gmail.com",
        "event_type": "Pre-Wedding & Reception",
        "venue_city": "Vadodara",
        "tax_mode": "WITH_GST",
        "discount_inr": 2000.0,
        "items": [
            {
                "service_type": "PRE_WEDDING",
                "description": "Full Day Outdoor Pre-Wedding Shoot (Drone + Gimbal)",
                "quantity": 1,
                "unit_price_inr": 45000.0,
            },
            {
                "service_type": "PHOTOGRAPHY",
                "description": "Reception Photography & Cinematic Reel",
                "quantity": 1,
                "unit_price_inr": 35000.0,
            }
        ]
    }
    r_q = client.post("/api/v1/billing/quotations", headers=headers_a, json=q_payload)
    q_data = r_q.json()
    quotation_id = q_data.get("quotation_id")
    log_test("TC-CB-05a", f"Create Quotation {q_data.get('quotation_number')}", r_q.status_code == 201)

    # Convert quotation to invoice
    r_conv = client.post(f"/api/v1/billing/quotations/{quotation_id}/convert-to-invoice", headers=headers_a)
    conv_data = r_conv.json()
    log_test(
        "TC-CB-05b",
        f"1-Click Convert Quotation -> Invoice {conv_data.get('invoice_number')}",
        r_conv.status_code == 200 and "invoice_id" in conv_data
    )

    # -------------------------------------------------------------
    # TC-CB-06: Strict IDOR Protection
    # -------------------------------------------------------------
    print("\n>>> Running TC-CB-06: Strict IDOR Protection...")
    # Photographer B attempts to view Photographer A's invoice
    r_idor_get = client.get(f"/api/v1/billing/invoices/{invoice_id}", headers=headers_b)
    log_test("TC-CB-06a", "Cross-photographer GET invoice blocked with 404", r_idor_get.status_code == 404)

    # Photographer B attempts to record payment on Photographer A's invoice
    r_idor_pay = client.post(f"/api/v1/billing/invoices/{invoice_id}/record-payment", headers=headers_b, json={
        "amount_inr": 1000.0,
        "payment_mode": "CASH"
    })
    log_test("TC-CB-06b", "Cross-photographer record-payment blocked with 404", r_idor_pay.status_code == 404)

    # Photographer B attempts to cancel Photographer A's invoice
    r_idor_cancel = client.post(f"/api/v1/billing/invoices/{invoice_id}/cancel", headers=headers_b)
    log_test("TC-CB-06c", "Cross-photographer cancel blocked with 404", r_idor_cancel.status_code == 404)

    # -------------------------------------------------------------
    # TC-CB-07: Invoice Immutability
    # -------------------------------------------------------------
    print("\n>>> Running TC-CB-07: Invoice Immutability...")
    # Change Photographer A's GST profile to Unregistered
    client.put("/api/v1/billing/tax-profile", headers=headers_a, json={
        "gst_status": "UNREGISTERED",
        "default_tax_mode": "WITHOUT_GST"
    })

    # Historical invoice should still retain original GST snapshot
    r_hist = client.get(f"/api/v1/billing/invoices/{invoice_id}", headers=headers_a)
    hist_data = r_hist.json()
    log_test(
        "TC-CB-07a",
        "Historical invoice retains original GST snapshot after profile change",
        hist_data["gst_applied"] is True and
        hist_data["seller_gstin_snapshot"] == "24ABCDE1234F1Z5" and
        hist_data["cgst_amount_inr"] == 15750.0 and
        hist_data["grand_total_inr"] == 206500.0
    )

    # -------------------------------------------------------------
    # TC-CB-08: Public Secure Share Token & WhatsApp Click Payload
    # -------------------------------------------------------------
    print("\n>>> Running TC-CB-08: Public Share Token & WhatsApp...")
    sec_token = chk2_data.get("secure_share_token")
    r_pub = client.get(f"/api/v1/billing/share/{sec_token}")
    log_test(
        "TC-CB-08a",
        "Public shared invoice accessible via unguessable token without login",
        r_pub.status_code == 200 and r_pub.json()["client_name"] == "Rahul & Priya Sharma"
    )

    wa_info = chk2_data.get("whatsapp_share", {})
    log_test(
        "TC-CB-08b",
        "WhatsApp share payload contains click-to-chat URL with secure link",
        "api.whatsapp.com/send" in wa_info.get("whatsapp_click_url", "") and
        sec_token in wa_info.get("whatsapp_click_url", "")
    )

    # -------------------------------------------------------------
    # TC-CB-09: Printable A4 HTML Invoice
    # -------------------------------------------------------------
    print("\n>>> Running TC-CB-09: Printable A4 HTML Invoice...")
    r_html = client.get(f"/api/v1/billing/invoices/{invoice_id}/html?token={token_a}")
    log_test(
        "TC-CB-09a",
        "Printable A4 HTML rendered with Studio Bank and UPI details",
        r_html.status_code == 200 and
        "Aura Cinematic Weddings" in r_html.text and
        "TAX INVOICE" in r_html.text and
        "Courtyard Marriott" in r_html.text
    )

    # -------------------------------------------------------------
    # TC-CB-10: GSTR-1 CSV Export
    # -------------------------------------------------------------
    print("\n>>> Running TC-CB-10: GSTR-1 CSV Export...")
    r_csv = client.get("/api/v1/billing/exports/gstr1", headers=headers_a)
    log_test(
        "TC-CB-10a",
        "GET /billing/exports/gstr1 returns valid CSV with tax breakdown",
        r_csv.status_code == 200 and
        "text/csv" in r_csv.headers.get("content-type", "") and
        "Taxable Value (INR)" in r_csv.text and
        "Rahul & Priya Sharma" in r_csv.text
    )

    print("\n=====================================================================")
    print(f"   TEST SUITE SUMMARY: {PASSED_TESTS}/{TOTAL_TESTS} PASSED ({(PASSED_TESTS/TOTAL_TESTS)*100:.1f}%)")
    print("=====================================================================")
    db.close()
    if FAILED_TESTS > 0:
        sys.exit(1)


if __name__ == "__main__":
    run_qa_suite()
