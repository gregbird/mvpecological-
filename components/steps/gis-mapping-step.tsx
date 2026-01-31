'use client'

import * as React from 'react'
import {
  FileUp,
  MapPin,
  Loader2,
  Check,
  Globe,
  Database,
  Pencil,
  Clock,
  ChevronLeft,
  ChevronRight,
  Circle,
  Layers,
  Save,
} from 'lucide-react'
import dynamic from 'next/dynamic'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useUpdateProjectBoundary, useCompleteWorkflowStep } from '@/hooks/use-project-data'
import { calculateAreaHectares } from '@/lib/supabase/queries/habitats'
import { GISConnectionModal, type GISSourceType } from '@/components/gis'
import { getDefaultVisibleLayers, DATASET_GROUPS } from '@/lib/config/dataset-layers'
import {
  parseShapefile,
  isShapefileType,
  validateBoundary,
  calculatePerimeter,
  getLocationFromBoundary,
  createBuffer,
  STANDARD_BUFFER_DISTANCES,
  type IrishLocationInfo,
} from '@/lib/gis'
import type { Project, WorkflowStep } from '@/types/database'
import { useProjectContext } from '@/contexts/project-context'

// Dynamic import for map
const ProjectMapWithDraw = dynamic(
  () => import('@/components/maps/project-map-with-draw').then((mod) => mod.ProjectMapWithDraw),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted/50 flex h-full items-center justify-center">
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

// Wizard steps
type WizardStep = 'source' | 'boundary' | 'buffers' | 'layers' | 'review'

const WIZARD_STEPS: { id: WizardStep; label: string; icon: React.ElementType }[] = [
  { id: 'source', label: 'Source', icon: Globe },
  { id: 'boundary', label: 'Boundary', icon: MapPin },
  { id: 'buffers', label: 'Buffers', icon: Circle },
  { id: 'layers', label: 'Layers', icon: Layers },
  { id: 'review', label: 'Review', icon: Check },
]

// Buffer zone colors - each distance gets a unique color
const BUFFER_COLORS: Record<number, { fill: string; stroke: string; name: string }> = {
  0.5: { fill: '#ef4444', stroke: '#dc2626', name: 'Red' },
  1: { fill: '#f97316', stroke: '#ea580c', name: 'Orange' },
  2: { fill: '#eab308', stroke: '#ca8a04', name: 'Yellow' },
  5: { fill: '#22c55e', stroke: '#16a34a', name: 'Green' },
  10: { fill: '#3b82f6', stroke: '#2563eb', name: 'Blue' },
  15: { fill: '#8b5cf6', stroke: '#7c3aed', name: 'Purple' },
}

// Get color for any buffer distance (including custom)
function getBufferColor(distance: number): { fill: string; stroke: string; name: string } {
  if (BUFFER_COLORS[distance]) return BUFFER_COLORS[distance]
  // Generate color for custom distances based on hue
  const hue = (distance * 37) % 360
  return {
    fill: `hsl(${hue}, 70%, 50%)`,
    stroke: `hsl(${hue}, 70%, 40%)`,
    name: `Custom ${distance}km`,
  }
}

// Irish Grid Reference conversion
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
    color: 'bg-green-600',
    comingSoon: true,
  },
  {
    id: 'manual' as const,
    label: 'Draw on Map',
    description: 'Draw boundary manually',
    icon: Pencil,
    color: 'bg-amber-500',
    comingSoon: false,
  },
  {
    id: 'upload' as const,
    label: 'Upload File',
    description: 'GeoJSON or Shapefile',
    icon: FileUp,
    color: 'bg-purple-500',
    comingSoon: false,
  },
]

