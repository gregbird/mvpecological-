-- Mobile sync idempotency indexes
--
-- Context: the mobile app (Dulra Mobile) writes records to SQLite first and
-- then syncs them to Supabase. Two paths depend on DB-side uniqueness:
--
--   1. releve_surveys.survey_id — mobile uses Supabase .upsert({...}, { onConflict: 'survey_id' })
--      to re-save an existing relevé without a DELETE+INSERT window. Without a
--      unique index this call fails with Postgres error 42P10.
--
--   2. surveys.local_id — if a sync pass is interrupted after the remote INSERT
--      but before markSurveySynced, the next sync needs to detect the orphan.
--      Mobile does SELECT ... WHERE local_id = ? and uses .maybeSingle(); without
--      a unique index a double-INSERT could return multiple rows and crash the
--      sync. The partial predicate keeps NULL local_id rows (web-created surveys)
--      out of the uniqueness check.

CREATE UNIQUE INDEX IF NOT EXISTS idx_releve_surveys_survey_id_unique
  ON releve_surveys (survey_id)
  WHERE survey_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_surveys_local_id_unique
  ON surveys (local_id)
  WHERE local_id IS NOT NULL;
