'use client'

import * as React from 'react'
import { Search, Loader2, Check, AlertCircle, Info, Database, Save } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  useFindings,
  useSavedFindings,
  useCreateFinding,
  useDeleteFinding,
  useCompleteWorkflowStep,
  useFindingsStats,
} from '@/hooks/use-project-data'
import { SearchInterface } from '@/components/desk-research/search-interface'
import type { DeskResearchFinding as FindingCardType } from '@/components/desk-research/finding-card'
import { ProjectMap } from '@/components/maps/project-map'
import type { Project, WorkflowStep, DeskResearchFinding, Json } from '@/types/database'

interface DataGatheringStepProps {
  project: Project
  workflowStep: WorkflowStep
  userId: string
  onComplete?: () => void
}

export function DataGatheringStep({
  project,
  workflowStep,
  userId,
  onComplete,
}: DataGatheringStepProps) {
  const { toast } = useToast()
  const [showMap, setShowMap] = React.useState(true)
  const [selectedFinding, setSelectedFinding] = React.useState<FindingCardType | null>(null)
  const [localSavedFindings, setLocalSavedFindings] = React.useState<FindingCardType[]>([])

  // React Query hooks
  const { data: savedFindings = [], isLoading: isLoadingFindings } = useSavedFindings(project.id)
  const { data: findingsStats } = useFindingsStats(project.id)
  const createFinding = useCreateFinding()
  const deleteFinding = useDeleteFinding()
  const completeStep = useCompleteWorkflowStep()

  // Convert database findings to card format
  const dbFindingsAsCards = React.useMemo(() => {
    return savedFindings.map(
      (f): FindingCardType => ({
        id: f.id,
        source: f.source,
        dataType: f.data_type,
        title: f.title,
        content: f.content || undefined,
        rawData: f.raw_data as Record<string, unknown> | undefined,
        location: f.location as GeoJSON.Geometry | undefined,
        isSaved: true,
        notes: f.notes || undefined,
        metadata: (f.raw_data as Record<string, unknown>)?.metadata as FindingCardType['metadata'],
      })
    )
  }, [savedFindings])

  // Combine local and database saved findings
  const allSavedFindings = React.useMemo(() => {
    const dbIds = new Set(savedFindings.map((f) => f.id))
    const localOnly = localSavedFindings.filter((f) => !dbIds.has(f.id))
    return [...dbFindingsAsCards, ...localOnly]
  }, [dbFindingsAsCards, localSavedFindings, savedFindings])

  // Project boundary as GeoJSON
  const projectBoundary = project.boundary as GeoJSON.Feature<GeoJSON.Polygon> | undefined
  const projectCenter = project.center_point
    ? {
        lat: (project.center_point as GeoJSON.Point).coordinates[1],
        lng: (project.center_point as GeoJSON.Point).coordinates[0],
      }
    : undefined

  // Handle saving a finding
  const handleSaveFinding = async (finding: FindingCardType) => {
    if (finding.isSaved) {
      // Toggle off - remove from local state first
      setLocalSavedFindings((prev) => prev.filter((f) => f.id !== finding.id))

      // If it's in the database, delete it
      const dbFinding = savedFindings.find((f) => f.id === finding.id)
      if (dbFinding) {
        try {
          await deleteFinding.mutateAsync(finding.id)
        } catch (error) {
          toast({
            variant: 'destructive',
            title: 'Error removing finding',
            description: 'Failed to remove the finding from the database.',
          })
        }
      }
    } else {
      // Save it locally first for instant UI feedback
      setLocalSavedFindings((prev) => [...prev, { ...finding, isSaved: true }])

      // Then persist to database
      try {
        await createFinding.mutateAsync({
          project_id: project.id,
          source: finding.source,
          data_type: finding.dataType,
          title: finding.title,
          content: finding.content || null,
          raw_data: (finding.rawData as unknown as Json) || null,
          location: (finding.location as unknown as Json) || null,
          is_saved: true,
          notes: finding.notes || null,
          created_by: userId,
        })

        // Remove from local state after successful save (it will appear in dbFindings)
        setLocalSavedFindings((prev) => prev.filter((f) => f.id !== finding.id))
      } catch (error) {
        // Revert local state on error
        setLocalSavedFindings((prev) => prev.filter((f) => f.id !== finding.id))
        toast({
          variant: 'destructive',
          title: 'Error saving finding',
          description: 'Failed to save the finding to the database.',
        })
      }
    }
  }

  // Handle removing a finding
  const handleRemoveFinding = async (finding: FindingCardType) => {
    setLocalSavedFindings((prev) => prev.filter((f) => f.id !== finding.id))

    const dbFinding = savedFindings.find((f) => f.id === finding.id)
    if (dbFinding) {
      try {
        await deleteFinding.mutateAsync(finding.id)
        toast({
          title: 'Finding removed',
          description: 'The finding has been removed from your research.',
        })
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error removing finding',
          description: 'Failed to remove the finding.',
        })
      }
    }
  }

  // Handle viewing a finding on the map
  const handleViewOnMap = (finding: FindingCardType) => {
    setSelectedFinding(finding)
    setShowMap(true)
  }

  // Complete workflow step
  const handleComplete = async () => {
    if (allSavedFindings.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Cannot complete step',
        description: 'Please save at least one finding before completing this step.',
      })
      return
    }

    try {
      await completeStep.mutateAsync({
        projectId: project.id,
        stepNumber: workflowStep.step_number,
      })

      toast({
        title: 'Step completed',
        description: 'Data Gathering step has been completed. Moving to Desk Assessment.',
      })

      onComplete?.()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error completing step',
        description: 'Failed to complete the workflow step.',
      })
    }
  }

  const isComplete = workflowStep.status === 'approved'
  const canComplete = allSavedFindings.length > 0 && !isComplete

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Step 2: Data Gathering</h2>
          <p className="text-muted-foreground">
            Search external databases for relevant ecological data within the project area
          </p>
        </div>
        <Badge
          variant={
            isComplete ? 'default' : workflowStep.status === 'in_progress' ? 'secondary' : 'outline'
          }
        >
          {isComplete
            ? 'Completed'
            : workflowStep.status === 'in_progress'
              ? 'In Progress'
              : 'Pending'}
        </Badge>
      </div>

      {/* Instructions */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Data Sources</AlertTitle>
        <AlertDescription>
          Search NPWS for designated sites (SAC, SPA, NHA) and GBIF for species occurrence records.
          Save relevant findings to include them in your desk research assessment. All saved data is
          automatically stored in the project database.
        </AlertDescription>
      </Alert>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Findings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {findingsStats?.total || allSavedFindings.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Designated Sites</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {findingsStats?.byType.find((t) => t.type === 'designated_site')?.count ||
                allSavedFindings.filter((f) => f.dataType === 'designated_site').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Species Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {findingsStats?.byType.find((t) => t.type === 'species_record')?.count ||
                allSavedFindings.filter((f) => f.dataType === 'species_record').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Data Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {findingsStats?.bySource.length ||
                new Set(allSavedFindings.map((f) => f.source)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className={`grid gap-6 ${showMap ? 'lg:grid-cols-2' : ''}`}>
        {/* Search Interface */}
        <div>
          {!projectBoundary ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Project Boundary</AlertTitle>
              <AlertDescription>
                Please complete Step 1 (GIS Mapping) to define a project boundary before searching
                for data.
              </AlertDescription>
            </Alert>
          ) : (
            <SearchInterface
              projectId={project.id}
              projectBoundary={projectBoundary}
              projectCenter={projectCenter}
              gridReference={project.grid_reference || undefined}
              searchRadius={2}
              onFindingSave={handleSaveFinding}
              onFindingRemove={handleRemoveFinding}
              onViewOnMap={handleViewOnMap}
              savedFindings={allSavedFindings}
            />
          )}
        </div>

        {/* Map */}
        {showMap && (
          <Card className="h-fit lg:sticky lg:top-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Project Area</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setShowMap(false)}>
                  Hide Map
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ProjectMap
                className="h-125"
                center={projectCenter ? [projectCenter.lat, projectCenter.lng] : [53.1424, -7.6921]}
                zoom={12}
                boundary={projectBoundary}
                findings={allSavedFindings}
                selectedFinding={selectedFinding}
                onFindingClick={(finding) => setSelectedFinding(finding)}
              />
              {selectedFinding && (
                <div className="bg-muted mt-3 rounded-lg p-3">
                  <p className="text-sm font-medium">{selectedFinding.title}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {selectedFinding.metadata?.siteCode || selectedFinding.metadata?.scientificName}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!showMap && (
          <Button variant="outline" onClick={() => setShowMap(true)} className="w-fit">
            Show Map
          </Button>
        )}
      </div>

      {/* Progress Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Step Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Project boundary defined</span>
              {projectBoundary ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="text-muted-foreground h-4 w-4" />
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Findings saved</span>
              {allSavedFindings.length > 0 ? (
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-muted-foreground">{allSavedFindings.length} saved</span>
                </span>
              ) : (
                <AlertCircle className="text-muted-foreground h-4 w-4" />
              )}
            </div>
          </div>

          <Progress
            value={isComplete ? 100 : projectBoundary ? (allSavedFindings.length > 0 ? 75 : 50) : 0}
          />

          <div className="flex gap-2">
            <Button
              onClick={handleComplete}
              disabled={!canComplete || completeStep.isPending}
              className="flex-1"
            >
              {completeStep.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              {isComplete ? 'Completed' : 'Complete Step & Continue'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
