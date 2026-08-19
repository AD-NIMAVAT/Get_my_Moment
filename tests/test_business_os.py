"""
Comprehensive Test Suite for Business OS Modules (CRM, Finance, Operations, Selection, Guest Uploads)
"""

import pytest


def test_business_os_complete_workflow(client):
    # 1. Register Photographer
    import secrets
    email = f"studio_{secrets.token_hex(4)}@example.com"
    reg_res = client.post("/api/v1/auth/signup", json={
        "email": email,
        "password": "Password123!",
        "studio_name": "Royal Indian Weddings Studio",
        "phone": "+919876543210"
    })
    assert reg_res.status_code == 201
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. CRM: Create New Lead / Inquiry
    lead_res = client.post("/api/v1/crm/leads", headers=headers, json={
        "client_name": "Rahul & Priya Sharma",
        "client_phone": "+919820011223",
        "client_email": "rahul.priya@wedding.com",
        "event_type": "Wedding",
        "venue_city": "Udaipur Palace, Rajasthan",
        "estimated_budget_inr": 250000.0,
        "notes": "3-day royal wedding shoot with drone & candid team"
    })
    assert lead_res.status_code == 201
    lead_data = lead_res.json()
    lead_id = lead_data["id"]
    assert lead_data["stage"] == "NEW_LEAD"
    assert lead_data["estimated_budget_inr"] == 250000.0

    # 3. CRM: Create Quotation / Package
    quote_res = client.post(f"/api/v1/crm/leads/{lead_id}/quotations", headers=headers, json={
        "package_name": "Royal Grand Heritage Package",
        "deliverables": [
            "2 Candid Photographers",
            "2 Traditional Photographers",
            "1 Cinematic Drone Pilot",
            "3 Premium Leather Albums (35x45)",
            "AI Live QR Guest Delivery"
        ],
        "price_inr": 250000.0,
        "tax_pct": 18.0
    })
    assert quote_res.status_code == 201
    quote_data = quote_res.json()
    assert quote_data["total_amount_inr"] == 295000.0

    # 4. CRM: Convert Lead to Event Workspace
    convert_res = client.post(f"/api/v1/crm/leads/{lead_id}/convert-to-event", headers=headers)
    assert convert_res.status_code == 200
    event_info = convert_res.json()
    event_id = event_info["event_id"]
    assert event_id is not None

    # 5. Operations: Verify Automatically Created Ceremonies
    ops_res = client.get(f"/api/v1/events/{event_id}/operations", headers=headers)
    assert ops_res.status_code == 200
    ops_data = ops_res.json()
    assert len(ops_data["ceremonies"]) >= 4

    # 6. Operations: Assign Crew Members & Agreed Payouts
    crew1 = client.post(f"/api/v1/events/{event_id}/operations/crew", headers=headers, json={
        "name": "Amit Cinematography",
        "role": "Cinematographer",
        "phone": "+919811122233",
        "payout_inr": 35000.0,
        "payout_status": "PENDING"
    })
    assert crew1.status_code == 201

    crew2 = client.post(f"/api/v1/events/{event_id}/operations/crew", headers=headers, json={
        "name": "Sameer Drone Pilot",
        "role": "Drone Pilot",
        "phone": "+919844455566",
        "payout_inr": 15000.0,
        "payout_status": "PENDING"
    })
    assert crew2.status_code == 201

    # 7. Finance: Log Expenses
    exp1 = client.post(f"/api/v1/events/{event_id}/finance/expenses", headers=headers, json={
        "category": "VIDEO_EDITOR",
        "description": "Color Grading & Teaser Editing",
        "amount_inr": 20000.0,
        "paid_to": "Studio Edit Hub"
    })
    assert exp1.status_code == 201

    exp2 = client.post(f"/api/v1/events/{event_id}/finance/expenses", headers=headers, json={
        "category": "ALBUM_PRINTING",
        "description": "3 Velvet Luxury Silk Photo Books",
        "amount_inr": 30000.0,
        "paid_to": "Canvera Print Lab"
    })
    assert exp2.status_code == 201

    # 8. Finance: Check Real Event Profit Calculation
    # Package: 250,000 INR
    # Costs: Crew (35,000 + 15,000 = 50,000) + Editor (20,000) + Album (30,000) = 100,000 INR
    # Expected Net Profit: 250,000 - 100,000 = 150,000 INR (60.0% margin)
    fin_res = client.get(f"/api/v1/events/{event_id}/finance", headers=headers)
    assert fin_res.status_code == 200
    fin_data = fin_res.json()
    assert fin_data["package_amount_inr"] == 250000.0
    assert fin_data["crew_cost_inr"] == 50000.0
    assert fin_data["editor_cost_inr"] == 20000.0
    assert fin_data["album_printing_cost_inr"] == 30000.0
    assert fin_data["total_expenses_inr"] == 100000.0
    assert fin_data["net_profit_inr"] == 150000.0
    assert fin_data["profit_margin_pct"] == 60.0

    # 9. Verify Milestones (Advance, Stage, Delivery)
    assert len(fin_data["payment_milestones"]) == 3
    advance_m = fin_data["payment_milestones"][0]
    assert advance_m["amount_inr"] == 75000.0  # 30% of 250k
