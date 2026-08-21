# E2E User Journeys
**GetMyMoment — Complete User Journey Documentation**
**Date:** 2026-08-20 | **All Journeys: VERIFIED ✅**

---

## Journey 1: Wedding Guest QR Experience

**Actor:** Wedding Guest at an event

### Steps
1. **Receive QR Code** — Via WhatsApp/SMS from photographer
2. **Scan QR** → https://getmymoment.in/e/{token}
3. **Sign Up** — Enter name + phone number → Account created (201)
4. **Give Consent** — Tap "Allow face matching" → Consent recorded (201)
5. **Take Selfie** — Camera opens → Selfie captured → AI matching runs
6. **View My Photos** — Gallery shows matched event photos (sorted by similarity score)
7. **Refresh Page** — Session restored from localStorage + server validation (no logout)
8. **Switch Guest** — Sign out and re-login as different guest

### API Flow
`
POST /events/{token}/guests/register
  → 201 {guest_id}
POST /guests/{guest_id}/consent
  → 201 {consent_id}
POST /events/{token}/guests/{guest_id}/search (selfie)
  → 200 {matched_photos}
GET /events/{token}/guests/{guest_id}/cached-match
  → 200 {status: READY, photos: [...]}
GET /events/{token}/guests/{guest_id}/session/validate
  → 200 {is_valid: true}
`

**Result: ✅ VERIFIED**

---

## Journey 2: Photographer Event Day Workflow

**Actor:** Wedding Photographer (Studio Admin)

### Steps
1. **Login** → Dashboard
2. **Create Event** → "Kavya & Adarsh Wedding" → Event created with QR
3. **Generate Folders** → Wedding preset → 6 ceremony folders created
4. **Upload Photos** → Batch drag-drop → AI indexes faces
5. **Share QR** → Guests scan QR → Start receiving selfies
6. **Monitor Guest Matches** → Dashboard shows who found their photos

### API Flow
`
POST /auth/login → {access_token}
POST /events → {id, access_token, qr_url}
POST /events/{id}/folders/generate-wedding-preset → [{folders}]
POST /events/{id}/photos (multipart) → {uploaded_count, photos}
GET /events/{id}/guests → [{guest, match_status}]
`

**Result: ✅ VERIFIED**

---

## Journey 3: Client Album Proofing

**Actor:** Bride/Groom receiving selection link

### Steps
1. **Receive Link** — Photographer sends selection link via WhatsApp
2. **Open Portal** → /selection/{token}
3. **Browse Photos** — Grouped by folder/ceremony
4. **Toggle Selections** — Heart photos they want in album
5. **Submit** — Confirm selections to photographer

### API Flow
`
GET /selection/{selection_token} → {photos, folders, selected_count}
POST /selection/{token}/photos/{photo_id}/toggle → {is_client_selected}
POST /selection/{token}/submit → {message, total_selected}
`

**Result: ✅ VERIFIED**

---

## Journey 4: Crew Field Operations

**Actor:** Freelance photographer/crew member

### Steps
1. **Receive Invite** — Photographer assigns via operations panel
2. **Login** → /crew/login → Enter phone number → Crew JWT
3. **View Dashboard** → See assigned events and ceremonies
4. **Set Active Ceremony** → Tap "Now shooting: Mandap"
5. **Upload Photos** → Direct from camera card → Photos tagged to active ceremony

### API Flow
`
POST /crew/login {phone} → {access_token, crew_id}
GET /crew/dashboard → {assigned_events}
POST /crew/set-ceremony → {ceremony_id}
POST /crew/upload (multipart) → {uploaded_count}
`

**Result: ✅ VERIFIED**

---

## Journey 5: CRM → Event Pipeline

**Actor:** Photographer (Business Owner)

### Steps
1. **Add Lead** → Client inquiry → Create lead in CRM
2. **Send Quotation** → Package + pricing → Quotation sent
3. **Convert to Event** → Lead confirmed → Booking created as Event
4. **Generate Invoice** → Post-event → Invoice with GST sent to client

### API Flow
`
POST /crm/leads → {id}
POST /crm/leads/{id}/quotations → {id, total_amount_inr}
POST /crm/leads/{id}/convert-to-event → {event_id}
POST /billing/invoices → {id, total_amount}
`

**Result: ✅ VERIFIED**

---

## Session Resilience Testing

| Scenario | Expected | Result |
|---|---|---|
| Guest refreshes page | Session restored from localStorage | ✅ |
| Guest opens in new tab | Multi-tab sync via storage event | ✅ |
| Guest session tampered | Server validation rejects (404) | ✅ |
| Cross-event guest lookup | 404 Not Found | ✅ |
| Valid session expires | Re-login prompt | ✅ |
