'use client'

import * as React from 'react'
import { useToast } from '@/hooks/use-toast'
import {
  generateBaselineReportHtml,
  type BaselineExportData,
  type MapImage,
} from '@/lib/export/baseline-report-exporter'
import {
  exportDeskAssessmentPdf,
  exportDeskAssessmentDocx,
} from '@/lib/export/desk-assessment-exporter'
import { getAllScreenshots } from '@/lib/map-screenshots/storage'
import { fetchImageAsBase64 } from '@/lib/export/image-utils'
import type { Project, DeskResearchFinding } from '@/types/database'
import type { HabitatRow } from '@/components/steps/desk-assessment/baseline-report-tab'

interface UseDeskExportOptions {
  project: Project
  savedFindings: DeskResearchFinding[]
  habitatRows: HabitatRow[]
  aiInsights: string | null
}

export function useDeskExport({
  project,
  savedFindings,
  habitatRows,
  aiInsights,
}: UseDeskExportOptions) {
  const { toast } = useToast()
  const [isExporting, setIsExporting] = React.useState(false)

  const collectExportData = React.useCallback(async (): Promise<BaselineExportData> => {
    // Dedupe findings before mapping. The DB can hold multiple rows for the same
    // logical entity (e.g. duplicated saves, multi-report linkage) which would
    // otherwise produce identical rows in the export tables.
    const dedupedFindings = dedupeFindings(savedFindings)

    const designatedSiteMap = new Map<string, ReturnType<typeof mapDesignatedSite>>()
    for (const f of dedupedFindings.filter((x) => x.data_type === 'designated_site')) {
      const row = mapDesignatedSite(f)
      const key = row.code || row.name
      if (!designatedSiteMap.has(key)) designatedSiteMap.set(key, row)
    }
    const designatedSites = Array.from(designatedSiteMap.values())

    const speciesMap = new Map<string, ReturnType<typeof mapSpecies>>()
    for (const f of dedupedFindings.filter((x) => x.data_type === 'species_record')) {
      const row = mapSpecies(f)
      const raw = f.raw_data as Record<string, unknown> | null
      const scientific = (raw?.scientificName as string) || row.name
      const key = `${scientific}__${row.source}`
      if (!speciesMap.has(key)) speciesMap.set(key, row)
    }
    const speciesRecords = Array.from(speciesMap.values())

    const waterBodyMap = new Map<string, ReturnType<typeof mapWaterBody>>()
    for (const f of dedupedFindings.filter(
      (x) => x.data_type === 'water_quality' || x.data_type === 'catchment'
    )) {
      const row = mapWaterBody(f)
      const raw = f.raw_data as Record<string, unknown> | null
      const code =
        (raw?.waterBodyCode as string) ||
        (raw?.RiverCode as string) ||
        (raw?.LakeCode as string) ||
        (raw?.CatchmentId as string) ||
        row.name
      if (!waterBodyMap.has(code)) waterBodyMap.set(code, row)
    }
    const waterBodies = Array.from(waterBodyMap.values())

    const constraints = buildConstraints(dedupedFindings)

    let mapImages: MapImage[] = []
    try {
      const screenshots = await getAllScreenshots(project.id)
      const results = await Promise.all(
        screenshots.map(async (ss) => {
          if (!ss.url) return null
          const img = await fetchImageAsBase64(ss.url)
          if (!img) return null
          return {
            stepName: ss.stepName,
            label: ss.label,
            dataUrl: `data:image/jpeg;base64,${img.base64}`,
          }
        })
      )
      mapImages = results.filter((r): r is MapImage => r !== null)
    } catch {
      // Screenshots non-critical
    }

    return {
      projectName: project.name,
      siteCode: project.site_code || project.id.slice(0, 8),
      date: new Date().toLocaleDateString('en-IE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      designatedSites,
      speciesRecords,
      habitatTypes: habitatRows.map((h) => ({
        fossittCode: h.fossittCode,
        name: h.fossittName,
        nlcLabel: h.nlcLabel,
        areaHa: h.areaHa,
        percentage: h.percentage,
      })),
      waterBodies,
      constraints,
      mapImages,
      aiInsights: aiInsights ?? undefined,
    }
  }, [savedFindings, project, habitatRows, aiInsights])

  const handleExport = React.useCallback(
    async (format: 'html' | 'pdf' | 'docx') => {
      setIsExporting(true)
      try {
        const data = await collectExportData()
        if (format === 'html') {
          const html = generateBaselineReportHtml(data)
          const blob = new Blob([html], { type: 'text/html' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${(project.site_code || project.name).replace(/\s+/g, '_')}_desk_assessment.html`
          a.click()
          URL.revokeObjectURL(url)
        } else if (format === 'pdf') {
          exportDeskAssessmentPdf(data)
        } else {
          await exportDeskAssessmentDocx(data)
        }
        toast({ title: `Exported as ${format.toUpperCase()}` })
      } catch {
        toast({ variant: 'destructive', title: 'Export failed' })
      } finally {
        setIsExporting(false)
      }
    },
    [collectExportData, project, toast]
  )

  return { isExporting, handleExport }
}

// ── Mappers (extracted so dedupe + mapping share one definition) ──

function mapDesignatedSite(f: DeskResearchFinding) {
  const raw = f.raw_data as Record<string, unknown> | null
  // NPWS findings store the code under several possible keys depending on source
  const code =
    (raw?.SITE_CODE as string) || (raw?.siteCode as string) || (raw?.SITECODE as string) || ''
  const type =
    (raw?.DESIGNATION as string) || (raw?.siteType as string) || (raw?.SITE_TYPE as string) || ''
  const areaHa = raw?.AREA_HA ?? raw?.areaHa
  const area = typeof areaHa === 'number' ? `${areaHa.toFixed(0)} ha` : ''
  return {
    name: f.title,
    code,
    type,
    area,
    distance: f.distance_from_boundary_km != null ? f.distance_from_boundary_km.toFixed(1) : '—',
  }
}

function mapSpecies(f: DeskResearchFinding) {
  const raw = f.raw_data as Record<string, unknown> | null
  const metadata = raw?.metadata as Record<string, unknown> | null
  return {
    name: f.title,
    taxon: (metadata?.taxonGroup as string) || (raw?.taxonGroup as string) || 'Unknown',
    source: f.source,
    protected: f.is_protected || (metadata?.isProtected as boolean) || false,
    records: (metadata?.recordCount as number) || (raw?.recordCount as number) || 1,
  }
}

function mapWaterBody(f: DeskResearchFinding) {
  const raw = f.raw_data as Record<string, unknown> | null
  const metadata = raw?.metadata as Record<string, unknown> | null
  const siteType = (metadata?.siteType as string) || (raw?.waterBodyType as string) || ''
  let type = 'River'
  if (siteType.toLowerCase().includes('lake')) type = 'Lake'
  else if (siteType.toLowerCase().includes('transitional')) type = 'Transitional'
  else if (f.data_type === 'catchment') type = 'Catchment'
  return {
    name: f.title,
    type,
    wfdStatus: (raw?.WFD_Status as string) || (raw?.wfdStatus as string) || '—',
    distance: f.distance_from_boundary_km != null ? f.distance_from_boundary_km.toFixed(1) : '—',
  }
}

// ── Finding deduplication ──

/**
 * Remove duplicate findings that share the same logical identity. The DB can
 * hold multiple rows for the same entity (duplicated saves, multi-report links,
 * legacy rows), and surfacing all of them in the export produces 2x/3x repeated
 * tables. We keep the first occurrence per (data_type, identity key).
 */
function dedupeFindings(findings: DeskResearchFinding[]): DeskResearchFinding[] {
  const seen = new Set<string>()
  const out: DeskResearchFinding[] = []
  for (const f of findings) {
    const raw = f.raw_data as Record<string, unknown> | null
    let identity = ''
    switch (f.data_type) {
      case 'designated_site':
        identity =
          (raw?.SITE_CODE as string) ||
          (raw?.siteCode as string) ||
          (raw?.SITECODE as string) ||
          f.title
        break
      case 'species_record':
        identity =
          (raw?.scientificName as string) ||
          ((raw?.metadata as Record<string, unknown> | null)?.scientificName as string) ||
          f.title
        identity = `${identity}__${f.source}`
        break
      case 'water_quality':
      case 'catchment':
        identity =
          (raw?.waterBodyCode as string) ||
          (raw?.RiverCode as string) ||
          (raw?.LakeCode as string) ||
          (raw?.CatchmentId as string) ||
          f.title
        break
      case 'habitat':
        identity = (raw?.fossittCode as string) || (raw?.nlcLabel as string) || f.title
        break
      case 'company_report':
        identity = (raw?.fileName as string) || f.title
        break
      default:
        identity = f.id
    }
    const key = `${f.data_type}::${identity}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(f)
  }
  return out
}

// ── Constraint builder ──

function buildConstraints(savedFindings: DeskResearchFinding[]): BaselineExportData['constraints'] {
  const constraints: BaselineExportData['constraints'] = []

  for (const f of savedFindings) {
    const raw = f.raw_data as Record<string, unknown> | null
    const metadata = raw?.metadata as Record<string, unknown> | null

    if (f.data_type === 'designated_site') {
      const distance = f.distance_from_boundary_km ?? (metadata?.distance as number) ?? null
      if (distance != null && distance <= 2) {
        constraints.push({
          finding: f.title,
          type: 'Designated Site',
          source: f.source,
          constraint: `Within ${distance.toFixed(1)} km of site boundary`,
        })
      } else if (distance == null || distance === 0) {
        constraints.push({
          finding: f.title,
          type: 'Designated Site',
          source: f.source,
          constraint: 'Overlaps or adjacent to site boundary',
        })
      }
    }
    if (f.data_type === 'species_record' && (f.is_protected || metadata?.isProtected)) {
      constraints.push({
        finding: f.title,
        type: 'Species Record',
        source: f.source,
        constraint: 'Protected species — Wildlife Acts / Habitats Directive',
      })
    }
    if (f.data_type === 'species_record' && metadata?.isInvasive) {
      constraints.push({
        finding: f.title,
        type: 'Species Record',
        source: f.source,
        constraint: 'Invasive species — management measures required',
      })
    }
    if (f.data_type === 'water_quality') {
      const wfdStatus = (raw?.WFD_Status as string) || ''
      if (['Poor', 'Bad', 'Moderate'].includes(wfdStatus)) {
        constraints.push({
          finding: f.title,
          type: 'Water Quality',
          source: f.source,
          constraint: `WFD Status: ${wfdStatus} — water quality constraint`,
        })
      }
    }
  }

  return constraints
}
