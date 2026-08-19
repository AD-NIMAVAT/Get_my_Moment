# Get My Moment — Photographer Pilot Field Guide

Welcome to the **Get My Moment** photographer pilot guide. This document provides step-by-step instructions for operating Get My Moment during live events (weddings, galas, sports tournaments, corporate summits).

---

## 1. Pre-Event Setup (2 Minutes)

1. **Log in to Studio Dashboard**: Go to [http://localhost:3000/dashboard](http://localhost:3000/dashboard) (or your production studio URL).
2. **Create New Event**:
   - Enter Event Title (e.g. `David & Sarah Wedding`).
   - Set Event Date and initial expiration window (e.g. 30 days).
3. **Generate & Print QR Code Signage**:
   - Go to **"Event QR Code & Signage"**.
   - Download the high-resolution event QR PNG.
   - Print table tent cards or display the QR on digital screens / entry kiosks with copy:  
     *"Find Your Photos Instantly — Scan with your phone camera!"*

---

## 2. Ingesting Photos During & Post-Event

### Option A: Web Drag-and-Drop
- Drag and drop photo batches (JPEG/PNG/WebP) directly into the web uploader at `/dashboard/events/{id}`.
- Uploads process in chunked parallel streams with background AI indexing.

### Option B: CLI High-Speed SD Card Ingest
For massive batches (1,000–10,000 photos directly from camera SD cards):
```powershell
python tools/uploader/cli.py --dir "D:/DCIM/100CANON" --event-id "<event_id>" --email "<your_email>" --password "<your_password>"
```
- Uses multi-threaded file hashing and concurrent multipart uploads.

---

## 3. Guest Experience Script

When guests scan the QR code:
1. **Welcome Screen**: Displays your studio branding, event title, and total indexed photos.
2. **Instant Registration**: Guest enters their Name & Mobile number.
3. **Privacy & Consent**: Transparent biometric face-search consent + optional studio marketing opt-in.
4. **Selfie Capture**: Guest snaps a selfie with their phone front camera (or uploads from gallery).
5. **Instant Private Gallery**: 128-dimensional AI vector search matches their face in under 100ms and presents their moments with one-tap high-resolution downloads.

---

## 4. Live Telemetry & Lead Capture

- Review live engagement metrics anytime at `GET /api/v1/events/{id}/analytics` or in your Studio Dashboard:
  - **Photos Indexed** vs **Searches Executed**
  - **Match Delivery Rate**
  - **Consented Marketing Leads (Name, Mobile)** for future studio booking inquiries.

---

## 5. Privacy & Data Retention Guidelines

- Guest selfies are **transient** (processed purely in memory for search vector computation and never stored permanently).
- All vector embeddings are strictly quarantined to the current event (`WHERE event_id = :event_id`).
- When an event is deleted or expires, all associated face embeddings and lead caches are purged according to privacy regulations.
