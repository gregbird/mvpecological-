import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProjectSites,
  upsertProjectSite,
  deleteProjectSite,
  type UpsertSiteParams,
} from '@/lib/supabase/queries/project-sites'

export function useProjectSites(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-sites', projectId],
    queryFn: () => getProjectSites(projectId!),
    enabled: !!projectId,
  })
}

export function useUpsertSite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: UpsertSiteParams) => upsertProjectSite(params),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-sites', variables.projectId] })
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] })
    },
  })
}

export function useDeleteSite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ siteId, projectId }: { siteId: string; projectId: string }) =>
      deleteProjectSite(siteId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-sites', variables.projectId] })
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] })
    },
  })
}
