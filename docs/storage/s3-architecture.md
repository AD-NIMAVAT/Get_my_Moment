# Get My Moment — AWS S3 Storage Architecture (P1-BATCH-01)

**Status:** `ADAPTER IMPLEMENTED — PRODUCTION CUTOVER DEFERRED`  
**Configuration Driver:** `STORAGE_DRIVER=local` (Default) | `STORAGE_DRIVER=s3`  

---

## 1. DETERMINISTIC TENANT-SCOPED OBJECT KEY HIERARCHY

All S3 objects are strictly partitioned by tenant (`studio_id`) and event (`event_id`):

```text
getmymoment-photos-prod/
└── studios/{studio_id}/
    └── events/{event_id}/
        ├── originals/
        │   └── [{folder_id}/]{photo_uuid}.jpg
        ├── thumbnails/
        │   ├── [{folder_id}/]{photo_uuid}_small.jpg    # 400px JPEG
        │   └── [{folder_id}/]{photo_uuid}_medium.jpg   # 1200px JPEG
        ├── faces/
        │   └── {face_uuid}.jpg                         # Debug crops (if enabled)
        └── temp/
            └── {temp_uuid}.jpg                         # Ingestion buffers
```

---

## 2. INGESTION & ACCESS FLOW

```mermaid
sequenceDiagram
    autonumber
    participant Cam as Photographer Camera / Web
    participant API as FastAPI Backend
    participant S3 as AWS S3 Bucket
    participant Celery as AI Worker
    participant Guest as Guest Mobile Client

    Cam->>API: Upload Master Photo (JPEG)
    API->>API: Validate Magic Bytes & SHA-256
    API->>S3: PutObject(originals/{id}.jpg, SSE-S3 AES-256)
    API->>Celery: Dispatch Task: process_photo(photo_id, s3_key)
    
    Celery->>S3: GetObject(originals/{id}.jpg)
    Celery->>Celery: Generate Thumbnails & Run YuNet/SFace
    Celery->>S3: PutObject(thumbnails/{id}_small.jpg)
    Celery->>S3: PutObject(thumbnails/{id}_medium.jpg)
    
    Guest->>API: Request Photo Download (with valid Capability Token)
    API->>API: Verify Token / JWT Authorization
    API->>S3: GeneratePresignedURL(originals/{id}.jpg, TTL=900s)
    API->>Guest: Return Presigned S3 Download Link
```