export function GISMappingStep({ project, workflowStep, onComplete }: GISMappingStepProps) {
  const { toast } = useToast()
  const { setMapFullscreen } = useProjectContext()

  // Wizard state
  const [currentStep, setCurrentStep] = React.useState<WizardStep>(() => {
    // Start at boundary step if we already have a boundary
    if (project.boundary) return 'boundary'
    return 'source'
  })

  // Data state
  const [boundary, setBoundary] = React.useState<GeoJSON.Feature<GeoJSON.Polygon> | null>(
    project.boundary as GeoJSON.Feature<GeoJSON.Polygon> | null
  )
  const [selectedSource, setSelectedSource] = React.useState<GISSourceType>(
    project.boundary ? 'manual' : null
  )
  const [enabledBuffers, setEnabledBuffers] = React.useState<number[]>([]) // Start with no buffers selected
  const [customBufferInput, setCustomBufferInput] = React.useState<string>('')
  const [customBuffers, setCustomBuffers] = React.useState<number[]>([]) // User-added custom distances
  const [visibleLayers, setVisibleLayers] = React.useState<string[]>(getDefaultVisibleLayers())
  const [bufferZones, setBufferZones] = React.useState<
    Map<number, GeoJSON.Feature<GeoJSON.Polygon>>
  >(new Map())
  const [locationInfo, setLocationInfo] = React.useState<IrishLocationInfo | null>(null)
  const [isLoadingLocation, setIsLoadingLocation] = React.useState(false)

  // UI state
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [showConnectionModal, setShowConnectionModal] = React.useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false)

  // Map view state (persists between wizard steps)
  const [mapCenter, setMapCenter] = React.useState<[number, number] | undefined>(undefined)
  const [mapZoom, setMapZoom] = React.useState<number | undefined>(undefined)

  const handleViewChange = React.useCallback((center: [number, number], zoom: number) => {
    setMapCenter(center)
    setMapZoom(zoom)
  }, [])

  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const updateBoundary = useUpdateProjectBoundary()
  const completeStep = useCompleteWorkflowStep()

  // Toggle map fullscreen mode when entering/leaving boundary step
  React.useEffect(() => {
    const isMapStep =
      currentStep === 'boundary' ||
      currentStep === 'buffers' ||
      currentStep === 'layers' ||
      currentStep === 'review'
    setMapFullscreen(isMapStep)

    // Cleanup: restore sidebar when component unmounts
    return () => {
      setMapFullscreen(false)
    }
  }, [currentStep, setMapFullscreen])

  // Generate buffer zones when boundary or enabled buffers change
  React.useEffect(() => {
    if (!boundary) {
      setBufferZones(new Map())
      return
    }

    const newBuffers = new Map<number, GeoJSON.Feature<GeoJSON.Polygon>>()
    for (const distance of enabledBuffers) {
      const buffered = createBuffer(boundary, distance, 'kilometers')
      if (buffered) {
        newBuffers.set(distance, buffered)
      }
    }
    setBufferZones(newBuffers)
  }, [boundary, enabledBuffers])

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
        }
      } catch (error) {
        console.error('Error fetching location:', error)
      } finally {
        setIsLoadingLocation(false)
      }
    }

    const timeoutId = setTimeout(fetchLocation, 500)
    return () => clearTimeout(timeoutId)
  }, [boundary])

  // Calculate boundary info
  const boundaryInfo = React.useMemo(() => {
    if (!boundary?.geometry) return null

    const coords = boundary.geometry.coordinates[0]
    if (coords.length < 3) return null

    const lats = coords.map((c) => c[1])
    const lngs = coords.map((c) => c[0])
    const centerLat = lats.reduce((a, b) => a + b) / lats.length
    const centerLng = lngs.reduce((a, b) => a + b) / lngs.length

    return {
      centerLat: centerLat.toFixed(6),
      centerLng: centerLng.toFixed(6),
      area: calculateAreaHectares(boundary.geometry).toFixed(2),
      perimeter: calculatePerimeter(boundary).toFixed(2),
      gridRef: toIrishGridRef(centerLat, centerLng),
      pointCount: coords.length - 1,
    }
  }, [boundary])

  // File upload handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsProcessing(true)

    try {
      const fileName = file.name.toLowerCase()

      if (isShapefileType(file)) {
        const result = await parseShapefile(file)
        if (!result.success || !result.feature) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: result.error || 'Failed to parse shapefile',
          })
          return
        }
        setBoundary(result.feature)
        setHasUnsavedChanges(true)
        setSelectedSource('upload')
        setCurrentStep('boundary')
        return
      }

      if (fileName.endsWith('.geojson') || fileName.endsWith('.json')) {
        const text = await file.text()
        const geojson = JSON.parse(text)

        let feature: GeoJSON.Feature<GeoJSON.Polygon> | null = null

        if (geojson.type === 'FeatureCollection' && geojson.features?.length > 0) {
          feature = geojson.features.find(
            (f: GeoJSON.Feature) =>
              f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon'
          )
        } else if (geojson.type === 'Feature') {
          feature = geojson
        } else if (geojson.type === 'Polygon') {
          feature = { type: 'Feature', geometry: geojson, properties: {} }
        }

        if (!feature) throw new Error('No polygon found in file')

        const geom = feature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon
        if (geom.type === 'MultiPolygon') {
          feature = {
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: geom.coordinates[0] },
            properties: feature.properties,
          } as GeoJSON.Feature<GeoJSON.Polygon>
        }

        const validation = validateBoundary(feature as GeoJSON.Feature<GeoJSON.Polygon>)
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
        setSelectedSource('upload')
        setCurrentStep('boundary')
        return
      }

      throw new Error('Unsupported file format')
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to parse file',
      })
    } finally {
      setIsProcessing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Handlers
  const handleBoundaryChange = (features: GeoJSON.FeatureCollection) => {
    if (features.features.length > 0) {
      setBoundary(features.features[0] as GeoJSON.Feature<GeoJSON.Polygon>)
      setHasUnsavedChanges(true)
    }
  }

  const handleSourceSelect = (source: string) => {
    if (source === 'upload') {
      fileInputRef.current?.click()
      return
    }
    if (source === 'manual') {
      setSelectedSource('manual')
      setCurrentStep('boundary')
    }
  }

  const handleBufferToggle = (distance: number) => {
    setEnabledBuffers((prev) =>
      prev.includes(distance) ? prev.filter((d) => d !== distance) : [...prev, distance]
    )
    setHasUnsavedChanges(true)
  }

  const handleLayerToggle = (layerId: string) => {
    setVisibleLayers((prev) =>
      prev.includes(layerId) ? prev.filter((id) => id !== layerId) : [...prev, layerId]
    )
  }

  const handleSave = async () => {
    if (!boundary || !boundaryInfo) return

    try {
      await updateBoundary.mutateAsync({
        projectId: project.id,
        boundary: boundary,
        centerPoint: {
          type: 'Point',
          coordinates: [parseFloat(boundaryInfo.centerLng), parseFloat(boundaryInfo.centerLat)],
        },
        gridReference: boundaryInfo.gridRef,
      })
      setHasUnsavedChanges(false)
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save boundary' })
    }
  }

  const handleComplete = async () => {
    if (!boundary) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please define a boundary first',
      })
      return
    }

    if (hasUnsavedChanges) await handleSave()

    try {
      await completeStep.mutateAsync({
        projectId: project.id,
        stepNumber: workflowStep.step_number,
      })
      onComplete?.()
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to complete step' })
    }
  }

  // Navigation
  const currentStepIndex = WIZARD_STEPS.findIndex((s) => s.id === currentStep)
  const canGoBack = currentStepIndex > 0
  const canGoNext = currentStepIndex < WIZARD_STEPS.length - 1

  const goBack = () => {
    if (canGoBack) setCurrentStep(WIZARD_STEPS[currentStepIndex - 1].id)
  }

  const goNext = () => {
    if (currentStep === 'source' && !selectedSource) {
      return
    }
    if (currentStep === 'boundary' && !boundary) {
      return
    }
    if (canGoNext) setCurrentStep(WIZARD_STEPS[currentStepIndex + 1].id)
  }

  const isComplete = workflowStep.status === 'approved'

  // Determine if we're in map mode (compact header)
  const isMapMode = currentStep !== 'source'

  return (
    <div className="flex h-full flex-col">
      {/* Progress Header - Compact when in map mode */}
      <div
        className={cn(
          'border-border bg-card shrink-0 border-b transition-all duration-300',
          isMapMode ? 'px-4 py-2' : 'px-6 py-4'
        )}
      >
        {/* Full header for source step */}
        {!isMapMode && (
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">GIS Mapping</h2>
              <p className="text-muted-foreground text-sm">Define your project boundary</p>
            </div>
            <Badge variant={isComplete ? 'default' : 'secondary'}>
              {isComplete ? 'Completed' : 'In Progress'}
            </Badge>
          </div>
        )}

        {/* Step indicators - Compact when in map mode */}
        <div
          className={cn(
            'flex items-center',
            isMapMode ? 'justify-center gap-2' : 'justify-between'
          )}
        >
          {WIZARD_STEPS.map((step, index) => {
            const Icon = step.icon
            const isActive = step.id === currentStep
            const isPast = index < currentStepIndex
            const isClickable =
              isPast ||
              (index === currentStepIndex + 1 &&
                (currentStep !== 'source' || selectedSource) &&
                (currentStep !== 'boundary' || boundary))

            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => isClickable && setCurrentStep(step.id)}
                  disabled={!isClickable && !isActive}
                  className={cn(
                    'flex items-center gap-1 transition-all',
                    isClickable && 'cursor-pointer',
                    !isClickable && !isActive && 'opacity-40',
                    isMapMode ? 'flex-row' : 'flex-col'
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center justify-center rounded-full border-2 transition-all',
                      isMapMode ? 'h-7 w-7' : 'h-10 w-10',
                      isActive && 'border-emerald-500 bg-emerald-500 text-white',
                      isPast && 'border-emerald-500 bg-emerald-50 text-emerald-600',
                      !isActive && !isPast && 'border-gray-300 text-gray-400'
                    )}
                  >
                    {isPast ? (
                      <Check className={cn(isMapMode ? 'h-3.5 w-3.5' : 'h-5 w-5')} />
                    ) : (
                      <Icon className={cn(isMapMode ? 'h-3.5 w-3.5' : 'h-5 w-5')} />
                    )}
                  </div>
                  <span
                    className={cn(
                      'font-medium',
                      isMapMode ? 'text-[11px]' : 'text-xs',
                      isActive && 'text-emerald-600',
                      isPast && 'text-emerald-600',
                      !isActive && !isPast && 'text-gray-400'
                    )}
                  >
                    {step.label}
                  </span>
                </button>
                {index < WIZARD_STEPS.length - 1 && (
                  <div
                    className={cn(
                      'h-0.5',
                      isMapMode ? 'w-6' : 'mx-2 flex-1',
                      index < currentStepIndex ? 'bg-emerald-500' : 'bg-gray-200'
                    )}
                  />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-hidden">
        {/* Step 1: Source Selection */}
        {currentStep === 'source' && (
          <div className="flex h-full items-center justify-center p-8">
            <div className="w-full max-w-2xl">
              <h3 className="mb-2 text-center text-xl font-semibold">
                How would you like to define your boundary?
              </h3>
              <p className="text-muted-foreground mb-8 text-center">
                Choose a method to get started
              </p>

              <div className="grid grid-cols-2 gap-4">
                {gisSourceOptions.map((option) => {
                  const Icon = option.icon
                  const isSelected = selectedSource === option.id

                  return (
                    <button
                      key={option.id}
                      onClick={() => !option.comingSoon && handleSourceSelect(option.id)}
                      disabled={option.comingSoon || isComplete}
                      className={cn(
                        'relative flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all',
                        option.comingSoon && 'cursor-not-allowed opacity-50',
                        !option.comingSoon && 'hover:border-emerald-400 hover:shadow-lg',
                        isSelected && 'border-emerald-500 bg-emerald-50 shadow-lg'
                      )}
                    >
                      {option.comingSoon && (
                        <Badge variant="secondary" className="absolute -top-2 -right-2">
                          <Clock className="mr-1 h-3 w-3" /> Soon
                        </Badge>
                      )}
                      <div
                        className={cn(
                          'flex h-14 w-14 items-center justify-center rounded-xl',
                          option.color
                        )}
                      >
                        <Icon className="h-7 w-7 text-white" />
                      </div>
                      <div className="text-center">
                        <h4 className="font-semibold">{option.label}</h4>
                        <p className="text-muted-foreground text-sm">{option.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".geojson,.json,.shp,.zip"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isProcessing || isComplete}
              />
            </div>
          </div>
        )}

        {/* Step 2: Boundary Drawing - No buffer zones here, only boundary */}
        {currentStep === 'boundary' && (
          <div className="relative h-full">
            <ProjectMapWithDraw
              className="h-full"
              center={mapCenter}
              zoom={mapZoom}
              boundary={boundary ?? undefined}
              onBoundaryChange={handleBoundaryChange}
              onViewChange={handleViewChange}
              editable={!isComplete}
              visibleLayers={[]}
            />

            {/* Boundary info overlay */}
            {boundary && boundaryInfo && (
              <div className="bg-card/95 absolute top-4 left-4 z-[1000] rounded-lg border p-4 shadow-lg backdrop-blur">
                <h4 className="mb-2 font-semibold">Boundary Info</h4>
                <dl className="space-y-1 text-sm">
                  {locationInfo?.county && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">County</dt>
                      <dd className="font-medium">Co. {locationInfo.county}</dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Area</dt>
                    <dd className="font-medium">{boundaryInfo.area} ha</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Grid Ref</dt>
                    <dd className="font-mono text-xs">{boundaryInfo.gridRef}</dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Buffer Zones */}
        {currentStep === 'buffers' && (
          <div className="flex h-full">
            {/* Map */}
            <div className="flex-1">
              <ProjectMapWithDraw
                className="h-full"
                center={mapCenter}
                zoom={mapZoom}
                boundary={boundary ?? undefined}
                bufferZones={bufferZones}
                bufferColors={Object.fromEntries(enabledBuffers.map((d) => [d, getBufferColor(d)]))}
                onViewChange={handleViewChange}
                editable={false}
                visibleLayers={[]}
              />
            </div>

            {/* Buffer selection panel */}
            <div className="border-border w-80 overflow-y-auto border-l p-6">
              <h3 className="mb-2 text-lg font-semibold">Buffer Zones</h3>
              <p className="text-muted-foreground mb-6 text-sm">
                Select buffer distances for designated site analysis
              </p>

              {/* Standard buffer distances */}
              <div className="space-y-2">
                {STANDARD_BUFFER_DISTANCES.map((buffer) => {
                  const isEnabled = enabledBuffers.includes(buffer.value)
                  const color = getBufferColor(buffer.value)

                  return (
                    <button
                      key={buffer.value}
                      onClick={() => handleBufferToggle(buffer.value)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg border-2 p-3 text-left transition-all',
                        isEnabled
                          ? 'border-gray-400 bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full border-2"
                        style={{
                          borderColor: color.stroke,
                          backgroundColor: isEnabled ? color.fill : 'transparent',
                        }}
                      >
                        {isEnabled && <Check className="h-4 w-4 text-white" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{buffer.label}</span>
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: color.fill }}
                          />
                        </div>
                        <div className="text-muted-foreground text-xs">{buffer.description}</div>
                      </div>
                    </button>
                  )
                })}

                {/* Custom buffer distances */}
                {customBuffers.map((distance) => {
                  const isEnabled = enabledBuffers.includes(distance)
                  const color = getBufferColor(distance)

                  return (
                    <div key={distance} className="flex items-center gap-2">
                      <button
                        onClick={() => handleBufferToggle(distance)}
                        className={cn(
                          'flex flex-1 items-center gap-3 rounded-lg border-2 p-3 text-left transition-all',
                          isEnabled
                            ? 'border-gray-400 bg-gray-50'
                            : 'border-gray-200 hover:border-gray-300'
                        )}
                      >
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-full border-2"
                          style={{
                            borderColor: color.stroke,
                            backgroundColor: isEnabled ? color.fill : 'transparent',
                          }}
                        >
                          {isEnabled && <Check className="h-4 w-4 text-white" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{distance} km</span>
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: color.fill }}
                          />
                          <Badge variant="outline" className="text-[10px]">
                            Custom
                          </Badge>
                        </div>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-red-500"
                        onClick={() => {
                          setCustomBuffers((prev) => prev.filter((d) => d !== distance))
                          setEnabledBuffers((prev) => prev.filter((d) => d !== distance))
                          setHasUnsavedChanges(true)
                        }}
                      >
                        <span className="text-lg">×</span>
                      </Button>
                    </div>
                  )
                })}
              </div>

              {/* Add custom buffer */}
              <div className="mt-4 border-t pt-4">
                <label className="text-sm font-medium">Add Custom Buffer</label>
                <div className="mt-2 flex gap-2">
                  <input
                    type="number"
                    min="0.1"
                    max="50"
                    step="0.1"
                    value={customBufferInput}
                    onChange={(e) => setCustomBufferInput(e.target.value)}
                    placeholder="e.g. 3.5"
                    className="border-input bg-background flex-1 rounded-md border px-3 py-2 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const value = parseFloat(customBufferInput)
                      if (value > 0 && value <= 50) {
                        const allDistances = [
                          ...STANDARD_BUFFER_DISTANCES.map((b) => b.value),
                          ...customBuffers,
                        ]
                        if (!allDistances.includes(value)) {
                          setCustomBuffers((prev) => [...prev, value].sort((a, b) => a - b))
                          setEnabledBuffers((prev) => [...prev, value])
                          setHasUnsavedChanges(true)
                        }
                        setCustomBufferInput('')
                      }
                    }}
                    disabled={!customBufferInput || parseFloat(customBufferInput) <= 0}
                  >
                    Add
                  </Button>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  Enter distance in kilometers (0.1 - 50)
                </p>
              </div>

              {/* Selected summary */}
              <div className="mt-6 rounded-lg bg-gray-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Selected Buffers</span>
                  <span className="text-muted-foreground text-sm">{enabledBuffers.length}</span>
                </div>
                {enabledBuffers.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {enabledBuffers
                      .sort((a, b) => a - b)
                      .map((d) => {
                        const color = getBufferColor(d)
                        return (
                          <Badge
                            key={d}
                            variant="secondary"
                            className="gap-1"
                            style={{ borderColor: color.stroke, borderWidth: 1 }}
                          >
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: color.fill }}
                            />
                            {d} km
                          </Badge>
                        )
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Data Layers */}
        {currentStep === 'layers' && (
          <div className="flex h-full">
            {/* Map */}
            <div className="flex-1">
              <ProjectMapWithDraw
                className="h-full"
                center={mapCenter}
                zoom={mapZoom}
                boundary={boundary ?? undefined}
                bufferZones={bufferZones}
                onViewChange={handleViewChange}
                editable={false}
                visibleLayers={visibleLayers}
              />
            </div>

            {/* Layer selection panel */}
            <div className="border-border w-80 overflow-y-auto border-l p-6">
              <h3 className="mb-2 text-lg font-semibold">Data Layers</h3>
              <p className="text-muted-foreground mb-6 text-sm">
                Choose which datasets to display on the map
              </p>

              <div className="space-y-6">
                {DATASET_GROUPS.map((group) => (
                  <div key={group.id}>
                    <div className="mb-2 flex items-center gap-2">
                      <group.icon className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">{group.label}</span>
                    </div>
                    <div className="space-y-1">
                      {group.layers.map((layer) => {
                        const isEnabled = visibleLayers.includes(layer.id)

                        return (
                          <button
                            key={layer.id}
                            onClick={() => handleLayerToggle(layer.id)}
                            className={cn(
                              'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-all',
                              isEnabled ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-gray-100'
                            )}
                          >
                            <div
                              className={cn(
                                'flex h-4 w-4 items-center justify-center rounded border-2',
                                isEnabled ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'
                              )}
                            >
                              {isEnabled && <Check className="h-3 w-3 text-white" />}
                            </div>
                            {layer.color && (
                              <span
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: layer.color }}
                              />
                            )}
                            <span>{layer.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {currentStep === 'review' && (
          <div className="flex h-full">
            {/* Map */}
            <div className="flex-1">
              <ProjectMapWithDraw
                className="h-full"
                center={mapCenter}
                zoom={mapZoom}
                boundary={boundary ?? undefined}
                bufferZones={bufferZones}
                bufferColors={Object.fromEntries(enabledBuffers.map((d) => [d, getBufferColor(d)]))}
                onViewChange={handleViewChange}
                editable={false}
                visibleLayers={visibleLayers}
              />
            </div>

            {/* Review panel */}
            <div className="border-border w-96 overflow-y-auto border-l p-6">
              <h3 className="mb-6 text-lg font-semibold">Review & Save</h3>

              {/* Boundary Summary */}
              <div className="mb-6 rounded-lg border p-4">
                <h4 className="mb-3 flex items-center gap-2 font-medium">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  Boundary
                </h4>
                {boundaryInfo && (
                  <dl className="space-y-2 text-sm">
                    {locationInfo?.county && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Location</dt>
                        <dd className="font-medium">
                          {locationInfo.townland && `${locationInfo.townland}, `}Co.{' '}
                          {locationInfo.county}
                        </dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Area</dt>
                      <dd className="font-medium">{boundaryInfo.area} ha</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Perimeter</dt>
                      <dd>{boundaryInfo.perimeter} km</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Grid Reference</dt>
                      <dd className="font-mono text-xs">{boundaryInfo.gridRef}</dd>
                    </div>
                  </dl>
                )}
              </div>

              {/* Buffer Summary */}
              <div className="mb-6 rounded-lg border p-4">
                <h4 className="mb-3 flex items-center gap-2 font-medium">
                  <Circle className="h-4 w-4 text-blue-500" />
                  Buffer Zones
                </h4>
                <div className="flex flex-wrap gap-2">
                  {enabledBuffers.length > 0 ? (
                    enabledBuffers
                      .sort((a, b) => a - b)
                      .map((d) => {
                        const color = getBufferColor(d)
                        return (
                          <Badge
                            key={d}
                            variant="secondary"
                            className="gap-1"
                            style={{ borderColor: color.stroke, borderWidth: 1 }}
                          >
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: color.fill }}
                            />
                            {d} km
                          </Badge>
                        )
                      })
                  ) : (
                    <span className="text-muted-foreground text-sm">No buffers selected</span>
                  )}
                </div>
              </div>

              {/* Layers Summary */}
              <div className="mb-6 rounded-lg border p-4">
                <h4 className="mb-3 flex items-center gap-2 font-medium">
                  <Layers className="h-4 w-4 text-purple-500" />
                  Data Layers
                </h4>
                <p className="text-muted-foreground text-sm">
                  {visibleLayers.length} layer{visibleLayers.length !== 1 ? 's' : ''} enabled
                </p>
              </div>

              {/* Save status */}
              <div className="mb-6 flex items-center gap-2 text-sm">
                {hasUnsavedChanges ? (
                  <>
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="text-amber-600">Unsaved changes</span>
                  </>
                ) : (
                  <>
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-emerald-600">All changes saved</span>
                  </>
                )}
              </div>

              {/* Action buttons */}
              <div className="space-y-3">
                <Button
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges || updateBoundary.isPending}
                  variant="outline"
                  className="w-full"
                >
                  {updateBoundary.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Changes
                </Button>

                <Button
                  onClick={handleComplete}
                  disabled={!boundary || hasUnsavedChanges || completeStep.isPending || isComplete}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  {completeStep.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Complete Step
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Footer - Compact when in map mode */}
      <div
        className={cn(
          'border-border bg-card shrink-0 border-t transition-all duration-300',
          isMapMode ? 'px-4 py-2' : 'px-6 py-4'
        )}
      >
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size={isMapMode ? 'sm' : 'default'}
            onClick={goBack}
            disabled={!canGoBack}
          >
            <ChevronLeft className={cn(isMapMode ? 'mr-1 h-3 w-3' : 'mr-2 h-4 w-4')} />
            Back
          </Button>

          <div className={cn('text-muted-foreground', isMapMode ? 'text-xs' : 'text-sm')}>
            Step {currentStepIndex + 1} of {WIZARD_STEPS.length}
          </div>

          {currentStep !== 'review' ? (
            <Button size={isMapMode ? 'sm' : 'default'} onClick={goNext} disabled={!canGoNext}>
              Next
              <ChevronRight className={cn(isMapMode ? 'ml-1 h-3 w-3' : 'ml-2 h-4 w-4')} />
            </Button>
          ) : (
            <div className="w-20" /> // Spacer
          )}
        </div>
      </div>

      {/* GIS Connection Modal */}
      <GISConnectionModal
        open={showConnectionModal}
        onOpenChange={setShowConnectionModal}
        onSourceSelect={setSelectedSource}
        onBoundaryImport={(b) => {
          setBoundary(b)
          setHasUnsavedChanges(true)
          setCurrentStep('boundary')
        }}
      />
    </div>
  )
}
