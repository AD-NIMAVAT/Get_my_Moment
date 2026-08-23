#!/usr/bin/env bash
# ==============================================================================
# Get My Moment — Production PostgreSQL Backup & Integrity Validation Script
# ==============================================================================
# Fail-fast, lock-protected, non-destructive, checksum-validated backup script.
# Exports custom-format archive (.dump) with pg_restore verification.
# Zero hardcoded credentials. Safe for live production environments.
# ==============================================================================

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/home/ubuntu/backups}"
CONTAINER_NAME="${CONTAINER_NAME:-getmymoment_prod_postgres}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-getmymoment}"
LOCK_FILE="/tmp/gmm_db_backup.lock"
MIN_FREE_SPACE_MB=1024 # 1 GB minimum required

TIMESTAMP=$(date -u +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/gmm_backup_${TIMESTAMP}.dump"
TEMP_BACKUP_FILE="${BACKUP_DIR}/gmm_backup_${TIMESTAMP}.dump.tmp"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
META_FILE="${BACKUP_FILE}.meta.json"

log() {
    echo "[$(date -u +"%Y-%m-%d %H:%M:%SZ")] $*"
}

error() {
    echo "[$(date -u +"%Y-%m-%d %H:%M:%SZ")] [ERROR] $*" >&2
}

# 1. Lock Protection: Prevent overlapping backup executions
exec 200>"${LOCK_FILE}"
if ! flock -n 200; then
    error "Another backup process is currently running. Exiting."
    exit 1
fi

START_TIME=$(date +%s)
log "Starting PostgreSQL backup for database '${DB_NAME}' from container '${CONTAINER_NAME}'..."

# 2. Ensure backup directory exists and set safe permissions
mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

# 3. Check available disk space
AVAILABLE_SPACE_MB=$(df -m "${BACKUP_DIR}" | awk 'NR==2 {print $4}')
if [ "${AVAILABLE_SPACE_MB}" -lt "${MIN_FREE_SPACE_MB}" ]; then
    error "Insufficient disk space: ${AVAILABLE_SPACE_MB} MB available, ${MIN_FREE_SPACE_MB} MB required."
    exit 1
fi

# 4. Verify container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    error "PostgreSQL container '${CONTAINER_NAME}' is not running."
    exit 1
fi

# 5. Cleanup handler for incomplete artifacts on failure
cleanup_on_failure() {
    if [ -f "${TEMP_BACKUP_FILE}" ]; then
        log "Cleaning up incomplete backup artifact: ${TEMP_BACKUP_FILE}"
        rm -f "${TEMP_BACKUP_FILE}"
    fi
}
trap cleanup_on_failure ERR

# 6. Execute pg_dump custom format (-F c) inside container directly to temp file
log "Executing pg_dump (custom archive format)..."
docker exec "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" -F c -b -v -f "/tmp/dump_${TIMESTAMP}.tmp"

# 7. Copy dump from container to host
docker cp "${CONTAINER_NAME}:/tmp/dump_${TIMESTAMP}.tmp" "${TEMP_BACKUP_FILE}"
docker exec "${CONTAINER_NAME}" rm -f "/tmp/dump_${TIMESTAMP}.tmp"

# 8. Verify non-zero size
FILE_SIZE=$(stat -c%s "${TEMP_BACKUP_FILE}" 2>/dev/null || stat -f%z "${TEMP_BACKUP_FILE}")
if [ "${FILE_SIZE}" -le 1024 ]; then
    error "Backup file size (${FILE_SIZE} bytes) is suspiciously small. Aborting."
    rm -f "${TEMP_BACKUP_FILE}"
    exit 1
fi

# 9. Verify backup integrity with pg_restore --list inside container
log "Validating backup archive structure via pg_restore --list..."
docker cp "${TEMP_BACKUP_FILE}" "${CONTAINER_NAME}:/tmp/verify_${TIMESTAMP}.tmp"
if ! docker exec "${CONTAINER_NAME}" pg_restore --list "/tmp/verify_${TIMESTAMP}.tmp" > /dev/null; then
    docker exec "${CONTAINER_NAME}" rm -f "/tmp/verify_${TIMESTAMP}.tmp"
    error "Backup archive validation failed. Archive is corrupt."
    rm -f "${TEMP_BACKUP_FILE}"
    exit 1
fi
docker exec "${CONTAINER_NAME}" rm -f "/tmp/verify_${TIMESTAMP}.tmp"

# 10. Atomic rename to final backup filename
mv "${TEMP_BACKUP_FILE}" "${BACKUP_FILE}"
chmod 600 "${BACKUP_FILE}"

# 11. Compute SHA-256 Checksum
log "Computing SHA-256 checksum..."
sha256sum "${BACKUP_FILE}" | awk '{print $1}' > "${CHECKSUM_FILE}"
CHECKSUM=$(cat "${CHECKSUM_FILE}")
chmod 600 "${CHECKSUM_FILE}"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# 12. Record Safe Metadata JSON
cat <<EOF > "${META_FILE}"
{
  "database": "${DB_NAME}",
  "timestamp_utc": "${TIMESTAMP}",
  "file_path": "${BACKUP_FILE}",
  "file_size_bytes": ${FILE_SIZE},
  "format": "postgresql_custom_archive_v1",
  "sha256": "${CHECKSUM}",
  "duration_seconds": ${DURATION},
  "status": "VERIFIED_SUCCESSFUL",
  "verified_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
chmod 600 "${META_FILE}"

log "Backup successfully completed and verified in ${DURATION}s."
log "Artifact: ${BACKUP_FILE} ($(numfmt --to=iec-i --suffix=B "${FILE_SIZE}" 2>/dev/null || echo "${FILE_SIZE} bytes"))"
log "SHA-256: ${CHECKSUM}"
exit 0