'use client'

interface DataLayersIndicatorProps {
  visibleLayers: string[]
  npwsLoading: boolean
  npwsSiteCount: number
  epaLoading: boolean
  epaCounts: { total: number; rivers: number; lakes: number; catchments: number }
  hasBoundary: boolean
}

const NPWS_LAYER_IDS = ['sac', 'spa', 'nha', 'pnha']
const EPA_LAYER_IDS = ['rivers', 'lakes', 'catchments', 'wfd_river_status']

/**
 * Bottom-left overlay showing NPWS site counts and EPA feature counts
 * when the corresponding layers are active.
 */
export function DataLayersIndicator({
  visibleLayers,
  npwsLoading,
  npwsSiteCount,
  epaLoading,
  epaCounts,
  hasBoundary,
}: DataLayersIndicatorProps) {
  const hasNpws = visibleLayers.some((l) => NPWS_LAYER_IDS.includes(l))
  const hasEpa = visibleLayers.some((l) => EPA_LAYER_IDS.includes(l))
  if (!hasNpws && !hasEpa) return null

  return (
    <div
      data-map-control="true"
      className="bg-background/90 absolute bottom-4 left-4 z-1000 space-y-1 rounded-lg px-3 py-2 text-sm shadow-lg backdrop-blur-sm"
    >
      {hasNpws && (
        <div>
          {npwsLoading ? (
            <span className="text-muted-foreground">Loading NPWS sites...</span>
          ) : npwsSiteCount > 0 ? (
            <span className="text-emerald-600">
              {npwsSiteCount} designated site{npwsSiteCount !== 1 ? 's' : ''} found
            </span>
          ) : hasBoundary ? (
            <span className="text-muted-foreground">No designated sites nearby</span>
          ) : null}
        </div>
      )}
      {hasEpa && (
        <div>
          {epaLoading ? (
            <span className="text-muted-foreground">Loading EPA data...</span>
          ) : epaCounts.total > 0 ? (
            <span className="text-sky-600">
              {epaCounts.rivers > 0 &&
                `${epaCounts.rivers} river${epaCounts.rivers !== 1 ? 's' : ''}`}
              {epaCounts.rivers > 0 && epaCounts.lakes > 0 && ', '}
              {epaCounts.lakes > 0 && `${epaCounts.lakes} lake${epaCounts.lakes !== 1 ? 's' : ''}`}
              {(epaCounts.rivers > 0 || epaCounts.lakes > 0) && epaCounts.catchments > 0 && ', '}
              {epaCounts.catchments > 0 &&
                `${epaCounts.catchments} catchment${epaCounts.catchments !== 1 ? 's' : ''}`}
            </span>
          ) : hasBoundary ? (
            <span className="text-muted-foreground">No EPA features nearby</span>
          ) : null}
        </div>
      )}
    </div>
  )
}
