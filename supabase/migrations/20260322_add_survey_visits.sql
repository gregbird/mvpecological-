-- Multi-visit survey support
-- Allows grouping multiple survey visits under a single visit_group_id
-- e.g. 3-night bat surveys, seasonal bird surveys

ALTER TABLE surveys ADD COLUMN visit_group_id UUID NULL;
ALTER TABLE surveys ADD COLUMN visit_number INT NULL;

-- Index for grouping queries
CREATE INDEX idx_surveys_visit_group ON surveys(visit_group_id) WHERE visit_group_id IS NOT NULL;

-- Unique constraint: same group can't have duplicate visit numbers
CREATE UNIQUE INDEX idx_surveys_visit_group_number ON surveys(visit_group_id, visit_number) WHERE visit_group_id IS NOT NULL;
