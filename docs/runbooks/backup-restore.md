# Get My Moment - Database Backup & Disaster Recovery Runbook

**Database:** PostgreSQL 16 on Docker Container getmymoment_prod_postgres
**Database Name:** getmymoment
**Host Path:** /home/ubuntu/backups/

---

## 1. BACKUP PROCEDURE

### Non-Destructive Live Backup:
`ash
# 1. Create backup directory
mkdir -p /home/ubuntu/backups

# 2. Run pg_dump from inside postgres container
TIMESTAMP=
docker exec getmymoment_prod_postgres pg_dump -U postgres -d getmymoment -F c -b -v -f /tmp/gmm_backup_.dump

# 3. Copy dump from container to host
docker cp getmymoment_prod_postgres:/tmp/gmm_backup_.dump /home/ubuntu/backups/
docker exec getmymoment_prod_postgres rm /tmp/gmm_backup_.dump

# 4. Verify dump size and existence
ls -lh /home/ubuntu/backups/gmm_backup_.dump
`

---

## 2. RESTORE PROCEDURE (Disaster Recovery)

> **SAFETY WARNING:** Never restore directly over a running production database without first taking a fresh pre-restore snapshot.

`ash
# 1. Take a safety snapshot of current state
docker exec getmymoment_prod_postgres pg_dump -U postgres -d getmymoment > /home/ubuntu/backups/pre_restore_safety.sql

# 2. Copy dump file into container
docker cp /home/ubuntu/backups/gmm_backup_<TIMESTAMP>.dump getmymoment_prod_postgres:/tmp/restore_target.dump

# 3. Run pg_restore
docker exec getmymoment_prod_postgres pg_restore -U postgres -d getmymoment --clean --if-exists -v /tmp/restore_target.dump

# 4. Clean up temp file inside container
docker exec getmymoment_prod_postgres rm /tmp/restore_target.dump

# 5. Run sanity check
docker exec getmymoment_prod_postgres psql -U postgres -d getmymoment -c 'SELECT count(*) FROM photographers; SELECT count(*) FROM events; SELECT count(*) FROM photos;'
`
