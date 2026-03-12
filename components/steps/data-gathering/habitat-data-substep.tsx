'use client'

import * as React from 'react'
import { Loader2, Search, Layers, AlertCircle, Eye, EyeOff, Sparkles } from 'lucide-react'
import dynamic from 'next/dynamic'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { getBoundingBox } from '@/lib/gis/bounding-box'
import {
  searchNlcLandCover,
  fetchNlcPolygons,
  NLC_LEVEL1_COLORS,
  type AggregatedHabitat,
} from '@/lib/external-apis/osi'
import { mapNlcToFossitt } from '@/lib/data/nlc-to-fossitt'
import { useSessionStorage } from '@/hooks/shared/use-session-storage'
import { IRELAND_CENTER } from '@/lib/config/map-constants'
import { MarkdownContent } from '@/components/desk-research/deep-research-shell'
import type { Project } from '@/types/database'

// Dynamic import for map
const ProjectMap = dynamic(
  () => import('@/components/maps/project-map').then((mod) => mod.ProjectMap),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted/50 flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ),
  }
)

interface HabitatDataSubStepProps {
  project: Project
  projectBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  projectCenter?: { lat: number; lng: number }
  bufferDistances: number[]
  showMap: boolean
  onToggleMap: () => void
  isActive?: boolean
}

export interface HabitatResult {
  nlcId: string
  nlcLabel: string
  nlcLevel1: string
  fossittCode: string
  fossittName: string
  areaHectares: number
  polygonCount: number
}

