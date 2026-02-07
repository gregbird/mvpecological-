'use client'

import * as React from 'react'
import {
  Check,
  Download,
  FileSpreadsheet,
  FileJson,
  Plus,
  Loader2,
  MapPin,
  Shield,
  AlertCircle,
  ClipboardList,
  FileText,
  Waves,
  Bug,
  Sparkles,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Ruler,
} from 'lucide-react'
import dynamic from 'next/dynamic'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import { TargetNoteForm } from './target-note-form'
import type { Project, DeskResearchFinding } from '@/types/database'
import type { TargetNoteWithCreator } from '@/lib/supabase/queries/target-notes'

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

interface ReviewExportSubStepProps {
  project: Project
  projectBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  projectCenter?: { lat: number; lng: number }
  bufferDistances?: number[]
  userId: string
  savedFindings: DeskResearchFinding[]
  targetNotes: TargetNoteWithCreator[]
  findingsStats?: {
    total: number
    byType: { type: string; count: number }[]
    bySource: { source: string; count: number }[]
  } | null
  onComplete: () => void
  isCompleting: boolean
  isComplete: boolean
}

// Source badge colors
const SOURCE_COLORS: Record<string, string> = {
  npws: 'bg-emerald-100 text-emerald-700',
  gbif: 'bg-purple-100 text-purple-700',
  nbdc: 'bg-blue-100 text-blue-700',
  epa: 'bg-cyan-100 text-cyan-700',
  catchments: 'bg-cyan-100 text-cyan-700',
  manual: 'bg-gray-100 text-gray-700',
}

// Data type badge colors
const DATA_TYPE_COLORS: Record<string, string> = {
  designated_site: 'bg-emerald-100 text-emerald-700',
  species_record: 'bg-purple-100 text-purple-700',
  water_quality: 'bg-cyan-100 text-cyan-700',
  catchment: 'bg-cyan-100 text-cyan-700',
}

// Site type badge colors
const SITE_TYPE_COLORS: Record<string, string> = {
  SAC: 'bg-blue-100 text-blue-700',
  SPA: 'bg-amber-100 text-amber-700',
  NHA: 'bg-green-100 text-green-700',
  pNHA: 'bg-teal-100 text-teal-700',
}

// Red list status badge colors
const RED_LIST_COLORS: Record<string, string> = {
  CR: 'bg-red-200 text-red-800',
  EN: 'bg-red-100 text-red-700',
  VU: 'bg-orange-100 text-orange-700',
  NT: 'bg-yellow-100 text-yellow-700',
  LC: 'bg-green-100 text-green-700',
}

// Category display names
const CATEGORY_LABELS: Record<string, string> = {
  access_point: 'Access Point',
  check_feature: 'Check Feature',
  habitat: 'Habitat',
  fauna: 'Fauna',
  flora: 'Flora',
  management: 'Management',
  damage: 'Damage',
  ownership: 'Ownership',
}

