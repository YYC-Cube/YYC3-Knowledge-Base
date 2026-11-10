-- ============================================
-- P2.1 Phase: Build System Schema Updates
-- ============================================

-- Make job_id optional in build_jobs (build jobs can exist independently)
ALTER TABLE build_jobs ALTER COLUMN job_id DROP NOT NULL;

-- Add missing columns to match API usage
ALTER TABLE build_jobs ADD COLUMN IF NOT EXISTS project_name VARCHAR(255);
ALTER TABLE build_jobs ADD COLUMN IF NOT EXISTS repository_url VARCHAR(500);
ALTER TABLE build_jobs ADD COLUMN IF NOT EXISTS commit VARCHAR(100);
ALTER TABLE build_jobs ADD COLUMN IF NOT EXISTS env_vars JSONB DEFAULT '{}';
ALTER TABLE build_jobs ADD COLUMN IF NOT EXISTS parameters JSONB DEFAULT '{}';
ALTER TABLE build_jobs ADD COLUMN IF NOT EXISTS steps JSONB DEFAULT '[]';

-- Add created_by column if not exists (for tracking who created the build)
ALTER TABLE build_jobs ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- Add retry_of column for retry tracking
ALTER TABLE build_jobs ADD COLUMN IF NOT EXISTS retry_of UUID REFERENCES build_jobs(id);

-- Update build_steps table to use step_id instead of step_order
ALTER TABLE build_steps ADD COLUMN IF NOT EXISTS step_id VARCHAR(255);
DROP INDEX IF EXISTS idx_build_steps_build_job_id_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_build_steps_job_step
    ON build_steps(build_job_id, step_id);

-- Add output_detail column if not exists
ALTER TABLE build_steps ADD COLUMN IF NOT EXISTS output_detail TEXT;

-- Update runners table to include system info
ALTER TABLE runners ADD COLUMN IF NOT EXISTS system_info JSONB DEFAULT '{}';
ALTER TABLE runners ADD COLUMN IF NOT EXISTS description TEXT;

-- Add updated_at to build_jobs if not exists
ALTER TABLE build_jobs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_build_jobs_updated_at ON build_jobs;
CREATE TRIGGER update_build_jobs_updated_at
    BEFORE UPDATE ON build_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for new columns
COMMENT ON COLUMN build_jobs.job_id IS 'Optional reference to parent job (for SSH-triggered builds)';
COMMENT ON COLUMN build_jobs.project_name IS 'Project name for the build';
COMMENT ON COLUMN build_jobs.repository_url IS 'Full repository URL';
COMMENT ON COLUMN build_jobs.commit IS 'Commit SHA or identifier';
COMMENT ON COLUMN build_jobs.env_vars IS 'Environment variables for the build';
COMMENT ON COLUMN build_jobs.parameters IS 'Build parameters';
COMMENT ON COLUMN build_jobs.steps IS 'Build steps configuration';
COMMENT ON COLUMN build_jobs.created_by IS 'User who created the build job';
COMMENT ON COLUMN build_jobs.retry_of IS 'Original build job ID if this is a retry';
COMMENT ON COLUMN build_steps.step_id IS 'Unique step identifier within the build';
COMMENT ON COLUMN runners.system_info IS 'Runner system information (CPU, memory, etc.)';
