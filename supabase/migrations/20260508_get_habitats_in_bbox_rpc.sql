-- Viewport-bound habitat fetch for the mobile project map. Mobile cannot
-- mount 600-1000+ native polygon overlays without freezing the device, so
-- the spatial filter is pushed to PostGIS via the existing
-- habitat_polygons_boundary_idx GIST index. The legacy get_project_habitats
-- RPC stays as the explicit "Show all" escape hatch on the list screen.
--
-- Web continues to read habitat_polygons directly via select('*') and is
-- unaffected — this migration is purely additive (new function, no table /
-- index / RLS changes).
--
-- Geometry pipeline matches get_project_habitats so the two RPCs return
-- byte-compatible payloads:
--   ST_MakeValid           -> repair self-intersections / invalid rings
--   ST_CollectionExtract 3 -> coerce GeometryCollection -> MultiPolygon
--   ST_SimplifyPreserveTopology(0.00005)
--                          -> ~5m simplification at Irish latitudes
--   ST_AsGeoJSON(_, 5)     -> ~1m precision, payload trim
--
-- security invoker => RLS on habitat_polygons (project_members) applies
-- as-is; the same callers that can SELECT the table can call this RPC.

create or replace function public.get_habitats_in_bbox(
  p_project_id uuid,
  p_site_id    uuid default null,
  p_min_lng    double precision default null,
  p_min_lat    double precision default null,
  p_max_lng    double precision default null,
  p_max_lat    double precision default null,
  p_limit      int default 500
)
returns table (
  id uuid,
  project_id uuid,
  site_id uuid,
  survey_id uuid,
  fossitt_code text,
  fossitt_name text,
  area_hectares double precision,
  condition text,
  evaluation text,
  eu_annex_code text,
  survey_method text,
  notes text,
  listed_species text[],
  threats text[],
  photos text[],
  include_in_report boolean,
  boundary jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    h.id,
    h.project_id,
    h.site_id,
    h.survey_id,
    h.fossitt_code,
    h.fossitt_name,
    h.area_hectares,
    h.condition,
    h.evaluation,
    h.eu_annex_code,
    h.survey_method,
    h.notes,
    h.listed_species,
    h.threats,
    h.photos,
    h.include_in_report,
    case
      when h.boundary is null then null
      else st_asgeojson(
        st_simplifypreservetopology(
          st_collectionextract(st_makevalid(h.boundary), 3),
          0.00005
        ),
        5
      )::jsonb
    end as boundary,
    h.created_at,
    h.updated_at
  from public.habitat_polygons h
  where h.project_id = p_project_id
    and (p_site_id is null or h.site_id = p_site_id)
    and h.boundary is not null
    and (
      p_min_lng is null or
      st_intersects(
        h.boundary,
        st_setsrid(st_makeenvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat), 4326)
      )
    )
  order by h.area_hectares desc nulls last
  limit greatest(1, least(coalesce(p_limit, 500), 1000));
$$;

grant execute on function public.get_habitats_in_bbox(
  uuid, uuid, double precision, double precision, double precision, double precision, int
) to authenticated;
