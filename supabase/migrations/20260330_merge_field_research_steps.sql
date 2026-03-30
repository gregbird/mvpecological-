-- D2.1: Merge workflow steps 4 (Field Survey), 5 (Habitat Mapping), 6 (Target Notes)
-- into a single step 4 (Field Research). Renumber steps 7-10 to 5-8.

-- Step 1: Merge completion status — if ANY of 4/5/6 was in_progress or approved, keep that
-- Pick the "best" status: approved > needs_review > in_progress > pending
UPDATE workflow_steps ws4
SET
  name = 'Field Research',
  status = (
    SELECT CASE
      WHEN bool_or(status = 'approved') THEN 'approved'
      WHEN bool_or(status = 'needs_review') THEN 'needs_review'
      WHEN bool_or(status = 'in_progress') THEN 'in_progress'
      ELSE 'pending'
    END
    FROM workflow_steps sub
    WHERE sub.project_id = ws4.project_id
      AND sub.step_number IN (4, 5, 6)
  ),
  started_at = (
    SELECT MIN(started_at)
    FROM workflow_steps sub
    WHERE sub.project_id = ws4.project_id
      AND sub.step_number IN (4, 5, 6)
      AND sub.started_at IS NOT NULL
  ),
  completed_at = (
    SELECT MAX(completed_at)
    FROM workflow_steps sub
    WHERE sub.project_id = ws4.project_id
      AND sub.step_number IN (4, 5, 6)
      AND sub.completed_at IS NOT NULL
  ),
  updated_at = now()
WHERE ws4.step_number = 4;

-- Step 2: Delete old steps 5 and 6
DELETE FROM workflow_steps WHERE step_number IN (5, 6);

-- Step 3: Renumber 7→5, 8→6, 9→7, 10→8
-- Use negative numbers temporarily to avoid unique constraint conflicts
UPDATE workflow_steps SET step_number = -step_number WHERE step_number IN (7, 8, 9, 10);
UPDATE workflow_steps SET step_number = 5, name = 'Data Analysis' WHERE step_number = -7;
UPDATE workflow_steps SET step_number = 6, name = 'AI Draft' WHERE step_number = -8;
UPDATE workflow_steps SET step_number = 7, name = 'Quality Review' WHERE step_number = -9;
UPDATE workflow_steps SET step_number = 8, name = 'Final Submission' WHERE step_number = -10;

-- Step 4: Update phase for renumbered steps
UPDATE workflow_steps SET phase = 'reporting' WHERE step_number IN (5, 6, 7, 8);
UPDATE workflow_steps SET phase = 'field_research' WHERE step_number = 4;
