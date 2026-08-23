#!/usr/bin/env bash
# ==============================================================================
# Get My Moment — Production PostgreSQL Backup & Local 7-Generation Retention
# ==============================================================================
# Fail-fast, lock-protected, non-destructive, checksum-validated backup script.
# Exports custom-format archive (.dump) with pg_restore verification.
# Automatically rotates local archives keeping the 7 most recent successful sets.
# Zero hardcoded credentials. Safe for live production environments.
# ==============================================================================

set -euo pipefail

# Ensure non-interactive cron environments have complete PATH
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${PATH:-}"

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/home/ubuntu/backups}"
CONTAINER_NAME="${CONTAINER_NAME:-getmymoment_prod_postgres}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-getmymoment}"
LOCK_FILE="/tmp/gmm_db_backup.lock"
RETENTION_COUNT="${RETENTION_COUNT:-7}"
MIN_FREE_SPACE_MB=1024 # 1 GB minimum floor

TIMESTAMP=$(date -u +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/gmm_backup_${TIMESTAMP}.dump"
TEMP_BACKUP_FILE="${BACKUP_DIR}/gmm_backup_${TIMESTAMP}.dump.tmp"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
META_FILE="${BACKUP_FILE}.meta.json"
STATUS_FILE="${BACKUP_DIR}/backup_status.json"
LOG_FILE="${BACKUP_DIR}/backup.log"

log() {
    local msg="[$(date -u +"%Y-%m-%d %H:%M:%SZ")] $*"
    echo "${msg}"
    if [ -d "${BACKUP_DIR}" ] && [ -w "${BACKUP_DIR}" ]; then
        echo "${msg}" >> "${LOG_FILE}" 2>/dev/null || true
    fi
}

error() {
    local msg="[$(date -u +"%Y-%m-%d %H:%M:%SZ")] [ERROR] $*"
    echo "${msg}" >&2
    if [ -d "${BACKUP_DIR}" ] && [ -w "${BACKUP_DIR}" ]; then
        echo "${msg}" >> "${LOG_FILE}" 2>/dev/null || true
    fi
}

# 1. Lock Protection: Prevent overlapping backup executions
exec 200>"${LOCK_FILE}"
if ! flock -n 200; then
    error "Another backup process is currently running. Exiting."
    exit 1
fi

START_TIME=$(date +%s)
log "Starting automated PostgreSQL backup for '${DB_NAME}' from container '${CONTAINER_NAME}'..."

# 2. Ensure backup directory exists and set safe permissions
mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

# 3. Check available disk space (Must have > 1 GB free)
AVAILABLE_SPACE_MB=$(df -m "${BACKUP_DIR}" | awk 'NR==2 {print $4}')
if [ "${AVAILABLE_SPACE_MB}" -lt "${MIN_FREE_SPACE_MB}" ]; then
    error "Insufficient disk space: ${AVAILABLE_SPACE_MB} MB available, ${MIN_FREE_SPACE_MB} MB required."
    
    # Record Failure in Status File atomically
    cat <<EOF > "${STATUS_FILE}.tmp"
{
  "last_attempt_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "last_validation_status": "FAILED_INSUFFICIENT_DISK",
  "error_detail": "Available disk space ${AVAILABLE_SPACE_MB}MB is below required ${MIN_FREE_SPACE_MB}MB threshold."
}
EOF
    mv -f "${STATUS_FILE}.tmp" "${STATUS_FILE}"
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
    docker exec "${CONTAINER_NAME}" rm -f "/tmp/dump_${TIMESTAMP}.tmp" "/tmp/verify_${TIMESTAMP}.tmp" 2>/dev/null || true
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

# 13. Local 7-Backup Rolling Retention Rotation
log "Applying local ${RETENTION_COUNT}-generation backup retention policy..."
MANAGED_DUMPS=($(ls -t "${BACKUP_DIR}"/gmm_backup_*.dump 2>/dev/null || true))
TOTAL_MANAGED=${#MANAGED_DUMPS[@]}

if [ "${TOTAL_MANAGED}" -gt "${RETENTION_COUNT}" ]; then
    EXCESS_COUNT=$((TOTAL_MANAGED - RETENTION_COUNT))
    log "Found ${TOTAL_MANAGED} managed backups (limit is ${RETENTION_COUNT}). Rotating ${EXCESS_COUNT} oldest sets..."
    
    for (( i=RETENTION_COUNT; i<TOTAL_MANAGED; i++ )); do
        OLD_DUMP="${MANAGED_DUMPS[$i]}"
        log "Rotating old backup set: ${OLD_DUMP}"
        rm -f "${OLD_DUMP}" "${OLD_DUMP}.sha256" "${OLD_DUMP}.meta.json"
    done
else
    log "Retention check: ${TOTAL_MANAGED} / ${RETENTION_COUNT} managed backup sets currently retained."
fi

# 14. Record Operational Status File Atomically
cat <<EOF > "${STATUS_FILE}.tmp"
{
  "last_attempt_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "last_success_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "last_backup_filename": "$(basename "${BACKUP_FILE}")",
  "last_backup_size_bytes": ${FILE_SIZE},
  "last_validation_status": "SUCCESS",
  "duration_seconds": ${DURATION},
  "retained_backups_count": $(ls "${BACKUP_DIR}"/gmm_backup_*.dump 2>/dev/null | wc -l)
}
EOF
mv -f "${STATUS_FILE}.tmp" "${STATUS_FILE}"
chmod 600 "${STATUS_FILE}"

log "Backup successfully completed, verified, and rotated in ${DURATION}s."
log "Artifact: ${BACKUP_FILE} ($(numfmt --to=iec-i --suffix=B "${FILE_SIZE}" 2>/dev/null || echo "${FILE_SIZE} bytes"))"
log "SHA-256: ${CHECKSUM}"
exit 0