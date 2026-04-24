'use client'

import {
  Activity,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  Clock,
  Info,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { WFDData, AquaticResearchResult } from './aquatic-types'
import { WFD_STATUS_COLORS } from './aquatic-types'

interface WfdTabProps {
  wfdData: WFDData | null
  isLoading: boolean
  result: AquaticResearchResult | null
}

export function WfdTab({ wfdData, isLoading, result }: WfdTabProps) {
  return (
    <>
      {wfdData ? (
        <>
          {/* Current Status & Risk */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4 text-blue-500" />
                WFD Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-muted-foreground text-xs">Current Status</span>
                  <div className="flex items-center gap-2">
                    <Badge className={WFD_STATUS_COLORS[wfdData.currentStatus || ''] || ''}>
                      {wfdData.currentStatus || 'Not Assessed'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Risk Level</span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        wfdData.risk === 'At risk'
                          ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300'
                          : wfdData.risk === 'Not at risk'
                            ? 'border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/50 dark:text-green-300'
                            : ''
                      }
                    >
                      {wfdData.risk === 'At risk' && <AlertCircle className="mr-1 h-3 w-3" />}
                      {wfdData.risk || 'Unknown'}
                    </Badge>
                  </div>
                </div>
              </div>

              {wfdData.catchmentName && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Catchment: </span>
                  <span className="font-medium">{wfdData.catchmentName}</span>
                  {wfdData.subCatchmentName && (
                    <span className="text-muted-foreground"> / {wfdData.subCatchmentName}</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status History */}
          {wfdData.statusHistory.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-500" />
                  Status History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {wfdData.statusHistory.slice(0, 5).map((h, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between rounded border px-3 py-2 text-sm"
                    >
                      <div>
                        <span className="font-medium">{h.period}</span>
                        {h.details.length > 0 && (
                          <p className="text-muted-foreground mt-1 text-xs">
                            {h.details.join(' • ')}
                          </p>
                        )}
                      </div>
                      <Badge className={WFD_STATUS_COLORS[h.status] || ''}>{h.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Trends */}
          {wfdData.trends.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-amber-500" />
                  Water Quality Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {wfdData.trends.map((t, idx) => {
                    const isUpward = t.TrendDesc.toLowerCase().includes('upward')
                    const isDownward = t.TrendDesc.toLowerCase().includes('downward')
                    const WfdTrendIcon = isUpward ? TrendingUp : isDownward ? TrendingDown : Minus

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800"
                      >
                        <span className="font-medium">{t.ParameterName}</span>
                        <div className="flex items-center gap-1">
                          <WfdTrendIcon
                            className={`h-4 w-4 ${
                              isUpward
                                ? 'text-red-500'
                                : isDownward
                                  ? 'text-green-500'
                                  : 'text-gray-500'
                            }`}
                          />
                          <span
                            className={
                              isUpward
                                ? 'text-red-600'
                                : isDownward
                                  ? 'text-green-600'
                                  : 'text-gray-600'
                            }
                          >
                            {t.TrendDesc}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <p className="text-muted-foreground mt-2 text-xs">
                  Note: Upward trends for pollutants indicate degrading conditions.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Failures */}
          {wfdData.failures.length > 0 && (
            <Card className="border-red-200 bg-red-50/30 dark:border-red-900 dark:bg-red-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                  <AlertTriangle className="h-4 w-4" />
                  Environmental Failures
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {wfdData.failures.map((f, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 rounded bg-red-100 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {f.Name}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Connectivity */}
          {wfdData.connectivity.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <ArrowRight className="h-4 w-4 text-cyan-500" />
                  Hydrological Connectivity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-gray-600">Upstream (Input)</h4>
                    <div className="space-y-1">
                      {wfdData.connectivity
                        .filter((c) => c.Direction === 'Input')
                        .map((c, idx) => (
                          <div
                            key={idx}
                            className="rounded bg-blue-50 px-2 py-1 text-sm text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                          >
                            {c.Name}
                          </div>
                        ))}
                      {wfdData.connectivity.filter((c) => c.Direction === 'Input').length === 0 && (
                        <p className="text-muted-foreground text-sm">None recorded</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-gray-600">Downstream (Output)</h4>
                    <div className="space-y-1">
                      {wfdData.connectivity
                        .filter((c) => c.Direction === 'Output')
                        .map((c, idx) => (
                          <div
                            key={idx}
                            className="rounded bg-green-50 px-2 py-1 text-sm text-green-700 dark:bg-green-950/40 dark:text-green-300"
                          >
                            {c.Name}
                          </div>
                        ))}
                      {wfdData.connectivity.filter((c) => c.Direction === 'Output').length ===
                        0 && <p className="text-muted-foreground text-sm">None recorded</p>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : isLoading ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-blue-400" />
            <p className="text-sm font-medium">Fetching WFD data from Catchments.ie...</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardContent className="flex items-start gap-2 pt-4">
            <Info className="h-4 w-4 shrink-0 text-amber-600" />
            <div className="text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-300">
                No WFD Data Available
              </p>
              <p className="text-muted-foreground">
                {result
                  ? 'Detailed WFD data was not available from Catchments.ie for this water body.'
                  : 'WFD data will be fetched when research completes.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
