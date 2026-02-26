/**
 * Report Template Renderer
 * Replaces {{placeholder}} variables in template sections with real project data.
 * Supports all report types (PEA, EcIA, AA Screening, NIS, Bat, Bird, Habitat, etc.)
 */

import { PEA_TEMPLATE_SECTIONS } from './pea-template'
import { DEFAULT_SECTIONS_BY_TYPE } from '@/lib/config/template-types'
import type { ReportSection } from '@/lib/supabase/queries/reports'
import type { TemplateSectionData } from '@/lib/supabase/queries/templates'
import type {
  Project,
  DeskResearchFinding,
  HabitatPolygon,
  SpeciesObservation,
  Survey,
} from '@/types/database'

export interface TemplateData {
  project: Project
  findings: DeskResearchFinding[]
  habitats: HabitatPolygon[]
  observations: SpeciesObservation[]
  surveys: Survey[]
}

/**
 * Render PEA template with full placeholder substitution.
 * PEA has the most detailed template with rich markdown content.
 */
export function renderPeaTemplate(data: TemplateData): ReportSection[] {
  const replacements = buildReplacements(data)

  return PEA_TEMPLATE_SECTIONS.map((tmpl) => {
    let content = tmpl.template
    for (const [key, value] of Object.entries(replacements)) {
      content = content.replaceAll(`{{${key}}}`, value)
    }
    return {
      id: tmpl.id,
      title: tmpl.title,
      content,
      isEdited: false,
      aiGenerated: false,
    }
  })
}

/**
 * Render any report type template with placeholder substitution.
 * Uses PEA's rich template for PEA type, DEFAULT_SECTIONS_BY_TYPE for others.
 * If customSections are provided (from org template), those are used instead.
 */
export function renderReportTemplate(
  reportType: string,
  data: TemplateData,
  customSections?: TemplateSectionData[]
): ReportSection[] {
  const replacements = buildReplacements(data)

  // If org has custom sections, use those
  if (customSections && customSections.length > 0) {
    return customSections.map((section) => {
      let content = section.template || ''
      for (const [key, value] of Object.entries(replacements)) {
        content = content.replaceAll(`{{${key}}}`, value)
      }
      return {
        id: section.id,
        title: section.title,
        content,
        isEdited: false,
        aiGenerated: false,
      }
    })
  }

  // PEA has its own detailed template with rich markdown
  if (reportType === 'pea') {
    return renderPeaTemplate(data)
  }

  // Other report types: use defaultTemplate from template-types.ts
  const sectionDefs = DEFAULT_SECTIONS_BY_TYPE[reportType]
  if (!sectionDefs) {
    // Unknown type — return empty sections
    return []
  }

  return sectionDefs.map((def) => {
    let content = def.defaultTemplate || ''
    for (const [key, value] of Object.entries(replacements)) {
      content = content.replaceAll(`{{${key}}}`, value)
    }
    return {
      id: def.id,
      title: def.title,
      content,
      isEdited: false,
      aiGenerated: false,
    }
  })
}

