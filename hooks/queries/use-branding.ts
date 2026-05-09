import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getBranding,
  updateBranding,
  DEFAULT_BRANDING,
  type Branding,
} from '@/lib/supabase/queries/branding'

const brandingKey = (organizationId: string | null | undefined) => ['branding', organizationId]

export function useBranding(organizationId: string | null | undefined) {
  return useQuery({
    queryKey: brandingKey(organizationId),
    queryFn: () => getBranding(organizationId!),
    enabled: !!organizationId,
    placeholderData: DEFAULT_BRANDING,
    staleTime: 60_000,
  })
}

export function useUpdateBranding(organizationId: string | null | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (branding: Branding) => updateBranding(organizationId!, branding),
    onSuccess: (data) => {
      queryClient.setQueryData(brandingKey(organizationId), data)
    },
  })
}
