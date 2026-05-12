// Section formatters for the AI report context. Each fn pushes a markdown
// block onto the running `parts` array — keeps the orchestrator
// (`context-builder.ts`) flat and readable. Same output as the original
// monolithic buildReportContext, just split by data category.
//
// The two largest blocks (findings + data-sources) live in their own files:
//   - `format-findings.ts`
//   - `format-data-sources.ts`
// Re-exported from here so callers see a single import surface.

import type {
  AquaticResearchData,
  DeepResearchData,
  HabitatData,
  ObservationData,
  ProjectData,
  ReleveData,
  ReleveSpeciesData,
  SiteContext,
  SurveyData,
  TargetNoteData,
} from './types'

export { formatFindings } from './format-findings'
export { formatDataSources } from './format-data-sources'

interface ProjectAreaInfo {
  boundaryAreaHa?: number
  studyAreaHa?: number
  bufferRadiusKm?: number
}

export function formatProjectInfo(
  parts: string[],
  project: ProjectData,
  siteContext: SiteContext | null | undefined,
  areaInfo?: ProjectAreaInfo
): void {
  const p = project
  const sc = siteContext
  parts.push('# PROJECT INFORMATION')
  parts.push(`Project Name: ${p.name}`)
  if (sc) {
    parts.push(`Site Scope: ${sc.siteCode}${sc.siteName ? ` (${sc.siteName})` : ''}`)
    parts.push(
      'NOTE: Data below is filtered to this site only. Other sites in the project are excluded.'
    )
    if (sc.county) parts.push(`County: ${sc.county}`)
    else if (p.county) parts.push(`County: ${p.county}`)
    if (sc.townland) parts.push(`Townland: ${sc.townland}`)
    else if (p.townland) parts.push(`Townland: ${p.townland}`)
    if (sc.province) parts.push(`Province: ${sc.province}`)
    else if (p.province) parts.push(`Province: ${p.province}`)
  } else {
    if (p.site_code) parts.push(`Site Code: ${p.site_code}`)
    if (p.grid_reference) parts.push(`Grid Reference: ${p.grid_reference}`)
    if (p.county) parts.push(`County: ${p.county}`)
    if (p.townland) parts.push(`Townland: ${p.townland}`)
    if (p.province) parts.push(`Province: ${p.province}`)
  }

  // Project boundary + study area block — explicit so the AI uses the right
  // number for "site area" and never inflates the figure with the sum of
  // habitat polygon areas (which can exceed the study area when polygons
  // extend beyond the buffer or overlap).
  if (areaInfo?.boundaryAreaHa != null || areaInfo?.studyAreaHa != null) {
    parts.push('')
    parts.push('## Project Area')
    if (areaInfo.boundaryAreaHa != null) {
      parts.push(
        `Site boundary area: ${areaInfo.boundaryAreaHa.toFixed(2)} ha (the actual development footprint — use this number whenever the text refers to "the site")`
      )
    }
    if (areaInfo.studyAreaHa != null && areaInfo.bufferRadiusKm != null) {
      parts.push(
        `Study area (boundary + ${areaInfo.bufferRadiusKm} km buffer): ${areaInfo.studyAreaHa.toFixed(2)} ha (the desktop assessment extent — habitat polygons and findings within this area inform the screening)`
      )
    }
    parts.push(
      'IMPORTANT: Do NOT use the sum of habitat polygon areas as the "site area" or "site size". Habitat polygons can extend beyond the study area and may overlap; their combined extent does not equal site area.'
    )
  }

  parts.push('')
}

