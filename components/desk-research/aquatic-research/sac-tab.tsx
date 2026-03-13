'use client'

import { Fish, Leaf, Info, Loader2, Navigation, AlertTriangle, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { LinkedSAC, RiverDistanceData } from './aquatic-types'

interface SacTabProps {
  bestMatch: LinkedSAC | undefined
  linkedSACs: LinkedSAC[]
  isLoading: boolean
  riverDistance?: RiverDistanceData | null
}

export function SacTab({ bestMatch, linkedSACs, isLoading, riverDistance }: SacTabProps) {
  return (
    <>
      {/* River Distance to SAC */}
      {riverDistance && !riverDistance.error && <RiverDistanceCard riverDistance={riverDistance} />}

      {bestMatch ? (
        <>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{bestMatch.siteName}</CardTitle>
                {riverDistance?.sacReached && (
                  <Badge className="border-blue-300 bg-blue-100 text-xs text-blue-700">
                    <Navigation className="mr-1 h-3 w-3" />
                    {riverDistance.sacReached.distanceKm} km along river
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-xs">
                Site Code: {bestMatch.siteCode}
                {bestMatch.siteArea && ` • Area: ${bestMatch.siteArea.toFixed(0)} ha`}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Aquatic Species */}
              {bestMatch.aquaticSpecies.length > 0 && (
                <div>
                  <h4 className="mb-2 flex items-center gap-1 text-xs font-medium">
                    <Fish className="h-4 w-4 text-cyan-600" />
                    Annex II Aquatic Species (Qualifying Interests)
                  </h4>
                  <div className="space-y-1">
                    {bestMatch.aquaticSpecies.map((s) => (
                      <div
                        key={s.code}
                        className="flex items-center justify-between rounded bg-cyan-50 px-2 py-1 text-sm"
                      >
                        <span className="font-medium">{s.commonName}</span>
                        <span className="text-muted-foreground text-xs italic">
                          {s.name} [{s.code}]
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Aquatic Habitats */}
              {bestMatch.aquaticHabitats.length > 0 && (
                <div>
                  <h4 className="mb-2 flex items-center gap-1 text-xs font-medium">
                    <Leaf className="h-4 w-4 text-green-600" />
                    Annex I Aquatic Habitats
                  </h4>
                  <div className="space-y-1">
                    {bestMatch.aquaticHabitats.map((h) => (
                      <div key={h.code} className="rounded bg-green-50 px-2 py-1 text-sm">
                        <span className="font-medium">[{h.code}]</span> <span>{h.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Other Species */}
              {bestMatch.allSpecies.length > bestMatch.aquaticSpecies.length && (
                <div>
                  <h4 className="mb-2 text-xs font-medium text-gray-700">
                    Other Qualifying Species
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {bestMatch.allSpecies
                      .filter((s) => !bestMatch.aquaticSpecies.some((as) => as.code === s.code))
                      .map((s) => (
                        <Badge key={s.code} variant="outline" className="text-xs">
                          {s.name}
                        </Badge>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Other potential matches */}
          {linkedSACs.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-gray-600">Other Potential SAC Matches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {linkedSACs.slice(1).map((sac) => (
                    <div key={sac.siteCode} className="flex items-center justify-between text-sm">
                      <span>{sac.siteName}</span>
                      <Badge variant="outline" className="text-xs">
                        {sac.matchScore}% match
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : isLoading ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-cyan-400" />
            <p className="text-sm font-medium">Searching for linked SAC sites...</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-4 text-center">
            <Info className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
            <p className="text-muted-foreground text-sm">No linked Natura 2000 SAC sites found.</p>
            <p className="text-muted-foreground mt-1 text-xs">
              This water body may still support protected species downstream.
            </p>
          </CardContent>
        </Card>
      )}
    </>
  )
}

function RiverDistanceCard({ riverDistance }: { riverDistance: RiverDistanceData }) {
  const { riverDistanceKm, downstreamPath, sacReached, truncatedAt15km } = riverDistance

  if (riverDistanceKm == null) return null

  const isWithinZoI = riverDistanceKm <= 15

  return (
    <Card className={sacReached ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200'}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <Navigation className="h-4 w-4 text-blue-600" />
            River Network Distance
          </CardTitle>
          {isWithinZoI && (
            <Badge className="border-amber-300 bg-amber-100 text-xs text-amber-700">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Within 15km ZoI
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-center">
          <span className="text-2xl font-bold text-blue-600">{riverDistanceKm}</span>
          <span className="ml-1 text-sm text-blue-600">km along river</span>
          {truncatedAt15km && (
            <p className="text-muted-foreground mt-1 text-xs">
              Exceeds 15km zone of influence threshold
            </p>
          )}
        </div>

        {/* Downstream path breadcrumb */}
        {downstreamPath.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-gray-600">Downstream Path</p>
            <div className="flex flex-wrap items-center gap-1 text-xs">
              <Badge variant="secondary" className="text-[10px]">
                Project
              </Badge>
              {downstreamPath.map((step, i) => (
                <span key={step.waterBodyCode} className="flex items-center gap-1">
                  <ChevronRight className="h-3 w-3 text-gray-400" />
                  <Badge
                    variant={i === downstreamPath.length - 1 && sacReached ? 'default' : 'outline'}
                    className="text-[10px]"
                  >
                    {step.waterBodyName}
                    <span className="ml-1 text-gray-500">{step.distanceKm} km</span>
                  </Badge>
                </span>
              ))}
              {sacReached && (
                <span className="flex items-center gap-1">
                  <ChevronRight className="h-3 w-3 text-gray-400" />
                  <Badge className="bg-emerald-100 text-[10px] text-emerald-700">SAC</Badge>
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
