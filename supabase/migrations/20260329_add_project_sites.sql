-- Multi-site boundary support
-- Allows multiple site boundaries per project (e.g., wind farm with 4 turbine sites)
-- Each site has independent boundary, buffer distances, and location info

-- 1. Create project_sites table
CREATE TABLE project_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  site_code TEXT NOT NULL,
  site_name TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  boundary geometry(Polygon, 4326),
  center_point geometry(Point, 4326),
  grid_reference TEXT,
  county TEXT,
  townland TEXT,
  province TEXT,
  buffer_distances NUMERIC[] DEFAULT '{2,5}',
  visible_layers TEXT[],
  attributes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, site_code)
);

-- Indexes
CREATE INDEX idx_project_sites_project ON project_sites(project_id);
CREATE INDEX idx_project_sites_boundary ON project_sites USING GIST(boundary);

-- 2. Add optional site_id FK to downstream tables
ALTER TABLE desk_research_findings ADD COLUMN site_id UUID REFERENCES project_sites(id) ON DELETE SET NULL;
ALTER TABLE surveys ADD COLUMN site_id UUID REFERENCES project_sites(id) ON DELETE SET NULL;
ALTER TABLE target_notes ADD COLUMN site_id UUID REFERENCES project_sites(id) ON DELETE SET NULL;
ALTER TABLE habitat_polygons ADD COLUMN site_id UUID REFERENCES project_sites(id) ON DELETE SET NULL;

CREATE INDEX idx_findings_site ON desk_research_findings(site_id) WHERE site_id IS NOT NULL;
CREATE INDEX idx_surveys_site ON surveys(site_id) WHERE site_id IS NOT NULL;
CREATE INDEX idx_target_notes_site ON target_notes(site_id) WHERE site_id IS NOT NULL;
CREATE INDEX idx_habitats_site ON habitat_polygons(site_id) WHERE site_id IS NOT NULL;

-- 3. Auto-update timestamp trigger
CREATE TRIGGER update_project_sites_updated_at
  BEFORE UPDATE ON project_sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. Audit logging
CREATE TRIGGER audit_project_sites
  AFTER INSERT OR UPDATE OR DELETE ON project_sites
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

-- 5. RLS policies
ALTER TABLE project_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view project sites" ON project_sites
  FOR SELECT USING (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert project sites" ON project_sites
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update project sites" ON project_sites
  FOR UPDATE USING (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete project sites" ON project_sites
  FOR DELETE USING (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- 6. Sync trigger: keep projects.boundary in sync with first site
CREATE OR REPLACE FUNCTION sync_project_boundary_from_sites()
RETURNS TRIGGER AS $$
DECLARE
  first_site RECORD;
BEGIN
  -- Get the first site (by sort_order) for this project
  SELECT boundary, center_point, grid_reference, county, townland, province, buffer_distances, visible_layers
  INTO first_site
  FROM project_sites
  WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
    AND boundary IS NOT NULL
  ORDER BY sort_order ASC, created_at ASC
  LIMIT 1;

  IF first_site IS NOT NULL THEN
    UPDATE projects SET
      boundary = first_site.boundary,
      center_point = first_site.center_point,
      grid_reference = first_site.grid_reference,
      county = first_site.county,
      townland = first_site.townland,
      province = first_site.province,
      buffer_distances = first_site.buffer_distances,
      visible_layers = first_site.visible_layers,
      updated_at = now()
    WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sync_boundary_on_site_change
  AFTER INSERT OR UPDATE OR DELETE ON project_sites
  FOR EACH ROW EXECUTE FUNCTION sync_project_boundary_from_sites();

-- 7. Migrate existing single-boundary projects into project_sites
INSERT INTO project_sites (project_id, site_code, site_name, sort_order, boundary, center_point, grid_reference, county, townland, province, buffer_distances, visible_layers)
SELECT
  id,
  COALESCE(LEFT(UPPER(REGEXP_REPLACE(name, '[^a-zA-Z ]', '', 'g')), 4), 'SITE') || ' 00101',
  name,
  0,
  boundary,
  center_point,
  grid_reference,
  county,
  townland,
  province,
  COALESCE(buffer_distances, '{2,5}'),
  visible_layers
FROM projects
WHERE boundary IS NOT NULL;

-- 8. RPC: Get all project sites with GeoJSON boundaries
CREATE OR REPLACE FUNCTION get_project_sites_with_geojson(p_project_id UUID)
RETURNS JSONB AS $$
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'project_id', s.project_id,
      'site_code', s.site_code,
      'site_name', s.site_name,
      'sort_order', s.sort_order,
      'boundary', ST_AsGeoJSON(s.boundary)::jsonb,
      'center_point', ST_AsGeoJSON(s.center_point)::jsonb,
      'grid_reference', s.grid_reference,
      'county', s.county,
      'townland', s.townland,
      'province', s.province,
      'buffer_distances', s.buffer_distances,
      'visible_layers', s.visible_layers,
      'attributes', s.attributes,
      'created_at', s.created_at,
      'updated_at', s.updated_at
    ) ORDER BY s.sort_order, s.created_at
  ), '[]'::jsonb)
  FROM project_sites s
  WHERE s.project_id = p_project_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 9. RPC: Upsert a project site
