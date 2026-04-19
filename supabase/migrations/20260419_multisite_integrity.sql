-- Multi-site integrity: cascade deletes, releve site_id, trigger fix, RPC expansion.

-- 1. Switch site_id FKs from SET NULL to CASCADE on site-scoped tables.
-- Findings/surveys/habitats/target_notes die with their site to keep reports clean.
ALTER TABLE desk_research_findings
  DROP CONSTRAINT desk_research_findings_site_id_fkey,
  ADD CONSTRAINT desk_research_findings_site_id_fkey
    FOREIGN KEY (site_id) REFERENCES project_sites(id) ON DELETE CASCADE;

ALTER TABLE surveys
  DROP CONSTRAINT surveys_site_id_fkey,
  ADD CONSTRAINT surveys_site_id_fkey
    FOREIGN KEY (site_id) REFERENCES project_sites(id) ON DELETE CASCADE;

ALTER TABLE habitat_polygons
  DROP CONSTRAINT habitat_polygons_site_id_fkey,
  ADD CONSTRAINT habitat_polygons_site_id_fkey
    FOREIGN KEY (site_id) REFERENCES project_sites(id) ON DELETE CASCADE;

ALTER TABLE target_notes
  DROP CONSTRAINT target_notes_site_id_fkey,
  ADD CONSTRAINT target_notes_site_id_fkey
    FOREIGN KEY (site_id) REFERENCES project_sites(id) ON DELETE CASCADE;

-- 2. Add site_id to releve_surveys (independent of surveys table — has its own project_id).
ALTER TABLE releve_surveys
  ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES project_sites(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS releve_surveys_site_id_idx ON releve_surveys(site_id);

-- Backfill: inherit site_id from linked survey when available.
UPDATE releve_surveys rs
SET site_id = s.site_id
FROM surveys s
WHERE rs.survey_id = s.id
  AND rs.site_id IS NULL
  AND s.site_id IS NOT NULL;

-- 3. Fix sync trigger: handle last-site-deleted case.
-- Previously, when the final site was removed, the UPDATE was skipped because
-- first_site IS NULL, leaving projects.boundary with stale data.
CREATE OR REPLACE FUNCTION sync_project_boundary_from_sites()
RETURNS TRIGGER AS $$
DECLARE
  first_site RECORD;
  target_project_id uuid;
BEGIN
  target_project_id := COALESCE(NEW.project_id, OLD.project_id);

  SELECT boundary, center_point, grid_reference, county, townland, province, buffer_distances, visible_layers
  INTO first_site
  FROM public.project_sites
  WHERE project_id = target_project_id
    AND boundary IS NOT NULL
  ORDER BY sort_order ASC, created_at ASC
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.projects SET
      boundary = first_site.boundary,
      center_point = first_site.center_point,
      grid_reference = first_site.grid_reference,
      county = first_site.county,
      townland = first_site.townland,
      province = first_site.province,
      buffer_distances = first_site.buffer_distances,
      visible_layers = first_site.visible_layers,
      updated_at = now()
    WHERE id = target_project_id;
  ELSE
    -- No sites left with a boundary: clear project-level legacy fields.
    UPDATE public.projects SET
      boundary = NULL,
      center_point = NULL,
      grid_reference = NULL,
      county = NULL,
      townland = NULL,
      province = NULL,
      buffer_distances = NULL,
      visible_layers = NULL,
      updated_at = now()
    WHERE id = target_project_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 4. Impact preview RPC — counts rows that CASCADE will destroy.
-- Used by the confirm dialog before deletion.
CREATE OR REPLACE FUNCTION get_site_impact_counts(p_site_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_counts jsonb;
BEGIN
  SELECT jsonb_build_object(
    'findings', (SELECT COUNT(*) FROM public.desk_research_findings WHERE site_id = p_site_id),
    'surveys', (SELECT COUNT(*) FROM public.surveys WHERE site_id = p_site_id),
    'habitats', (SELECT COUNT(*) FROM public.habitat_polygons WHERE site_id = p_site_id),
    'target_notes', (SELECT COUNT(*) FROM public.target_notes WHERE site_id = p_site_id),
    'releve_surveys', (SELECT COUNT(*) FROM public.releve_surveys WHERE site_id = p_site_id),
    'species_observations', (
      SELECT COUNT(*) FROM public.species_observations o
      JOIN public.surveys s ON o.survey_id = s.id
      WHERE s.site_id = p_site_id
    ),
    'photos', (
      SELECT COUNT(*) FROM public.photos p
      LEFT JOIN public.surveys s ON p.survey_id = s.id
      LEFT JOIN public.habitat_polygons h ON p.habitat_polygon_id = h.id
      LEFT JOIN public.target_notes t ON p.target_note_id = t.id
      WHERE s.site_id = p_site_id OR h.site_id = p_site_id OR t.site_id = p_site_id
    )
  ) INTO v_counts;

  RETURN v_counts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 5. Expand delete_project_site to return counts + clean orphan AI insight keys.
-- Return type changes from boolean → jsonb, so drop + recreate.
DROP FUNCTION IF EXISTS delete_project_site(uuid);

CREATE FUNCTION delete_project_site(p_site_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_counts jsonb;
  v_project_id uuid;
BEGIN
  SELECT project_id INTO v_project_id FROM public.project_sites WHERE id = p_site_id;

  IF v_project_id IS NULL THEN
    RETURN jsonb_build_object('deleted', false, 'reason', 'site_not_found');
  END IF;

  -- Capture impact counts before the CASCADE fires.
  v_counts := public.get_site_impact_counts(p_site_id);

  -- Strip this site's keys from any workflow_steps.metadata.aiInsightsBySite map.
  UPDATE public.workflow_steps
  SET metadata = jsonb_set(
        metadata,
        '{aiInsightsBySite}',
        (metadata -> 'aiInsightsBySite') - p_site_id::text
      )
  WHERE project_id = v_project_id
    AND metadata ? 'aiInsightsBySite'
    AND (metadata -> 'aiInsightsBySite') ? p_site_id::text;

  DELETE FROM public.project_sites WHERE id = p_site_id;

  RETURN jsonb_build_object(
    'deleted', true,
    'site_id', p_site_id,
    'orphaned_counts', v_counts
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
