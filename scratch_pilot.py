"""
Live Pilot 01 Field Validation Script
Runs controlled real event validation against live production API (http://127.0.0.1:8000).
"""

import io
import time
import httpx
import json
from datetime import datetime
from PIL import Image, ImageDraw
from apps.api.database import SessionLocal
from apps.api.models import Event, Photo, Face, FaceEmbedding

API_BASE = "http://127.0.0.1:8000/api/v1"

def create_synthetic_photo(color="blue", text="Photo") -> bytes:
    img = Image.new("RGB", (800, 600), color=color)
    draw = ImageDraw.Draw(img)
    # Draw simple facial feature structure so YuNet can detect it
    draw.ellipse((350, 200, 450, 320), fill=(240, 220, 200)) # face
    draw.ellipse((375, 230, 395, 250), fill=(50, 50, 50))    # left eye
    draw.ellipse((405, 230, 425, 250), fill=(50, 50, 50))    # right eye
    draw.polygon([(400, 250), (395, 275), (405, 275)], fill=(180, 120, 100)) # nose
    draw.rectangle((385, 285, 415, 295), fill=(180, 50, 50))  # mouth
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()

def run_pilot():
    client = httpx.Client(timeout=30.0)
    print("=== STARTING LIVE-PILOT-01 FIELD VALIDATION ===")
    
    # 1. Photographer Registration / Login
    email = f"live_pilot_{int(time.time())}@example.com"
    pwd = "PilotSecurePassword123!"
    print(f"[1] Registering Pilot Photographer: {email}")
    reg_resp = client.post(f"{API_BASE}/auth/signup", json={
        "email": email,
        "password": pwd,
        "studio_name": "Field Pilot Studio",
        "phone": "+919876501234"
    })
    assert reg_resp.status_code == 201, f"Signup failed: {reg_resp.text}"
    token = reg_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(" -> Photographer authenticated successfully.")

    # 2. Create Controlled Pilot Event
    print("[2] Creating Pilot Event...")
    event_resp = client.post(f"{API_BASE}/events", headers=headers, json={
        "name": "Live Pilot Event 01",
        "event_date": datetime.utcnow().strftime("%Y-%m-%d"),
        "allow_guest_uploads": True,
        "allow_downloads": True
    })
    assert event_resp.status_code == 201, f"Event creation failed: {event_resp.text}"
    event_data = event_resp.json()
    event_id = event_data["id"]
    public_token = event_data["access_token"]
    print(f" -> Created Event ID: {event_id}, Public Token: {public_token}")

    # 3. HTTP Photo Ingest (3 Synthetic Pilot Photos)
    print("[3] Uploading 3 Synthetic Event Photos via HTTP Streaming...")
    photos_data = [
        ("pilot_ceremony_01.jpg", create_synthetic_photo(color="navy", text="Ceremony")),
        ("pilot_reception_02.jpg", create_synthetic_photo(color="darkgreen", text="Reception")),
        ("pilot_portrait_03.jpg", create_synthetic_photo(color="maroon", text="Portrait"))
    ]
    files = [("files", (name, b, "image/jpeg")) for name, b in photos_data]
    
    t_upload_start = time.time()
    upload_resp = client.post(f"{API_BASE}/events/{event_id}/photos", headers=headers, files=files)
    t_upload_end = time.time()
    
    assert upload_resp.status_code == 201, f"Upload failed: {upload_resp.text}"
    uploaded_photos = upload_resp.json()["photos"]
    print(f" -> Uploaded {len(uploaded_photos)} photos in {t_upload_end - t_upload_start:.2f}s.")

    # 4. Wait for Celery Worker Processing & Poll Telemetry
    print("[4] Waiting for Celery Processing & Guest-Ready status...")
    max_wait = 20
    start_wait = time.time()
    all_ready = False
    
    while time.time() - start_wait < max_wait:
        status_resp = client.get(f"{API_BASE}/events/{event_id}/photos", headers=headers)
        photos = status_resp.json()
        ready_count = sum(1 for p in photos if p["status"] == "PROCESSED")
        if ready_count == len(photos_data):
            all_ready = True
            break
        time.sleep(0.5)

    assert all_ready, "Photos did not transition to PROCESSED within timeout."
    print(" -> All photos successfully PROCESSED and GUEST_READY.")

    # 5. Check Live Event Health Endpoint
    print("[5] Verifying Event Health Endpoint...")
    health_resp = client.get(f"{API_BASE}/events/{event_id}/health", headers=headers)
    assert health_resp.status_code == 200
    health_data = health_resp.json()
    print(f" -> Event Health: {health_data['pipeline_health']}, Total: {health_data['photos_total']}, Ready: {health_data['photos_ready']}")

    # 6. Guest Public Landing & Face Matching Search Flow
    print("[6] Verifying Public Guest Flow & Face Search...")
    pub_resp = client.get(f"{API_BASE}/events/public/by-token/{public_token}")
    assert pub_resp.status_code == 200
    
    # Guest Register
    guest_reg = client.post(f"{API_BASE}/events/{event_id}/guests/register", json={
        "name": "Pilot Guest Participant",
        "mobile": "+919876543210"
    })
    assert guest_reg.status_code == 201
    guest_id = guest_reg.json()["guest_id"]

    # Guest Consent
    consent_resp = client.post(f"{API_BASE}/guests/{guest_id}/consent", json={
        "guest_id": guest_id,
        "face_search_consent": True,
        "marketing_consent": False
    })
    assert consent_resp.status_code == 201

    # Guest Face Search
    selfie_b = create_synthetic_photo(color="navy", text="Selfie")
    search_resp = client.post(
        f"{API_BASE}/events/{event_id}/guests/{guest_id}/search",
        files=[("selfie", ("selfie.jpg", selfie_b, "image/jpeg"))]
    )
    assert search_resp.status_code == 200
    search_data = search_resp.json()
    print(f" -> Face Search completed: search_id={search_data.get('search_id')}, latency={search_data.get('search_latency_ms')}ms")

    # 7. Selection Portal Verification
    print("[7] Verifying Client Selection Portal...")
    db = SessionLocal()
    try:
        ev_rec = db.query(Event).filter(Event.id == event_id).first()
        sel_token = ev_rec.selection_token
        print(f" -> Selection token retrieved: {sel_token}")
        
        sel_gallery = client.get(f"{API_BASE}/selection/{sel_token}")
        assert sel_gallery.status_code == 200, f"Selection gallery failed: {sel_gallery.text}"
        sel_data = sel_gallery.json()
        assert sel_data["total_photos"] == len(photos_data)
        
        # Toggle selection on photo 1
        p1_id = photos[0]["id"]
        toggle_resp = client.post(f"{API_BASE}/selection/{sel_token}/photos/{p1_id}/toggle", json={
            "is_selected": True,
            "comment": "Pilot selection favorite"
        })
        assert toggle_resp.status_code == 200, f"Selection toggle failed: {toggle_resp.text}"
        assert toggle_resp.json()["is_client_selected"] is True
        print(" -> Client photo selection toggle verified.")

        # Data consistency check
        db_photos = db.query(Photo).filter(Photo.event_id == event_id).all()
        db_faces = db.query(Face).filter(Face.event_id == event_id).all()
        db_embs = db.query(FaceEmbedding).filter(FaceEmbedding.event_id == event_id).all()
        print(f" -> DB Consistency: Photos={len(db_photos)}, Faces={len(db_faces)}, Embeddings={len(db_embs)}")
        assert len(db_photos) == len(photos_data)
        assert len(db_faces) == len(db_embs)
    finally:
        db.close()

    # 8. Wireless FTP Status
    print("[8] Verifying Wireless FTP Ingest Service...")
    wireless_resp = client.get(f"{API_BASE}/wireless/status")
    assert wireless_resp.status_code == 200
    w_data = wireless_resp.json()
    print(f" -> Wireless FTP Ingest: running={w_data.get('is_running')}, port={w_data.get('port')}, server_ip={w_data.get('server_ip')}")

    print("=== LIVE PILOT 01 EXECUTION COMPLETED SUCCESSFULLY ===")
    return {
        "event_id": event_id,
        "photo_count": len(photos_data),
        "pipeline_health": health_data['pipeline_health'],
        "photos_ready": health_data['photos_ready'],
        "wireless_running": w_data.get('is_running'),
        "faces_detected": len(db_faces),
        "embeddings_created": len(db_embs)
    }

if __name__ == "__main__":
    result = run_pilot()
    print(json.dumps(result, indent=2))
