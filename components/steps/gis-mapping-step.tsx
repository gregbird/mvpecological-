'use client'

import * as React from 'react'
import { FileUp, MapPin, Loader2, Check, AlertCircle, Info } from 'lucide-react'
import dynamic from 'next/dynamic'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useUpdateProjectBoundary, useCompleteWorkflowStep } from '@/hooks/use-project-data'
import { calculateAreaHectares } from '@/lib/supabase/queries/habitats'
import type { Project, WorkflowStep } from '@/types/database'

// Dynamic import for map with draw controls
const ProjectMapWithDraw = dynamic(
  () => import('@/components/maps/project-map-with-draw').then((mod) => mod.ProjectMapWithDraw),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted/50 flex h-[500px] items-center justify-center rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ),
  }
)

interface GISMappingStepProps {
  project: Project
  workflowStep: WorkflowStep
  onComplete?: () => void
}

// Irish Grid Reference conversion (simple approximation)
function toIrishGridRef(lat: number, lng: number): string {
  // Simple approximation for demonstration
  // In production, use a proper coordinate transformation library
  const letters = [
    ['V', 'W', 'X', 'Y', 'Z'],
    ['Q', 'R', 'S', 'T', 'U'],
    ['L', 'M', 'N', 'O', 'P'],
    ['F', 'G', 'H', 'J', 'K'],
    ['A', 'B', 'C', 'D', 'E'],
  ]

  // Very rough conversion for Irish coordinates
  // Proper implementation would use EPSG:29903 transformation
  const eastingBase = (lng + 10.5) * 100000
  const northingBase = (lat - 51.4) * 111000

  const e100k = Math.floor(eastingBase / 100000)
  const n100k = Math.floor(northingBase / 100000)

  if (e100k < 0 || e100k > 4 || n100k < 0 || n100k > 4) {
    return 'Outside Ireland'
  }

  const letter = letters[4 - n100k]?.[e100k] || 'X'
  const easting = Math.floor((eastingBase % 100000) / 100)
    .toString()
    .padStart(3, '0')
  const northing = Math.floor((northingBase % 100000) / 100)
    .toString()
    .padStart(3, '0')

  return `${letter} ${easting} ${northing}`
}

