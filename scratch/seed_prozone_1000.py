"""
Get My Moment - Seed Prozone Studio with 1,000 Indexed Photos & Complete Business OS Data
"""

import sys
import os

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')
import uuid
import hashlib
import random
import io
import time
from datetime import datetime, timedelta
import numpy as np
from PIL import Image, ImageDraw, ImageFont

# Set Python path to project root
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.orm import Session
from apps.api.database import SessionLocal, engine, Base
from apps.api.models import (
    Photographer, Event, Photo, Face, FaceEmbedding, 
    Guest, Consent, GuestSearch, Lead, PaymentMilestone, 
    EventExpense, Ceremony, CrewMember, EventTask, CalendarNote
)
from apps.api.auth import hash_password
from apps.api.services.storage import storage_service
from packages.shared.constants import PhotoStatus

CEREMONIES = [
    "Haldi Rasam & Floral Splash",
    "Mehendi & Sangeet Bollywood Night",
    "Ganesh Puja & Mandap Vidhi",
    "Royal Baraat & Varmala Ceremony",
    "Grand Wedding Reception & Gala",
]

PALETTES = [
    ((243, 160, 143), (232, 106, 91)),   # Coral sunset
    ((217, 164, 65), (143, 100, 32)),    # Warm gold & amber
    ((110, 190, 230), (45, 110, 170)),   # Royal blue & cyan
    ((235, 130, 175), (180, 50, 110)),   # Rose & magenta
    ((90, 190, 130), (40, 120, 80)),     # Emerald garden
    ((240, 220, 180), (190, 160, 110)),  # Champagne & ivory
    ((180, 130, 230), (110, 60, 170)),   # Velvet purple
    ((245, 180, 130), (200, 100, 60)),   # Warm terracotta
]

def generate_wedding_photo(photo_idx: int, ceremony_name: str) -> tuple:
    """Generate high-resolution portrait/candid image with realistic metadata, faces, and aesthetic overlays."""
    width = random.choice([1200, 1600, 1400])
    height = random.choice([800, 1066, 1200]) if photo_idx % 3 != 0 else random.choice([1200, 1600])
    
    palette_bg, palette_fg = random.choice(PALETTES)
    
    # Create base gradient background
    img = Image.new("RGB", (width, height), color=palette_bg)
    draw = ImageDraw.Draw(img)
    
    # Draw artistic decorative lighting & bokeh circles
    for _ in range(random.randint(12, 25)):
        cx = random.randint(0, width)
        cy = random.randint(0, height)
        radius = random.randint(40, 180)
        alpha_color = (
            min(255, palette_fg[0] + random.randint(-30, 50)),
            min(255, palette_fg[1] + random.randint(-30, 50)),
            min(255, palette_fg[2] + random.randint(-30, 50)),
        )
        draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=alpha_color)
    
    # Draw portrait stylized character/subjects
    num_people = 1 if photo_idx % 2 == 0 else random.randint(2, 4)
    face_boxes = []
    
    step_x = width // (num_people + 1)
    for p_idx in range(num_people):
        px = step_x * (p_idx + 1) + random.randint(-30, 30)
        py = height // 2 + random.randint(-40, 40)
        head_radius = random.randint(60, 110)
        
        # Face ellipse
        face_skin = (random.randint(220, 255), random.randint(180, 220), random.randint(150, 190))
        draw.ellipse([px - head_radius, py - head_radius * 1.3, px + head_radius, py + head_radius * 0.9], fill=face_skin, outline=(70, 40, 30), width=2)
        
        # Hair
        hair_color = random.choice([(30, 20, 15), (50, 35, 25), (20, 15, 10)])
        draw.chord([px - head_radius, py - head_radius * 1.4, px + head_radius, py - head_radius * 0.4], 180, 360, fill=hair_color)
        
        # Eyes
        eye_y = py - head_radius * 0.2
        eye_dist = head_radius * 0.35
        draw.ellipse([px - eye_dist - 6, eye_y - 4, px - eye_dist + 6, eye_y + 4], fill=(30, 20, 20))
        draw.ellipse([px + eye_dist - 6, eye_y - 4, px + eye_dist + 6, eye_y + 4], fill=(30, 20, 20))
        
        # Smile
        mouth_y = py + head_radius * 0.4
        draw.arc([px - 20, mouth_y - 10, px + 20, mouth_y + 10], 0, 180, fill=(180, 50, 60), width=3)
        
        # Outfit / Traditional attire
        body_top = py + head_radius * 0.9
        outfit_color = (random.randint(150, 240), random.randint(40, 180), random.randint(40, 120))
        draw.polygon([
            (px - head_radius * 1.8, height),
            (px + head_radius * 1.8, height),
            (px + head_radius * 0.7, body_top),
            (px - head_radius * 0.7, body_top),
        ], fill=outfit_color)
        
        face_boxes.append((
            int(px - head_radius),
            int(py - head_radius * 1.3),
            int(head_radius * 2),
            int(head_radius * 2.2)
        ))

    # Watermark / Tag header & footer
    draw.rectangle([0, height - 60, width, height], fill=(20, 20, 20))
    draw.text((25, height - 42), f"PROZONE STUDIO • {ceremony_name.upper()} • PHOTO #{photo_idx:04d}", fill=(240, 240, 240))
    draw.text((width - 180, height - 42), "GET MY MOMENT", fill=(232, 106, 91))
    
    # Save to JPEG byte buffer
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=88, optimize=True)
    return buf.getvalue(), width, height, face_boxes

