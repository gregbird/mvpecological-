-- D1.2 + D1.4: Remove 'planned' and 'approved' from survey_status enum
-- Survey flow is now simply: in_progress → completed

-- Step 1: Convert existing rows
UPDATE surveys SET status = 'in_progress' WHERE status = 'planned';
UPDATE surveys SET status = 'completed' WHERE status = 'approved';

-- Step 2: Drop default before altering type
ALTER TABLE surveys ALTER COLUMN status DROP DEFAULT;

-- Step 3: Swap enum
ALTER TYPE survey_status RENAME TO survey_status_old;
CREATE TYPE survey_status AS ENUM ('in_progress', 'completed');
ALTER TABLE surveys
  ALTER COLUMN status TYPE survey_status USING status::text::survey_status;

-- Step 4: Restore default and clean up
ALTER TABLE surveys ALTER COLUMN status SET DEFAULT 'in_progress'::survey_status;
DROP TYPE survey_status_old;
