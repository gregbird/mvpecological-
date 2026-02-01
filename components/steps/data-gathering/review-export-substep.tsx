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
  manual: 'bg-gray-100 text-gray-700',
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
      'Distance (km)',
      'Protected',
      'Red List Status',
      'Content',
    ]
    const rows = savedFindings.map((f) => [
      f.title,
      f.source.toUpperCase(),
      f.data_type.replace('_', ' '),
      f.distance_from_boundary_km?.toFixed(2) || '',
      f.is_protected ? 'Yes' : 'No',
      f.red_list_status || '',
      f.content || '',
    ])

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
      .map((f) => ({
        type: 'Feature' as const,
        geometry: f.location as GeoJSON.Geometry,
        properties: {
          id: f.id,
          title: f.title,
          source: f.source,
          dataType: f.data_type,
          distance_km: f.distance_from_boundary_km,
          isProtected: f.is_protected,
          redListStatus: f.red_list_status,
          content: f.content,
        },
      }))

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
      findings: savedFindings.map((f) => ({
        id: f.id,
        title: f.title,
        source: f.source,
        dataType: f.data_type,
        content: f.content,
        distance_km: f.distance_from_boundary_km,
        isProtected: f.is_protected,
        redListStatus: f.red_list_status,
        rawData: f.raw_data,
      })),
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
      {/* Left Panel - Summary */}
      <div className="flex w-[400px] shrink-0 flex-col border-r bg-white">
        {/* Header */}
        <div className="border-b p-4">
          <h3 className="text-lg font-semibold">Review & Export</h3>
          <p className="text-muted-foreground text-sm">{savedFindings.length} findings collected</p>
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1">
          <div className="space-y-4 p-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border bg-emerald-50 p-3 text-center">
                <MapPin className="mx-auto mb-1 h-5 w-5 text-emerald-600" />
                <div className="text-xl font-bold text-emerald-700">{designatedSitesCount}</div>
                <div className="text-[10px] text-emerald-600">Sites</div>
              </div>
              <div className="rounded-lg border bg-purple-50 p-3 text-center">
                <Bug className="mx-auto mb-1 h-5 w-5 text-purple-600" />
                <div className="text-xl font-bold text-purple-700">{speciesRecordsCount}</div>
                <div className="text-[10px] text-purple-600">Species</div>
              </div>
              <div className="rounded-lg border bg-cyan-50 p-3 text-center">
                <Waves className="mx-auto mb-1 h-5 w-5 text-cyan-600" />
                <div className="text-xl font-bold text-cyan-700">{waterFeaturesCount}</div>
                <div className="text-[10px] text-cyan-600">Aquatic</div>
              </div>
            </div>

            {/* Protected Species Warning */}
            {protectedCount > 0 && (
              <Alert className="border-red-200 bg-red-50">
                <Shield className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  <strong>{protectedCount}</strong> protected species found in this area
                </AlertDescription>
              </Alert>
            )}

            {/* Sources */}
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

            {/* Saved Findings List */}
            <div className="rounded-lg border p-3">
              <h4 className="mb-2 text-sm font-medium">Saved Findings</h4>
              {savedFindings.length === 0 ? (
                <div className="py-4 text-center">
                  <FileText className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                  <p className="text-muted-foreground text-sm">No findings saved</p>
                </div>
              ) : (
                <div className="max-h-[200px] space-y-1.5 overflow-y-auto">
                  {savedFindings.slice(0, 10).map((finding) => (
                    <div
                      key={finding.id}
                      className="flex items-center gap-2 rounded border bg-gray-50 p-2 text-sm"
                    >
                      {finding.is_protected && (
                        <Shield className="h-3.5 w-3.5 shrink-0 text-red-500" />
                      )}
                      <span className="min-w-0 flex-1 truncate">{finding.title}</span>
                      <Badge variant="outline" className="shrink-0 text-[9px]">
                        {finding.source.toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                  {savedFindings.length > 10 && (
                    <p className="text-muted-foreground pt-1 text-center text-xs">
                      +{savedFindings.length - 10} more findings
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Target Notes */}
            <div className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-medium">Target Notes</h4>
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
                </div>
              ) : (
                <div className="space-y-1.5">
                  {targetNotes.map((note) => (
                    <div key={note.id} className="rounded border bg-gray-50 p-2">
                      <div className="flex items-center gap-2">
                        <span className="flex-1 truncate text-sm font-medium">{note.title}</span>
                        {note.priority === 'high' && (
                          <Badge variant="destructive" className="text-[9px]">
                            High
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {CATEGORY_LABELS[note.category] || note.category}
                      </p>
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
                  className="h-auto flex-col py-2"
                >
                  <FileSpreadsheet className="mb-1 h-4 w-4" />
                  <span className="text-[10px]">CSV</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportAsGeoJSON}
                  disabled={savedFindings.length === 0}
                  className="h-auto flex-col py-2"
                >
                  <MapPin className="mb-1 h-4 w-4" />
                  <span className="text-[10px]">GeoJSON</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportAsJSON}
                  disabled={savedFindings.length === 0}
                  className="h-auto flex-col py-2"
                >
                  <FileJson className="mb-1 h-4 w-4" />
                  <span className="text-[10px]">JSON</span>
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

      {/* Right - Map */}
      <div className="flex-1">
        <ProjectMap
          className="h-full"
          center={projectCenter ? [projectCenter.lat, projectCenter.lng] : [53.1424, -7.6921]}
          zoom={12}
          boundary={projectBoundary}
          bufferDistances={bufferDistances}
          findings={savedFindings.map((f) => ({
            id: f.id,
            source: f.source,
            dataType: f.data_type,
            title: f.title,
            content: f.content || undefined,
            location: f.location as GeoJSON.Geometry | undefined,
            isSaved: true,
          }))}
        />
      </div>
    </div>
  )
}
