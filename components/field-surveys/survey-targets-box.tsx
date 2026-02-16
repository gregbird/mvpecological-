'use client'

import * as React from 'react'
import { Trees, ChevronDown, ChevronUp, Loader2, MapPin } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { DeskResearchFinding } from '@/types/database'

interface DesignatedSiteTarget {
  id: string
  title: string
  siteType: string
  distance: string | null
}

const SITE_TYPE_COLORS: Record<string, string> = {
  SAC: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  SPA: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  NHA: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  pNHA: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
}

interface SurveyTargetsBoxProps {
  findings: DeskResearchFinding[]
  isLoading?: boolean
}

export function SurveyTargetsBox({ findings, isLoading }: SurveyTargetsBoxProps) {
  const [isOpen, setIsOpen] = React.useState(true)

  // Extract designated sites from saved findings
  const sites = React.useMemo(() => {
    const siteMap = new Map<string, DesignatedSiteTarget>()

    for (const finding of findings) {
      if (finding.data_type !== 'designated_site') continue

      const raw = finding.raw_data as Record<string, unknown> | null
      const metadata = raw?.metadata as Record<string, unknown> | undefined

      const siteType =
        (metadata?.siteType as string) ||
        (metadata?.designation as string) ||
        (raw?.SITE_TYPE as string) ||
        ''

      const distance = (metadata?.distance as string | number | undefined) ?? null
      const distanceStr = distance !== null ? String(distance) : null

      // Deduplicate by title
      if (!siteMap.has(finding.title)) {
        siteMap.set(finding.title, {
          id: finding.id,
          title: finding.title,
          siteType: siteType.toUpperCase() === 'PNHA' ? 'pNHA' : siteType.toUpperCase(),
          distance: distanceStr,
        })
      }
    }

    // Sort: closest first
    return Array.from(siteMap.values()).sort((a, b) => {
      const da = a.distance ? parseFloat(a.distance) : 999
      const db = b.distance ? parseFloat(b.distance) : 999
      return da - db
    })
  }, [findings])

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-purple-200 bg-purple-50/50 dark:border-purple-900 dark:bg-purple-950/20">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trees className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-lg">Survey Targets (Habitats)</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {sites.length > 0 && <Badge variant="secondary">{sites.length} sites</Badge>}
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
            <CardDescription>
              Designated sites identified from desk research that require field verification
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : sites.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm">
                No designated sites found. Complete the Data Gathering step (Step 2) and save
                designated sites to see survey targets here.
              </p>
            ) : (
              <ScrollArea className={sites.length > 6 ? 'h-56' : undefined}>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {sites.map((site) => (
                    <div
                      key={site.id}
                      className="flex items-start gap-2 rounded-md border bg-white/60 p-2 dark:bg-white/5"
                    >
                      <Badge
                        className={`mt-0.5 shrink-0 text-xs ${SITE_TYPE_COLORS[site.siteType] || ''}`}
                      >
                        {site.siteType || 'Site'}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{site.title}</p>
                        {site.distance && (
                          <p className="text-muted-foreground flex items-center gap-1 text-xs">
                            <MapPin className="h-3 w-3" />
                            {parseFloat(site.distance) === 0
                              ? 'Within site boundary'
                              : `${parseFloat(site.distance).toFixed(1)} km`}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
