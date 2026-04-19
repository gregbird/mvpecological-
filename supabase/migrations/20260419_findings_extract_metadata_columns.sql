-- Aşama 1 of raw_data normalization — add typed columns for the hot
-- metadata fields that list/restore/AI paths read, then backfill them
-- from raw_data so both old and new rows are queryable via the columns.
--
-- Kept in raw_data (NOT migrated):
--   * deepResearch.aiAnalysis — long narrative, cold read
--   * ssco / habitats / article17 enrichment — arrays, rare reads
--   * full NPWS/EPA API fields (OBJECTID, SITECODE, etc.) — evidence path
--   * species gridSquares / nbdcData / sampleRecords — bulky, spatial
--
-- After this migration, writes continue to populate raw_data AND the new
-- columns (dual-write). Aşama 2 will switch reads to use the columns.

-- 1. Add columns (nullable — backfill UPDATE below handles existing rows,
-- dual-write at the application layer handles new rows).
ALTER TABLE public.desk_research_findings
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS site_code text,
  ADD COLUMN IF NOT EXISTS site_type text,
  ADD COLUMN IF NOT EXISTS scientific_name text,
  ADD COLUMN IF NOT EXISTS common_name text,
  ADD COLUMN IF NOT EXISTS taxon_group text,
  ADD COLUMN IF NOT EXISTS is_invasive boolean,
  ADD COLUMN IF NOT EXISTS is_threatened boolean,
  ADD COLUMN IF NOT EXISTS fossitt_code text;

-- 2. Backfill ai_summary — habitat stores at top level, everything else
-- under metadata (audited against live data, data_type-split).
UPDATE public.desk_research_findings
SET ai_summary = CASE data_type
  WHEN 'habitat' THEN raw_data->>'aiSummary'
  ELSE raw_data->'metadata'->>'aiSummary'
END
WHERE ai_summary IS NULL
  AND (
    (data_type = 'habitat' AND raw_data ? 'aiSummary')
    OR (data_type <> 'habitat' AND raw_data->'metadata' ? 'aiSummary')
  );

-- 3. Backfill site_code — designated/water_quality/catchment use metadata.siteCode
-- (newer rows) or top-level SITECODE/siteCode (older rows).
UPDATE public.desk_research_findings
SET site_code = COALESCE(
  raw_data->'metadata'->>'siteCode',
  raw_data->>'siteCode',
  raw_data->>'SITECODE'
)
WHERE data_type IN ('designated_site', 'water_quality', 'catchment')
  AND site_code IS NULL;

-- 4. Backfill site_type — same pattern.
UPDATE public.desk_research_findings
SET site_type = COALESCE(
  raw_data->'metadata'->>'siteType',
  raw_data->>'SITE_TYPE'
)
WHERE data_type IN ('designated_site', 'water_quality', 'catchment')
  AND site_type IS NULL;

-- 5. Backfill scientific_name — species_record only. Duplicate stored at
-- both metadata and top level; prefer metadata (kept in sync by app).
UPDATE public.desk_research_findings
SET scientific_name = COALESCE(
  raw_data->'metadata'->>'scientificName',
  raw_data->>'scientificName'
)
WHERE data_type = 'species_record'
  AND scientific_name IS NULL;

-- 6. Backfill common_name — species_record, metadata only.
UPDATE public.desk_research_findings
SET common_name = raw_data->'metadata'->>'commonName'
WHERE data_type = 'species_record'
  AND common_name IS NULL
  AND raw_data->'metadata' ? 'commonName';

-- 7. Backfill taxon_group — species_record, metadata only.
UPDATE public.desk_research_findings
SET taxon_group = raw_data->'metadata'->>'taxonGroup'
WHERE data_type = 'species_record'
  AND taxon_group IS NULL
  AND raw_data->'metadata' ? 'taxonGroup';

-- 8. Backfill is_invasive / is_threatened — species_record, metadata only.
-- Cast text → boolean (JSONB ->> gives text "true"/"false").
UPDATE public.desk_research_findings
SET is_invasive = (raw_data->'metadata'->>'isInvasive')::boolean
WHERE data_type = 'species_record'
  AND is_invasive IS NULL
  AND raw_data->'metadata' ? 'isInvasive'
  AND raw_data->'metadata'->>'isInvasive' IN ('true', 'false');

UPDATE public.desk_research_findings
SET is_threatened = (raw_data->'metadata'->>'isThreatened')::boolean
WHERE data_type = 'species_record'
  AND is_threatened IS NULL
  AND raw_data->'metadata' ? 'isThreatened'
  AND raw_data->'metadata'->>'isThreatened' IN ('true', 'false');

-- 9. Backfill fossitt_code — habitat only, top-level (no metadata wrapper).
UPDATE public.desk_research_findings
SET fossitt_code = raw_data->>'fossittCode'
WHERE data_type = 'habitat'
  AND fossitt_code IS NULL
  AND raw_data ? 'fossittCode';

-- 10. Indexes on the fields the restore/filter paths will query with
-- equality. Partial indexes keep them small — most rows won't match a
-- given filter.
CREATE INDEX IF NOT EXISTS idx_findings_site_code
  ON public.desk_research_findings (site_code)
  WHERE site_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_findings_scientific_name
  ON public.desk_research_findings (scientific_name)
  WHERE scientific_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_findings_fossitt_code
  ON public.desk_research_findings (fossitt_code)
  WHERE fossitt_code IS NOT NULL;
