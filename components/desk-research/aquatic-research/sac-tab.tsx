'use client'

import { Fish, Leaf, Info, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { LinkedSAC } from './aquatic-types'

interface SacTabProps {
  bestMatch: LinkedSAC | undefined
  linkedSACs: LinkedSAC[]
  isLoading: boolean
}

export function SacTab({ bestMatch, linkedSACs, isLoading }: SacTabProps) {
  return (
    <>
      {bestMatch ? (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{bestMatch.siteName}</CardTitle>
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
