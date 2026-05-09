-- Read-only RPC for the mobile app to fetch habitat polygons with boundary
-- pre-encoded as GeoJSON. The web client continues to use direct
-- select('*') against habitat_polygons; this RPC is purely additive and
-- exists so mobile clients get:
--   1. Explicit ST_AsGeoJSON encoding (independent of PostgREST defaults)
--   2. Server-side cleanup + simplify so offline cache stays small AND
--      invalid source geometries don't break the response
--   3. A single endpoint covering project + optional site filter
--
-- Geometry pipeline (per row):
--   ST_MakeValid           -> repair self-intersections / invalid rings
--                             (a meaningful slice of habitat_polygons rows
--                             have ST_IsValid = false)
--   ST_CollectionExtract 3 -> coerce any GeometryCollection output of
--                             MakeValid down to MultiPolygon, drop strays
--   ST_SimplifyPreserveTopology(0.00005)
--                          -> ~5m vertex simplification at Irish latitudes,
--                             topology preserved so output stays valid
--   ST_AsGeoJSON(_, 5)     -> 5 decimal digits ≈ 1m precision, payload trim
--
-- security invoker => existing RLS on habitat_polygons applies as-is via
-- project_members.

create or replace function public.get_project_habitats(
  p_project_id uuid,
  p_site_id uuid default null
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
  order by h.created_at desc;
$$;

grant execute on function public.get_project_habitats(uuid, uuid) to authenticated;