def seed_prozone_1000():
    db: Session = SessionLocal()
    try:
        print("=" * 70)
        print("🌟 SEEDING PROZONE STUDIO & 1,000 HIGH-RESOLUTION WORKSPACE PHOTOS")
        print("=" * 70)

        # 1. Create or Find Photographer "Prozone Studio"
        email = "prozone@studio.com"
        photographer = db.query(Photographer).filter(Photographer.email == email).first()
        if not photographer:
            photographer = Photographer(
                id=str(uuid.uuid4()),
                email=email,
                password_hash=hash_password("Prozone@2026!"),
                studio_name="Prozone Studio",
                phone="+91 98980 12345",
                city="Surat",
                state="Gujarat",
                instagram_handle="@prozonestudio_official",
                portfolio_url="https://prozonestudio.com",
                years_of_experience="5 - 10 Years (Senior Studio Leader)",
                specializations="Wedding & Pre-Wedding, Candid Photography, Cinematic Films & Teasers, Destination Weddings",
                gst_number="24AAACP1234F1Z9",
                subscription_plan="ENTERPRISE_VIP",
                subscription_status="ACTIVE",
                max_storage_gb=10000,
                max_events_per_month=9999,
                is_active=True,
                is_verified=True,
            )
            db.add(photographer)
            db.commit()
            db.refresh(photographer)
            print(f"✅ Created Photographer: {photographer.studio_name} ({photographer.email})")
        else:
            photographer.subscription_plan = "ENTERPRISE_VIP"
            photographer.is_verified = True
            photographer.is_active = True
            photographer.max_storage_gb = 10000
            db.commit()
            print(f"ℹ️ Found Photographer: {photographer.studio_name} ({photographer.email})")

        # 2. Create Flagship Wedding Event
        event_name = "Aarav & Meera Grand Royal Wedding"
        event = db.query(Event).filter(
            Event.photographer_id == photographer.id,
            Event.name == event_name
        ).first()

        if not event:
            event = Event(
                id=str(uuid.uuid4()),
                photographer_id=photographer.id,
                name=event_name,
                slug="aarav-meera-grand-royal-wedding",
                event_date=datetime.utcnow() - timedelta(days=2),
                venue="The Leela Palace",
                city="Udaipur",
                client_name="Aarav & Meera Shah",
                client_phone="+91 98765 11223",
                package_amount_inr=350000.0,
                access_token=hashlib.sha256(f"prozone_token_{time.time()}".encode()).hexdigest()[:12],
                selection_token=hashlib.sha256(f"selection_{time.time()}".encode()).hexdigest()[:16],
                status="ACTIVE",
                allow_downloads=True,
                require_otp=False,
            )
            db.add(event)
            db.commit()
            db.refresh(event)
            print(f"✅ Created Event: {event.name} (Access Token: {event.access_token})")
        else:
            print(f"ℹ️ Found Event: {event.name} (Access Token: {event.access_token})")

        # 3. Add Ceremonies
        ceremony_objects = []
        for idx, cname in enumerate(CEREMONIES):
            cer = db.query(Ceremony).filter(Ceremony.event_id == event.id, Ceremony.name == cname).first()
            if not cer:
                cer = Ceremony(
                    id=str(uuid.uuid4()),
                    event_id=event.id,
                    name=cname,
                    order_index=idx,
                    venue="The Leela Palace Courtyard",
                )
                db.add(cer)
                db.commit()
                db.refresh(cer)
            ceremony_objects.append(cer)

        # 4. Add Crew Members
        crew_list = [
            ("Amit Patel", "Lead Candid Photo", "+91 98251 11222", 30000.0, "PAID"),
            ("Rahul Sharma", "Traditional & Mandap", "+91 98251 33444", 22000.0, "PAID"),
            ("Vicky Chauhan", "4K Cinematic Drone Pilot", "+91 98251 55666", 25000.0, "PAID"),
            ("Pooja Mehta", "Live Colorist & Retoucher", "+91 98251 77888", 18000.0, "PENDING"),
        ]
        for name, role, phone, payout, pstatus in crew_list:
            if not db.query(CrewMember).filter(CrewMember.event_id == event.id, CrewMember.name == name).first():
                db.add(CrewMember(
                    id=str(uuid.uuid4()),
                    event_id=event.id,
                    photographer_id=photographer.id,
                    name=name,
                    role=role,
                    phone=phone,
                    payout_inr=payout,
                    payout_status=pstatus,
                ))
        db.commit()

        # 5. Add Milestones & Expenses
        if not db.query(PaymentMilestone).filter(PaymentMilestone.event_id == event.id).first():
            db.add(PaymentMilestone(
                id=str(uuid.uuid4()),
                event_id=event.id,
                photographer_id=photographer.id,
                title="Booking Advance (40%)",
                amount_inr=140000.0,
                status="RECEIVED",
                received_at=datetime.utcnow() - timedelta(days=20),
                payment_mode="UPI / Bank Transfer",
            ))
            db.add(PaymentMilestone(
                id=str(uuid.uuid4()),
                event_id=event.id,
                photographer_id=photographer.id,
                title="On-Event Milestone (40%)",
                amount_inr=140000.0,
                status="RECEIVED",
                received_at=datetime.utcnow() - timedelta(days=2),
                payment_mode="NEFT",
            ))
            db.add(PaymentMilestone(
                id=str(uuid.uuid4()),
                event_id=event.id,
                photographer_id=photographer.id,
                title="Final Album Delivery (20%)",
                amount_inr=70000.0,
                status="PENDING",
            ))
            db.commit()

        # 6. Check existing photos count
        existing_count = db.query(Photo).filter(Photo.event_id == event.id).count()
        target_total = 1000
        photos_to_create = target_total - existing_count

        print(f"📊 Current Photo Count: {existing_count} / {target_total}. Need to ingest: {photos_to_create} photos.")

        if photos_to_create > 0:
            print("🚀 Ingesting 1,000 photos with multi-face detection & 128-d SFace vector indexing...")
            batch_size = 50
            total_storage_added = 0

            # Pre-generate 10 representative face vector prototypes for consistent AI guest matching
            rng = np.random.RandomState(42)
            face_prototypes = [rng.randn(128).astype(np.float32) for _ in range(15)]
            for vec in face_prototypes:
                vec /= np.linalg.norm(vec)

            for b_start in range(0, photos_to_create, batch_size):
                b_end = min(photos_to_create, b_start + batch_size)
                print(f"   ⏳ Generating & Indexing Batch #{b_start + 1} to #{b_end} ({(b_end / photos_to_create) * 100:.1f}%)...")

                photos_batch = []
                faces_batch = []
                embeddings_batch = []

                for i in range(b_start, b_end):
                    photo_num = existing_count + i + 1
                    ceremony = ceremony_objects[photo_num % len(ceremony_objects)]

                    # Generate photo bytes
                    img_bytes, width, height, face_boxes = generate_wedding_photo(photo_num, ceremony.name)
                    sha256 = hashlib.sha256(img_bytes).hexdigest()
                    filename = f"PROZONE_RAW_{photo_num:04d}.jpg"

                    # Save to storage service
                    file_id, rel_path, fsize, _ = storage_service.save_original(
                        event_id=event.id,
                        file_bytes=img_bytes,
                        original_filename=filename,
                    )
                    total_storage_added += fsize

                    # Generate thumbnails
                    small_thumb, med_thumb = storage_service.generate_thumbnails(
                        event_id=event.id,
                        file_id=file_id,
                        original_path=rel_path,
                    )

                    photo = Photo(
                        id=file_id,
                        event_id=event.id,
                        ceremony_id=ceremony.id,
                        original_file_name=filename,
                        file_path=rel_path,
                        sha256_hash=sha256,
                        file_size=fsize,
                        width=width,
                        height=height,
                        mime_type="image/jpeg",
                        thumbnail_path=small_thumb,
                        processed_path=med_thumb,
                        status=PhotoStatus.PROCESSED.value,
                        faces_detected_count=len(face_boxes),
                        created_at=datetime.utcnow() - timedelta(minutes=random.randint(10, 2800)),
                    )
                    photos_batch.append(photo)

                    # Create Face and FaceEmbedding records for each detected face in the photo
                    for f_idx, box in enumerate(face_boxes):
                        face_id = str(uuid.uuid4())
                        bx, by, bw, bh = box

                        face_obj = Face(
                            id=face_id,
                            photo_id=file_id,
                            event_id=event.id,
                            bounding_box={
                                "x": max(0, bx),
                                "y": max(0, by),
                                "width": max(10, bw),
                                "height": max(10, bh),
                            },
                            detection_confidence=round(random.uniform(0.92, 0.99), 3),
                            quality_score=round(random.uniform(0.85, 1.0), 2),
                        )
                        faces_batch.append(face_obj)

                        # Select one of the realistic face prototype vectors + add subtle noise
                        proto = face_prototypes[(photo_num + f_idx) % len(face_prototypes)]
                        jittered = proto + np.random.randn(128).astype(np.float32) * 0.04
                        jittered /= np.linalg.norm(jittered)

                        emb_obj = FaceEmbedding(
                            id=str(uuid.uuid4()),
                            face_id=face_id,
                            event_id=event.id,
                            embedding=jittered.tolist(),
                        )
                        embeddings_batch.append(emb_obj)

                # Commit batch
                db.bulk_save_objects(photos_batch)
                db.bulk_save_objects(faces_batch)
                db.bulk_save_objects(embeddings_batch)
                db.commit()

            db.commit()

        final_count = db.query(Photo).filter(Photo.event_id == event.id).count()
        final_faces = db.query(Face).filter(Face.event_id == event.id).count()
        final_embeddings = db.query(FaceEmbedding).filter(FaceEmbedding.event_id == event.id).count()

        print("\n" + "=" * 70)
        print("🎉 PROZONE STUDIO & 1,000 PHOTOS INGEST COMPLETE!")
        print("=" * 70)
        print(f"🏢 Studio: {photographer.studio_name}")
        print(f"📧 Login Email: {photographer.email}")
        print(f"🔑 Password: Prozone@2026!")
        print(f"👑 Subscription: {photographer.subscription_plan} (10 TB Storage, Verified Pro ✨)")
        print(f"📸 Total Photos Ingested: {final_count}")
        print(f"👤 Total Faces Detected: {final_faces}")
        print(f"⚡ 128-d Embeddings Indexed: {final_embeddings}")
        print(f"🔗 Event Dashboard: http://localhost:3000/dashboard/events/{event.id}")
        print(f"📲 Live Guest QR Portal: http://localhost:3000/e/{event.access_token}")
        print(f"📖 Client Album Proofing: http://localhost:3000/selection/{event.selection_token}")
        print("=" * 70)

    except Exception as ex:
        db.rollback()
        print(f"❌ Error during seed: {ex}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed_prozone_1000()
