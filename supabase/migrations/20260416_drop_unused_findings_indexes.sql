-- Drop unused indexes on desk_research_findings.
--
-- idx_findings_raw_data_gin: 226 MB GIN index on raw_data (jsonb).
--   idx_scan = 0 since creation — never used by any query, but updated
--   on every INSERT/UPDATE. Primary contributor to the db "patladı"
--   incident on 2026-04-15: each INSERT was spilling ~22 MB to temp
--   disk, saturating I/O on the Micro compute tier.
--
-- desk_research_findings_location_idx: 544 KB spatial index.
--   idx_scan = 0 since creation — no queries filter by location
--   (queries use project_id / site_id). Removed to reduce INSERT cost.

DROP INDEX IF EXISTS public.idx_findings_raw_data_gin;
DROP INDEX IF EXISTS public.desk_research_findings_location_idx;