export function formatSurveys(parts: string[], surveys: SurveyData[]): void {
  parts.push('# FIELD SURVEYS')
  if (surveys.length === 0) {
    parts.push('No field surveys recorded.')
    parts.push('')
    return
  }
  parts.push(`Total surveys: ${surveys.length}`)
  for (const s of surveys) {
    const weather = s.weather as Record<string, unknown> | null
    parts.push(`- ${s.survey_type} survey on ${s.survey_date} (${s.status})`)
    if (s.start_time && s.end_time) parts.push(`  Time: ${s.start_time} to ${s.end_time}`)
    if (weather) {
      const weatherParts: string[] = []
      const temp = weather.temperature ?? weather.temperature_c
      const wind = weather.windSpeed ?? weather.wind_speed_kmh
      const cloud = weather.cloudCover ?? weather.cloud_cover_pct
      if (temp != null) weatherParts.push(`${temp}°C`)
      if (wind != null) weatherParts.push(`wind ${wind} km/h`)
      if (cloud != null) weatherParts.push(`cloud ${cloud}%`)
      if (weather.precipitation) weatherParts.push(`${weather.precipitation}`)
      if (weatherParts.length > 0) parts.push(`  Weather: ${weatherParts.join(', ')}`)

      const templateFields = weather.templateFields as Record<string, unknown> | undefined
      if (templateFields && typeof templateFields === 'object') {
        const fieldParts = Object.entries(templateFields)
          .filter(([, v]) => v != null && v !== '' && v !== false)
          .map(([k, v]) => {
            const label = k
              .replace(/_/g, ' ')
              .replace(/([a-z])([A-Z])/g, '$1 $2')
              .replace(/^\w/, (c) => c.toUpperCase())
            return `${label}: ${Array.isArray(v) ? v.join(', ') : v}`
          })
        if (fieldParts.length > 0) parts.push(`  Survey data: ${fieldParts.join('; ')}`)
      }
    }
    if (s.notes) parts.push(`  Notes: ${s.notes}`)
  }
  parts.push('')
}

export function formatHabitats(parts: string[], habitats: HabitatData[]): void {
  parts.push('# HABITATS')
  if (habitats.length === 0) {
    parts.push('No habitat polygons mapped.')
    parts.push('')
    return
  }
  const totalArea = habitats.reduce((sum, h) => sum + (h.area_hectares || 0), 0)
  parts.push(`Total habitat polygons: ${habitats.length}`)
  parts.push(
    `Sum of habitat polygon areas: ${totalArea.toFixed(2)} ha (the combined extent of every mapped polygon across the study area; this is NOT the site area, NOT the buffer area, and may exceed both when polygons span or overlap their boundaries)`
  )
  parts.push('')
  for (const h of habitats) {
    parts.push(`## ${h.fossitt_code} — ${h.fossitt_name}`)
    if (h.area_hectares) parts.push(`Area: ${h.area_hectares.toFixed(2)} ha`)
    if (h.condition) parts.push(`Condition: ${h.condition}`)
    if (h.eu_annex_code) parts.push(`EU Annex I: ${h.eu_annex_code}`)
    if (h.evaluation) parts.push(`Evaluation: ${h.evaluation}`)
    if (h.threats) parts.push(`Threats: ${h.threats}`)
    if (h.listed_species) parts.push(`Listed species: ${h.listed_species}`)
    if (h.notes) parts.push(`Notes: ${h.notes}`)
    parts.push('')
  }
  parts.push('')
}

export function formatObservations(parts: string[], observations: ObservationData[]): void {
  parts.push('# SPECIES OBSERVATIONS')
  if (observations.length === 0) {
    parts.push('No species observations recorded.')
    parts.push('')
    return
  }
  const protectedObs = observations.filter((o) => o.is_protected)
  parts.push(`Total observations: ${observations.length}`)
  parts.push(`Protected species: ${protectedObs.length}`)

  const byTaxon: Record<string, ObservationData[]> = {}
  for (const obs of observations) {
    const group = obs.taxon_group || 'Unknown'
    if (!byTaxon[group]) byTaxon[group] = []
    byTaxon[group].push(obs)
  }

  for (const [taxon, obs] of Object.entries(byTaxon)) {
    parts.push(`\n## ${taxon} (${obs.length} records)`)
    for (const o of obs) {
      const details: string[] = []
      if (o.species_name_common) details.push(o.species_name_common)
      if (o.count != null) details.push(`count: ${o.count}`)
      if (o.abundance_dafor) details.push(`DAFOR: ${o.abundance_dafor}`)
      if (o.evidence_type) details.push(`evidence: ${o.evidence_type}`)
      if (o.is_protected) details.push('PROTECTED')
      if (o.confidence_level) details.push(`confidence: ${o.confidence_level}`)
      parts.push(
        `- ${o.species_name_scientific}${details.length > 0 ? ` (${details.join(', ')})` : ''}`
      )
      if (o.behavior_notes) parts.push(`  Behaviour: ${o.behavior_notes}`)
    }
  }
  parts.push('')
}

