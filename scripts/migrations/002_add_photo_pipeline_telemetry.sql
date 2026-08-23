-- Migration: 002_add_photo_pipeline_telemetry.sql
-- Description: Additive nullable pipeline telemetry & latency tracking columns to photos table
-- Reversible: Yes (ALTER TABLE photos DROP COLUMN ...)
-- Data Loss: Zero
-- Locking Impact: Metadata-only instant alteration in PostgreSQL 16 (O(1))

ALTER TABLE photos ADD COLUMN IF NOT EXISTS queued_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS guest_ready_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS processing_duration_ms INTEGER DEFAULT NULL;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS ai_inference_ms INTEGER DEFAULT NULL;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS failure_category VARCHAR(64) DEFAULT NULL;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS camera_captured_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL;

CREATE INDEX IF NOT EXISTS ix_photos_event_status ON photos (event_id, status);