CREATE OR REPLACE FUNCTION upsert_project_site(
  p_project_id UUID,
  p_site_code TEXT,
  p_site_name TEXT DEFAULT NULL,
  p_sort_order INT DEFAULT 0,
  p_boundary JSON DEFAULT NULL,
  p_center_point JSON DEFAULT NULL,
  p_grid_reference TEXT DEFAULT NULL,
  p_county TEXT DEFAULT NULL,
  p_townland TEXT DEFAULT NULL,
  p_province TEXT DEFAULT NULL,
  p_buffer_distances NUMERIC[] DEFAULT '{2,5}',
  p_visible_layers TEXT[] DEFAULT NULL,
  p_attributes JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_site_id UUID;
BEGIN
  INSERT INTO project_sites (
    project_id, site_code, site_name, sort_order,
    boundary, center_point, grid_reference,
    county, townland, province,
    buffer_distances, visible_layers, attributes
  ) VALUES (
    p_project_id, p_site_code, p_site_name, p_sort_order,
    CASE WHEN p_boundary IS NOT NULL THEN ST_SetSRID(ST_GeomFromGeoJSON(p_boundary::text), 4326) END,
    CASE WHEN p_center_point IS NOT NULL THEN ST_SetSRID(ST_GeomFromGeoJSON(p_center_point::text), 4326) END,
    p_grid_reference,
    p_county, p_townland, p_province,
    p_buffer_distances, p_visible_layers, p_attributes
  )
  ON CONFLICT (project_id, site_code) DO UPDATE SET
    site_name = COALESCE(EXCLUDED.site_name, project_sites.site_name),
    sort_order = EXCLUDED.sort_order,
    boundary = COALESCE(EXCLUDED.boundary, project_sites.boundary),
    center_point = COALESCE(EXCLUDED.center_point, project_sites.center_point),
    grid_reference = COALESCE(EXCLUDED.grid_reference, project_sites.grid_reference),
    county = COALESCE(EXCLUDED.county, project_sites.county),
    townland = COALESCE(EXCLUDED.townland, project_sites.townland),
    province = COALESCE(EXCLUDED.province, project_sites.province),
    buffer_distances = EXCLUDED.buffer_distances,
    visible_layers = COALESCE(EXCLUDED.visible_layers, project_sites.visible_layers),
    attributes = COALESCE(EXCLUDED.attributes, project_sites.attributes),
    updated_at = now()
  RETURNING id INTO v_site_id;

  RETURN v_site_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. RPC: Delete a project site
CREATE OR REPLACE FUNCTION delete_project_site(p_site_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM project_sites WHERE id = p_site_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
