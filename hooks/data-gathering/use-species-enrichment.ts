'use client'

import * as React from 'react'

import { SpeciesResearchData } from '@/components/desk-research/species-research-modal'
import { type FPORecord } from '@/lib/data/fpo-species'
import { type Article17Species } from '@/lib/data/article17-species'
import { useCreateFinding, useUpdateFinding } from '@/hooks/queries/use-finding-hooks'
import type { DeskResearchFinding, Json } from '@/types/database'
import type { FindingDisplay } from '@/components/steps/data-gathering/findings-list'

interface UseSpeciesEnrichmentParams {
  project: { id: string }
  userId: string
  siteId?: string | null
  savedFindings: DeskResearchFinding[]
  aiSummaryTriggerRef: React.RefObject<((finding: FindingDisplay) => void) | null>
}

interface SpeciesEnrichmentState {
  speciesResearchOpen: boolean
  selectedSpeciesResearch: SpeciesResearchData | null
  speciesExistingAnalysis: string | undefined
  deepResearchFinding: FindingDisplay | null
}

export function useSpeciesEnrichment({
  project,
  userId,
  siteId,
  savedFindings,
  aiSummaryTriggerRef,
}: UseSpeciesEnrichmentParams) {
  const createFinding = useCreateFinding()
  const updateFinding = useUpdateFinding()

  const [state, setState] = React.useState<SpeciesEnrichmentState>({
    speciesResearchOpen: false,
    selectedSpeciesResearch: null,
    speciesExistingAnalysis: undefined,
    deepResearchFinding: null,
  })

  const setSpeciesResearchOpen = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, speciesResearchOpen: open }))
  }, [])

  /**
   * Open the deep research modal for a species finding.
   * Enriches with NBDC taxon details, FPO records, Article 17, and NPWS sites.
   */
  const handleSpeciesDeepResearch = React.useCallback(
    async (finding: FindingDisplay, sf: DeskResearchFinding[]) => {
      const scientificName = finding.metadata?.scientificName || finding.title

      let fpoRecords: FPORecord[] | undefined
      let article17Species: Article17Species[] | undefined
      let relatedSites: import('@/lib/data/npws-site-lookup').SiteWithSpecies[] | undefined

      // Enrich with NBDC taxon details (Irish records, grid squares) on-demand
      let totalIrishRecords = finding.metadata?.totalIrishRecords
      let gridSquares10km = finding.metadata?.gridSquares10km
      let nbdcUrl = finding.metadata?.nbdcUrl

      if (!totalIrishRecords && scientificName) {
        try {
          const { enrichSpeciesFromNBDC } = await import('@/lib/external-apis/nbdc')
          const nbdcData = await enrichSpeciesFromNBDC(scientificName)
          if (nbdcData) {
            totalIrishRecords = nbdcData.totalRecordsInIreland
            gridSquares10km = nbdcData.gridSquares10km
            nbdcUrl = nbdcData.nbdcUrl
          }
        } catch {
          // NBDC enrichment failed — not critical
        }
      }

      try {
        const [art17Module, npwsModule] = await Promise.all([
          import('@/lib/data/article17-species'),
          import('@/lib/data/npws-site-lookup'),
        ])

        if (finding.source === 'fpo' && finding.rawData?.sampleRecords) {
          fpoRecords = finding.rawData.sampleRecords as FPORecord[]
        }

        try {
          article17Species = await art17Module.searchSpeciesByName(scientificName)
        } catch {
          // silently skip
        }

        try {
          relatedSites = npwsModule.findSitesWithSpecies(scientificName)
        } catch {
          // silently skip
        }
      } catch {
        // Dynamic import failed
      }

      // Check for existing deep research analysis
      let cachedAnalysis: string | undefined
      const deepResearchFromRaw = (finding.rawData as Record<string, unknown>)?.deepResearch as
        | Record<string, unknown>
        | undefined
      if (deepResearchFromRaw?.aiAnalysis) {
        cachedAnalysis = deepResearchFromRaw.aiAnalysis as string
      } else {
        const savedMatch = sf.find(
          (f) => (f.raw_data as Record<string, unknown>)?.scientificName === scientificName
        )
        if (savedMatch) {
          const rawData = savedMatch.raw_data as Record<string, unknown>
          const deepResearch = rawData?.deepResearch as Record<string, unknown> | undefined
          if (deepResearch?.aiAnalysis) {
            cachedAnalysis = deepResearch.aiAnalysis as string
          }
        }
      }

      setState({
        speciesResearchOpen: true,
        selectedSpeciesResearch: {
          scientificName,
          commonName: finding.metadata?.commonName,
          taxonGroup: finding.metadata?.taxonGroup,
          recordCount: finding.metadata?.recordCount,
          designations: finding.metadata?.designations,
          distance: finding.metadata?.distance,
          isProtected: finding.metadata?.isProtected,
          isInvasive: finding.metadata?.isInvasive,
          isThreatened: finding.metadata?.isThreatened,
          totalIrishRecords,
          gridSquares10km,
          gbifUrl: finding.metadata?.gbifUrl || finding.sourceUrl,
          nbdcUrl,
          source: finding.source,
          fpoRecords,
          article17Species,
          relatedSites,
        },
        speciesExistingAnalysis: cachedAnalysis,
        deepResearchFinding: finding,
      })
    },
    []
  )

  /**
   * Save a deep research analysis result to an existing or new finding.
   */
  const handleSaveDeepResearchAnalysis = React.useCallback(
    async (data: {
      aiAnalysis: string
      relatedSites?: import('@/lib/data/npws-site-lookup').SiteWithSpecies[]
      fpoRecords?: FPORecord[]
      article17Species?: Article17Species[]
    }) => {
      if (!state.selectedSpeciesResearch) return

      const scientificName = state.selectedSpeciesResearch.scientificName

      const deepResearchData = {
        aiAnalysis: data.aiAnalysis,
        relatedSites: data.relatedSites?.slice(0, 10),
        fpoRecordCount: data.fpoRecords?.length || 0,
        article17Species: data.article17Species,
        generatedAt: new Date().toISOString(),
      }

      const existingSaved = savedFindings.find(
        (f) => (f.raw_data as Record<string, unknown>)?.scientificName === scientificName
      )

      if (existingSaved) {
        const existingRawData = (existingSaved.raw_data as Record<string, unknown>) || {}

        updateFinding
          .mutateAsync({
            findingId: existingSaved.id,
            updates: {
              raw_data: {
                ...existingRawData,
                deepResearch: deepResearchData,
              } as unknown as Json,
            },
          })
          .catch((err) => console.error('Failed to persist deep research to finding:', err))
      } else if (state.deepResearchFinding) {
        try {
          const payload = {
            project_id: project.id,
            site_id: siteId ?? null,
            source: 'nbdc' as const,
            data_type: 'species_record' as const,
            title: state.deepResearchFinding.title,
            content: state.deepResearchFinding.content || null,
            raw_data: {
              ...state.deepResearchFinding.rawData,
              scientificName,
              metadata: state.deepResearchFinding.metadata,
              deepResearch: deepResearchData,
            } as unknown as Json,
            location: state.deepResearchFinding.location as unknown as Json,
            is_saved: true,
            distance_from_boundary_km: state.deepResearchFinding.metadata?.distance || null,
            is_protected: state.deepResearchFinding.metadata?.isProtected || false,
            created_by: userId,
          }
          await createFinding.mutateAsync(payload)
        } catch (error) {
          console.error('Failed to create finding from deep research:', error)
        }
      }

      // Trigger short AI summary for the card
      if (state.deepResearchFinding) {
        aiSummaryTriggerRef.current?.(state.deepResearchFinding)
      }
    },
    [
      state.selectedSpeciesResearch,
      state.deepResearchFinding,
      savedFindings,
      project.id,
      siteId,
      userId,
      createFinding,
      updateFinding,
      aiSummaryTriggerRef,
    ]
  )

  return {
    speciesResearchOpen: state.speciesResearchOpen,
    selectedSpeciesResearch: state.selectedSpeciesResearch,
    speciesExistingAnalysis: state.speciesExistingAnalysis,
    setSpeciesResearchOpen,
    handleSpeciesDeepResearch,
    handleSaveDeepResearchAnalysis,
  }
}