function buildReplacements(data: TemplateData): Record<string, string> {
  const { project } = data
  const locationParts: string[] = []
  if (project.townland) locationParts.push(project.townland)
  if (project.county) locationParts.push(`Co. ${project.county}`)
  if (project.province) locationParts.push(project.province)

  const locationStr =
    locationParts.length > 0 ? locationParts.join(', ') : '*[Location not available]*'

  return {
    project_name: project.name || '*[Project name]*',
    location_description: locationStr,
    site_location: locationStr,
    site_description: locationStr,
    site_code: project.site_code || '*[Not assigned]*',
    grid_reference: project.grid_reference || '*[Not available]*',
    survey_date: new Date().toLocaleDateString('en-IE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    desk_sources_summary: buildDeskSourcesSummary(data.findings),
    survey_details: buildSurveyDetails(data.surveys),
    designated_sites_table: buildDesignatedSitesTable(data.findings),
    habitat_table: buildHabitatTable(data.habitats),
    flora_summary: buildFloraSummary(data.observations),
    fauna_summary: buildFaunaSummary(data.observations),
    constraints_table: buildConstraintsTable(data),
  }
}

function buildDeskSourcesSummary(findings: DeskResearchFinding[]): string {
  if (findings.length === 0) {
    return '*[No desk study findings recorded. Complete Step 2 (Data Gathering) to populate this section.]*'
  }

  const bySource: Record<string, number> = {}
  for (const f of findings) {
    const src = (f.source || 'unknown').toUpperCase()
    bySource[src] = (bySource[src] || 0) + 1
  }

  const lines: string[] = []
  const sourceDescriptions: Record<string, string> = {
    NPWS: 'National Parks & Wildlife Service designated sites database',
    GBIF: 'Global Biodiversity Information Facility species occurrence records',
    NBDC: 'National Biodiversity Data Centre species records and distribution data',
    EPA: 'Environmental Protection Agency water quality and catchment data',
    CATCHMENTS: 'Catchments.ie Water Framework Directive status data',
    MANUAL: 'Manual data entry and additional sources',
  }

  for (const [src, count] of Object.entries(bySource)) {
    const desc = sourceDescriptions[src] || src
    lines.push(`- **${src}** — ${desc} (${count} record${count !== 1 ? 's' : ''} retrieved)`)
  }

  return lines.join('\n')
}

function buildSurveyDetails(surveys: Survey[]): string {
  if (surveys.length === 0) {
    return '*[No field surveys recorded. Complete Step 4 (Field Survey) to populate this section.]*'
  }

  const lines: string[] = []
  lines.push(
    `A total of **${surveys.length}** field survey${surveys.length !== 1 ? 's were' : ' was'} undertaken:\n`
  )

  for (const s of surveys) {
    const parts: string[] = []
    parts.push(`- **${formatSurveyType(s.survey_type)}** on ${formatDate(s.survey_date)}`)

    if (s.start_time && s.end_time) {
      parts.push(`  - Survey effort: ${s.start_time} to ${s.end_time}`)
    }

    const weather = s.weather as Record<string, unknown> | null
    if (weather) {
      const wp: string[] = []
      if (weather.temperature != null) wp.push(`${weather.temperature}°C`)
      if (weather.windSpeed != null) wp.push(`wind ${weather.windSpeed} km/h`)
      if (weather.cloudCover != null) wp.push(`cloud cover ${weather.cloudCover}%`)
      if (weather.precipitation) wp.push(`${weather.precipitation}`)
      if (wp.length > 0) {
        parts.push(`  - Weather conditions: ${wp.join(', ')}`)
      }
    }

    if (s.notes) {
      parts.push(`  - Notes: ${s.notes}`)
    }

    lines.push(parts.join('\n'))
  }

  return lines.join('\n')
}

function buildDesignatedSitesTable(findings: DeskResearchFinding[]): string {
  const sites = findings.filter((f) => f.data_type === 'designated_site')

  if (sites.length === 0) {
    return '*[No designated sites recorded. Complete Step 2 (Data Gathering) to populate this section.]*'
  }

  const lines: string[] = [
    '| Site Name | Designation | Site Code | Distance (km) |',
    '|-----------|------------|-----------|---------------|',
  ]

  for (const s of sites) {
    const raw = s.raw_data as Record<string, unknown> | null
    const designation = raw?.designation || raw?.DESIGNATION || s.source?.toUpperCase() || '—'
    const siteCode = raw?.siteCode || raw?.SITECODE || '—'
    const distance =
      s.distance_from_boundary_km != null ? s.distance_from_boundary_km.toFixed(2) : '—'
    lines.push(`| ${s.title} | ${designation} | ${siteCode} | ${distance} |`)
  }

  return lines.join('\n')
}

function buildHabitatTable(habitats: HabitatPolygon[]): string {
  if (habitats.length === 0) {
    return '*[No habitats mapped. Complete Step 5 (Habitat Mapping) to populate this section.]*'
  }

  const lines: string[] = [
    '| FOSSITT Code | Habitat Name | Area (ha) | Condition |',
    '|-------------|-------------|-----------|-----------|',
  ]

  for (const h of habitats) {
    const area = h.area_hectares != null ? h.area_hectares.toFixed(2) : '—'
    const condition = h.condition || '—'
    lines.push(`| ${h.fossitt_code} | ${h.fossitt_name} | ${area} | ${condition} |`)
  }

  const totalArea = habitats.reduce((sum, h) => sum + (h.area_hectares || 0), 0)
  if (totalArea > 0) {
    lines.push('')
    lines.push(`Total mapped area: **${totalArea.toFixed(2)} ha**`)
  }

  return lines.join('\n')
}

function buildFloraSummary(observations: SpeciesObservation[]): string {
  const flora = observations.filter(
    (o) => o.taxon_group?.toLowerCase() === 'plant' || o.taxon_group?.toLowerCase() === 'flora'
  )

  if (flora.length === 0) {
    return 'No flora species were specifically recorded during the field surveys. A full botanical survey may be required to characterise the site flora, particularly during the optimal survey season (April–September).'
  }

  const lines: string[] = []
  lines.push(
    `A total of **${flora.length}** flora species were recorded during the field surveys:\n`
  )

  const protectedFlora = flora.filter((o) => o.is_protected)
  if (protectedFlora.length > 0) {
    lines.push(`**Protected Species (Flora Protection Order 2022):**\n`)
    for (const o of protectedFlora) {
      const common = o.species_name_common ? ` (${o.species_name_common})` : ''
      const dafor = o.abundance_dafor ? `, DAFOR: ${o.abundance_dafor}` : ''
      lines.push(`- *${o.species_name_scientific}*${common}${dafor}`)
    }
    lines.push('')
  }

  const nonProtected = flora.filter((o) => !o.is_protected)
  if (nonProtected.length > 0) {
    lines.push('**Other Flora Recorded:**\n')
    for (const o of nonProtected) {
      const common = o.species_name_common ? ` (${o.species_name_common})` : ''
      const dafor = o.abundance_dafor ? `, DAFOR: ${o.abundance_dafor}` : ''
      lines.push(`- *${o.species_name_scientific}*${common}${dafor}`)
    }
  }

  // Invasive species note
  const invasive = observations.filter(
    (o) =>
      o.taxon_group?.toLowerCase() === 'invasive' ||
      o.taxon_group?.toLowerCase() === 'invasive species'
  )
  if (invasive.length > 0) {
    lines.push('\n**Invasive Species:**\n')
    lines.push(
      'The following invasive species listed under the Third Schedule of the European Communities (Birds and Natural Habitats) Regulations 2011 were recorded:\n'
    )
    for (const o of invasive) {
      const common = o.species_name_common ? ` (${o.species_name_common})` : ''
      lines.push(`- *${o.species_name_scientific}*${common}`)
    }
  } else {
    lines.push(
      '\nNo invasive species listed under the Third Schedule of the European Communities (Birds and Natural Habitats) Regulations 2011 were recorded during the survey. However, ongoing vigilance is recommended, particularly in disturbed or riparian habitats.'
    )
  }

  return lines.join('\n')
}

function buildFaunaSummary(observations: SpeciesObservation[]): string {
  const fauna = observations.filter(
    (o) =>
      o.taxon_group?.toLowerCase() !== 'plant' &&
      o.taxon_group?.toLowerCase() !== 'flora' &&
      o.taxon_group?.toLowerCase() !== 'invasive' &&
      o.taxon_group?.toLowerCase() !== 'invasive species'
  )

  if (fauna.length === 0) {
    return 'No fauna species were specifically recorded during the field surveys. Targeted fauna surveys (e.g., bat activity surveys, breeding bird surveys) may be required depending on the habitats present and the nature of the proposed development.'
  }

  const lines: string[] = []
  const protectedFauna = fauna.filter((o) => o.is_protected)
  lines.push(
    `A total of **${fauna.length}** fauna observation${fauna.length !== 1 ? 's were' : ' was'} recorded, of which **${protectedFauna.length}** relate to protected species.\n`
  )

  // Group by taxon
  const byTaxon: Record<string, SpeciesObservation[]> = {}
  for (const o of fauna) {
    const group = o.taxon_group || 'Other'
    if (!byTaxon[group]) byTaxon[group] = []
    byTaxon[group].push(o)
  }

  for (const [taxon, obs] of Object.entries(byTaxon)) {
    lines.push(`**${taxon}** (${obs.length} record${obs.length !== 1 ? 's' : ''}):\n`)
    for (const o of obs) {
      const parts: string[] = []
      const common = o.species_name_common ? ` (${o.species_name_common})` : ''
      parts.push(`- *${o.species_name_scientific}*${common}`)

      const details: string[] = []
      if (o.count != null) details.push(`count: ${o.count}`)
      if (o.abundance_dafor) details.push(`DAFOR: ${o.abundance_dafor}`)
      if (o.evidence_type) details.push(`evidence: ${o.evidence_type}`)
      if (o.is_protected) details.push('**PROTECTED**')
      if (details.length > 0) parts[0] += ` — ${details.join(', ')}`

      if (o.behavior_notes) {
        parts.push(`  - Behaviour: ${o.behavior_notes}`)
      }

      lines.push(parts.join('\n'))
    }
    lines.push('')
  }

  return lines.join('\n')
}

function buildConstraintsTable(data: TemplateData): string {
  const lines: string[] = [
    '| Ecological Receptor | Importance | Potential Impact | Recommended Action |',
    '|--------------------|-----------|-----------------|--------------------|',
  ]

  // Add designated sites as receptors
  const sites = data.findings.filter((f) => f.data_type === 'designated_site')
  for (const s of sites) {
    const raw = s.raw_data as Record<string, unknown> | null
    const designation = raw?.designation || s.source?.toUpperCase() || ''
    const importance = designation === 'SAC' || designation === 'SPA' ? 'International' : 'National'
    const distance =
      s.distance_from_boundary_km != null
        ? `${s.distance_from_boundary_km.toFixed(1)} km from site`
        : 'Distance unknown'
    lines.push(
      `| ${s.title} (${designation}) | ${importance} | ${distance} — assess connectivity | Avoid impacts; AA Screening if required |`
    )
  }

  // Add habitats as receptors
  for (const h of data.habitats) {
    const importance = h.eu_annex_code ? 'National/International' : 'Local'
    const annex = h.eu_annex_code ? ` (Annex I: ${h.eu_annex_code})` : ''
    lines.push(
      `| ${h.fossitt_code} ${h.fossitt_name}${annex} | ${importance} | Habitat loss/degradation | Minimise footprint; restore post-works |`
    )
  }

  // Add protected species as receptors
  const protectedObs = data.observations.filter((o) => o.is_protected)
  for (const o of protectedObs) {
    const common = o.species_name_common || o.species_name_scientific
    lines.push(
      `| ${common} (*${o.species_name_scientific}*) | County/National | Disturbance, habitat loss | Pre-construction survey; timing constraints |`
    )
  }

  if (sites.length === 0 && data.habitats.length === 0 && protectedObs.length === 0) {
    return '*[No constraints data available. Complete earlier workflow steps to populate this table.]*'
  }

  return lines.join('\n')
}

// --- Helpers ---

function formatSurveyType(type: string): string {
  const labels: Record<string, string> = {
    walkover: 'Walkover Survey',
    habitat: 'Habitat Survey',
    breeding_bird: 'Breeding Bird Survey',
    wintering_bird: 'Wintering Bird Survey',
    bat_activity: 'Bat Activity Survey',
    bat_roost: 'Bat Roost Inspection',
    mammal: 'Mammal Survey',
    amphibian_reptile: 'Amphibian & Reptile Survey',
    aquatic: 'Aquatic Survey',
    invertebrate: 'Invertebrate Survey',
    botanical: 'Botanical Survey',
    other: 'Other Survey',
  }
  return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-IE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}
