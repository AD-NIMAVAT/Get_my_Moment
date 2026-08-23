# Get My Moment — AWS S3 Phased Cutover Plan (P1-BATCH-01)

**Execution Strategy:** Strict staged gating with zero production downtime and reversible rollback.

---

## 1. PHASED CUTOVER ROADMAP

| Phase | Milestone Name | Scope & Safety Rules | Status |
| :---: | :--- | :--- | :---: |
| **PHASE A** | **Adapter Foundation** | Build `S3StorageService`, abstract contract parity, and automated mock test suite. `STORAGE_DRIVER=local` remains default. | **`COMPLETED (P1-BATCH-01)`** |
| **PHASE B** | **AWS Bucket & IAM Provisioning** | Create private S3 bucket (`SSE-S3`), Block Public Access, attach least-privilege IAM instance profile to EC2. | `NEEDS_PROVISIONING` |
| **PHASE C** | **Integration Verification** | Run non-disruptive test object read/write verification script on EC2 using live AWS credentials. | `PENDING_PHASE_B` |
| **PHASE D** | **Dual-Read / S3-Write Pilot** | Switch `STORAGE_DRIVER=s3` for new event uploads. Existing photos read transparently from local storage. | `PENDING_PHASE_C` |
| **PHASE E** | **Historical Media Migration** | Background Celery sync script copies legacy local photos to S3 with SHA-256 integrity verification. | `PENDING_PHASE_D` |
| **PHASE F** | **CloudFront CDN Integration** | Attach CloudFront distribution to S3 bucket and API origin for edge caching in India. | `PENDING_PHASE_E` |

---

## 2. PHASE D PILOT CUTOVER RUNBOOK

1. Verify S3 bucket health: `aws s3 ls s3://getmymoment-photos-prod`
2. Update `.env.production`: `STORAGE_DRIVER=s3`
3. Restart API & AI Worker: `docker compose -f docker-compose.prod.yml restart api ai_worker`
4. Upload test wedding photo via photographer portal; verify original and thumbnails appear in S3.
5. Verify guest facial search matches new photo.
6. Verify legacy local photos remain viewable and downloadable.