export function formatReleves(
  parts: string[],
  releves: ReleveData[],
  releveSpecies: ReleveSpeciesData[]
): void {
  if (releves.length === 0) return
  parts.push('# RELEVÉ VEGETATION SURVEYS')
  parts.push(`Total relevés: ${releves.length}`)
  for (const r of releves) {
    parts.push(`\n## Relevé ${r.releve_code}${r.habitat_type ? ` — ${r.habitat_type}` : ''}`)

    const metaParts: string[] = []
    if (r.survey_date) metaParts.push(`Date: ${r.survey_date}`)
    if (r.recorder) metaParts.push(`Recorder: ${r.recorder}`)
    if (r.releve_area_sqm != null) metaParts.push(`Area: ${r.releve_area_sqm} sqm`)
    if (r.survey_x_coord != null && r.survey_y_coord != null) {
      metaParts.push(`GPS: ${r.survey_y_coord.toFixed(5)}, ${r.survey_x_coord.toFixed(5)}`)
    }
    if (r.accuracy_m != null) metaParts.push(`GPS accuracy: ±${r.accuracy_m}m`)
    if (metaParts.length > 0) parts.push(metaParts.join(' | '))

    const siteParts: string[] = []
    if (r.soil_type) siteParts.push(`Soil: ${r.soil_type}`)
    if (r.soil_stability) siteParts.push(`Stability: ${r.soil_stability}`)
    if (r.slope_degrees != null) siteParts.push(`Slope: ${r.slope_degrees}°`)
    if (r.aspect) siteParts.push(`Aspect: ${r.aspect}`)
    if (siteParts.length > 0) parts.push(siteParts.join(' | '))

    const coverParts: string[] = []
    if (r.total_vegetation_cover_pct != null)
      coverParts.push(`Total vegetation: ${r.total_vegetation_cover_pct}%`)
    if (r.cover_graminea_pct != null) coverParts.push(`Graminea: ${r.cover_graminea_pct}%`)
    if (r.cover_forbs_pct != null) coverParts.push(`Forbs: ${r.cover_forbs_pct}%`)
    if (r.cover_mosses_liverworts_pct != null)
      coverParts.push(`Mosses: ${r.cover_mosses_liverworts_pct}%`)
    if (r.cover_trees_pct != null) coverParts.push(`Trees: ${r.cover_trees_pct}%`)
    if (r.cover_shrubs_pct != null) coverParts.push(`Shrubs: ${r.cover_shrubs_pct}%`)
    if (r.cover_bare_soil_pct != null) coverParts.push(`Bare soil: ${r.cover_bare_soil_pct}%`)
    if (r.cover_bare_rock_pct != null) coverParts.push(`Bare rock: ${r.cover_bare_rock_pct}%`)
    if (r.cover_litter_pct != null) coverParts.push(`Litter: ${r.cover_litter_pct}%`)
    if (r.cover_open_water_pct != null) coverParts.push(`Open water: ${r.cover_open_water_pct}%`)
    if (coverParts.length > 0) parts.push(`Cover: ${coverParts.join(', ')}`)

    const maxHeightParts: string[] = []
    if (r.max_height_trees_m != null) maxHeightParts.push(`Trees: ${r.max_height_trees_m}m`)
    if (r.max_height_shrubs_cm != null) maxHeightParts.push(`Shrubs: ${r.max_height_shrubs_cm}cm`)
    if (r.max_height_bryophytes_cm != null)
      maxHeightParts.push(`Bryophytes: ${r.max_height_bryophytes_cm}cm`)
    if (r.max_height_graminea_cm != null)
      maxHeightParts.push(`Graminea: ${r.max_height_graminea_cm}cm`)
    if (r.max_height_forbs_cm != null) maxHeightParts.push(`Forbs: ${r.max_height_forbs_cm}cm`)
    if (maxHeightParts.length > 0) parts.push(`Max heights: ${maxHeightParts.join(', ')}`)

    const medianHeightParts: string[] = []
    if (r.median_height_graminea_cm != null)
      medianHeightParts.push(`Graminea: ${r.median_height_graminea_cm}cm`)
    if (r.median_height_forbs_cm != null)
      medianHeightParts.push(`Forbs: ${r.median_height_forbs_cm}cm`)
    if (medianHeightParts.length > 0) parts.push(`Median heights: ${medianHeightParts.join(', ')}`)

    if (r.other_species_proximity)
      parts.push(`Other species in proximity: ${r.other_species_proximity}`)
    if (r.fauna_observations) parts.push(`Fauna observations: ${r.fauna_observations}`)
    if (r.releve_comment) parts.push(`Relevé comment: ${r.releve_comment}`)

    const species = releveSpecies.filter((s) => s.releve_id === r.id)
    if (species.length > 0) {
      parts.push(`Species (${species.length} recorded):`)
      for (const sp of species) {
        const spParts: string[] = []
        if (sp.species_name_english) spParts.push(sp.species_name_english)
        if (sp.species_cover_domin != null) spParts.push(`DOMIN ${sp.species_cover_domin}`)
        if (sp.species_cover_pct != null) spParts.push(`${sp.species_cover_pct}%`)
        parts.push(
          `- ${sp.species_name_latin}${spParts.length > 0 ? ` (${spParts.join(', ')})` : ''}`
        )
      }
    }
  }
  parts.push('')
}

