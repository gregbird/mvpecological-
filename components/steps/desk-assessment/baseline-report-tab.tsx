'use client'

import * as React from 'react'
import { Download, Loader2, Undo2, EyeOff, ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useFindings, useToggleFindingSaved } from '@/hooks/queries/use-finding-hooks'
import {
  useProjectDeepResearch,
  useProjectAquaticResearch,
} from '@/hooks/queries/use-deep-research-hooks'
import { DesignatedSitesMatrix } from './designated-sites-matrix'
import { SpeciesRecordsSection } from './species-records-section'
import { HabitatInventorySection } from './habitat-inventory-section'
import { AquaticEnvironmentSection } from './aquatic-environment-section'
import { ConstraintsSummarySection } from './constraints-summary-section'
import {
  generateBaselineReportHtml,
  type BaselineExportData,
  type MapImage,
} from '@/lib/export/baseline-report-exporter'
import { getAllScreenshots } from '@/lib/map-screenshots/storage'
import { fetchImageAsBase64 } from '@/lib/export/image-utils'
import { useProjectBoundary } from '@/hooks/shared/use-project-boundary'
import { useProjectSites } from '@/hooks/queries/use-site-hooks'
import type { DeskResearchFinding, Project } from '@/types/database'

export interface HabitatRow {
  fossittCode: string
  fossittName: string
  nlcLabel: string
  areaHa: number
  percentage: number
}

interface BaselineReportTabProps {
  savedFindings: DeskResearchFinding[]
  project: Project
  /** Lift habitat data to parent for combined export */
  onHabitatData?: (rows: HabitatRow[]) => void
  /** Hide the internal export button (parent handles export) */
  hideExport?: boolean
  /** Active site for multi-site projects (null = "All Sites") */
  siteId?: string | null
}