export function GISMappingStep({ project, workflowStep, onComplete }: GISMappingStepProps) {
  const { toast } = useToast()
  const [boundary, setBoundary] = React.useState<GeoJSON.Feature<GeoJSON.Polygon> | null>(
    project.boundary as GeoJSON.Feature<GeoJSON.Polygon> | null
  )
  const [uploadedFile, setUploadedFile] = React.useState<File | null>(null)
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const updateBoundary = useUpdateProjectBoundary()
  const completeStep = useCompleteWorkflowStep()

  // Calculate boundary info
  const boundaryInfo = React.useMemo(() => {
    if (!boundary || !boundary.geometry) return null

    const coords = boundary.geometry.coordinates[0]
    if (coords.length < 3) return null

    // Calculate center point
    const lats = coords.map((c) => c[1])
    const lngs = coords.map((c) => c[0])
    const centerLat = lats.reduce((a, b) => a + b) / lats.length
    const centerLng = lngs.reduce((a, b) => a + b) / lngs.length

    // Calculate area
    const area = calculateAreaHectares(boundary.geometry)

    // Calculate grid reference
    const gridRef = toIrishGridRef(centerLat, centerLng)

    return {
      centerLat: centerLat.toFixed(6),
      centerLng: centerLng.toFixed(6),
      area: area.toFixed(2),
      gridRef,
      pointCount: coords.length - 1, // Last point repeats first
    }
  }, [boundary])

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadedFile(file)
    setIsProcessing(true)

    try {
      const text = await file.text()

      // Try to parse as GeoJSON
      if (file.name.endsWith('.geojson') || file.name.endsWith('.json')) {
        const geojson = JSON.parse(text)

        let feature: GeoJSON.Feature<GeoJSON.Polygon> | null = null

        if (geojson.type === 'FeatureCollection' && geojson.features?.length > 0) {
          // Find first polygon feature
          feature = geojson.features.find(
            (f: GeoJSON.Feature) =>
              f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon'
          )
        } else if (geojson.type === 'Feature' && geojson.geometry) {
          feature = geojson
        } else if (geojson.type === 'Polygon') {
          feature = { type: 'Feature', geometry: geojson, properties: {} }
        }

        if (feature) {
          // If MultiPolygon, convert to Polygon (take first)
          const geom = feature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon
          if (geom.type === 'MultiPolygon') {
            feature = {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: geom.coordinates[0],
              },
              properties: feature.properties,
            } as GeoJSON.Feature<GeoJSON.Polygon>
          }

          setBoundary(feature as GeoJSON.Feature<GeoJSON.Polygon>)
          setHasUnsavedChanges(true)
          toast({
            title: 'Boundary loaded',
            description: `Successfully loaded boundary from ${file.name}`,
          })
        } else {
          throw new Error('No polygon found in file')
        }
      } else if (file.name.endsWith('.shp') || file.name.endsWith('.zip')) {
        // For Shapefile support, we would need shpjs library
        toast({
          variant: 'destructive',
          title: 'Shapefile not supported',
          description: 'Please convert your Shapefile to GeoJSON format.',
        })
      } else {
        throw new Error('Unsupported file format')
      }
    } catch (error) {
      console.error('Error parsing file:', error)
      toast({
        variant: 'destructive',
        title: 'Error loading file',
        description: error instanceof Error ? error.message : 'Failed to parse the uploaded file',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle boundary drawn on map
  const handleBoundaryChange = (features: GeoJSON.FeatureCollection) => {
    if (features.features.length > 0) {
      const feature = features.features[0] as GeoJSON.Feature<GeoJSON.Polygon>
      setBoundary(feature)
      setHasUnsavedChanges(true)
    }
  }

  // Save boundary to Supabase
  const handleSave = async () => {
    if (!boundary || !boundaryInfo) return

    try {
      const centerPoint = {
        type: 'Point',
        coordinates: [parseFloat(boundaryInfo.centerLng), parseFloat(boundaryInfo.centerLat)],
      }

      await updateBoundary.mutateAsync({
        projectId: project.id,
        boundary: boundary,
        centerPoint: centerPoint,
        gridReference: boundaryInfo.gridRef,
      })

      setHasUnsavedChanges(false)
      toast({
        title: 'Boundary saved',
        description: 'Project boundary has been saved successfully.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error saving boundary',
        description: 'Failed to save the project boundary. Please try again.',
      })
    }
  }

  // Complete workflow step
  const handleComplete = async () => {
    if (!boundary) {
      toast({
        variant: 'destructive',
        title: 'Cannot complete step',
        description: 'Please draw or upload a project boundary first.',
      })
      return
    }

    if (hasUnsavedChanges) {
      await handleSave()
    }

    try {
      await completeStep.mutateAsync({
        projectId: project.id,
        stepNumber: workflowStep.step_number,
      })

      toast({
        title: 'Step completed',
        description: 'GIS Mapping step has been completed. Moving to Data Gathering.',
      })

      onComplete?.()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error completing step',
        description: 'Failed to complete the workflow step. Please try again.',
      })
    }
  }

  const isComplete = workflowStep.status === 'approved'
  const canComplete = boundary && !hasUnsavedChanges && !isComplete

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Step 1: GIS Mapping</h2>
          <p className="text-muted-foreground">
            Define the project boundary by uploading a file or drawing on the map
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
        <AlertTitle>Getting Started</AlertTitle>
        <AlertDescription>
          Upload a GeoJSON file with the project boundary, or use the drawing tools on the map to
          manually define the site area. The boundary will be used for all subsequent analysis
          steps.
        </AlertDescription>
      </Alert>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Map Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Project Boundary</CardTitle>
              <CardDescription>
                {boundary
                  ? 'Boundary defined. You can edit it or upload a new one.'
                  : 'No boundary defined yet. Upload a file or draw on the map.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="draw" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="draw">Draw on Map</TabsTrigger>
                  <TabsTrigger value="upload">Upload File</TabsTrigger>
                </TabsList>

                <TabsContent value="draw" className="space-y-4">
                  <div className="h-[500px] overflow-hidden rounded-lg border">
                    <ProjectMapWithDraw
                      boundary={boundary ?? undefined}
                      onBoundaryChange={handleBoundaryChange}
                      editable={!isComplete}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="upload" className="space-y-4">
                  <div
                    className="hover:border-primary hover:bg-muted/50 cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".geojson,.json"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isProcessing || isComplete}
                    />
                    {isProcessing ? (
                      <Loader2 className="text-muted-foreground mx-auto h-12 w-12 animate-spin" />
                    ) : (
                      <FileUp className="text-muted-foreground mx-auto h-12 w-12" />
                    )}
                    <h3 className="mt-4 text-lg font-semibold">
                      {isProcessing ? 'Processing...' : 'Upload Boundary File'}
                    </h3>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Drag and drop or click to upload a GeoJSON file
                    </p>
                    <p className="text-muted-foreground mt-2 text-xs">
                      Supported formats: .geojson, .json
                    </p>
                    {uploadedFile && (
                      <p className="mt-2 text-sm text-green-600">Uploaded: {uploadedFile.name}</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Info Panel */}
        <div className="space-y-4">
          {/* Boundary Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Boundary Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {boundaryInfo ? (
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Grid Reference</dt>
                    <dd className="font-mono font-semibold">{boundaryInfo.gridRef}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Area</dt>
                    <dd className="font-semibold">{boundaryInfo.area} ha</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Center (Lat)</dt>
                    <dd className="font-mono text-xs">{boundaryInfo.centerLat}°</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Center (Lng)</dt>
                    <dd className="font-mono text-xs">{boundaryInfo.centerLng}°</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Vertices</dt>
                    <dd>{boundaryInfo.pointCount}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No boundary defined yet. Draw or upload a boundary to see information.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Step Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Boundary defined</span>
                  {boundary ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="text-muted-foreground h-4 w-4" />
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Changes saved</span>
                  {!hasUnsavedChanges && boundary ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="text-muted-foreground h-4 w-4" />
                  )}
                </div>
              </div>
              <Progress value={isComplete ? 100 : boundary ? (hasUnsavedChanges ? 50 : 75) : 0} />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || updateBoundary.isPending || isComplete}
              variant="secondary"
            >
              {updateBoundary.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Save Boundary
            </Button>

            <Button onClick={handleComplete} disabled={!canComplete || completeStep.isPending}>
              {completeStep.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              {isComplete ? 'Completed' : 'Complete Step & Continue'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