export function formatTargetNotes(parts: string[], targetNotes: TargetNoteData[]): void {
  parts.push('# TARGET NOTES')
  if (targetNotes.length === 0) {
    parts.push('No target notes recorded.')
    parts.push('')
    return
  }
  parts.push(`Total: ${targetNotes.length}`)
  for (const tn of targetNotes) {
    parts.push(
      `- [${tn.category}] ${tn.title}${tn.priority ? ` (Priority: ${tn.priority})` : ''}${tn.is_verified ? ' [Verified]' : ''}`
    )
    if (tn.description) parts.push(`  ${tn.description}`)
  }
  parts.push('')
}

export function formatDeepResearch(parts: string[], deepResearch: DeepResearchData[]): void {
  if (deepResearch.length === 0) return
  parts.push('# DEEP RESEARCH — DESIGNATED SITES')
  for (const dr of deepResearch) {
    parts.push(`\n## ${dr.site_name} (${dr.site_code}) — ${dr.site_type}`)
    const habitats = dr.habitats as Array<{
      habitatCode: string
      habitatName: string
      status?: string
    }> | null
    if (habitats && Array.isArray(habitats) && habitats.length > 0) {
      parts.push('Qualifying Interest Habitats:')
      for (const h of habitats.slice(0, 8)) {
        parts.push(`  - [${h.habitatCode}] ${h.habitatName}${h.status ? ` (${h.status})` : ''}`)
      }
    }
    const cs = dr.conservation_summary as Record<string, number> | null
    if (cs && cs.total) {
      parts.push(
        `Conservation: ${cs.favourable || 0} favourable, ${cs.unfavourableInadequate || 0} inadequate, ${cs.unfavourableBad || 0} bad`
      )
    }
    const tp = dr.threats_pressures as { pressures?: string[]; threats?: string[] } | null
    if (tp) {
      if (tp.pressures?.length) parts.push(`Pressures: ${tp.pressures.join(', ')}`)
      if (tp.threats?.length) parts.push(`Threats: ${tp.threats.join(', ')}`)
    }
    if (dr.ai_analysis) parts.push(`AI Analysis: ${dr.ai_analysis.substring(0, 600)}`)
  }
  parts.push('')
}

export function formatAquaticResearch(
  parts: string[],
  aquaticResearch: AquaticResearchData[]
): void {
  if (aquaticResearch.length === 0) return
  parts.push('# AQUATIC RESEARCH')
  for (const ar of aquaticResearch) {
    parts.push(`\n## ${ar.water_body_name} (${ar.water_body_code}) — ${ar.water_body_type}`)
    if (ar.current_status) parts.push(`WFD Status: ${ar.current_status}`)
    if (ar.risk_level) parts.push(`Risk: ${ar.risk_level}`)

    const trends = ar.trends as Array<{
      ParameterName: string
      TrendDesc: string
    }> | null
    if (trends && Array.isArray(trends) && trends.length > 0) {
      parts.push('Trends:')
      for (const t of trends.slice(0, 5)) {
        parts.push(`  - ${t.ParameterName}: ${t.TrendDesc}`)
      }
    }

    const failures = ar.failures as Array<{ Name: string }> | null
    if (failures && Array.isArray(failures) && failures.length > 0) {
      parts.push(`Failures: ${failures.map((f) => f.Name).join(', ')}`)
    }

    if (ar.linked_sac_name) {
      parts.push(`Linked SAC: ${ar.linked_sac_name} (${ar.linked_sac_code})`)
    }
    if (ar.ai_analysis) parts.push(`AI Analysis: ${ar.ai_analysis.substring(0, 400)}`)
  }
  parts.push('')
}

export function formatDeskInsights(parts: string[], deskInsights: string | undefined): void {
  if (!deskInsights) return
  parts.push('# DESK ASSESSMENT AI INSIGHTS (from Step 3)')
  parts.push(deskInsights)
  parts.push('')
}
