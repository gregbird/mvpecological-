-- Dulra Seed Data
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)

-- 1. Create Organization
INSERT INTO organizations (id, name, settings)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Dulra Ecological Consultants',
  '{"theme": "light", "language": "en"}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 2. Create Profile (Dev User)
INSERT INTO profiles (id, email, full_name, organization_id, role)
VALUES (
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'dev@dulra.ie',
  'Dev User',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'admin'
)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- 3. Create Client
INSERT INTO clients (id, name, organization_id, contact_name, contact_email)
VALUES (
  'c3d4e5f6-a7b8-9012-cdef-123456789012',
  'Irish Wildlife Trust',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'John Murphy',
  'john@iwt.ie'
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 4. Create Project 1 - Killarney
INSERT INTO projects (
  id, name, site_code, organization_id, created_by, client_id,
  status, current_phase, health_status, survey_type,
  expected_start_date, expected_end_date
)
VALUES (
  'd4e5f6a7-b8c9-0123-def0-234567890123',
  'Killarney National Park Assessment',
  'KNP-2024-001',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'c3d4e5f6-a7b8-9012-cdef-123456789012',
  'active',
  'desk_research',
  'on_track',
  'PEA',
  '2024-03-01',
  '2024-06-30'
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 5. Create Project 2 - Shannon
INSERT INTO projects (
  id, name, site_code, organization_id, created_by, client_id,
  status, current_phase, health_status, survey_type,
  expected_start_date, expected_end_date
)
VALUES (
  'e5f6a7b8-c9d0-1234-ef01-345678901234',
  'Shannon Estuary Survey',
  'SES-2024-002',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'c3d4e5f6-a7b8-9012-cdef-123456789012',
  'active',
  'desk_research',
  'on_track',
  'EcIA',
  '2024-04-01',
  '2024-08-31'
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 6. Create Workflow Steps for Project 1
INSERT INTO workflow_steps (id, project_id, step_number, name, phase, status)
VALUES
  ('d4e5f6a7-b8c9-0123-def0-234567890123-step-1', 'd4e5f6a7-b8c9-0123-def0-234567890123', 1, 'GIS Mapping', 'desk_research', 'in_progress'),
  ('d4e5f6a7-b8c9-0123-def0-234567890123-step-2', 'd4e5f6a7-b8c9-0123-def0-234567890123', 2, 'Data Gathering', 'desk_research', 'pending'),
  ('d4e5f6a7-b8c9-0123-def0-234567890123-step-3', 'd4e5f6a7-b8c9-0123-def0-234567890123', 3, 'Desk Assessment', 'desk_research', 'pending'),
  ('d4e5f6a7-b8c9-0123-def0-234567890123-step-4', 'd4e5f6a7-b8c9-0123-def0-234567890123', 4, 'Survey Planning', 'field_research', 'pending'),
  ('d4e5f6a7-b8c9-0123-def0-234567890123-step-5', 'd4e5f6a7-b8c9-0123-def0-234567890123', 5, 'Field Survey', 'field_research', 'pending'),
  ('d4e5f6a7-b8c9-0123-def0-234567890123-step-6', 'd4e5f6a7-b8c9-0123-def0-234567890123', 6, 'Habitat Mapping', 'field_research', 'pending'),
  ('d4e5f6a7-b8c9-0123-def0-234567890123-step-7', 'd4e5f6a7-b8c9-0123-def0-234567890123', 7, 'Species Recording', 'field_research', 'pending'),
  ('d4e5f6a7-b8c9-0123-def0-234567890123-step-8', 'd4e5f6a7-b8c9-0123-def0-234567890123', 8, 'Data Analysis', 'reporting', 'pending'),
  ('d4e5f6a7-b8c9-0123-def0-234567890123-step-9', 'd4e5f6a7-b8c9-0123-def0-234567890123', 9, 'AI Draft', 'reporting', 'pending'),
  ('d4e5f6a7-b8c9-0123-def0-234567890123-step-10', 'd4e5f6a7-b8c9-0123-def0-234567890123', 10, 'Final Report', 'reporting', 'pending')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

-- 7. Create Workflow Steps for Project 2
INSERT INTO workflow_steps (id, project_id, step_number, name, phase, status)
VALUES
  ('e5f6a7b8-c9d0-1234-ef01-345678901234-step-1', 'e5f6a7b8-c9d0-1234-ef01-345678901234', 1, 'GIS Mapping', 'desk_research', 'in_progress'),
  ('e5f6a7b8-c9d0-1234-ef01-345678901234-step-2', 'e5f6a7b8-c9d0-1234-ef01-345678901234', 2, 'Data Gathering', 'desk_research', 'pending'),
  ('e5f6a7b8-c9d0-1234-ef01-345678901234-step-3', 'e5f6a7b8-c9d0-1234-ef01-345678901234', 3, 'Desk Assessment', 'desk_research', 'pending'),
  ('e5f6a7b8-c9d0-1234-ef01-345678901234-step-4', 'e5f6a7b8-c9d0-1234-ef01-345678901234', 4, 'Survey Planning', 'field_research', 'pending'),
  ('e5f6a7b8-c9d0-1234-ef01-345678901234-step-5', 'e5f6a7b8-c9d0-1234-ef01-345678901234', 5, 'Field Survey', 'field_research', 'pending'),
  ('e5f6a7b8-c9d0-1234-ef01-345678901234-step-6', 'e5f6a7b8-c9d0-1234-ef01-345678901234', 6, 'Habitat Mapping', 'field_research', 'pending'),
  ('e5f6a7b8-c9d0-1234-ef01-345678901234-step-7', 'e5f6a7b8-c9d0-1234-ef01-345678901234', 7, 'Species Recording', 'field_research', 'pending'),
  ('e5f6a7b8-c9d0-1234-ef01-345678901234-step-8', 'e5f6a7b8-c9d0-1234-ef01-345678901234', 8, 'Data Analysis', 'reporting', 'pending'),
  ('e5f6a7b8-c9d0-1234-ef01-345678901234-step-9', 'e5f6a7b8-c9d0-1234-ef01-345678901234', 9, 'AI Draft', 'reporting', 'pending'),
  ('e5f6a7b8-c9d0-1234-ef01-345678901234-step-10', 'e5f6a7b8-c9d0-1234-ef01-345678901234', 10, 'Final Report', 'reporting', 'pending')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

-- 8. Add Project Members
INSERT INTO project_members (id, project_id, user_id, role)
VALUES
  ('d4e5f6a7-b8c9-0123-def0-234567890123-member-1', 'd4e5f6a7-b8c9-0123-def0-234567890123', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'lead'),
  ('e5f6a7b8-c9d0-1234-ef01-345678901234-member-1', 'e5f6a7b8-c9d0-1234-ef01-345678901234', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'lead')
ON CONFLICT (id) DO NOTHING;

-- Done!
SELECT 'Seed completed!' as status;

-- Show created projects
SELECT id, name, site_code, status FROM projects;
