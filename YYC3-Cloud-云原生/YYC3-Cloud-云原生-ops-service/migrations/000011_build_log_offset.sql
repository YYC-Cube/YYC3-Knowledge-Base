-- Migration: 000011_build_log_offset
-- Description: Add log_offset column to build_steps for idempotent/ordered log handling

ALTER TABLE build_steps
ADD COLUMN IF NOT EXISTS log_offset BIGINT NOT NULL DEFAULT 0;

COMMENT ON COLUMN build_steps.log_offset IS 'Cumulative byte offset of appended log content; used for idempotent dedup and out-of-order detection';
