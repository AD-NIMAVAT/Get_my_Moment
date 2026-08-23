# Get My Moment — Production Database Backup & Restore Runbook (SEC-03)

**Document Version:** `1.0.0-PROD`  
**Target System:** PostgreSQL 16 with `pgvector` on AWS EC2  
**Implementation Tooling:** `scripts/backup_database.sh`, `scripts/verify_restore.sh`  

---

## 1. EXECUTIVE STATUS & DECISIONS SUMMARY

| Property | Status / Classification | Current Operational State |
| :--- | :---: | :--- |
| **Backup Tooling** | `VERIFIED` | Production-grade `pg_dump` custom format (`-F c`) with atomic validation. |
| **Restore Sandbox** | `VERIFIED` | Isolated test restore script (`scripts/verify_restore.sh`) with schema, row count & `pgvector` validation. |
| **Local Retention** | `APPROVED` | Keep 7 most recent successful backup sets (`.dump`, `.sha256`, `.meta.json`). |
| **Backup Frequency** | `APPROVED` | Daily at `03:00 UTC`. |
| **Target RPO** | `APPROVED` | 24 Hours. |
| **Target RTO** | `INITIAL_TARGET` | 60 Minutes (Requires full DR benchmark). |
| **Cloud S3 Copy** | `REQUIRED` | Dedicated private AWS S3 bucket (pending IAM role provisioning). |
| **Automation** | `ACTIVE_VERIFIED` | User crontab configured for `0 3 * * *` (03:00 UTC). |

---

## 2. BACKUP PREREQUISITES & SAFETY

- **Sufficient Storage:** Minimum 1 GB available disk space on root volume (`/home/ubuntu/backups`).
- **PostgreSQL Container:** `getmymoment_prod_postgres` running in Docker.
- **Lock Protection:** `/tmp/gmm_db_backup.lock` enforced via `flock` to prevent concurrent dump collisions.
- **Zero Secrets in Code/Logs:** Credentials handled entirely inside the Docker networking namespace; zero passwords stored in scripts or logs.

---

## 3. MANUAL BACKUP PROCEDURE

To create an immediate, verified PostgreSQL backup on the production server:

```bash
# SSH into production server
ssh -i "pro_technologies_124336.pem" ubuntu@16.170.81.162

# Run safe backup script
cd /home/ubuntu/Get_my_Moment
./scripts/backup_database.sh
```

**Artifacts Generated in `/home/ubuntu/backups/`:**
1. `gmm_backup_YYYYMMDD_HHMMSS.dump` — Custom compressed PostgreSQL archive (`chmod 600`).
2. `gmm_backup_YYYYMMDD_HHMMSS.dump.sha256` — Cryptographic SHA-256 hash.
3. `gmm_backup_YYYYMMDD_HHMMSS.dump.meta.json` — Audit metadata (size, duration, status, timestamp).

---

## 4. ISOLATED RESTORE VERIFICATION PROCEDURE

To verify a backup without touching or altering production data:

```bash
# Run restore test against latest backup
./scripts/verify_restore.sh

# Or against a specific backup file
./scripts/verify_restore.sh /home/ubuntu/backups/gmm_backup_20260823_174000.dump
```

**Validation Steps Performed by Script:**
1. Verifies SHA-256 checksum against `.sha256` file.
2. Creates isolated sandbox database `gmm_restore_test_<timestamp>`.
3. Installs `vector` extension in sandbox.
4. Restores schema, sequences, constraints, and data using `pg_restore`.
5. Verifies all 9 critical tables exist:
   - `photographers`, `events`, `photos`, `faces`, `face_embeddings`, `guests`, `consents`, `admin_users`, `folders`.
6. Verifies `face_embeddings.embedding` column is of type `vector(128)`.
7. Asserts 100% row-count parity between production database and restored sandbox.
8. Drops sandbox database cleanly upon completion.

---

## 5. FULL DISASTER RECOVERY (DR) PROCEDURE

> [!CAUTION]
> This procedure will overwrite the active database. ONLY execute during an authorized DR recovery scenario.

1. **Stop API & Worker Containers to prevent write activity:**
   ```bash
   cd /home/ubuntu/Get_my_Moment
   docker stop getmymoment_prod_api getmymoment_prod_celery_worker
   ```

2. **Verify Backup Integrity:**
   ```bash
   TARGET_BACKUP="/home/ubuntu/backups/gmm_backup_TARGET.dump"
   sha256sum -c "${TARGET_BACKUP}.sha256"
   ```

3. **Re-create Clean Database & Restore:**
   ```bash
   # Terminate existing connections and recreate database
   docker exec getmymoment_prod_postgres psql -U postgres -c "
     SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'getmymoment' AND pid <> pg_backend_pid();
     DROP DATABASE getmymoment;
     CREATE DATABASE getmymoment;
   "
   
   # Enable pgvector extension
   docker exec getmymoment_prod_postgres psql -U postgres -d getmymoment -c "CREATE EXTENSION IF NOT EXISTS vector;"
   
   # Restore archive
   docker cp "${TARGET_BACKUP}" getmymoment_prod_postgres:/tmp/restore.dump
   docker exec getmymoment_prod_postgres pg_restore -U postgres -d getmymoment --no-owner -v /tmp/restore.dump
   docker exec getmymoment_prod_postgres rm -f /tmp/restore.dump
   ```

4. **Restart Services & Validate:**
   ```bash
   docker start getmymoment_prod_api getmymoment_prod_celery_worker
   curl -i https://www.getmymoment.fun/api/v1/health
   ```

---

## 6. ACTIVE CRON AUTOMATION & OBSERVABILITY

**Installed Schedule:** User crontab for `ubuntu` user (`crontab -l`):
```cron
# Get My Moment — Automated Daily PostgreSQL Backup (03:00 UTC)
0 3 * * * /home/ubuntu/Get_my_Moment/scripts/backup_database.sh >> /home/ubuntu/backups/backup.log 2>&1
```

**Observability & Status Files:**
1. `/home/ubuntu/backups/backup_status.json`: Contains JSON metrics for external health checks:
   - `last_attempt_at`: ISO timestamp of latest execution.
   - `last_success_at`: ISO timestamp of latest verified backup.
   - `last_backup_filename`: Name of latest `.dump` file.
   - `last_backup_size_bytes`: Integer size.
   - `last_validation_status`: `SUCCESS` or `FAILED_*`.
   - `retained_backups_count`: Current count of local rolling archives.
2. `/home/ubuntu/backups/backup.log`: Execution audit log with zero secrets.


