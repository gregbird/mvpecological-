import { useQuery, useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import {
  getProjectSites,
  upsertProjectSite,
  deleteProjectSite,
  getSiteImpactCounts,
  type UpsertSiteParams,
} from '@/lib/supabase/queries/project-sites'

const FIVE_MINUTES = 5 * 60 * 1000

// Any query whose key starts with one of these prefixes is considered stale
// when a site is inserted, updated, or deleted.
const SITE_INVALIDATION_PREFIXES = [
  'project-sites',
  'project',
  'findings',
  'saved-findings',
  'findings-stats',
  'habitat-stats',
  'observation-stats',
  'survey-stats',
  'workflow-steps',
] as const

function invalidateSiteDependents(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string
) {
  queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey as QueryKey
      if (!Array.isArray(key) || key.length === 0) return false
      const [root, scoped] = key as [unknown, unknown]
      if (typeof root !== 'string') return false
      if (
        !SITE_INVALIDATION_PREFIXES.includes(root as (typeof SITE_INVALIDATION_PREFIXES)[number])
      ) {
        return false
      }
      // Only invalidate entries scoped to this project (or unscoped entries).
      return scoped === undefined || scoped === projectId
    },
  })
}

export function useProjectSites(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-sites', projectId],
    queryFn: () => getProjectSites(projectId!),
    enabled: !!projectId,
    staleTime: FIVE_MINUTES,
  })
}

export function useUpsertSite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: UpsertSiteParams) => upsertProjectSite(params),
    onSuccess: (_data, variables) => {
      invalidateSiteDependents(queryClient, variables.projectId)
    },
  })
}

export function useDeleteSite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ siteId }: { siteId: string; projectId: string }) => deleteProjectSite(siteId),
    onSuccess: (_data, variables) => {
      invalidateSiteDependents(queryClient, variables.projectId)
    },
  })
}

export function useSiteImpactCounts(siteId: string | undefined) {
  return useQuery({
    queryKey: ['site-impact-counts', siteId],
    queryFn: () => getSiteImpactCounts(siteId!),
    enabled: !!siteId,
    // Short staleTime so the confirm dialog reflects fresh counts.
    staleTime: 10 * 1000,
  })
}
