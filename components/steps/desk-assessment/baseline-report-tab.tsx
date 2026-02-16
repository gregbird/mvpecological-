'use client'

import { Loader2 } from 'lucide-react'

import {
  useProjectDeepResearch,
  useProjectAquaticResearch,
} from '@/hooks/queries/use-deep-research-hooks'
import { DesignatedSitesMatrix } from './designated-sites-matrix'
import { SpeciesRecordsSection } from './species-records-section'
import { AquaticEnvironmentSection } from './aquatic-environment-section'
import { ConstraintsSummarySection } from './constraints-summary-section'
import type { DeskResearchFinding } from '@/types/database'
import type { Project } from '@/types/database'

interface BaselineReportTabProps {
  savedFindings: DeskResearchFinding[]
  project: Project
}

export function BaselineReportTab({ savedFindings, project }: BaselineReportTabProps) {
  const { data: deepResearch = [], isLoading: isLoadingDeep } = useProjectDeepResearch(project.id)
  const { data: aquaticResearch = [], isLoading: isLoadingAquatic } = useProjectAquaticResearch(
    project.id
  )

  if (isLoadingDeep || isLoadingAquatic) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 p-6">
      {/* Section 1: Designated Sites Matrix */}
      <section>
        <h3 className="mb-4 text-lg font-semibold">1. Designated Sites</h3>
        <DesignatedSitesMatrix findings={savedFindings} deepResearch={deepResearch} />
      </section>

      {/* Section 2: Species Records */}
      <section>
        <h3 className="mb-4 text-lg font-semibold">2. Species Records</h3>
        <SpeciesRecordsSection findings={savedFindings} />
      </section>

      {/* Section 3: Aquatic Environment */}
      <section>
        <h3 className="mb-4 text-lg font-semibold">3. Aquatic Environment</h3>
        <AquaticEnvironmentSection findings={savedFindings} aquaticResearch={aquaticResearch} />
      </section>

      {/* Section 4: Constraints Summary */}
      <section>
        <h3 className="mb-4 text-lg font-semibold">4. Constraints Summary</h3>
        <ConstraintsSummarySection findings={savedFindings} />
      </section>
    </div>
  )
}
