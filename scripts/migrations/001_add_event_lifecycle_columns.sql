-- Migration: 001_add_event_lifecycle_columns.sql
-- Description: Additive nullable lifecycle timestamp columns (closed_at, archived_at) to events table
-- Reversible: Yes (ALTER TABLE events DROP COLUMN ...)
-- Data Loss: Zero
-- Locking Impact: Metadata-only instant alteration in PostgreSQL 16 (O(1))

ALTER TABLE events ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL;
