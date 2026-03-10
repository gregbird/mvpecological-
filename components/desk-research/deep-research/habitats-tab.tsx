'use client'

import { Leaf, Info, Bug, Bird } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { getHabitatDescription } from '@/lib/data/ssco-lookup'
import {
  getStatusDisplay,
  getTrendDisplay,
  type Article17Habitat,
} from '@/lib/data/article17-habitats'
import type { NPWSSiteData } from '@/lib/data/npws-site-lookup'
import { TrendIcon } from './npws-helpers'

interface HabitatWithArticle17 {
  habitatCode: string
  habitatName: string
  article17: Article17Habitat | null
}

interface HabitatsTabProps {
  mergedHabitats: Array<{ habitatCode: string; habitatName: string }>
  habitatsWithArticle17: HabitatWithArticle17[]
  siteSpecies: Array<{ code: string; name: string }>
  birdSpecies: Array<{ code: string; name: string }>
  excelData: NPWSSiteData | null
}

export function HabitatsTab({
  mergedHabitats,
  habitatsWithArticle17,
  siteSpecies,
  birdSpecies,
  excelData,
}: HabitatsTabProps) {
  return (
    <>
      {/* Habitats Section */}
      {mergedHabitats.length > 0 && (
        <>
          <div className="text-muted-foreground flex items-center gap-1.5 text-sm font-medium">
            <Leaf className="h-4 w-4 text-emerald-500" />
            Annex I Habitats ({mergedHabitats.length})
            {excelData && (
              <Badge variant="outline" className="text-[10px]">
                NPWS Datasheet
              </Badge>
            )}
          </div>
          {habitatsWithArticle17.map((habitat, idx) => {
            const a17 = habitat.article17
            const description = getHabitatDescription(habitat.habitatCode)
            const statusDisplay = a17 ? getStatusDisplay(a17.status) : null
            return (
              <Card key={idx}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={a17?.priorityHabitat ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {habitat.habitatCode}
                        </Badge>
                        {a17?.priorityHabitat && (
                          <Badge variant="outline" className="border-red-300 text-xs text-red-700">
                            Priority*
                          </Badge>
                        )}
                        {statusDisplay && (
                          <Badge
                            className={`text-xs ${statusDisplay.bgColor} ${statusDisplay.color} border-0`}
                          >
                            {statusDisplay.label}
                          </Badge>
                        )}
                        {a17 && (
                          <span
                            className={`flex items-center gap-1 text-xs ${getTrendDisplay(a17.trend).color}`}
                          >
                            <TrendIcon trend={a17.trend} />
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-medium">{habitat.habitatName}</p>
                      <p className="text-muted-foreground mt-1 text-xs">{description}</p>
                    </div>
                    <Leaf className="h-4 w-4 shrink-0 text-emerald-500" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </>
      )}

      {/* Species Section (SAC - Annex II) */}
      {siteSpecies.length > 0 && (
        <>
          <Separator />
          <div className="text-muted-foreground flex items-center gap-1.5 text-sm font-medium">
            <Bug className="h-4 w-4 text-amber-600" />
            Annex II Species ({siteSpecies.length})
          </div>
          {siteSpecies.map((species, idx) => (
            <Card key={idx}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium italic">{species.name}</p>
                    <p className="text-muted-foreground text-xs">Species Code: {species.code}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Annex II
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}

      {/* Bird Species Section (SPA) */}
      {birdSpecies.length > 0 && (
        <>
          <Separator />
          <div className="text-muted-foreground flex items-center gap-1.5 text-sm font-medium">
            <Bird className="h-4 w-4 text-blue-600" />
            Special Conservation Interest Birds ({birdSpecies.length})
            {excelData?.isWetland && (
              <Badge className="bg-cyan-100 text-xs text-cyan-700">Wetland SPA</Badge>
            )}
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {birdSpecies.map((bird, idx) => (
              <Card key={idx}>
                <CardContent className="px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium italic">{bird.name}</p>
                      <p className="text-muted-foreground text-xs">Species Code: {bird.code}</p>
                    </div>
                    <Bird className="h-4 w-4 text-blue-400" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* No data fallback */}
      {mergedHabitats.length === 0 && siteSpecies.length === 0 && birdSpecies.length === 0 && (
        <Card>
          <CardContent className="pt-4 text-center">
            <Info className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
            <p className="text-muted-foreground text-sm">Qualifying interest data not available.</p>
            <p className="text-muted-foreground mt-1 text-xs">
              This site may be an NHA/pNHA not covered in NPWS datasheets.
            </p>
          </CardContent>
        </Card>
      )}
    </>
  )
}
