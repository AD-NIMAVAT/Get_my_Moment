"""
Re-extract pure SFace 128-d biometric embeddings from all stored photos
"""

import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

import uuid
import numpy as np
from sqlalchemy.orm import Session

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from apps.api.database import SessionLocal
from apps.api.models import Photo, Face, FaceEmbedding, Event
from apps.api.services.storage import storage_service
from apps.api.services.ai_service import ai_service

def reindex_event_faces():
    db: Session = SessionLocal()
    try:
        event = db.query(Event).filter(Event.name == "Aarav & Meera Grand Royal Wedding").first()
        if not event:
            print("❌ Event not found!")
            return

        print("=" * 70)
        print("🧠 RE-EXTRACTING PURE SFace 128-D BIOMETRIC EMBEDDINGS")
        print("=" * 70)

        # Clear existing faces and embeddings
        print("🧹 Clearing previous face embeddings...")
        db.query(FaceEmbedding).filter(FaceEmbedding.event_id == event.id).delete(synchronize_session=False)
        db.query(Face).filter(Face.event_id == event.id).delete(synchronize_session=False)
        db.commit()

        photos = db.query(Photo).filter(Photo.event_id == event.id).all()
        total_photos = len(photos)
        print(f"📸 Total Photos to analyze: {total_photos}")

        ai_service._ensure_models()
        total_faces_created = 0

        faces_batch = []
        embeddings_batch = []

        for idx, p in enumerate(photos):
            abs_path = storage_service._safe_resolve(p.file_path)
            if not os.path.exists(abs_path):
                continue

            with open(abs_path, "rb") as f:
                img_bytes = f.read()

            detected_faces = ai_service.detect_faces(img_bytes)
            
            # If CNN detects real human faces in the photo
            if detected_faces and len(detected_faces) > 0:
                p.faces_detected_count = len(detected_faces)
                for df in detected_faces:
                    face_id = str(uuid.uuid4())
                    bx, by, bw, bh = df.bbox.x, df.bbox.y, df.bbox.w, df.bbox.h

                    face_obj = Face(
                        id=face_id,
                        photo_id=p.id,
                        event_id=event.id,
                        bounding_box={"x": bx, "y": by, "width": bw, "height": bh},
                        detection_confidence=getattr(df, 'confidence', 0.95),
                        quality_score=0.98,
                    )
                    faces_batch.append(face_obj)

                    # Extract SFace 128-d vector
                    embedding_vec = ai_service.extract_face_embedding(img_bytes, df.bbox)
                    if embedding_vec and len(embedding_vec) == 128:
                        emb_obj = FaceEmbedding(
                            id=str(uuid.uuid4()),
                            face_id=face_id,
                            event_id=event.id,
                            embedding=embedding_vec,
                        )
                        embeddings_batch.append(emb_obj)
                        total_faces_created += 1
            else:
                p.faces_detected_count = 0

            if (idx + 1) % 50 == 0 or (idx + 1) == total_photos:
                db.bulk_save_objects(faces_batch)
                db.bulk_save_objects(embeddings_batch)
                db.commit()
                faces_batch = []
                embeddings_batch = []
                print(f"   ⏳ Processed {idx + 1}/{total_photos} photos ({((idx + 1) / total_photos) * 100:.0f}%) -> {total_faces_created} biometric faces indexed...")

        db.commit()
        print("\n" + "=" * 70)
        print("✅ SFace BIOMETRIC RE-INDEXING COMPLETED!")
        print(f"👤 Total Pure Human Face Vectors: {total_faces_created}")
        print("=" * 70)

    except Exception as ex:
        db.rollback()
        print(f"❌ Error: {ex}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    reindex_event_faces()
