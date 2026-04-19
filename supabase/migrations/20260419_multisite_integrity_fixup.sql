-- Follow-up fixes: auth guard on delete_project_site + photo dedup.

-- 1. Tighten delete_project_site: ensure caller is a project member before
--    the SECURITY DEFINER context strips RLS.
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

  IF NOT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = v_project_id
      AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to delete sites in this project'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_counts := public.get_site_impact_counts(p_site_id);

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

-- 2. Fix photo double-count. A photo with both a survey AND a habitat_polygon
--    linked to the same site was counted twice before.
CREATE OR REPLACE FUNCTION get_site_impact_counts(p_site_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_counts jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.project_sites ps
    JOIN public.project_members pm ON pm.project_id = ps.project_id
    WHERE ps.id = p_site_id AND pm.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

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
      SELECT COUNT(DISTINCT p.id) FROM public.photos p
      LEFT JOIN public.surveys s ON p.survey_id = s.id
      LEFT JOIN public.habitat_polygons h ON p.habitat_polygon_id = h.id
      LEFT JOIN public.target_notes t ON p.target_note_id = t.id
      WHERE s.site_id = p_site_id OR h.site_id = p_site_id OR t.site_id = p_site_id
    )
  ) INTO v_counts;

  RETURN v_counts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
