# Get My Moment — AWS S3 Security & Access Control Posture (P1-BATCH-01)

**Security Classification:** `CRITICAL INFRASTRUCTURE DEFENSE`  

---

## 1. PRODUCTION BUCKET SECURITY REQUIREMENTS

When the AWS S3 production media bucket is provisioned in Phase 1B:

1. **S3 Block Public Access:** Must be **100% ENABLED** on bucket and account levels (`BlockPublicAcls`, `IgnorePublicAcls`, `BlockPublicPolicy`, `RestrictPublicBuckets` = `true`).
2. **Server-Side Encryption:** Mandatory `SSE-S3 (AES-256)` default bucket encryption. All incoming objects are encrypted at rest.
3. **Transport Layer Security:** Bucket policy enforcing HTTPS-only transport (`aws:SecureTransport: true`).
4. **Zero Public Object URLs:** Objects are never accessible via raw public S3 URLs. Access is granted exclusively via short-lived capability presigned URLs.

---

## 2. IAM INSTANCE PROFILE & LEAST-PRIVILEGE POLICY

The EC2 instance hosting Get My Moment must authenticate using an **IAM Instance Profile** with the following least-privilege policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowGetMyMomentMediaOperations",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:HeadObject"
      ],
      "Resource": "arn:aws:s3:::getmymoment-photos-prod/*"
    },
    {
      "Sid": "AllowBucketMetadataRead",
      "Effect": "Allow",
      "Action": [
        "s3:GetBucketLocation",
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::getmymoment-photos-prod"
    }
  ]
}
```

---

## 3. PRESIGNED URL SECURITY RULES

- **Bounded Expiration:** Default TTL = 900 seconds (15 minutes); maximum hard limit = 3600 seconds.
- **Fail-Closed Authorization Gate:** Presigned URLs are generated **only after** `apps/api/routers/photos.py` verifies:
  - Valid `token` matching `event.access_token` or `event.selection_token` (with `allow_downloads == True`), OR
  - Valid Photographer / Admin JWT.
- **Log Privacy Defense:** Full presigned URLs containing AWS query signatures (`X-Amz-Signature`) are never recorded in application logs.

