'use client'

import { BookOpen, AlertTriangle, TrendingUp, TrendingDown, AlertOctagon, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  getStatusDisplay,
  getTrendDisplay,
  getHabitatsSummary,
  type Article17Habitat,
} from '@/lib/data/article17-habitats'
import { TrendIcon } from './npws-helpers'

interface HabitatWithArticle17 {
  habitatCode: string
  habitatName: string
  article17: Article17Habitat | null
}

interface StatusTabProps {
  summary: ReturnType<typeof getHabitatsSummary>
  habitatsWithArticle17: HabitatWithArticle17[]
  allPressures: Set<string>
  allThreats: Set<string>
}

export function StatusTab({
  summary,
  habitatsWithArticle17,
  allPressures,
  allThreats,
}: StatusTabProps) {
  return (
    <>
      {summary.total > 0 ? (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <BookOpen className="h-4 w-4 text-purple-600" />
                Article 17 (2025) Conservation Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-3 text-xs">
                Based on NPWS Article 17 Report 2025 - national conservation status of qualifying
                habitats.
              </p>
              <div className="grid grid-cols-4 gap-2">
                <div className="rounded bg-green-50 p-2 text-center">
                  <div className="text-lg font-bold text-green-700">{summary.favourable}</div>
                  <div className="text-[10px] text-green-600">Favourable</div>
                </div>
                <div className="rounded bg-amber-50 p-2 text-center">
                  <div className="text-lg font-bold text-amber-700">
                    {summary.unfavourableInadequate}
                  </div>
                  <div className="text-[10px] text-amber-600">Inadequate</div>
                </div>
                <div className="rounded bg-red-50 p-2 text-center">
                  <div className="text-lg font-bold text-red-700">{summary.unfavourableBad}</div>
                  <div className="text-[10px] text-red-600">Bad</div>
                </div>
                <div className="rounded bg-gray-50 p-2 text-center">
                  <div className="text-lg font-bold text-gray-700">{summary.unknown}</div>
                  <div className="text-[10px] text-gray-600">Unknown</div>
                </div>
              </div>
              <div className="mt-3 flex gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  {summary.improving} improving
                </span>
                <span className="flex items-center gap-1">
                  <TrendingDown className="h-3 w-3 text-red-600" />
                  {summary.declining} declining
                </span>
                {summary.priorityCount > 0 && (
                  <span className="flex items-center gap-1">
                    <AlertOctagon className="h-3 w-3 text-red-500" />
                    {summary.priorityCount} priority
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Threats & Pressures */}
          {(allPressures.size > 0 || allThreats.size > 0) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  Threats & Pressures
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {allPressures.size > 0 && (
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs font-medium">
                      Current Pressures:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(allPressures).map((pressure, idx) => (
                        <Badge key={idx} variant="outline" className="bg-orange-50 text-xs">
                          {pressure}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {allThreats.size > 0 && (
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs font-medium">
                      Future Threats:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(allThreats).map((threat, idx) => (
                        <Badge key={idx} variant="outline" className="bg-red-50 text-xs">
                          {threat}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Per-habitat status */}
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs font-medium">Status by Habitat:</p>
            {habitatsWithArticle17.map((habitat, idx) => {
              const a17 = habitat.article17
              if (!a17) return null
              const statusDisplay = getStatusDisplay(a17.status)
              const trendDisplay = getTrendDisplay(a17.trend)
              return (
                <Card key={idx} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {habitat.habitatCode}
                        </Badge>
                        <Badge
                          className={`text-xs ${statusDisplay.bgColor} ${statusDisplay.color} border-0`}
                        >
                          {statusDisplay.label}
                        </Badge>
                        <span className={`flex items-center gap-1 text-xs ${trendDisplay.color}`}>
                          <TrendIcon trend={a17.trend} />
                          {trendDisplay.label}
                        </span>
                        {a17.priorityHabitat && (
                          <Badge variant="destructive" className="text-[10px]">
                            Priority*
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                        {a17.assessment}
                      </p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="pt-4 text-center">
            <Info className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
            <p className="text-muted-foreground text-sm">Conservation status data not available.</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Check NPWS Article 17 Reports for detailed assessments.
            </p>
          </CardContent>
        </Card>
      )}
    </>
  )
}
