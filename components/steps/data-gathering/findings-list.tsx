'use client'

import * as React from 'react'
import { Search, Loader2, ArrowUpDown, MapPin, Shield, Bug, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import type { DeskResearchFinding } from '@/types/database'

// Finding type for display
export interface FindingDisplay {
  id: string
  source: string
  dataType: string
  title: string
  content?: string
  location?: GeoJSON.Geometry
  isSaved: boolean
  sourceUrl?: string
  rawData?: Record<string, unknown>
  metadata?: {
    siteCode?: string
    siteType?: string
    scientificName?: string
    commonName?: string
    recordCount?: number
    distance?: number
    isProtected?: boolean
    redListStatus?: string
    designation?: string
    // NBDC enrichment fields
    isInvasive?: boolean
    isThreatened?: boolean
    nbdcTaxonId?: number
    totalIrishRecords?: number
    gridSquares10km?: number
    designations?: string
    nbdcEnriched?: boolean
  }
}

interface FindingsListProps {
  findings: FindingDisplay[]
  savedFindings: DeskResearchFinding[]
  isLoading?: boolean
  onSave: (finding: FindingDisplay) => void
  onViewOnMap?: (finding: FindingDisplay) => void
  emptyMessage?: string
  showFilters?: boolean
}

// Source badge colors
const SOURCE_COLORS: Record<string, string> = {
  npws: 'bg-emerald-100 text-emerald-700',
  gbif: 'bg-purple-100 text-purple-700',
  nbdc: 'bg-blue-100 text-blue-700',
  epa: 'bg-cyan-100 text-cyan-700',
  manual: 'bg-gray-100 text-gray-700',
}

// Type badge colors
const TYPE_COLORS: Record<string, string> = {
  designated_site: 'bg-green-100 text-green-700',
  species_record: 'bg-orange-100 text-orange-700',
  water_quality: 'bg-blue-100 text-blue-700',
  catchment: 'bg-teal-100 text-teal-700',
  other: 'bg-gray-100 text-gray-700',
}

export function FindingsList({
  findings,
  savedFindings,
  isLoading,
  onSave,
  onViewOnMap,
  emptyMessage = 'No findings found',
  showFilters = true,
}: FindingsListProps) {
  const [sortBy, setSortBy] = React.useState<'distance' | 'title' | 'type'>('distance')
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc')
  const [displayLimit, setDisplayLimit] = React.useState(20)
  const RESULTS_PER_PAGE = 20

  // Check if finding is already saved
  const isFindingSaved = (finding: FindingDisplay) => {
    return savedFindings.some(
      (f) =>
        f.id === finding.id ||
        (finding.metadata?.siteCode &&
          (f.raw_data as Record<string, unknown>)?.siteCode === finding.metadata.siteCode) ||
        (finding.metadata?.scientificName &&
          (f.raw_data as Record<string, unknown>)?.scientificName ===
            finding.metadata.scientificName &&
          f.source === finding.source)
    )
  }

  // Sort findings
  const sortedFindings = React.useMemo(() => {
    const sorted = [...findings]
    sorted.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'distance':
          const distA = a.metadata?.distance ?? Infinity
          const distB = b.metadata?.distance ?? Infinity
          comparison = distA - distB
          break
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        case 'type':
          comparison = a.dataType.localeCompare(b.dataType)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
    return sorted
  }, [findings, sortBy, sortOrder])

  // Paginated findings
  const paginatedFindings = sortedFindings.slice(0, displayLimit)
  const hasMoreResults = sortedFindings.length > displayLimit

  // Reset display limit when findings change
  React.useEffect(() => {
    setDisplayLimit(RESULTS_PER_PAGE)
  }, [findings])

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (findings.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center">
        <Search className="mb-4 h-12 w-12 text-gray-300" />
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header with count and filters */}
      {showFilters && (
        <div className="flex items-center justify-between border-b px-4 py-2">
          <span className="text-sm font-medium">{sortedFindings.length} results</span>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-gray-400" />
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="h-8 w-[110px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="distance">Distance</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="type">Type</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            >
              {sortBy === 'distance'
                ? sortOrder === 'asc'
                  ? 'Nearest'
                  : 'Farthest'
                : sortOrder === 'asc'
                  ? 'A-Z'
                  : 'Z-A'}
            </Button>
          </div>
        </div>
      )}

      {/* Findings list */}
      <ScrollArea className="flex-1">
        <div className="space-y-1.5 p-2">
          {paginatedFindings.map((finding) => {
            const saved = isFindingSaved(finding)
            return (
              <div
                key={finding.id}
                className={`rounded-lg border p-2.5 transition-colors ${saved ? 'border-emerald-400 bg-emerald-50' : 'hover:bg-gray-50'}`}
              >
                {/* Title + Save button row */}
                <div className="flex items-center justify-between gap-2">
                  <h4 className="min-w-0 flex-1 truncate text-sm font-medium" title={finding.title}>
                    {finding.title}
                  </h4>
                  <Button
                    variant={saved ? 'secondary' : 'default'}
                    size="sm"
                    className="h-6 shrink-0 px-2 text-[11px]"
                    onClick={() => onSave({ ...finding, isSaved: !saved })}
                  >
                    {saved ? '✓' : 'Save'}
                  </Button>
                </div>

                {/* Compact badges row */}
                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                  <Badge
                    variant="secondary"
                    className={`h-5 px-1.5 text-[10px] ${SOURCE_COLORS[finding.source] || ''}`}
                  >
                    {finding.source.toUpperCase()}
                  </Badge>
                  {finding.metadata?.nbdcEnriched && (
                    <span title="Enriched with NBDC data">
                      <Sparkles className="h-3 w-3 text-amber-500" />
                    </span>
                  )}
                  {finding.metadata?.distance !== undefined && (
                    <Badge variant="outline" className="h-5 gap-0.5 px-1.5 text-[10px]">
                      <MapPin className="h-2.5 w-2.5" />
                      {finding.metadata.distance === 0
                        ? 'Within'
                        : `${finding.metadata.distance.toFixed(1)}km`}
                    </Badge>
                  )}
                  {finding.metadata?.isProtected && (
                    <span title="Protected species">
                      <Shield className="h-3.5 w-3.5 text-red-500" />
                    </span>
                  )}
                  {finding.metadata?.isInvasive && (
                    <span title="Invasive species">
                      <Bug className="h-3.5 w-3.5 text-orange-500" />
                    </span>
                  )}
                  {finding.metadata?.redListStatus && (
                    <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                      {finding.metadata.redListStatus}
                    </Badge>
                  )}
                </div>

                {/* Compact action links */}
                <div className="mt-1.5 flex items-center gap-3 text-[11px]">
                  {finding.location && onViewOnMap && (
                    <button
                      className="text-blue-600 hover:underline"
                      onClick={() => onViewOnMap(finding)}
                    >
                      View on map
                    </button>
                  )}
                  {finding.sourceUrl && (
                    <a
                      href={finding.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Source ↗
                    </a>
                  )}
                </div>
              </div>
            )
          })}

          {/* Load more */}
          {hasMoreResults && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => setDisplayLimit((prev) => prev + RESULTS_PER_PAGE)}
              >
                Load More ({sortedFindings.length - displayLimit} remaining)
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
