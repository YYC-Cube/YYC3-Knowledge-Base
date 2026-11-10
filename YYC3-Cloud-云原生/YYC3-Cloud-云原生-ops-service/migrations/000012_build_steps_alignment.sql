-- Migration: 000012_build_steps_alignment
-- Description: Add step_id column to build_steps table to align schema with code
-- The code uses step_id (VARCHAR) as unique step identifier; schema had step_order (INT) instead

-- Add step_id column
ALTER TABLE build_steps
ADD COLUMN IF NOT EXISTS step_id VARCHAR(255);

-- Add job_id column for compatibility (code uses job_id, schema has build_job_id)
ALTER TABLE build_steps
ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES build_jobs(id) ON DELETE CASCADE;

-- Populate job_id from build_job_id for existing rows
UPDATE build_steps SET job_id = build_job_id WHERE job_id IS NULL;

-- Populate step_id from step_order for existing rows
UPDATE build_steps SET step_id = step_order::text WHERE step_id IS NULL;

-- Make step_order optional (step_id is now the primary identifier)
ALTER TABLE build_steps ALTER COLUMN step_order DROP NOT NULL;

-- Make step_name optional (defaults to step_id)
ALTER TABLE build_steps ALTER COLUMN step_name DROP NOT NULL;

-- Add exit_code column if not present
ALTER TABLE build_steps
ADD COLUMN IF NOT EXISTS exit_code INTEGER;

-- Add error column if not present                                  
ALTER TABLE build_steps
ADD COLUMN IF NOT EXISTS error TEXT;

-- Add log_offset column if not present
ALTER TABLE build_steps
ADD COLUMN IF NOT EXISTS log_offset BIGINT NOT NULL DEFAULT 0;

-- Add index on step_id
CREATE INDEX IF NOT EXISTS idx_build_steps_step_id ON build_steps(job_id, step_id);

COMMENT ON COLUMN build_steps.step_id IS 'Unique step identifier within a build job (e.g. build-backend, verify)';
COMMENT ON COLUMN build_steps.log_offset IS 'Cumulative byte offset for idempotent log append';
