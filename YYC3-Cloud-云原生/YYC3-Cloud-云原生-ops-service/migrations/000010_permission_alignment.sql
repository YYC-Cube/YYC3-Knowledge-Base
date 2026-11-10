-- Migration: 000010_permission_alignment
-- Description: Add missing permissions (job.output_detail, job.read_all, artifact.download)
-- that are checked in code but missing from seed data

-- Add missing permissions
INSERT INTO permissions (resource, action, description) VALUES
    ('job', 'output_detail', 'View detailed job execution output'),
    ('job', 'read_all', 'View all jobs across all scopes (global read)'),
    ('artifact', 'download', 'Download artifacts and generate download URLs')
ON CONFLICT (resource, action) DO NOTHING;

-- Grant new permissions to admin role (admin gets ALL permissions)
DO $$
DECLARE
    admin_role_id UUID;
BEGIN
    SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';

    IF admin_role_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT admin_role_id, p.id FROM permissions p
        WHERE (p.resource, p.action) IN (
            ('job', 'output_detail'),
            ('job', 'read_all'),
            ('artifact', 'download')
        )
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Grant relevant permissions to operator role
DO $$
DECLARE
    operator_role_id UUID;
BEGIN
    SELECT id INTO operator_role_id FROM roles WHERE name = 'operator';

    IF operator_role_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT operator_role_id, p.id FROM permissions p
        WHERE (p.resource, p.action) IN (
            ('job', 'output_detail'),
            ('artifact', 'download')
        )
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
