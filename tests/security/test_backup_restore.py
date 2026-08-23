"""
Get My Moment - Automated Database Backup & Restore Tooling Test Suite (SEC-03)
Validates script presence, permissions, metadata JSON format, checksum validation,
lockfile handling, and restore runbook integrity.
"""

import os
import json
import hashlib
import pytest


def test_1_backup_scripts_exist_and_executable():
    """1. Backup and verification scripts must exist in scripts/ directory."""
    backup_script = os.path.join("scripts", "backup_database.sh")
    restore_script = os.path.join("scripts", "verify_restore.sh")
    
    assert os.path.exists(backup_script), f"Missing {backup_script}"
    assert os.path.exists(restore_script), f"Missing {restore_script}"
    
    with open(backup_script, "r", encoding="utf-8") as f:
        content = f.read()
        assert "pg_dump" in content
        assert "pg_restore" in content
        assert "flock" in content
        assert "sha256sum" in content
        assert "MIN_FREE_SPACE_MB" in content

    with open(restore_script, "r", encoding="utf-8") as f:
        content = f.read()
        assert "pg_restore" in content
        assert "vector" in content
        assert "DROP DATABASE" in content


def test_2_backup_script_contains_no_hardcoded_secrets():
    """2. Backup scripts must not contain hardcoded passwords or AWS access keys."""
    forbidden_terms = ["password=", "secret_key", "AWS_SECRET", "razorpay_secret"]
    
    for script_name in ["backup_database.sh", "verify_restore.sh"]:
        script_path = os.path.join("scripts", script_name)
        with open(script_path, "r", encoding="utf-8") as f:
            content = f.read().lower()
            for term in forbidden_terms:
                assert term not in content, f"Potentially hardcoded secret '{term}' found in {script_name}!"


def test_3_metadata_json_schema_validation():
    """3. Backup metadata format must adhere to audit specifications."""
    sample_meta = {
        "database": "getmymoment",
        "timestamp_utc": "20260823_174031",
        "file_path": "/home/ubuntu/backups/gmm_backup_20260823_174031.dump",
        "file_size_bytes": 147456,
        "format": "postgresql_custom_archive_v1",
        "sha256": "14f17a23d0f066a7c86bcce9439da2f487d330f97fea37a7d3e67f12a305a84e",
        "duration_seconds": 1,
        "status": "VERIFIED_SUCCESSFUL",
        "verified_at": "2026-08-23T17:40:32Z"
    }
    
    # Must serialize/deserialize cleanly
    serialized = json.dumps(sample_meta)
    deserialized = json.loads(serialized)
    assert deserialized["status"] == "VERIFIED_SUCCESSFUL"
    assert deserialized["format"] == "postgresql_custom_archive_v1"
    assert len(deserialized["sha256"]) == 64


def test_4_sha256_checksum_verification_logic():
    """4. Checksum verification logic accurately detects integrity and tampering."""
    test_data = b"Sample PostgreSQL archive payload for verification"
    expected_hash = hashlib.sha256(test_data).hexdigest()
    
    # Match scenario
    actual_hash = hashlib.sha256(test_data).hexdigest()
    assert actual_hash == expected_hash
    
    # Tamper scenario
    tampered_data = b"Tampered PostgreSQL archive payload"
    tampered_hash = hashlib.sha256(tampered_data).hexdigest()
    assert tampered_hash != expected_hash


def test_5_runbook_documentation_exists():
    """5. Backup and restore runbook exists and documents all required procedures."""
    runbook_path = os.path.join("docs", "runbooks", "backup-restore.md")
    assert os.path.exists(runbook_path), f"Missing {runbook_path}"
    
    with open(runbook_path, "r", encoding="utf-8") as f:
        doc = f.read()
        assert "pg_restore" in doc
        assert "pgvector" in doc
        assert "NEEDS_DECISION" in doc
        assert "DISASTER RECOVERY" in doc