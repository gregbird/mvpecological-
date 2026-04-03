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
    const designatedSites = savedFindings
      .filter((f) => f.data_type === 'designated_site')
      .map((f) => {
        const raw = f.raw_data as Record<string, unknown> | null
        return {
          name: f.title,
          code: (raw?.SITE_CODE as string) || '',
          type: (raw?.DESIGNATION as string) || '',
          area: raw?.AREA_HA ? `${(raw.AREA_HA as number).toFixed(0)} ha` : '',
          distance: f.distance_from_boundary_km?.toFixed(1) ?? '—',
        }
      })

    const speciesRecords = savedFindings
      .filter((f) => f.data_type === 'species_record')
      .map((f) => {
        const raw = f.raw_data as Record<string, unknown> | null
        const metadata = raw?.metadata as Record<string, unknown> | null
        return {
          name: f.title,
          taxon: (metadata?.taxonGroup as string) || 'Unknown',
          source: f.source,
          protected: f.is_protected || (metadata?.isProtected as boolean) || false,
          records: (metadata?.recordCount as number) || 1,
        }
      })

    const waterBodies = savedFindings
      .filter((f) => f.data_type === 'water_quality' || f.data_type === 'catchment')
      .map((f) => {
        const raw = f.raw_data as Record<string, unknown> | null
        const metadata = raw?.metadata as Record<string, unknown> | null
        const siteType = (metadata?.siteType as string) || ''
        let type = 'River'
        if (siteType.toLowerCase().includes('lake')) type = 'Lake'
        else if (siteType.toLowerCase().includes('transitional')) type = 'Transitional'
        else if (f.data_type === 'catchment') type = 'Catchment'
        return {
          name: f.title,
          type,
          wfdStatus: (raw?.WFD_Status as string) || '—',
          distance: f.distance_from_boundary_km?.toFixed(1) ?? '—',
        }
      })

    const constraints = buildConstraints(savedFindings)

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
