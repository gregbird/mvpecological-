'use client'

import * as React from 'react'
import { Download, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
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
} from '@/lib/export/baseline-report-exporter'
import type { DeskResearchFinding, Project } from '@/types/database'

interface BaselineReportTabProps {
  savedFindings: DeskResearchFinding[]
  project: Project
}

export function BaselineReportTab({ savedFindings, project }: BaselineReportTabProps) {
  const { data: deepResearch = [], isLoading: isLoadingDeep } = useProjectDeepResearch(project.id)
  const { data: aquaticResearch = [], isLoading: isLoadingAquatic } = useProjectAquaticResearch(
    project.id
  )

  const boundary = project.boundary as GeoJSON.Feature<GeoJSON.Polygon> | undefined

  const handleExport = React.useCallback(() => {
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
          protected: f.is_protected || false,
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
        else if (f.data_type === 'catchment') type = 'Catchment'
        return {
          name: f.title,
          type,
          wfdStatus: (raw?.WFD_Status as string) || '—',
          distance: f.distance_from_boundary_km?.toFixed(1) ?? '—',
        }
      })

    const constraints = savedFindings
      .filter((f) => f.is_protected || f.relevance_level === 'high')
      .map((f) => ({
        finding: f.title,
        type: f.data_type.replace('_', ' '),
        source: f.source,
        constraint: f.is_protected ? 'Protected — further survey required' : 'High relevance',
      }))

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
      habitatTypes: [], // Populated from CORINE at render time; not available here
      waterBodies,
      constraints,
    }

    const html = generateBaselineReportHtml(data)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(project.site_code || project.name).replace(/\s+/g, '_')}_baseline_report.html`
    a.click()
    URL.revokeObjectURL(url)
  }, [savedFindings, project])

  if (isLoadingDeep || isLoadingAquatic) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export HTML
        </Button>
      </div>

      {/* Section 1: Designated Sites Matrix */}
      <section>
        <h3 className="mb-4 text-lg font-semibold">1. Designated Sites</h3>
        <DesignatedSitesMatrix findings={savedFindings} deepResearch={deepResearch} />
      </section>

      {/* Section 2: Species Records */}
      <section>
        <h3 className="mb-4 text-lg font-semibold">2. Species Records</h3>
        <SpeciesRecordsSection findings={savedFindings} boundary={boundary} />
      </section>

      {/* Section 3: Preliminary Habitat Inventory */}
      <section>
        <h3 className="mb-4 text-lg font-semibold">3. Preliminary Habitat Inventory</h3>
        <HabitatInventorySection project={project} />
      </section>

      {/* Section 4: Aquatic Environment */}
      <section>
        <h3 className="mb-4 text-lg font-semibold">4. Aquatic Environment</h3>
        <AquaticEnvironmentSection
          findings={savedFindings}
          aquaticResearch={aquaticResearch}
          boundary={boundary}
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
