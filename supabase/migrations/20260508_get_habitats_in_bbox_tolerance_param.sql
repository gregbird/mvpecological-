-- Add optional p_tolerance parameter to get_habitats_in_bbox so mobile can
-- send a tighter simplify tolerance at high zoom (z ≥ 16), where the default
-- 5m simplify produces visible TIN-style triangle artifacts on saved-habitat
-- polygons that overlap the NLC reference layer.
--
-- Default value (0.00005 ≈ 5m at lat 53°) preserves the existing web
-- behaviour: callers that don't pass p_tolerance get byte-identical output
-- to the previous function. Web (which reads habitat_polygons directly via
-- select('*'), not via this RPC) is unaffected either way.
--
-- Signature change (7 → 8 params) means we must DROP the old function first;
-- CREATE OR REPLACE only works for identical signatures.

drop function if exists public.get_habitats_in_bbox(
  uuid, uuid, double precision, double precision, double precision, double precision, int
);

create or replace function public.get_habitats_in_bbox(
  p_project_id uuid,
  p_site_id    uuid default null,
  p_min_lng    double precision default null,
  p_min_lat    double precision default null,
  p_max_lng    double precision default null,
  p_max_lat    double precision default null,
  p_limit      int default 500,
  p_tolerance  double precision default 0.00005
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
          coalesce(p_tolerance, 0.00005)
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
  uuid, uuid, double precision, double precision, double precision, double precision, int, double precision
) to authenticated;
