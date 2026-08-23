# Get My Moment — Storage Interface Specification (P1-BATCH-01)

**Document Version:** `1.0.0-PROD`  
**Scope:** Abstract storage contract and dual-driver implementations (`LocalStorageService` and `S3StorageService`).

---

## 1. ABSTRACT STORAGE CONTRACT (`StorageService`)

All storage drivers in Get My Moment implement the unified abstract interface defined in `apps/api/services/storage.py`:

```python
class StorageService:
    def save_original(
        self,
        event_id: str,
        file_bytes: bytes,
        original_filename: str,
        studio_id: Optional[str] = None,
        folder_id: Optional[str] = None
    ) -> Tuple[str, str, int, str]:
        """Saves master original media. Returns (file_id, storage_key, file_size_bytes, sha256_hash)."""
        raise NotImplementedError

    def generate_thumbnails(
        self,
        event_id: str,
        file_id: str,
        original_path: str,
        studio_id: Optional[str] = None,
        folder_id: Optional[str] = None
    ) -> Tuple[str, Optional[str]]:
        """Generates small (400px) and medium (1200px) JPEG thumbnails. Returns (small_key, medium_key)."""
        raise NotImplementedError

    def save_face_crop(self, event_id: str, face_id: str, crop_bytes: bytes) -> Optional[str]:
        """Saves visual face crop if FACE_DEBUG_CROPS_ENABLED is true."""
        raise NotImplementedError

    def save_temp_file(self, event_id: str, file_bytes: bytes, suffix: str = ".jpg") -> str:
        """Saves temporary working payload."""
        raise NotImplementedError

    def delete_file(self, file_path: str) -> bool:
        """Deletes object by storage key or relative path."""
        raise NotImplementedError

    def get_file_bytes(self, file_path: str) -> bytes:
        """Downloads and returns raw binary bytes."""
        raise NotImplementedError

    def object_exists(self, file_path: str) -> bool:
        """Verifies existence of object without downloading body."""
        raise NotImplementedError

    def get_presigned_url(self, file_path: str, expires_in: Optional[int] = None) -> str:
        """Generates bounded-TTL time-limited capability URL."""
        raise NotImplementedError

    def materialize_to_temp_file(self, file_path: str) -> str:
        """Downloads object to local isolated temporary file for OpenCV / AI processing."""
        raise NotImplementedError
```

---

## 2. DRIVER COMPARISON MATRIX

| Capability | `LocalStorageService` | `S3StorageService` |
| :--- | :--- | :--- |
| **Storage Destination** | Local NVMe EBS (`STORAGE_LOCAL_ROOT`) | AWS S3 Bucket (`S3_BUCKET_NAME`) |
| **Encryption at Rest** | Host filesystem encryption | Server-Side Encryption (`SSE-S3 / AES256`) |
| **Object Key Structure** | `studios/{studio_id}/events/{event_id}/...` | `studios/{studio_id}/events/{event_id}/...` |
| **Presigned URLs** | Relative API routing | Bounded AWS S3 SigV4 presigned URLs |
| **AI Worker Materialization** | Direct absolute local path | Downloads S3 bytes to `/tmp/gmm_ai_*.jpg` |
| **Capacity Constraint** | 30 GB local EBS floor | Unlimited AWS cloud capacity |

