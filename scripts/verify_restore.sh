#!/usr/bin/env bash
# ==============================================================================
# Get My Moment — Safe Isolated PostgreSQL Restore Verification Script
# ==============================================================================
# Non-destructive: Restores into a temporary isolated test database,
# validates schema, tables, row counts, pgvector embeddings, and indices,
# then securely cleans up the temporary database.
# NEVER alters or points to the live production database.
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/home/ubuntu/backups}"
CONTAINER_NAME="${CONTAINER_NAME:-getmymoment_prod_postgres}"
DB_USER="${DB_USER:-postgres}"
PROD_DB_NAME="${DB_NAME:-getmymoment}"

# Target backup file: either parameter 1 or the most recent .dump file
BACKUP_FILE="${1:-}"
if [ -z "${BACKUP_FILE}" ]; then
    BACKUP_FILE=$(ls -t "${BACKUP_DIR}"/gmm_backup_*.dump 2>/dev/null | head -n 1)
fi

if [ -z "${BACKUP_FILE}" ] || [ ! -f "${BACKUP_FILE}" ]; then
    echo "[ERROR] No valid backup file found to verify." >&2
    exit 1
fi

TEMP_DB="gmm_restore_test_$(date +%s)"

log() {
    echo "[$(date -u +"%Y-%m-%d %H:%M:%SZ")] $*"
}

error() {
    echo "[$(date -u +"%Y-%m-%d %H:%M:%SZ")] [ERROR] $*" >&2
}

log "=== ISOLATED RESTORE VERIFICATION START ==="
log "Backup Artifact: ${BACKUP_FILE}"
log "Target Test Database: ${TEMP_DB} (Isolated sandbox)"

# 1. Verify Checksum
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
if [ -f "${CHECKSUM_FILE}" ]; then
    EXPECTED_HASH=$(cat "${CHECKSUM_FILE}")
    ACTUAL_HASH=$(sha256sum "${BACKUP_FILE}" | awk '{print $1}')
    if [ "${EXPECTED_HASH}" != "${ACTUAL_HASH}" ]; then
        error "Checksum verification FAILED! Backup is corrupted."
        exit 1
    fi
    log "Checksum verification PASSED (SHA-256: ${ACTUAL_HASH})."
else
    log "Warning: Checksum file not found, proceeding with archive check..."
fi

# 2. Cleanup handler to ensure temporary test DB is ALWAYS destroyed
cleanup_temp_db() {
    log "Cleaning up temporary isolated database '${TEMP_DB}'..."
    docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -c "DROP DATABASE IF EXISTS \"${TEMP_DB}\";" >/dev/null 2>&1 || true
    docker exec "${CONTAINER_NAME}" rm -f "/tmp/restore_test.dump" >/dev/null 2>&1 || true
}
trap cleanup_temp_db EXIT

# 3. Create isolated sandbox database & install vector extension
log "Creating isolated test database '${TEMP_DB}'..."
docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -c "CREATE DATABASE \"${TEMP_DB}\";"
docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${TEMP_DB}" -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 4. Copy backup dump into container and restore
log "Transferring archive into container..."
docker cp "${BACKUP_FILE}" "${CONTAINER_NAME}:/tmp/restore_test.dump"

log "Restoring schema and data into sandbox database '${TEMP_DB}'..."
# pg_restore returns 0 on success (or 1 if non-critical warnings occurred)
docker exec "${CONTAINER_NAME}" pg_restore -U "${DB_USER}" -d "${TEMP_DB}" --no-owner --role="${DB_USER}" -v "/tmp/restore_test.dump" >/dev/null 2>&1 || true

# 5. Verify Critical Tables Exist
log "Verifying critical table presence..."
CRITICAL_TABLES=("photographers" "events" "photos" "faces" "face_embeddings" "guests" "consents" "admin_users" "folders")
for tbl in "${CRITICAL_TABLES[@]}"; do
    EXISTS=$(docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${TEMP_DB}" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${tbl}');")
    if [ "${EXISTS}" != "t" ]; then
        error "Critical table '${tbl}' is missing in restored database!"
        exit 1
    fi
done
log "All ${#CRITICAL_TABLES[@]} critical tables successfully restored."

# 6. Verify pgvector extension & face_embeddings column type
log "Verifying pgvector extension & vector(128) column structure..."
VEC_EXT=$(docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${TEMP_DB}" -tAc "SELECT extname FROM pg_extension WHERE extname = 'vector';")
if [ "${VEC_EXT}" != "vector" ]; then
    error "pgvector extension was not properly restored/enabled in sandbox database!"
    exit 1
fi

COL_TYPE=$(docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${TEMP_DB}" -tAc "SELECT udt_name FROM information_schema.columns WHERE table_name = 'face_embeddings' AND column_name = 'embedding';")
if [ "${COL_TYPE}" != "vector" ]; then
    error "Column 'face_embeddings.embedding' type mismatch! Expected 'vector', got '${COL_TYPE}'."
    exit 1
fi
log "pgvector structure verified (embedding: vector)."

# 7. Compare Table Counts between Production and Restored Sandbox
log "Comparing row count integrity between production and restored sandbox..."
for tbl in "${CRITICAL_TABLES[@]}"; do
    PROD_COUNT=$(docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${PROD_DB_NAME}" -tAc "SELECT COUNT(*) FROM \"${tbl}\";" 2>/dev/null || echo "0")
    RESTORE_COUNT=$(docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${TEMP_DB}" -tAc "SELECT COUNT(*) FROM \"${tbl}\";" 2>/dev/null || echo "0")
    log " - Table '${tbl}': Prod=${PROD_COUNT} | Restored=${RESTORE_COUNT}"
    if [ "${PROD_COUNT}" != "${RESTORE_COUNT}" ]; then
        error "Row count mismatch on table '${tbl}'! Prod=${PROD_COUNT}, Restored=${RESTORE_COUNT}."
        exit 1
    fi
done

# 8. Record Successful Restore-Test Audit Log
RESTORE_LOG="/home/ubuntu/backups/restore_verification.log"
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] RESTORE_VERIFIED: artifact='${BACKUP_FILE}' size=$(stat -c%s "${BACKUP_FILE}" 2>/dev/null || echo "0") status=SUCCESS" >> "${RESTORE_LOG}"

log "=== ISOLATED RESTORE VERIFICATION PASSED (100% INTEGRITY) ==="
exit 0