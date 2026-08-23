# Get My Moment — AWS S3 Media Operations & Provisioning Runbook (P1-BATCH-02)

**Document Version:** `1.0.0-PROD`  
**Target Environment:** AWS EC2 `16.170.81.162` (`i-099c75fb4ec331e27`, Stockholm `eu-north-1`, Account: `347447669372`)  

---

## 1. PROVISIONED AWS INFRASTRUCTURE IDENTIFIERS

| Resource | Identifier / Value | Security Configuration |
| :--- | :--- | :--- |
| **AWS Region** | `eu-north-1` (Stockholm) | Same as EC2 host (Zero transfer fees, low latency) |
| **AWS Account ID** | `347447669372` | Production AWS Account |
| **Media S3 Bucket** | `getmymoment-media-prod-347447669372-eunorth1` | S3 Block Public Access = ALL 4 TRUE, SSE-S3 AES-256 |
| **IAM Role Name** | `GetMyMomentProductionMediaRole` | Trusted entity: `ec2.amazonaws.com` |
| **IAM Instance Profile** | `GetMyMomentProductionMediaProfile` | Attached to EC2 `i-099c75fb4ec331e27` |
| **IAM Policy Name** | `GetMyMomentMediaS3AccessPolicy` | Scoped strictly to media bucket & objects |

---

## 2. PROVISIONING PROCEDURE (AWS ADMINISTRATOR)

To provision the AWS S3 media bucket and IAM instance profile:

```bash
# Execute with AWS Administrator credentials (e.g. in AWS CloudShell)
bash scripts/provision_aws_s3_media.sh
```

---

## 3. NON-CUSTOMER TEST INTEGRATION VERIFICATION

Once the IAM instance profile is attached to the EC2 instance, execute the automated synthetic verification script on the EC2 host:

```bash
# Runs synthetic PUT, HEAD, GET, Presigned URL, SSE-S3, DELETE & Public-Denial checks
python3 scripts/verify_s3_integration.py getmymoment-media-prod-347447669372-eunorth1 eu-north-1
```

---

## 4. DATABASE BACKUP BUCKET SEPARATION OF CONCERNS
> [!IMPORTANT]
> The media application role `GetMyMomentProductionMediaRole` is **strictly denied access** to database backups.  
> When automated cloud database backups are provisioned, they will use an isolated backup bucket (`getmymoment-backups-prod-347447669372-eunorth1`) with separate IAM policies and retention locking.

