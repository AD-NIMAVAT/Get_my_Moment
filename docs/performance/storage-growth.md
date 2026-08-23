# Get My Moment — Storage Growth & Capacity Projections (P1-BASELINE-01)

**Current Storage Driver:** `local` (`STORAGE_DRIVER=local`)  
**Storage Root:** `/home/ubuntu/Get_my_Moment/data` (Mounted via Docker volume `storage_data`)  
**Available Local EBS Disk:** 30 GB free out of 48 GB total (39% used).  

---

## 1. STORAGE FOOTPRINT PER 1,000 PHOTOS

Based on empirical JPEG compression and thumbnail metrics:

- **High-Resolution Master Photos (Average 4.5 MB / photo):** `4.5 GB / 1,000 photos`
- **Web Medium Thumbnails (Average 250 KB / photo):** `250 MB / 1,000 photos`
- **Small Grid Thumbnails (Average 50 KB / photo):** `50 MB / 1,000 photos`
- **PostgreSQL Database Rows & Embeddings (128-d vector + metadata):** `3.5 MB / 1,000 photos`
- **Total Combined Storage per 1,000 Photos:** `~4.8 GB`

---

## 2. PROJECTION MATRIX & CAPACITY THRESHOLDS

| Photo Scale | Estimated Events | Disk Required (Photos + Thumbs) | Available Disk (30 GB) | Status / Risk Level |
| :---: | :---: | :---: | :---: | :--- |
| **1,000 Photos** | 1 Wedding | **4.8 GB** | 25.2 GB remaining | `SAFE` |
| **5,000 Photos** | 2-3 Weddings | **24.0 GB** | 6.0 GB remaining | `WARNING — NEARING LIMIT` |
| **10,000 Photos** | 5 Weddings | **48.0 GB** | **EXHAUSTED (-18 GB)** | `CRITICAL FAILURE` |
| **50,000 Photos** | 25 Weddings | **240.0 GB** | **EXHAUSTED (-210 GB)** | `IMPOSSIBLE WITHOUT S3` |
| **100,000 Photos** | 50 Weddings | **480.0 GB** | **EXHAUSTED (-450 GB)** | `IMPOSSIBLE WITHOUT S3` |

---

## 3. KEY ARCHITECTURAL CONCLUSION
> [!IMPORTANT]
> Local disk storage can support **at most 2–3 active wedding events (~6,000 photos)** before catastrophic disk exhaustion occurs. Migrating production media storage to **AWS S3** is the **#1 mandatory prerequisite** before onboarding additional photographers.

