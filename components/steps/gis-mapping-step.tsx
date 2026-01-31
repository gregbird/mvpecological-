'use client'

import * as React from 'react'
import {
  FileUp,
  MapPin,
  Loader2,
  Check,
  AlertCircle,
  Globe,
  Database,
  Pencil,
  Clock,
} from 'lucide-react'
import dynamic from 'next/dynamic'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { useUpdateProjectBoundary, useCompleteWorkflowStep } from '@/hooks/use-project-data'
import { calculateAreaHectares } from '@/lib/supabase/queries/habitats'
import {
  GISConnectionModal,
  type GISSourceType,
  DatasetLayersPanel,
  BufferZonePanel,
} from '@/components/gis'
import { getDefaultVisibleLayers } from '@/lib/config/dataset-layers'
import {
  parseShapefile,
  isShapefileType,
  validateBoundary,
  getCRSName,
  calculatePerimeter,
  getLocationFromBoundary,
  type IrishLocationInfo,
} from '@/lib/gis'
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
  userId?: string
  onComplete?: () => void
}

// Irish Grid Reference conversion (simple approximation)
function toIrishGridRef(lat: number, lng: number): string {
  const letters = [
    ['V', 'W', 'X', 'Y', 'Z'],
    ['Q', 'R', 'S', 'T', 'U'],
    ['L', 'M', 'N', 'O', 'P'],
    ['F', 'G', 'H', 'J', 'K'],
    ['A', 'B', 'C', 'D', 'E'],
  ]

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

// GIS source options
const gisSourceOptions = [
  {
    id: 'arcgis' as const,
    label: 'ArcGIS Online',
    description: 'Import from ArcGIS',
    icon: Globe,
    color: 'bg-blue-500',
    comingSoon: true,
  },
  {
    id: 'qgis' as const,
    label: 'QGIS',
    description: 'Import from PostGIS',
    icon: Database,
    color: 'bg-green-500',
    comingSoon: true,
  },
  {
    id: 'manual' as const,
    label: 'Manual',
    description: 'Draw on map',
    icon: Pencil,
    color: 'bg-amber-500',
    comingSoon: false,
  },
]

export function GISMappingStep({ project, workflowStep, onComplete }: GISMappingStepProps) {
  const { toast } = useToast()
  const [boundary, setBoundary] = React.useState<GeoJSON.Feature<GeoJSON.Polygon> | null>(
    project.boundary as GeoJSON.Feature<GeoJSON.Polygon> | null
  )
  const [uploadedFile, setUploadedFile] = React.useState<File | null>(null)
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false)
  const [showConnectionModal, setShowConnectionModal] = React.useState(false)
  const [selectedSource, setSelectedSource] = React.useState<GISSourceType>(null)
  const [visibleLayers, setVisibleLayers] = React.useState<string[]>(getDefaultVisibleLayers())
  const [bufferZones, setBufferZones] = React.useState<
    Map<number, GeoJSON.Feature<GeoJSON.Polygon>>
  >(new Map())
  const [locationInfo, setLocationInfo] = React.useState<IrishLocationInfo | null>(null)
  const [isLoadingLocation, setIsLoadingLocation] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const updateBoundary = useUpdateProjectBoundary()
  const completeStep = useCompleteWorkflowStep()

  // Handle buffer zones change
  const handleBuffersChange = React.useCallback(
    (newBuffers: Map<number, GeoJSON.Feature<GeoJSON.Polygon>>) => {
      setBufferZones(newBuffers)
    },
    []
  )

  // Fetch location info when boundary changes
  React.useEffect(() => {
    if (!boundary) {
      setLocationInfo(null)
      return
    }

    const fetchLocation = async () => {
      setIsLoadingLocation(true)
      try {
        const result = await getLocationFromBoundary(boundary)
        if (result.success && result.location) {
          setLocationInfo(result.location)
        } else {
          setLocationInfo(null)
        }
      } catch (error) {
        console.error('Error fetching location:', error)
        setLocationInfo(null)
      } finally {
        setIsLoadingLocation(false)
      }
    }

    // Debounce to avoid too many requests
    const timeoutId = setTimeout(fetchLocation, 500)
    return () => clearTimeout(timeoutId)
  }, [boundary])

  // Calculate boundary info
  const boundaryInfo = React.useMemo(() => {
    if (!boundary || !boundary.geometry) return null

    const coords = boundary.geometry.coordinates[0]
    if (coords.length < 3) return null

    const lats = coords.map((c) => c[1])
    const lngs = coords.map((c) => c[0])
    const centerLat = lats.reduce((a, b) => a + b) / lats.length
    const centerLng = lngs.reduce((a, b) => a + b) / lngs.length

    const area = calculateAreaHectares(boundary.geometry)
    const gridRef = toIrishGridRef(centerLat, centerLng)
    const perimeter = calculatePerimeter(boundary)

    return {
      centerLat: centerLat.toFixed(6),
      centerLng: centerLng.toFixed(6),
      area: area.toFixed(2),
      perimeter: perimeter.toFixed(2),
      gridRef,
      pointCount: coords.length - 1,
    }
  }, [boundary])

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadedFile(file)
    setIsProcessing(true)

    try {
      const fileName = file.name.toLowerCase()

      // Handle Shapefile (.shp or .zip)
      if (isShapefileType(file)) {
        const result = await parseShapefile(file)

        // Show warnings if any
        if (result.warnings.length > 0) {
          result.warnings.forEach((warning) => {
            toast({
              title: 'Warning',
              description: warning,
            })
          })
        }

        if (!result.success || !result.feature) {
          toast({
            variant: 'destructive',
            title: 'Shapefile Error',
            description: result.error || 'Failed to parse shapefile',
          })
          return
        }

        // Show CRS info if detected
        if (result.metadata.detectedCRS) {
          toast({
            title: 'Coordinate System',
            description: `Detected: ${getCRSName(result.metadata.detectedCRS)}`,
          })
        }

        setBoundary(result.feature)
        setHasUnsavedChanges(true)
        setSelectedSource('manual')
        toast({
          title: 'Shapefile loaded',
          description: `Successfully loaded boundary from ${file.name}`,
        })
        return
      }

      // Handle GeoJSON
      if (fileName.endsWith('.geojson') || fileName.endsWith('.json')) {
        const text = await file.text()
        const geojson = JSON.parse(text)

        let feature: GeoJSON.Feature<GeoJSON.Polygon> | null = null

        if (geojson.type === 'FeatureCollection' && geojson.features?.length > 0) {
          feature = geojson.features.find(
            (f: GeoJSON.Feature) =>
              f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon'
          )
        } else if (geojson.type === 'Feature' && geojson.geometry) {
          feature = geojson
        } else if (geojson.type === 'Polygon') {
          feature = { type: 'Feature', geometry: geojson, properties: {} }
        }

        if (!feature) {
          throw new Error('No polygon found in file')
        }

        // Convert MultiPolygon to Polygon
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

        // Validate the boundary
        const validation = validateBoundary(feature as GeoJSON.Feature<GeoJSON.Polygon>)

        // Show warnings
        if (validation.warnings.length > 0) {
          validation.warnings.forEach((warning) => {
            toast({
              title: 'Warning',
              description: warning,
            })
          })
        }

        // Check for errors
        if (!validation.valid) {
          toast({
            variant: 'destructive',
            title: 'Validation Error',
            description: validation.errors.join('. '),
          })
          return
        }

        setBoundary(feature as GeoJSON.Feature<GeoJSON.Polygon>)
        setHasUnsavedChanges(true)
        setSelectedSource('manual')
        toast({
          title: 'Boundary loaded',
          description: `Successfully loaded boundary from ${file.name}`,
        })
        return
      }

      // Unsupported format
      throw new Error(
        'Unsupported file format. Please upload .geojson, .json, .shp, or .zip files.'
      )
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

  // Handle GIS source selection
  const handleSourceSelect = (source: GISSourceType) => {
    setSelectedSource(source)
    if (source === 'manual') {
      toast({
        title: 'Manual drawing mode',
        description: 'Use the drawing tools on the map to define your boundary.',
      })
    }
  }

  // Handle boundary import from GIS connection
  const handleBoundaryImport = (importedBoundary: GeoJSON.Feature<GeoJSON.Polygon>) => {
    setBoundary(importedBoundary)
    setHasUnsavedChanges(true)
    toast({
      title: 'Boundary imported',
      description: 'Successfully imported boundary from external source.',
    })
  }

  // Handle layer toggle
  const handleLayerToggle = (layerId: string, visible: boolean) => {
    setVisibleLayers((prev) => (visible ? [...prev, layerId] : prev.filter((id) => id !== layerId)))
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
          <h2 className="text-foreground text-2xl font-bold">Step 1: GIS Mapping</h2>
          <p className="text-muted-foreground">
            Define the project boundary using your preferred GIS tool
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

      {/* GIS Source Selection */}
      <Card>
        <CardHeader>
          <CardTitle>How would you like to define your project boundary?</CardTitle>
          <CardDescription>
            Connect to your GIS tool or draw boundaries manually on the map
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {gisSourceOptions.map((option) => {
              const Icon = option.icon
              const isSelected = selectedSource === option.id

              return (
                <button
                  key={option.id}
                  onClick={() => {
                    if (option.comingSoon) return
                    if (option.id === 'manual') {
                      handleSourceSelect('manual')
                    } else {
                      setShowConnectionModal(true)
                    }
                  }}
                  disabled={isComplete || option.comingSoon}
                  className={cn(
                    'border-border bg-card relative flex cursor-pointer flex-col items-center gap-3 rounded-lg border p-6 text-center transition-all',
                    option.comingSoon
                      ? 'cursor-not-allowed opacity-60'
                      : 'hover:border-emerald-400 hover:bg-emerald-50 hover:shadow-md dark:hover:border-emerald-600 dark:hover:bg-emerald-950/30',
                    isSelected &&
                      !option.comingSoon &&
                      'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20 dark:border-emerald-600 dark:bg-emerald-950/30',
                    isComplete && 'cursor-not-allowed opacity-50'
                  )}
                >
                  {option.comingSoon && (
                    <Badge variant="secondary" className="absolute -top-2 -right-2 text-xs">
                      <Clock className="mr-1 h-3 w-3" />
                      Soon
                    </Badge>
                  )}
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-lg',
                      option.comingSoon ? 'bg-gray-400' : option.color
                    )}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-foreground font-semibold">{option.label}</h3>
                    <p className="text-muted-foreground mt-0.5 text-sm">{option.description}</p>
                  </div>
                  {isSelected && !option.comingSoon && (
                    <Badge
                      variant="secondary"
                      className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-400"
                    >
                      Selected
                    </Badge>
                  )}
                </button>
              )
            })}
          </div>

          {/* File upload option */}
          <div className="mt-4 flex flex-col items-center justify-center gap-1">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">or</span>
              <Button
                variant="link"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isComplete || isProcessing}
                className="text-emerald-600 dark:text-emerald-400"
              >
                <FileUp className="mr-1 h-4 w-4" />
                {isProcessing ? 'Processing...' : 'Upload file'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".geojson,.json,.shp,.zip"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isProcessing || isComplete}
              />
            </div>
            <span className="text-muted-foreground text-xs">
              Supports: GeoJSON, Shapefile (.shp, .zip)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Main Content - Map and Layers */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Map Section */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Project Boundary</CardTitle>
              <CardDescription>
                {boundary
                  ? 'Boundary defined. You can edit it or upload a new one.'
                  : 'No boundary defined yet. Select a source above or draw on the map.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] overflow-hidden rounded-lg border">
                <ProjectMapWithDraw
                  boundary={boundary ?? undefined}
                  bufferZones={bufferZones}
                  onBoundaryChange={handleBoundaryChange}
                  editable={!isComplete}
                  visibleLayers={visibleLayers}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          {/* Buffer Zones */}
          <BufferZonePanel boundary={boundary} onBuffersChange={handleBuffersChange} />

          {/* Dataset Layers */}
          <DatasetLayersPanel visibleLayers={visibleLayers} onLayerToggle={handleLayerToggle} />

          {/* Boundary Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4" />
                Boundary Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {boundaryInfo ? (
                <dl className="space-y-2 text-sm">
                  {/* Location Info */}
                  {isLoadingLocation ? (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Location</dt>
                      <dd className="text-muted-foreground text-xs">Loading...</dd>
                    </div>
                  ) : locationInfo ? (
                    <>
                      {locationInfo.townland && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Townland</dt>
                          <dd className="font-semibold">{locationInfo.townland}</dd>
                        </div>
                      )}
                      {locationInfo.county && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">County</dt>
                          <dd className="font-semibold">Co. {locationInfo.county}</dd>
                        </div>
                      )}
                      {locationInfo.province && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Province</dt>
                          <dd className="text-xs">{locationInfo.province}</dd>
                        </div>
                      )}
                    </>
                  ) : null}

                  <div className="border-border my-2 border-t" />

                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Grid Reference</dt>
                    <dd className="font-mono font-semibold">{boundaryInfo.gridRef}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Area</dt>
                    <dd className="font-semibold">{boundaryInfo.area} ha</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Perimeter</dt>
                    <dd className="font-semibold">{boundaryInfo.perimeter} km</dd>
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
                <p className="text-muted-foreground text-sm">No boundary defined yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Progress Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Step Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Boundary defined</span>
                  {boundary ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="text-muted-foreground h-4 w-4" />
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Changes saved</span>
                  {!hasUnsavedChanges && boundary ? (
                    <Check className="h-4 w-4 text-emerald-600" />
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

            <Button
              onClick={handleComplete}
              disabled={!canComplete || completeStep.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
            >
              {completeStep.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              {isComplete ? 'Completed' : 'Complete & Continue'}
            </Button>
          </div>
        </div>
      </div>

      {/* GIS Connection Modal */}
      <GISConnectionModal
        open={showConnectionModal}
        onOpenChange={setShowConnectionModal}
        onSourceSelect={handleSourceSelect}
        onBoundaryImport={handleBoundaryImport}
      />
    </div>
  )
}
