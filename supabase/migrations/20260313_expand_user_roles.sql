-- Expand user_role enum with new roles from feedback
-- Existing: admin, assessor, client
-- Adding: project_manager, ecologist, junior, third_party

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'project_manager';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'ecologist';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'junior';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'third_party';