export function BaselineReportTab({
  savedFindings,
  project,
  onHabitatData: onHabitatDataParent,
  hideExport,
  siteId,
}: BaselineReportTabProps) {
  const { toast } = useToast()
  const { data: deepResearch = [], isLoading: isLoadingDeep } = useProjectDeepResearch(project.id)
  const { data: aquaticResearch = [], isLoading: isLoadingAquatic } = useProjectAquaticResearch(
    project.id
  )
  // Filter unsaved findings to current site so the "show all findings" toggle stays site-aware
  const { data: allFindings = [] } = useFindings(project.id, siteId)
  const toggleSaved = useToggleFindingSaved()

  const { data: projectSites = [] } = useProjectSites(project.id)
  const selectedSite = React.useMemo(
    () => (siteId ? (projectSites.find((s) => s.id === siteId) ?? null) : null),
    [siteId, projectSites]
  )
  const {
    projectBoundary: boundary,
    otherBoundaries,
    allBoundaries,
  } = useProjectBoundary(project, selectedSite)

  // Lifted habitat state from HabitatInventorySection for use in export
  const [habitatRows, setHabitatRows] = React.useState<HabitatRow[]>([])

  // Notify parent when habitat data changes
  const handleHabitatData = React.useCallback(
    (rows: HabitatRow[]) => {
      setHabitatRows(rows)
      onHabitatDataParent?.(rows)
    },
    [onHabitatDataParent]
  )
  const [showExcluded, setShowExcluded] = React.useState(false)

  const excludedFindings = React.useMemo(
    () => allFindings.filter((f) => !f.is_saved),
    [allFindings]
  )

  const handleRemoveFinding = React.useCallback(
    async (findingId: string) => {
      try {
        await toggleSaved.mutateAsync({ findingId, isSaved: false })
        toast({ title: 'Finding excluded' })
      } catch {
        toast({ variant: 'destructive', title: 'Failed to exclude finding' })
      }
    },
    [toggleSaved, toast]
  )

  const handleRestoreFinding = React.useCallback(
    async (findingId: string) => {
      try {
        await toggleSaved.mutateAsync({ findingId, isSaved: true })
        toast({ title: 'Finding restored' })
      } catch {
        toast({ variant: 'destructive', title: 'Failed to restore finding' })
      }
    },
    [toggleSaved, toast]
  )

  const [isExporting, setIsExporting] = React.useState(false)

  const handleExport = React.useCallback(async () => {
    setIsExporting(true)
    try {
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

      // Use same logic as extractConstraints() in constraints-summary-section
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

      // Fetch map screenshots and convert to base64 for embedding
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
        // Screenshots are non-critical — export tables even if images fail
      }

      const data: BaselineExportData = {
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
      }

      const html = generateBaselineReportHtml(data)
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(project.site_code || project.name).replace(/\s+/g, '_')}_baseline_report.html`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setIsExporting(false)
    }
  }, [savedFindings, project, habitatRows])

  if (isLoadingDeep || isLoadingAquatic) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 p-6">
      {/* Excluded Findings Panel */}
      {showExcluded && excludedFindings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h4 className="mb-3 text-sm font-semibold text-amber-800">
            Excluded Findings — click Restore to add back
          </h4>
          <div className="space-y-2">
            {excludedFindings.map((f) => (
              <div
                key={f.id}
                className="bg-card flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div className="mr-3 min-w-0 flex-1">
                  <span className="text-sm font-medium">{f.title}</span>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {f.source.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="ml-1 text-xs">
                    {f.data_type.replace('_', ' ')}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-emerald-700 hover:text-emerald-800"
                  onClick={() => handleRestoreFinding(f.id)}
                >
                  <Undo2 className="mr-1 h-4 w-4" />
                  Restore
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 1: Designated Sites Matrix */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <h3 className="text-lg font-semibold">1. Designated Sites</h3>
          <div className="ml-auto flex items-center gap-2">
            {excludedFindings.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExcluded(!showExcluded)}
                className="text-amber-700"
              >
                <EyeOff className="mr-2 h-4 w-4" />
                Excluded ({excludedFindings.length})
                <ChevronDown
                  className={cn('ml-1 h-3 w-3 transition-transform', showExcluded && 'rotate-180')}
                />
              </Button>
            )}
            {!hideExport && (
              <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
                {isExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {isExporting ? 'Exporting...' : 'Export HTML'}
              </Button>
            )}
          </div>
        </div>
        <DesignatedSitesMatrix
          findings={savedFindings}
          deepResearch={deepResearch}
          boundary={boundary}
          otherBoundaries={otherBoundaries}
          allBoundaries={allBoundaries}
          onRemoveFinding={handleRemoveFinding}
        />
      </section>

      {/* Section 2: Species Records */}
      <section>
        <h3 className="mb-4 text-lg font-semibold">2. Species Records</h3>
        <SpeciesRecordsSection
          findings={savedFindings}
          boundary={boundary}
          otherBoundaries={otherBoundaries}
          allBoundaries={allBoundaries}
          onRemoveFinding={handleRemoveFinding}
        />
      </section>

      {/* Section 3: Preliminary Habitat Inventory */}
      <section>
        <h3 className="mb-4 text-lg font-semibold">3. Preliminary Habitat Inventory</h3>
        <HabitatInventorySection
          findings={savedFindings}
          boundary={boundary}
          otherBoundaries={otherBoundaries}
          allBoundaries={allBoundaries}
          onHabitatData={handleHabitatData}
          onRemoveFinding={handleRemoveFinding}
          npwsVisibleLayers={
            Array.isArray(project.visible_layers)
              ? project.visible_layers.filter((v): v is string => typeof v === 'string')
              : undefined
          }
        />
      </section>

      {/* Section 4: Aquatic Environment */}
      <section>
        <h3 className="mb-4 text-lg font-semibold">4. Aquatic Environment</h3>
        <AquaticEnvironmentSection
          findings={savedFindings}
          aquaticResearch={aquaticResearch}
          boundary={boundary}
          otherBoundaries={otherBoundaries}
          allBoundaries={allBoundaries}
          onRemoveFinding={handleRemoveFinding}
        />
      </section>

      {/* Section 5: Constraints Summary */}
      <section>
        <h3 className="mb-4 text-lg font-semibold">5. Constraints Summary</h3>
        <ConstraintsSummarySection findings={savedFindings} />
      </section>
    </div>
  )
}
