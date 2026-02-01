'use client'

import * as React from 'react'
import {
  Check,
  Download,
  FileSpreadsheet,
  FileJson,
  FileText,
  Plus,
  Loader2,
  MapPin,
  Shield,
  AlertCircle,
  ClipboardList,
} from 'lucide-react'
import dynamic from 'next/dynamic'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import type { Project, DeskResearchFinding, TargetNote, Json } from '@/types/database'
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
  userId,
  savedFindings,
  targetNotes,
  findingsStats,
  onComplete,
  isCompleting,
  isComplete,
}: ReviewExportSubStepProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = React.useState<'summary' | 'findings' | 'notes'>('summary')
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

  // Group target notes by category
  const notesByCategory = React.useMemo(() => {
    const groups: Record<string, TargetNoteWithCreator[]> = {}
    for (const note of targetNotes) {
      if (!groups[note.category]) {
        groups[note.category] = []
      }
      groups[note.category].push(note)
    }
    return groups
  }, [targetNotes])

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

    toast({ title: 'Export complete', description: 'CSV file downloaded successfully.' })
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

    toast({ title: 'Export complete', description: 'GeoJSON file downloaded successfully.' })
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

    toast({ title: 'Export complete', description: 'JSON file downloaded successfully.' })
  }

  const canComplete = savedFindings.length > 0 && !isComplete

  return (
    <div className="flex h-full">
      {/* Map */}
      <div className="flex-1">
        <ProjectMap
          className="h-full"
          center={projectCenter ? [projectCenter.lat, projectCenter.lng] : [53.1424, -7.6921]}
          zoom={12}
          boundary={projectBoundary}
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

      {/* Review Panel */}
      <div className="flex w-[400px] flex-col border-l">
        <div className="border-b p-4">
          <h3 className="font-semibold">Review & Export</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Review your findings and create target notes for field surveyors.
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          className="flex flex-1 flex-col"
        >
          <TabsList className="mx-4 mt-4">
            <TabsTrigger value="summary" className="flex-1">
              Summary
            </TabsTrigger>
            <TabsTrigger value="findings" className="flex-1">
              Findings
              {savedFindings.length > 0 && (
                <Badge variant="secondary" className="ml-1.5">
                  {savedFindings.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex-1">
              Notes
              {targetNotes.length > 0 && (
                <Badge variant="secondary" className="ml-1.5">
                  {targetNotes.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-4 p-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <Card>
                    <CardContent className="p-3 text-center">
                      <div className="text-2xl font-bold">{savedFindings.length}</div>
                      <div className="text-muted-foreground text-xs">Total Findings</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <div className="text-2xl font-bold">{targetNotes.length}</div>
                      <div className="text-muted-foreground text-xs">Target Notes</div>
                    </CardContent>
                  </Card>
                </div>

                {/* By Type */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">By Type</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Designated Sites</span>
                      <Badge variant="secondary">{designatedSitesCount}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Species Records</span>
                      <Badge variant="secondary">{speciesRecordsCount}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Aquatic Features</span>
                      <Badge variant="secondary">{waterFeaturesCount}</Badge>
                    </div>
                    {protectedCount > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-red-600">
                          <Shield className="h-3 w-3" />
                          Protected
                        </span>
                        <Badge variant="destructive">{protectedCount}</Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* By Source */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">By Source</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(findingsBySource).map(([source, findings]) => (
                        <Badge
                          key={source}
                          variant="secondary"
                          className={SOURCE_COLORS[source] || ''}
                        >
                          {source.toUpperCase()} ({findings.length})
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Export Options */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Export Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <Download className="mr-2 h-4 w-4" />
                          Export Findings
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={exportAsCSV}>
                          <FileSpreadsheet className="mr-2 h-4 w-4" />
                          Export as CSV
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={exportAsGeoJSON}>
                          <MapPin className="mr-2 h-4 w-4" />
                          Export as GeoJSON
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={exportAsJSON}>
                          <FileJson className="mr-2 h-4 w-4" />
                          Export as JSON
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardContent>
                </Card>

                {/* Validation */}
                {savedFindings.length === 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      You need to save at least one finding before completing this step.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Findings Tab */}
          <TabsContent value="findings" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-2 p-4">
                {savedFindings.length === 0 ? (
                  <div className="py-8 text-center">
                    <FileText className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                    <p className="text-muted-foreground text-sm">No findings saved yet</p>
                  </div>
                ) : (
                  savedFindings.map((finding) => (
                    <Card key={finding.id} className="border-emerald-200">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          {finding.is_protected && (
                            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                          )}
                          <div className="min-w-0 flex-1">
                            <h4 className="truncate font-medium">{finding.title}</h4>
                            <div className="mt-1 flex flex-wrap gap-1">
                              <Badge
                                variant="secondary"
                                className={`text-[10px] ${SOURCE_COLORS[finding.source] || ''}`}
                              >
                                {finding.source.toUpperCase()}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                {finding.data_type.replace('_', ' ')}
                              </Badge>
                              {finding.distance_from_boundary_km !== null && (
                                <Badge variant="outline" className="text-[10px]">
                                  {finding.distance_from_boundary_km === 0
                                    ? 'Within site'
                                    : `${finding.distance_from_boundary_km.toFixed(1)} km`}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Target Notes Tab */}
          <TabsContent value="notes" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-4 p-4">
                {/* Add Note Button */}
                <Dialog open={showNoteForm} onOpenChange={setShowNoteForm}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Target Note
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
                      onSuccess={() => {
                        setShowNoteForm(false)
                        toast({ title: 'Target note created' })
                      }}
                      onCancel={() => setShowNoteForm(false)}
                    />
                  </DialogContent>
                </Dialog>

                {/* Notes List */}
                {targetNotes.length === 0 ? (
                  <div className="py-8 text-center">
                    <ClipboardList className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                    <p className="text-muted-foreground text-sm">No target notes yet</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Target notes help field surveyors know what to check
                    </p>
                  </div>
                ) : (
                  Object.entries(notesByCategory).map(([category, notes]) => (
                    <div key={category}>
                      <h4 className="mb-2 text-sm font-medium">
                        {CATEGORY_LABELS[category] || category}
                      </h4>
                      <div className="space-y-2">
                        {notes.map((note) => (
                          <Card key={note.id}>
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <h5 className="font-medium">{note.title}</h5>
                                  {note.description && (
                                    <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                                      {note.description}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  {note.priority === 'high' && (
                                    <Badge variant="destructive" className="text-[10px]">
                                      High
                                    </Badge>
                                  )}
                                  {note.is_verified && (
                                    <Badge variant="default" className="gap-0.5 text-[10px]">
                                      <Check className="h-3 w-3" />
                                      Verified
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Complete Button */}
        <div className="border-t p-4">
          <Button
            onClick={onComplete}
            disabled={!canComplete || isCompleting}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
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
                Complete Step
              </>
            )}
          </Button>
          {savedFindings.length === 0 && !isComplete && (
            <p className="text-muted-foreground mt-2 text-center text-xs">
              Save at least one finding to complete this step
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