export function HabitatDataSubStep({
  project,
  projectBoundary,
  projectCenter,
  bufferDistances,
  showMap,
  onToggleMap,
  isActive,
}: HabitatDataSubStepProps) {
  const { toast } = useToast()
  const cacheKey = `nlc-habitat-${project.id}`

  const [isSearching, setIsSearching] = React.useState(false)
  const [results, setResults] = useSessionStorage<HabitatResult[]>(cacheKey, [])
  const [habitatPolygons, setHabitatPolygons] = React.useState<GeoJSON.FeatureCollection | null>(
    null
  )
  const [selectedHabitatType, setSelectedHabitatType] = React.useState<string | null>(null)
  const [selectedBuffer, setSelectedBuffer] = React.useState(bufferDistances[0] || 2)
  const [totalArea, setTotalArea] = React.useState(0)
  const [aiAnalysis, setAiAnalysis] = useSessionStorage<string>(`${cacheKey}-ai`, '')
  const [isAnalysing, setIsAnalysing] = React.useState(false)
  const [aiError, setAiError] = React.useState<string | null>(null)
  const [notes, setNotes] = useSessionStorage<Record<string, string>>(`${cacheKey}-notes`, {})
  const [expandedRow, setExpandedRow] = React.useState<string | null>(null)

  // Style polygons — always create new features with _highlight key for reliable GeoJSON re-render
  const styledPolygons = React.useMemo((): GeoJSON.FeatureCollection | undefined => {
    if (!habitatPolygons) return undefined

    return {
      type: 'FeatureCollection',
      features: habitatPolygons.features.map((f) => ({
        ...f,
        properties: {
          ...f.properties,
          fillOpacity: !selectedHabitatType
            ? 0.5
            : String(f.properties?.nlc_id) === selectedHabitatType
              ? 0.7
              : 0.08,
          _highlight: selectedHabitatType || '',
        },
      })),
    }
  }, [habitatPolygons, selectedHabitatType])

  // Invalidate Leaflet map size when tab becomes visible
  React.useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => {
        window.dispatchEvent(new Event('resize'))
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isActive])

  // Compute total area from results
  React.useEffect(() => {
    const total = results.reduce((sum, r) => sum + r.areaHectares, 0)
    setTotalArea(Math.round(total * 100) / 100)
  }, [results])

  const performSearch = async () => {
    const bbox = getBoundingBox(projectBoundary, projectCenter, selectedBuffer)
    if (!bbox) {
      toast({
        variant: 'destructive',
        title: 'No boundary',
        description: 'Please define a project boundary first.',
      })
      return
    }

    setIsSearching(true)
    setResults([])
    setHabitatPolygons(null)

    const bboxParams = {
      bbox: {
        minLat: bbox.minLat,
        maxLat: bbox.maxLat,
        minLng: bbox.minLng,
        maxLng: bbox.maxLng,
      },
    }

    try {
      const [aggregated, polygons] = await Promise.all([
        searchNlcLandCover(bboxParams),
        fetchNlcPolygons(bboxParams),
      ])

      if (aggregated.length === 0) {
        toast({
          title: 'No habitats found',
          description: 'No land cover data found within the selected buffer zone.',
        })
        setIsSearching(false)
        return
      }

      const mapped: HabitatResult[] = aggregated.map((h: AggregatedHabitat) => {
        const fossitt = mapNlcToFossitt(h.nlcId)
        return {
          nlcId: h.nlcId,
          nlcLabel: h.nlcLabel,
          nlcLevel1: h.nlcLevel1,
          fossittCode: fossitt?.fossittCode || '\u2014',
          fossittName: fossitt?.fossittName || h.nlcLabel,
          areaHectares: h.areaHectares,
          polygonCount: h.polygonCount,
        }
      })

      setResults(mapped)
      setHabitatPolygons(polygons)

      const totalPolygons = mapped.reduce((sum, m) => sum + m.polygonCount, 0)
      toast({
        title: 'Habitat data loaded',
        description: `Found ${mapped.length} habitat types from ${totalPolygons.toLocaleString()} polygons.`,
      })
    } catch (error) {
      console.error('NLC search error:', error)
      toast({
        variant: 'destructive',
        title: 'Search failed',
        description: 'Could not fetch land cover data from OSI.',
      })
    } finally {
      setIsSearching(false)
    }
  }

  const generateAnalysis = async () => {
    if (results.length === 0) return
    setIsAnalysing(true)
    setAiError(null)

    try {
      const response = await fetch('/api/ai/habitat-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habitats: results.map((r) => ({
            fossittCode: r.fossittCode,
            fossittName: r.fossittName,
            nlcLabel: r.nlcLabel,
            areaHectares: r.areaHectares,
          })),
          projectName: project.name,
          bufferKm: selectedBuffer,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate analysis')
      }

      const data = await response.json()
      setAiAnalysis(data.analysis)
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Analysis failed')
    } finally {
      setIsAnalysing(false)
    }
  }

  const handleRowClick = (nlcId: string) => {
    setSelectedHabitatType((prev) => (prev === nlcId ? null : nlcId))
    setExpandedRow((prev) => (prev === nlcId ? null : nlcId))
  }

  const updateNote = (nlcId: string, text: string) => {
    setNotes((prev) => ({ ...prev, [nlcId]: text }))
  }

  if (!projectBoundary) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No project boundary defined. Please complete Step 1 (GIS Mapping) first.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Results Panel */}
      <div className="flex w-[40%] shrink-0 flex-col border-r">
        {/* Search Controls */}
        <div className="border-b p-4">
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <Layers className="h-4 w-4 text-green-600" />
            Habitat Data (NLC 2018)
          </h3>
          <p className="text-muted-foreground mb-4 text-sm">
            Fetch land cover data from the National Land Cover 2018 dataset and convert to Fossitt
            habitat codes.
          </p>

          <div className="flex items-center gap-2">
            <Select
              value={selectedBuffer.toString()}
              onValueChange={(v) => setSelectedBuffer(parseFloat(v))}
            >
              <SelectTrigger className="w-30">
                <SelectValue placeholder="Buffer" />
              </SelectTrigger>
              <SelectContent>
                {(bufferDistances.length > 0 ? bufferDistances : [2, 5]).map((d) => (
                  <SelectItem key={d} value={d.toString()}>
                    {d} km buffer
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={performSearch}
              disabled={isSearching}
              className="flex-1 border-green-300 text-green-700 hover:bg-gray-50"
            >
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fetching habitats...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search Habitats
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-hidden">
          {results.length === 0 && !isSearching ? (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <Layers className="mb-4 h-12 w-12 text-gray-300" />
              <p className="text-muted-foreground">Search to find habitat data</p>
            </div>
          ) : isSearching ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="flex h-full flex-col">
              {/* Summary header */}
              <div className="flex items-center justify-between border-b px-4 py-2">
                <span className="text-sm font-medium">{results.length} habitat types</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">
                    {totalArea.toLocaleString()} ha
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={generateAnalysis}
                    disabled={isAnalysing}
                    className="h-7 gap-1 text-xs text-purple-600 hover:text-purple-700"
                  >
                    {isAnalysing ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    {aiAnalysis ? 'Regenerate' : 'AI Analysis'}
                  </Button>
                </div>
              </div>

              {/* Habitat list */}
              <ScrollArea className="flex-1">
                <div className="divide-y">
                  {results.map((r) => {
                    const pct =
                      totalArea > 0 ? ((r.areaHectares / totalArea) * 100).toFixed(1) : '0'
                    const color = NLC_LEVEL1_COLORS[r.nlcLevel1] || '#22c55e'
                    const isSelected = selectedHabitatType === r.nlcId
                    const isExpanded = expandedRow === r.nlcId
                    const note = notes[r.nlcId] || ''
                    return (
                      <div key={r.nlcId}>
                        {/* Row */}
                        <div
                          className={`flex cursor-pointer items-center gap-2 px-3 py-2.5 transition-colors ${
                            isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                          }`}
                          onClick={() => handleRowClick(r.nlcId)}
                        >
                          <div
                            className="h-4 w-4 shrink-0 rounded-sm"
                            style={{ backgroundColor: color }}
                          />
                          <Badge variant="outline" className="shrink-0 font-mono text-xs">
                            {r.fossittCode}
                          </Badge>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{r.fossittName}</div>
                            <div className="text-muted-foreground text-[11px]">
                              NLC: {r.nlcLabel}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-sm tabular-nums">
                              {r.areaHectares.toLocaleString()} ha
                            </div>
                            <div className="text-muted-foreground text-[11px] tabular-nums">
                              {pct}%
                            </div>
                          </div>
                          {note && <div className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />}
                        </div>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className="border-t border-blue-100 bg-blue-50/50 px-3 py-2.5">
                            <div className="mb-2">
                              <label className="text-muted-foreground mb-1 block text-[11px] font-medium">
                                Notes
                              </label>
                              <Textarea
                                placeholder="Add notes about this habitat..."
                                value={note}
                                onChange={(e) => updateNote(r.nlcId, e.target.value)}
                                className="min-h-[60px] bg-white text-xs"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <div className="text-muted-foreground text-[10px]">
                              {r.polygonCount.toLocaleString()} polygons in buffer zone
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* AI Habitat Analysis */}
                {(aiAnalysis || isAnalysing || aiError) && (
                  <div className="border-t p-3">
                    {isAnalysing ? (
                      <div className="flex items-center gap-2 py-4 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-purple-400" />
                      </div>
                    ) : aiError ? (
                      <div className="rounded-md border border-red-200 bg-red-50 p-3">
                        <p className="text-xs text-red-700">{aiError}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={generateAnalysis}
                        >
                          Try Again
                        </Button>
                      </div>
                    ) : aiAnalysis ? (
                      <div>
                        <div className="mb-2 flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                          <span className="text-xs font-semibold text-purple-700">
                            AI Habitat Analysis
                          </span>
                        </div>
                        <MarkdownContent text={aiAnalysis} />
                      </div>
                    ) : null}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      {showMap && (
        <div className="relative flex-1">
          <ProjectMap
            className="h-full"
            center={projectCenter ? [projectCenter.lat, projectCenter.lng] : IRELAND_CENTER}
            zoom={11}
            boundary={projectBoundary}
            bufferDistances={bufferDistances}
            habitatPolygons={styledPolygons}
            findings={[]}
          />

          <Button
            variant="secondary"
            size="sm"
            className="absolute top-4 right-4 z-1000"
            onClick={onToggleMap}
            data-map-control="true"
          >
            <EyeOff className="mr-1 h-4 w-4" />
            Hide Map
          </Button>
        </div>
      )}

      {!showMap && (
        <div className="flex flex-1 items-center justify-center bg-gray-50">
          <Button variant="outline" onClick={onToggleMap}>
            <Eye className="mr-2 h-4 w-4" />
            Show Map
          </Button>
        </div>
      )}
    </div>
  )
}