export function ReviewExportSubStep({
  project,
  projectBoundary,
  projectCenter,
  bufferDistances,
  userId,
  savedFindings,
  targetNotes,
  onComplete,
  isCompleting,
  isComplete,
}: ReviewExportSubStepProps) {
  const { toast } = useToast()
  const [showNoteForm, setShowNoteForm] = React.useState(false)
  const [expandedFindingId, setExpandedFindingId] = React.useState<string | null>(null)

  // Helper to get AI summary from raw_data (inline summary only)
  const getAISummary = (finding: DeskResearchFinding): string | null => {
    const rawData = finding.raw_data as Record<string, unknown> | null
    if (!rawData) return null

    const metadata = rawData.metadata as Record<string, unknown> | undefined
    if (metadata?.aiSummary && typeof metadata.aiSummary === 'string') {
      return metadata.aiSummary
    }

    return null
  }

  // Helper to get deep research analysis from raw_data
  const getDeepResearch = (finding: DeskResearchFinding): string | null => {
    const rawData = finding.raw_data as Record<string, unknown> | null
    if (!rawData) return null

    const deepResearch = rawData.deepResearch as Record<string, unknown> | undefined
    if (deepResearch?.aiAnalysis && typeof deepResearch.aiAnalysis === 'string') {
      return deepResearch.aiAnalysis
    }

    return null
  }

  // Helper to get site type from finding metadata
  const getSiteType = (finding: DeskResearchFinding): string | null => {
    const rawData = finding.raw_data as Record<string, unknown> | null
    if (!rawData) return null
    const metadata = rawData.metadata as Record<string, unknown> | undefined
    return (metadata?.siteType as string) || null
  }

  // Check if a finding has any AI content
  const hasAnyAI = (finding: DeskResearchFinding): boolean => {
    return getAISummary(finding) !== null || getDeepResearch(finding) !== null
  }

  // Count findings with AI summaries or deep research
  const aiSummaryCount = savedFindings.filter((f) => getAISummary(f) !== null).length
  const deepResearchCount = savedFindings.filter((f) => getDeepResearch(f) !== null).length

  // Stats calculations
  const designatedSitesCount = savedFindings.filter((f) => f.data_type === 'designated_site').length
  const speciesRecordsCount = savedFindings.filter((f) => f.data_type === 'species_record').length
  const waterFeaturesCount = savedFindings.filter(
    (f) => f.data_type === 'water_quality' || f.data_type === 'catchment'
  ).length
  const protectedCount = savedFindings.filter((f) => f.is_protected).length

  // Group findings by source
  const findingsBySource = React.useMemo(() => {
    const groups: Record<string, DeskResearchFinding[]> = {}
    for (const finding of savedFindings) {
      if (!groups[finding.source]) {
        groups[finding.source] = []
      }
      groups[finding.source].push(finding)
    }
    return groups
  }, [savedFindings])

  // Export functions
  const exportAsCSV = () => {
    const headers = [
      'Title',
      'Source',
      'Type',
      'Site Type',
      'Distance (km)',
      'Protected',
      'Red List Status',
      'Content',
      'AI Summary',
      'Deep Research',
    ]
    const rows = savedFindings.map((f) => {
      const aiSummary = getAISummary(f)
      const deepResearch = getDeepResearch(f)
      const siteType = getSiteType(f)
      return [
        f.title,
        f.source.toUpperCase(),
        f.data_type.replace('_', ' '),
        siteType || '',
        f.distance_from_boundary_km?.toFixed(2) || '',
        f.is_protected ? 'Yes' : 'No',
        f.red_list_status || '',
        f.content || '',
        aiSummary ? aiSummary.replace(/"/g, '""').replace(/\n/g, ' ') : '',
        deepResearch ? deepResearch.replace(/"/g, '""').replace(/\n/g, ' ') : '',
      ]
    })

    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.name.replace(/\s+/g, '_')}_findings.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportAsGeoJSON = () => {
    const features = savedFindings
      .filter((f) => f.location)
      .map((f) => {
        const aiSummary = getAISummary(f)
        const deepResearch = getDeepResearch(f)
        const siteType = getSiteType(f)
        return {
          type: 'Feature' as const,
          geometry: f.location as GeoJSON.Geometry,
          properties: {
            id: f.id,
            title: f.title,
            source: f.source,
            dataType: f.data_type,
            siteType: siteType || undefined,
            distance_km: f.distance_from_boundary_km,
            isProtected: f.is_protected,
            redListStatus: f.red_list_status,
            content: f.content,
            aiSummary: aiSummary || undefined,
            deepResearch: deepResearch || undefined,
          },
        }
      })

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features,
    }

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.name.replace(/\s+/g, '_')}_findings.geojson`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportAsJSON = () => {
    const data = {
      project: {
        id: project.id,
        name: project.name,
        gridReference: project.grid_reference,
        county: project.county,
        townland: project.townland,
      },
      findings: savedFindings.map((f) => {
        const aiSummary = getAISummary(f)
        const deepResearch = getDeepResearch(f)
        const siteType = getSiteType(f)
        return {
          id: f.id,
          title: f.title,
          source: f.source,
          dataType: f.data_type,
          siteType: siteType || undefined,
          content: f.content,
          distance_km: f.distance_from_boundary_km,
          isProtected: f.is_protected,
          redListStatus: f.red_list_status,
          aiSummary: aiSummary || undefined,
          deepResearch: deepResearch || undefined,
          rawData: f.raw_data,
        }
      }),
      targetNotes: targetNotes.map((n) => ({
        id: n.id,
        category: n.category,
        title: n.title,
        description: n.description,
        priority: n.priority,
        isVerified: n.is_verified,
      })),
      exportedAt: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.name.replace(/\s+/g, '_')}_data.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const canComplete = savedFindings.length > 0 && !isComplete

  return (
    <div className="flex h-full">
      {/* Left Panel - Summary (60%) */}
      <div className="flex w-[60%] shrink-0 flex-col border-r bg-white">
        {/* Header */}
        <div className="border-b p-4">
          <h3 className="text-lg font-semibold">Review & Export</h3>
          <p className="text-muted-foreground text-sm">{savedFindings.length} findings collected</p>
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1">
          <div className="space-y-4 p-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-lg border bg-emerald-50 p-3 text-center">
                <MapPin className="mx-auto mb-1 h-5 w-5 text-emerald-600" />
                <div className="text-xl font-bold text-emerald-700">{designatedSitesCount}</div>
                <div className="text-[10px] text-emerald-600">Designated Sites</div>
              </div>
              <div className="rounded-lg border bg-purple-50 p-3 text-center">
                <Bug className="mx-auto mb-1 h-5 w-5 text-purple-600" />
                <div className="text-xl font-bold text-purple-700">{speciesRecordsCount}</div>
                <div className="text-[10px] text-purple-600">Species Records</div>
              </div>
              <div className="rounded-lg border bg-cyan-50 p-3 text-center">
                <Waves className="mx-auto mb-1 h-5 w-5 text-cyan-600" />
                <div className="text-xl font-bold text-cyan-700">{waterFeaturesCount}</div>
                <div className="text-[10px] text-cyan-600">Aquatic Features</div>
              </div>
              <div className="rounded-lg border bg-red-50 p-3 text-center">
                <Shield className="mx-auto mb-1 h-5 w-5 text-red-600" />
                <div className="text-xl font-bold text-red-700">{protectedCount}</div>
                <div className="text-[10px] text-red-600">Protected</div>
              </div>
            </div>

            {/* Protected Species Warning */}
            {protectedCount > 0 && (
              <Alert className="border-red-200 bg-red-50">
                <Shield className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  <strong>{protectedCount}</strong> protected species/sites found — ensure
                  mitigation measures are addressed in the assessment.
                </AlertDescription>
              </Alert>
            )}

            {/* Sources + AI Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border p-3">
                <h4 className="mb-2 text-sm font-medium">Data Sources</h4>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(findingsBySource).map(([source, findings]) => (
                    <Badge key={source} className={`${SOURCE_COLORS[source] || ''}`}>
                      {source.toUpperCase()} ({findings.length})
                    </Badge>
                  ))}
                  {Object.keys(findingsBySource).length === 0 && (
                    <span className="text-muted-foreground text-sm">No data yet</span>
                  )}
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <h4 className="mb-2 text-sm font-medium">AI Enrichment</h4>
                <div className="flex flex-wrap gap-1.5">
                  {aiSummaryCount > 0 && (
                    <Badge variant="secondary" className="gap-1">
                      <Sparkles className="h-3 w-3" />
                      {aiSummaryCount} AI Summaries
                    </Badge>
                  )}
                  {deepResearchCount > 0 && (
                    <Badge variant="secondary" className="gap-1 bg-indigo-100 text-indigo-700">
                      <BookOpen className="h-3 w-3" />
                      {deepResearchCount} Deep Research
                    </Badge>
                  )}
                  {aiSummaryCount === 0 && deepResearchCount === 0 && (
                    <span className="text-muted-foreground text-sm">No AI data</span>
                  )}
                </div>
              </div>
            </div>

            {/* Saved Findings List */}
            <div className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-medium">Saved Findings ({savedFindings.length})</h4>
              </div>
              {savedFindings.length === 0 ? (
                <div className="py-4 text-center">
                  <FileText className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                  <p className="text-muted-foreground text-sm">No findings saved</p>
                  <p className="text-muted-foreground text-xs">
                    Go to previous tabs to search and save findings
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedFindings.slice(0, 30).map((finding) => {
                    const aiSummary = getAISummary(finding)
                    const deepResearch = getDeepResearch(finding)
                    const siteType = getSiteType(finding)
                    const isExpanded = expandedFindingId === finding.id
                    const rawData = finding.raw_data as Record<string, unknown> | null
                    const metadata = rawData?.metadata as Record<string, unknown> | undefined
                    const scientificName = metadata?.scientificName as string | undefined
                    const taxonGroup = metadata?.taxonGroup as string | undefined
                    const designations = metadata?.designations as string | undefined
                    const totalRecords = metadata?.totalIrishRecords as number | undefined

                    return (
                      <div
                        key={finding.id}
                        className="cursor-pointer rounded-lg border bg-gray-50 text-sm transition-colors hover:bg-gray-100"
                        onClick={() => setExpandedFindingId(isExpanded ? null : finding.id)}
                      >
                        <div className="flex items-start gap-3 p-3">
                          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                            {/* Title row */}
                            <div className="flex items-center gap-1.5">
                              {finding.is_protected && (
                                <Shield className="h-4 w-4 shrink-0 text-red-500" />
                              )}
                              <span className="min-w-0 flex-1 font-medium">{finding.title}</span>
                            </div>
                            {/* Scientific name / taxon for species */}
                            {scientificName && scientificName !== finding.title && (
                              <p className="text-xs text-gray-500 italic">{scientificName}</p>
                            )}
                            {/* Content preview */}
                            {finding.content && (
                              <p className="text-muted-foreground line-clamp-2 text-xs">
                                {finding.content}
                              </p>
                            )}
                            {/* Badge row */}
                            <div className="flex flex-wrap items-center gap-1">
                              {/* Data type badge */}
                              <Badge
                                className={`text-[9px] ${DATA_TYPE_COLORS[finding.data_type] || 'bg-gray-100 text-gray-600'}`}
                              >
                                {finding.data_type.replace('_', ' ')}
                              </Badge>
                              {/* Source badge */}
                              <Badge variant="outline" className="text-[9px]">
                                {finding.source.toUpperCase()}
                              </Badge>
                              {/* Site type badge */}
                              {siteType && (
                                <Badge
                                  className={`text-[9px] ${SITE_TYPE_COLORS[siteType] || 'bg-gray-100 text-gray-600'}`}
                                >
                                  {siteType}
                                </Badge>
                              )}
                              {/* Taxon group */}
                              {taxonGroup && (
                                <Badge variant="outline" className="text-[9px]">
                                  {taxonGroup}
                                </Badge>
                              )}
                              {/* Distance badge */}
                              {finding.distance_from_boundary_km != null && (
                                <Badge variant="outline" className="gap-0.5 text-[9px]">
                                  <Ruler className="h-2.5 w-2.5" />
                                  {finding.distance_from_boundary_km.toFixed(1)} km
                                </Badge>
                              )}
                              {/* Red list badge */}
                              {finding.red_list_status && (
                                <Badge
                                  className={`text-[9px] ${RED_LIST_COLORS[finding.red_list_status] || 'bg-orange-100 text-orange-700'}`}
                                >
                                  {finding.red_list_status}
                                </Badge>
                              )}
                              {/* Record count */}
                              {totalRecords != null && totalRecords > 0 && (
                                <Badge variant="outline" className="text-[9px]">
                                  {totalRecords.toLocaleString()} Irish records
                                </Badge>
                              )}
                              {/* AI icons */}
                              {aiSummary && (
                                <Sparkles className="h-3 w-3 shrink-0 text-purple-500" />
                              )}
                              {deepResearch && (
                                <BookOpen className="h-3 w-3 shrink-0 text-indigo-500" />
                              )}
                            </div>
                            {/* Designations preview for species */}
                            {designations && (
                              <p className="text-[10px] leading-tight text-red-600">
                                {designations
                                  .split('||')
                                  .slice(0, 2)
                                  .map((d) => d.trim())
                                  .join(' · ')}
                                {designations.split('||').length > 2 && ' ...'}
                              </p>
                            )}
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                          ) : (
                            <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                          )}
                        </div>

                        {/* Expanded content */}
                        {isExpanded && (
                          <div className="space-y-0 border-t">
                            {/* Full content */}
                            {finding.content && (
                              <div className="border-b bg-white p-3">
                                <div className="mb-1 text-[10px] font-medium text-gray-500 uppercase">
                                  Description
                                </div>
                                <p className="text-muted-foreground text-xs leading-relaxed whitespace-pre-line">
                                  {finding.content}
                                </p>
                              </div>
                            )}
                            {/* AI Summary section */}
                            {aiSummary && (
                              <div className="bg-purple-50 p-3">
                                <div className="mb-1 flex items-center gap-1 text-[10px] font-medium text-purple-700">
                                  <Sparkles className="h-3 w-3" />
                                  AI Summary
                                </div>
                                <p className="text-muted-foreground text-xs leading-relaxed">
                                  {aiSummary}
                                </p>
                              </div>
                            )}
                            {/* Deep Research section */}
                            {deepResearch && (
                              <div
                                className={`bg-indigo-50 p-3 ${aiSummary ? 'border-t border-indigo-100' : ''}`}
                              >
                                <div className="mb-1 flex items-center gap-1 text-[10px] font-medium text-indigo-700">
                                  <BookOpen className="h-3 w-3" />
                                  Deep Research
                                </div>
                                <p className="text-muted-foreground text-xs leading-relaxed">
                                  {deepResearch.substring(0, 600)}
                                  {deepResearch.length > 600 && '...'}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {savedFindings.length > 30 && (
                    <p className="text-muted-foreground pt-1 text-center text-xs">
                      +{savedFindings.length - 30} more findings
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Target Notes */}
            <div className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-medium">Target Notes ({targetNotes.length})</h4>
                <Dialog open={showNoteForm} onOpenChange={setShowNoteForm}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 px-2">
                      <Plus className="mr-1 h-3 w-3" />
                      Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Target Note</DialogTitle>
                      <DialogDescription>
                        Add a note for field surveyors to check during their visit.
                      </DialogDescription>
                    </DialogHeader>
                    <TargetNoteForm
                      projectId={project.id}
                      userId={userId}
                      onSuccess={() => setShowNoteForm(false)}
                      onCancel={() => setShowNoteForm(false)}
                    />
                  </DialogContent>
                </Dialog>
              </div>
              {targetNotes.length === 0 ? (
                <div className="py-3 text-center">
                  <ClipboardList className="mx-auto mb-1 h-6 w-6 text-gray-300" />
                  <p className="text-muted-foreground text-xs">No target notes yet</p>
                  <p className="text-muted-foreground mt-1 text-[10px]">
                    Add notes for features to investigate in the field
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {targetNotes.map((note) => (
                    <div key={note.id} className="rounded-lg border bg-gray-50 p-2.5">
                      <div className="flex items-center gap-2">
                        <span className="flex-1 text-sm font-medium">{note.title}</span>
                        <div className="flex items-center gap-1">
                          {note.priority === 'high' && (
                            <Badge variant="destructive" className="text-[9px]">
                              High
                            </Badge>
                          )}
                          {note.priority === 'low' && (
                            <Badge variant="outline" className="text-[9px] text-gray-500">
                              Low
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-[9px]">
                            {CATEGORY_LABELS[note.category] || note.category}
                          </Badge>
                        </div>
                      </div>
                      {note.description && (
                        <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                          {note.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Export Buttons */}
            <div className="rounded-lg border p-3">
              <h4 className="mb-2 text-sm font-medium">Export Data</h4>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportAsCSV}
                  disabled={savedFindings.length === 0}
                  className="h-auto flex-col py-3"
                >
                  <FileSpreadsheet className="mb-1 h-5 w-5" />
                  <span className="text-xs">CSV</span>
                  <span className="text-muted-foreground text-[9px]">Spreadsheet</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportAsGeoJSON}
                  disabled={savedFindings.length === 0}
                  className="h-auto flex-col py-3"
                >
                  <MapPin className="mb-1 h-5 w-5" />
                  <span className="text-xs">GeoJSON</span>
                  <span className="text-muted-foreground text-[9px]">Spatial Data</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportAsJSON}
                  disabled={savedFindings.length === 0}
                  className="h-auto flex-col py-3"
                >
                  <FileJson className="mb-1 h-5 w-5" />
                  <span className="text-xs">JSON</span>
                  <span className="text-muted-foreground text-[9px]">Full Data</span>
                </Button>
              </div>
            </div>

            {/* Validation Warning */}
            {savedFindings.length === 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Save at least one finding to complete this step.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </ScrollArea>

        {/* Complete Button - Fixed at bottom */}
        <div className="border-t bg-white p-4">
          <Button
            onClick={onComplete}
            disabled={!canComplete || isCompleting}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            size="lg"
          >
            {isCompleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Completing...
              </>
            ) : isComplete ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Completed
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Complete Data Gathering
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Right - Map (40%) */}
      <div className="w-[40%] shrink-0">
        <ProjectMap
          className="h-full"
          center={projectCenter ? [projectCenter.lat, projectCenter.lng] : [53.1424, -7.6921]}
          zoom={12}
          boundary={projectBoundary}
          bufferDistances={bufferDistances}
          findings={savedFindings.map((f) => {
            const raw = f.raw_data as Record<string, unknown> | null
            const meta = raw?.metadata as Record<string, unknown> | undefined
            return {
              id: f.id,
              source: f.source as
                | 'npws'
                | 'gbif'
                | 'nbdc'
                | 'epa'
                | 'catchments'
                | 'fpo'
                | 'manual',
              dataType: f.data_type as
                | 'designated_site'
                | 'species_record'
                | 'water_quality'
                | 'catchment'
                | 'other',
              title: f.title,
              content: f.content || undefined,
              location: f.location as GeoJSON.Geometry | undefined,
              isSaved: true,
              metadata: {
                siteCode: meta?.siteCode as string | undefined,
                siteType: meta?.siteType as string | undefined,
                scientificName: meta?.scientificName as string | undefined,
                commonName: meta?.commonName as string | undefined,
                recordCount: meta?.recordCount as number | undefined,
                isProtected: f.is_protected || (meta?.isProtected as boolean | undefined),
                isInvasive: meta?.isInvasive as boolean | undefined,
                isThreatened: meta?.isThreatened as boolean | undefined,
                designation: meta?.designation as string | undefined,
                designations: meta?.designations as string | undefined,
                distance: f.distance_from_boundary_km ?? (meta?.distance as number | undefined),
                taxonGroup: meta?.taxonGroup as string | undefined,
                totalIrishRecords: meta?.totalIrishRecords as number | undefined,
              },
            }
          })}
        />
      </div>
    </div>
  )
}
