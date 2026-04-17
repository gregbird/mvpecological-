'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

/**
 * Data hook for the Evidence Matrix tab.
 *
 * The underlying endpoint does two things: (1) deterministic matrix build
 * (always cheap, deterministic), and (2) optional AI narrative generation
 * (expensive, user-triggered). We split them at the hook layer — `useQuery`
 * for the always-on matrix, `useMutation` for the on-demand regenerate — so
 * the table is usable immediately while the narrative streams in behind.
 */

export interface EvidenceSource {
  kind: 'npws' | 'nbdc' | 'gbif' | 'epa' | 'catchments' | 'manual' | 'company_reports'
  findingId?: string
  chunkId?: string
  documentId?: string
  label: string
  snippet?: string
  page?: number | null
}

export interface EvidenceEntity {
  type: 'species' | 'habitat' | 'site' | 'designation'
  canonical: string
  displayName: string
  sources: EvidenceSource[]
  sourceKinds: string[]
  overlapCount: number
  isGap: boolean
  isCoveredOnlyByReports: boolean
}

export interface EvidenceMatrixData {
  entities: EvidenceEntity[]
  narrative: string | null
  metadata: {
    totalFindings: number
    totalMentions: number
    distinctEntities: number
    overlapsCount: number
    gapsCount: number
    onlyReportsCount: number
  }
}

const FIFTEEN_MINUTES = 15 * 60 * 1000

function buildUrl(projectId: string, siteId: string | null, generateNarrative: boolean): string {
  const params = new URLSearchParams()
  if (siteId) params.set('siteId', siteId)
  if (generateNarrative) params.set('generateNarrative', 'true')
  const qs = params.toString()
  return `/api/projects/${projectId}/evidence-matrix${qs ? `?${qs}` : ''}`
}

async function fetchMatrix(
  projectId: string,
  siteId: string | null,
  generateNarrative: boolean
): Promise<EvidenceMatrixData> {
  const response = await fetch(buildUrl(projectId, siteId, generateNarrative))
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || `Request failed (${response.status})`)
  }
  return (await response.json()) as EvidenceMatrixData
}

export function useEvidenceMatrix(projectId: string, siteId: string | null) {
  return useQuery({
    queryKey: ['evidence-matrix', projectId, siteId],
    queryFn: () => fetchMatrix(projectId, siteId, false),
    enabled: !!projectId,
    staleTime: FIFTEEN_MINUTES,
  })
}

export function useGenerateEvidenceNarrative(projectId: string, siteId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => fetchMatrix(projectId, siteId, true),
    onSuccess: (data) => {
      // Patch the cached matrix with the fresh narrative so the UI re-renders
      // without refetching the (unchanged) entity list.
      queryClient.setQueryData<EvidenceMatrixData>(
        ['evidence-matrix', projectId, siteId],
        (prev) => (prev ? { ...prev, narrative: data.narrative } : data)
      )
    },
  })
}
