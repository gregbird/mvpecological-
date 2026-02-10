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
  ChevronDown,
  Circle,
  Layers,
  Save,
  Eye,
  EyeOff,
  ExternalLink,
  X,
  Ban,
} from 'lucide-react'
import dynamic from 'next/dynamic'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useUpdateProjectBoundary, useCompleteWorkflowStep } from '@/hooks/use-project-data'
import { calculateAreaHectares } from '@/lib/supabase/queries/habitats'
import { GISConnectionModal, type GISSourceType } from '@/components/gis'
import {
  getDefaultVisibleLayers,
  DATASET_GROUPS,
  type DatasetLayer,
} from '@/lib/config/dataset-layers'
import {
  queryDesignatedSites,
  type NPWSDesignatedSite,
  type DesignatedSiteType,
} from '@/lib/external-apis/npws'
import {
  searchRivers,
  searchLakes,
  searchCatchments,
  type EPARiver,
  type EPALake,
  type EPACatchment,
} from '@/lib/external-apis/epa'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import { MapCaptureButton } from '@/components/maps/map-capture-button'
import type { Project, WorkflowStep } from '@/types/database'
import { useProjectContext } from '@/contexts/project-context'

// Import MapStyle type
import type { MapStyle } from '@/components/maps/project-map-with-draw'

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
type WizardStep = 'source' | 'boundary' | 'buffers' | 'layers'
type ViewMode = 'preview' | 'wizard'

const WIZARD_STEPS: { id: WizardStep; label: string; icon: React.ElementType }[] = [
  { id: 'source', label: 'Source', icon: Globe },
  { id: 'boundary', label: 'Boundary', icon: MapPin },
  { id: 'buffers', label: 'Buffers', icon: Circle },
  { id: 'layers', label: 'Layers', icon: Layers },
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

export function GISMappingStep({ project, workflowStep, userId, onComplete }: GISMappingStepProps) {
  const { setMapFullscreen, refetchProject, refetchWorkflowSteps } = useProjectContext()

  // Check if step is completed (approved or needs_review means data exists)
  const isStepCompleted =
    workflowStep.status === 'approved' || workflowStep.status === 'needs_review'
  const hasSavedData = !!(project.boundary && project.grid_reference)

  // View mode: preview (summary view) or wizard (editing)
  const [viewMode, setViewMode] = React.useState<ViewMode>(() => {
    // Show preview if step is completed and has saved data
    if (isStepCompleted && hasSavedData) return 'preview'
    return 'wizard'
  })

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
  const [enabledBuffers, setEnabledBuffers] = React.useState<number[]>(() => {
    // Initialize from saved project data or start with empty array
    return (project.buffer_distances as number[] | null) ?? []
  })
  const [customBufferInput, setCustomBufferInput] = React.useState<string>('')
  const [customBuffers, setCustomBuffers] = React.useState<number[]>(() => {
    // Initialize custom buffers from project data (buffers not in standard list)
    const saved = (project.buffer_distances as number[] | null) ?? []
    const standardValues = STANDARD_BUFFER_DISTANCES.map((b) => b.value) as number[]
    return saved.filter((d) => !standardValues.includes(d))
  })
  const [visibleLayers, setVisibleLayers] = React.useState<string[]>(() => {
    // Initialize from saved project data or use defaults
    return (project.visible_layers as string[] | null) ?? getDefaultVisibleLayers()
  })
  const [bufferZones, setBufferZones] = React.useState<
    Map<number, GeoJSON.Feature<GeoJSON.Polygon>>
  >(new Map())
  const [locationInfo, setLocationInfo] = React.useState<IrishLocationInfo | null>(null)
  const [isLoadingLocation, setIsLoadingLocation] = React.useState(false)

  // UI state
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [showConnectionModal, setShowConnectionModal] = React.useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false)

  // Map container ref for screenshot capture
  const gisMapContainerRef = React.useRef<HTMLDivElement>(null)
  // Map view state (persists between wizard steps)
  const [mapCenter, setMapCenter] = React.useState<[number, number] | undefined>(undefined)
  const [mapZoom, setMapZoom] = React.useState<number | undefined>(undefined)
  // Base map style state (persists between wizard steps - fixes satellite->streets bug)
  const [baseMapStyle, setBaseMapStyle] = React.useState<MapStyle>('satellite')
  // Fly to location state - for animating to clicked items
  const [flyToLocation, setFlyToLocation] = React.useState<
    | {
        center: [number, number]
        zoom: number
        key: string
      }
    | undefined
  >(undefined)

  // Layer data state - stores fetched results for each layer
  const [layerData, setLayerData] = React.useState<{
    npwsSites: NPWSDesignatedSite[]
    rivers: EPARiver[]
    lakes: EPALake[]
    catchments: EPACatchment[]
  }>({
    npwsSites: [],
    rivers: [],
    lakes: [],
    catchments: [],
  })
  const [layerDataLoading, setLayerDataLoading] = React.useState<Record<string, boolean>>({})
  const [expandedLayers, setExpandedLayers] = React.useState<Set<string>>(new Set())
  // Track ignored and deleted items by their unique ID
  const [ignoredItems, setIgnoredItems] = React.useState<Set<string>>(new Set())
  const [deletedItems, setDeletedItems] = React.useState<Set<string>>(new Set())
  // Track which categories show all items (not just first 5)
  const [showAllItems, setShowAllItems] = React.useState<Set<string>>(new Set())
  // Cache flag to prevent re-fetching on every toggle
  const layerDataFetchedRef = React.useRef(false)

  const handleViewChange = React.useCallback((center: [number, number], zoom: number) => {
    setMapCenter(center)
    setMapZoom(zoom)
  }, [])

  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const updateBoundary = useUpdateProjectBoundary()
  const completeStep = useCompleteWorkflowStep()

  // Toggle map fullscreen mode when entering/leaving boundary step or in preview mode
  React.useEffect(() => {
    const isMapStep =
      viewMode === 'preview' ||
      currentStep === 'boundary' ||
      currentStep === 'buffers' ||
      currentStep === 'layers'
    setMapFullscreen(isMapStep)

    // Cleanup: restore sidebar when component unmounts
    return () => {
      setMapFullscreen(false)
    }
  }, [viewMode, currentStep, setMapFullscreen])

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

  // Fetch layer data when entering layers step - fetches ALL data once and caches it
  const fetchLayerData = React.useCallback(async () => {
    if (!boundary) return

    // Don't refetch if already fetched
    if (layerDataFetchedRef.current) return
    layerDataFetchedRef.current = true

    const coords = boundary.geometry.coordinates[0]
    const lats = coords.map((c) => c[1])
    const lngs = coords.map((c) => c[0])
    const maxBuffer = enabledBuffers.length > 0 ? Math.max(...enabledBuffers) : 5

    // Calculate bbox with buffer (approximate)
    const bufferDegrees = maxBuffer / 111 // ~111km per degree
    const bbox = {
      minLat: Math.min(...lats) - bufferDegrees,
      maxLat: Math.max(...lats) + bufferDegrees,
      minLng: Math.min(...lngs) - bufferDegrees,
      maxLng: Math.max(...lngs) + bufferDegrees,
    }

    // Fetch ALL data types in parallel (not conditional on visibleLayers)
    // This way data is cached and toggles don't trigger refetches

    // Fetch NPWS sites (all types)
    setLayerDataLoading((prev) => ({ ...prev, npws: true }))
    try {
      const siteTypes: DesignatedSiteType[] = ['SAC', 'SPA', 'NHA', 'pNHA']
      const sites = await queryDesignatedSites({
        bbox: {
          minX: bbox.minLng,
          minY: bbox.minLat,
          maxX: bbox.maxLng,
          maxY: bbox.maxLat,
        },
        siteTypes,
      })
      setLayerData((prev) => ({ ...prev, npwsSites: sites }))
    } catch (error) {
      console.error('Error fetching NPWS sites:', error)
    } finally {
      setLayerDataLoading((prev) => ({ ...prev, npws: false }))
    }

    // Fetch Rivers
    setLayerDataLoading((prev) => ({ ...prev, rivers: true }))
    try {
      const rivers = await searchRivers({ bbox, limit: 100 })
      setLayerData((prev) => ({ ...prev, rivers }))
    } catch (error) {
      console.error('Error fetching rivers:', error)
    } finally {
      setLayerDataLoading((prev) => ({ ...prev, rivers: false }))
    }

    // Fetch Lakes
    setLayerDataLoading((prev) => ({ ...prev, lakes: true }))
    try {
      const lakes = await searchLakes({ bbox, limit: 100 })
      setLayerData((prev) => ({ ...prev, lakes }))
    } catch (error) {
      console.error('Error fetching lakes:', error)
    } finally {
      setLayerDataLoading((prev) => ({ ...prev, lakes: false }))
    }

    // Fetch Catchments
    setLayerDataLoading((prev) => ({ ...prev, catchments: true }))
    try {
      const catchments = await searchCatchments({ bbox, limit: 50 })
      setLayerData((prev) => ({ ...prev, catchments }))
    } catch (error) {
      console.error('Error fetching catchments:', error)
    } finally {
      setLayerDataLoading((prev) => ({ ...prev, catchments: false }))
    }
  }, [boundary, enabledBuffers])

  // Trigger data fetch when layers step is active (only once)
  React.useEffect(() => {
    if (currentStep === 'layers' && boundary && !layerDataFetchedRef.current) {
      fetchLayerData()
    }
  }, [currentStep, boundary, fetchLayerData])

  // Reset cache when boundary changes
  React.useEffect(() => {
    layerDataFetchedRef.current = false
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
      console.error('File parse error:', error)
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
    } else {
      // Boundary was deleted
      setBoundary(null)
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
      const result = await updateBoundary.mutateAsync({
        projectId: project.id,
        boundary: boundary,
        centerPoint: {
          type: 'Point',
          coordinates: [parseFloat(boundaryInfo.centerLng), parseFloat(boundaryInfo.centerLat)],
        },
        gridReference: boundaryInfo.gridRef,
        bufferDistances: enabledBuffers,
        visibleLayers: visibleLayers,
        townland: locationInfo?.townland || undefined,
        county: locationInfo?.county || undefined,
        province: locationInfo?.province || undefined,
      })

      if (result) {
        setHasUnsavedChanges(false)
        refetchProject()
      }
    } catch (error) {
      console.error('[GISMappingStep] Save error:', error)
    }
  }

  const handleComplete = async () => {
    if (!boundary) {
      return
    }

    if (hasUnsavedChanges) await handleSave()

    try {
      await completeStep.mutateAsync({
        projectId: project.id,
        stepNumber: workflowStep.step_number,
      })
      refetchWorkflowSteps()
      onComplete?.()
    } catch (error) {
      console.error('[GISMappingStep] Complete step error:', error)
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
    // Auto-enable default data layers when entering the Layers step
    if (currentStep === 'buffers') {
      const defaultLayers = getDefaultVisibleLayers()
      // Only set if user hasn't already configured layers
      if (visibleLayers.length === 0) {
        setVisibleLayers(defaultLayers)
        setHasUnsavedChanges(true)
      }
    }
    if (canGoNext) setCurrentStep(WIZARD_STEPS[currentStepIndex + 1].id)
  }

  const isComplete = workflowStep.status === 'approved'

  // Determine if we're in map mode (compact header)
  const isMapMode = currentStep !== 'source'

  // Handle entering edit mode from preview
  const handleEditClick = () => {
    setViewMode('wizard')
    setCurrentStep('source')
  }

  // PREVIEW MODE - Show summary when step is completed
  if (viewMode === 'preview') {
    return (
      <div className="flex h-full">
        {/* Map with all data */}
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
            showLayersControl={true}
            visibleLayers={visibleLayers}
            baseMapStyle={baseMapStyle}
            onBaseMapStyleChange={setBaseMapStyle}
            flyToLocation={flyToLocation}
          />
        </div>

        {/* Summary Panel */}
        <div className="border-border w-96 overflow-y-auto border-l bg-white">
          {/* Header */}
          <div className="border-b p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">GIS Mapping</h2>
                <p className="text-muted-foreground text-sm">Project boundary configuration</p>
              </div>
              <Badge variant="default" className="bg-emerald-500">
                Completed
              </Badge>
            </div>
          </div>

          {/* Summary Content */}
          <div className="space-y-6 p-6">
            {/* Boundary Info */}
            <div className="rounded-lg border p-4">
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
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Vertices</dt>
                    <dd>{boundaryInfo.pointCount} points</dd>
                  </div>
                </dl>
              )}
            </div>

            {/* Buffer Zones */}
            <div className="rounded-lg border p-4">
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
                  <span className="text-muted-foreground text-sm">No buffers configured</span>
                )}
              </div>
            </div>

            {/* Data Layers */}
            <div className="rounded-lg border p-4">
              <h4 className="mb-3 flex items-center gap-2 font-medium">
                <Layers className="h-4 w-4 text-purple-500" />
                Data Layers
              </h4>
              <div className="space-y-2">
                {DATASET_GROUPS.map((group) => {
                  const activeLayers = group.layers.filter((l) => visibleLayers.includes(l.id))
                  if (activeLayers.length === 0) return null
                  return (
                    <div key={group.id}>
                      <div className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                        {group.label}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {activeLayers.map((layer) => (
                          <Badge key={layer.id} variant="outline" className="gap-1 text-xs">
                            {layer.color && (
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: layer.color }}
                              />
                            )}
                            {layer.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )
                })}
                {visibleLayers.length === 0 && (
                  <span className="text-muted-foreground text-sm">No layers enabled</span>
                )}
              </div>
            </div>

            {/* Edit Button */}
            <Button onClick={handleEditClick} variant="outline" className="w-full">
              <Pencil className="mr-2 h-4 w-4" />
              Edit Configuration
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // WIZARD MODE - Original wizard flow
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
              showLayersControl={true}
              visibleLayers={[]}
              baseMapStyle={baseMapStyle}
              onBaseMapStyleChange={setBaseMapStyle}
              flyToLocation={flyToLocation}
            />

            {/* Boundary info overlay */}
            {boundary && boundaryInfo && (
              <div className="bg-card/95 absolute bottom-4 left-4 z-1000 rounded-lg border p-4 shadow-lg backdrop-blur">
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
                showLayersControl={true}
                visibleLayers={[]}
                baseMapStyle={baseMapStyle}
                onBaseMapStyleChange={setBaseMapStyle}
                flyToLocation={flyToLocation}
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
            <div className="relative flex-1" ref={gisMapContainerRef}>
              <ProjectMapWithDraw
                className="h-full"
                center={mapCenter}
                zoom={mapZoom}
                boundary={boundary ?? undefined}
                bufferZones={bufferZones}
                onViewChange={handleViewChange}
                editable={false}
                showLayersControl={true}
                visibleLayers={visibleLayers}
                baseMapStyle={baseMapStyle}
                onBaseMapStyleChange={setBaseMapStyle}
                ignoredItems={ignoredItems}
                deletedItems={deletedItems}
                npwsSiteCount={(() => {
                  // Map layer IDs to SITE_TYPE values (pNHA has special casing)
                  const layerToSiteType: Record<string, string> = {
                    sac: 'SAC',
                    spa: 'SPA',
                    nha: 'NHA',
                    pnha: 'pNHA',
                  }
                  const selectedTypes = ['sac', 'spa', 'nha', 'pnha']
                    .filter((l) => visibleLayers.includes(l))
                    .map((l) => layerToSiteType[l])
                  return layerData.npwsSites.filter(
                    (site) =>
                      selectedTypes.includes(site.SITE_TYPE || '') &&
                      !deletedItems.has(`npws-${site.SITE_TYPE}-${site.SITECODE}`) &&
                      !ignoredItems.has(`npws-${site.SITE_TYPE}-${site.SITECODE}`)
                  ).length
                })()}
                flyToLocation={flyToLocation}
              />

              {/* Map capture button */}
              <MapCaptureButton
                containerRef={gisMapContainerRef}
                projectId={project.id}
                stepName="gis_mapping"
                userId={userId}
                className="absolute top-4 right-4 z-1000 shadow-md"
              />
            </div>

            {/* Compact Layer selection panel with data preview */}
            <div className="border-border flex w-80 shrink-0 flex-col overflow-hidden border-l bg-white">
              {/* Header - more compact */}
              <div className="border-b px-3 py-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Data Layers</h3>
                  <Badge variant="outline" className="text-[10px]">
                    {enabledBuffers.length > 0 ? `${Math.max(...enabledBuffers)} km` : '5 km'}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-xs">
                  {visibleLayers.length} active · Toggle to view data
                </p>
              </div>

              {/* Layer list with collapsible data */}
              <ScrollArea className="min-h-0 flex-1">
                <div className="w-full overflow-hidden p-2">
                  {/* NPWS Designated Sites */}
                  <div className="mb-2 rounded-lg border">
                    <Collapsible
                      open={expandedLayers.has('npws')}
                      onOpenChange={(open) => {
                        setExpandedLayers((prev) => {
                          const next = new Set(prev)
                          if (open) next.add('npws')
                          else next.delete('npws')
                          return next
                        })
                      }}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex w-full min-w-0 cursor-pointer items-center justify-between p-2 hover:bg-gray-50">
                          <div className="flex min-w-0 items-center gap-2">
                            <div
                              role="checkbox"
                              aria-checked={visibleLayers.some((l) =>
                                ['sac', 'spa', 'nha', 'pnha'].includes(l)
                              )}
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation()
                                const npwsLayers = ['sac', 'spa', 'nha', 'pnha']
                                const allEnabled = npwsLayers.every((l) =>
                                  visibleLayers.includes(l)
                                )
                                if (allEnabled) {
                                  setVisibleLayers((prev) =>
                                    prev.filter((l) => !npwsLayers.includes(l))
                                  )
                                } else {
                                  setVisibleLayers((prev) => [...new Set([...prev, ...npwsLayers])])
                                }
                                setHasUnsavedChanges(true)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  const npwsLayers = ['sac', 'spa', 'nha', 'pnha']
                                  const allEnabled = npwsLayers.every((l) =>
                                    visibleLayers.includes(l)
                                  )
                                  if (allEnabled) {
                                    setVisibleLayers((prev) =>
                                      prev.filter((l) => !npwsLayers.includes(l))
                                    )
                                  } else {
                                    setVisibleLayers((prev) => [
                                      ...new Set([...prev, ...npwsLayers]),
                                    ])
                                  }
                                  setHasUnsavedChanges(true)
                                }
                              }}
                              className={cn(
                                'flex h-4 w-4 cursor-pointer items-center justify-center rounded border-2',
                                visibleLayers.some((l) => ['sac', 'spa', 'nha', 'pnha'].includes(l))
                                  ? 'border-emerald-500 bg-emerald-500'
                                  : 'border-gray-300'
                              )}
                            >
                              {visibleLayers.some((l) =>
                                ['sac', 'spa', 'nha', 'pnha'].includes(l)
                              ) && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <span className="text-sm font-medium">Designated Sites</span>
                            {layerDataLoading.npws ? (
                              <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">
                                {(() => {
                                  const layerToSiteType: Record<string, string> = {
                                    sac: 'SAC',
                                    spa: 'SPA',
                                    nha: 'NHA',
                                    pnha: 'pNHA',
                                  }
                                  const selectedTypes = ['sac', 'spa', 'nha', 'pnha']
                                    .filter((l) => visibleLayers.includes(l))
                                    .map((l) => layerToSiteType[l])
                                  return layerData.npwsSites.filter(
                                    (site) =>
                                      selectedTypes.includes(site.SITE_TYPE || '') &&
                                      !deletedItems.has(`npws-${site.SITE_TYPE}-${site.SITECODE}`)
                                  ).length
                                })()}
                              </Badge>
                            )}
                          </div>
                          <ChevronDown
                            className={cn(
                              'h-4 w-4 text-gray-400 transition-transform',
                              expandedLayers.has('npws') && 'rotate-180'
                            )}
                          />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t bg-gray-50/50 p-2">
                          {/* Layer toggles */}
                          <div className="mb-2 flex flex-wrap gap-1">
                            {['sac', 'spa', 'nha', 'pnha'].map((layerId) => {
                              const layer = DATASET_GROUPS.find(
                                (g) => g.id === 'npws'
                              )?.layers.find((l) => l.id === layerId)
                              const isEnabled = visibleLayers.includes(layerId)
                              return (
                                <button
                                  key={layerId}
                                  onClick={() => {
                                    handleLayerToggle(layerId)
                                    setHasUnsavedChanges(true)
                                  }}
                                  className={cn(
                                    'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors',
                                    isEnabled
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                  )}
                                >
                                  <span
                                    className="h-1.5 w-1.5 rounded-full"
                                    style={{ backgroundColor: layer?.color }}
                                  />
                                  {layerId.toUpperCase()}
                                </button>
                              )
                            })}
                          </div>
                          {/* Sites list */}
                          {(() => {
                            // Filter by selected layer types and exclude deleted items
                            const layerToSiteType: Record<string, string> = {
                              sac: 'SAC',
                              spa: 'SPA',
                              nha: 'NHA',
                              pnha: 'pNHA',
                            }
                            const selectedTypes = ['sac', 'spa', 'nha', 'pnha']
                              .filter((l) => visibleLayers.includes(l))
                              .map((l) => layerToSiteType[l])
                            const filteredSites = layerData.npwsSites.filter(
                              (site) =>
                                selectedTypes.includes(site.SITE_TYPE || '') &&
                                !deletedItems.has(`npws-${site.SITE_TYPE}-${site.SITECODE}`)
                            )
                            const displayCount = 5
                            const isShowingAll = showAllItems.has('npws')
                            const sitesToShow = isShowingAll
                              ? filteredSites
                              : filteredSites.slice(0, displayCount)
                            return filteredSites.length > 0 ? (
                              <div className="max-h-64 space-y-1 overflow-x-hidden overflow-y-auto">
                                {sitesToShow.map((site, idx) => {
                                  const siteKey = `npws-${site.SITE_TYPE}-${site.SITECODE}`
                                  const isIgnored = ignoredItems.has(siteKey)
                                  return (
                                    <div
                                      key={`${site.SITE_TYPE}-${site.SITECODE}-${idx}`}
                                      onClick={() => {
                                        // Zoom to site on click
                                        if (site.geometry) {
                                          const coords =
                                            site.geometry.type === 'Polygon'
                                              ? site.geometry.coordinates[0]
                                              : site.geometry.type === 'MultiPolygon'
                                                ? site.geometry.coordinates[0][0]
                                                : null
                                          if (coords) {
                                            const lats = coords.map((c: number[]) => c[1])
                                            const lngs = coords.map((c: number[]) => c[0])
                                            const centerLat =
                                              (Math.min(...lats) + Math.max(...lats)) / 2
                                            const centerLng =
                                              (Math.min(...lngs) + Math.max(...lngs)) / 2
                                            setFlyToLocation({
                                              center: [centerLat, centerLng],
                                              zoom: 13,
                                              key: `${site.SITECODE}-${Date.now()}`,
                                            })
                                          }
                                        }
                                      }}
                                      className={cn(
                                        'group flex cursor-pointer items-start gap-1.5 rounded p-1.5 text-xs transition-colors',
                                        isIgnored
                                          ? 'bg-gray-100 opacity-50'
                                          : 'bg-white hover:bg-gray-100'
                                      )}
                                    >
                                      <span
                                        className="mt-1 h-2 w-2 shrink-0 rounded-full"
                                        style={{
                                          backgroundColor:
                                            site.SITE_TYPE === 'SAC'
                                              ? '#10b981'
                                              : site.SITE_TYPE === 'SPA'
                                                ? '#3b82f6'
                                                : site.SITE_TYPE === 'NHA'
                                                  ? '#8b5cf6'
                                                  : '#a855f7',
                                        }}
                                      />
                                      <div
                                        className={cn(
                                          'min-w-0 flex-1 overflow-hidden',
                                          isIgnored && 'line-through'
                                        )}
                                      >
                                        <p className="font-medium" title={site.SITENAME}>
                                          {site.SITENAME && site.SITENAME.length > 28
                                            ? site.SITENAME.slice(0, 28) + '…'
                                            : site.SITENAME}
                                        </p>
                                        <p className="text-muted-foreground text-[10px]">
                                          {site.SITE_TYPE} · {site.AREA_HA?.toFixed(0)} ha
                                        </p>
                                      </div>
                                      <div className="flex shrink-0 items-center gap-0.5">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setIgnoredItems((prev) => {
                                              const next = new Set(prev)
                                              if (isIgnored) {
                                                next.delete(siteKey)
                                              } else {
                                                next.add(siteKey)
                                              }
                                              return next
                                            })
                                            setHasUnsavedChanges(true)
                                          }}
                                          className={cn(
                                            'rounded p-1 transition-colors',
                                            isIgnored
                                              ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                                              : 'text-gray-400 hover:bg-gray-200 hover:text-amber-600'
                                          )}
                                          title={isIgnored ? 'Show on map' : 'Hide from map'}
                                        >
                                          {isIgnored ? (
                                            <Eye className="h-3 w-3" />
                                          ) : (
                                            <EyeOff className="h-3 w-3" />
                                          )}
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setDeletedItems((prev) => {
                                              const next = new Set(prev)
                                              next.add(siteKey)
                                              return next
                                            })
                                            setHasUnsavedChanges(true)
                                          }}
                                          className="rounded p-1 text-gray-400 transition-colors hover:bg-red-100 hover:text-red-600"
                                          title="Remove from list"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </div>
                                  )
                                })}
                                {filteredSites.length > displayCount && (
                                  <button
                                    onClick={() => {
                                      setShowAllItems((prev) => {
                                        const next = new Set(prev)
                                        if (isShowingAll) {
                                          next.delete('npws')
                                        } else {
                                          next.add('npws')
                                        }
                                        return next
                                      })
                                    }}
                                    className="text-muted-foreground sticky bottom-0 w-full bg-gray-50/90 py-1 text-center text-[10px] backdrop-blur-sm transition-colors hover:bg-gray-100 hover:text-gray-700"
                                  >
                                    {isShowingAll
                                      ? 'Show less'
                                      : `+${filteredSites.length - displayCount} more sites`}
                                  </button>
                                )}
                              </div>
                            ) : !layerDataLoading.npws ? (
                              <p className="text-muted-foreground py-2 text-center text-xs">
                                No sites found in buffer zone
                              </p>
                            ) : null
                          })()}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>

                  {/* EPA Rivers */}
                  <div className="mb-2 rounded-lg border">
                    <Collapsible
                      open={expandedLayers.has('rivers')}
                      onOpenChange={(open) => {
                        setExpandedLayers((prev) => {
                          const next = new Set(prev)
                          if (open) next.add('rivers')
                          else next.delete('rivers')
                          return next
                        })
                      }}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex w-full cursor-pointer items-center justify-between p-2 hover:bg-gray-50">
                          <div className="flex items-center gap-2">
                            <div
                              role="checkbox"
                              aria-checked={visibleLayers.includes('rivers')}
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleLayerToggle('rivers')
                                setHasUnsavedChanges(true)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleLayerToggle('rivers')
                                  setHasUnsavedChanges(true)
                                }
                              }}
                              className={cn(
                                'flex h-4 w-4 cursor-pointer items-center justify-center rounded border-2',
                                visibleLayers.includes('rivers')
                                  ? 'border-emerald-500 bg-emerald-500'
                                  : 'border-gray-300'
                              )}
                            >
                              {visibleLayers.includes('rivers') && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </div>
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: '#0284c7' }}
                            />
                            <span className="text-sm font-medium">Rivers</span>
                            {layerDataLoading.rivers ? (
                              <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">
                                {layerData.rivers.length}
                              </Badge>
                            )}
                          </div>
                          <ChevronDown
                            className={cn(
                              'h-4 w-4 text-gray-400 transition-transform',
                              expandedLayers.has('rivers') && 'rotate-180'
                            )}
                          />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t bg-gray-50/50 p-2">
                          {(() => {
                            const filteredRivers = layerData.rivers.filter(
                              (river) => !deletedItems.has(`river-${river.RiverCode}`)
                            )
                            const displayCount = 5
                            const isShowingAll = showAllItems.has('rivers')
                            const riversToShow = isShowingAll
                              ? filteredRivers
                              : filteredRivers.slice(0, displayCount)
                            return filteredRivers.length > 0 ? (
                              <div className="max-h-64 space-y-1 overflow-x-hidden overflow-y-auto">
                                {riversToShow.map((river, idx) => {
                                  const itemKey = `river-${river.RiverCode}`
                                  const isIgnored = ignoredItems.has(itemKey)
                                  return (
                                    <div
                                      key={`${river.RiverCode}-${idx}`}
                                      onClick={() => {
                                        if (river.geometry) {
                                          const coords =
                                            river.geometry.type === 'LineString'
                                              ? river.geometry.coordinates
                                              : river.geometry.type === 'MultiLineString'
                                                ? river.geometry.coordinates[0]
                                                : null
                                          if (coords && coords.length > 0) {
                                            const lats = coords.map((c: number[]) => c[1])
                                            const lngs = coords.map((c: number[]) => c[0])
                                            const centerLat =
                                              (Math.min(...lats) + Math.max(...lats)) / 2
                                            const centerLng =
                                              (Math.min(...lngs) + Math.max(...lngs)) / 2
                                            setFlyToLocation({
                                              center: [centerLat, centerLng],
                                              zoom: 13,
                                              key: `${river.RiverCode}-${Date.now()}`,
                                            })
                                          }
                                        }
                                      }}
                                      className={cn(
                                        'group flex cursor-pointer items-start gap-1.5 rounded p-1.5 text-xs transition-colors',
                                        isIgnored
                                          ? 'bg-gray-100 opacity-50'
                                          : 'bg-white hover:bg-gray-100'
                                      )}
                                    >
                                      <span
                                        className="mt-1 h-2 w-2 shrink-0 rounded-full"
                                        style={{ backgroundColor: '#0284c7' }}
                                      />
                                      <div
                                        className={cn(
                                          'min-w-0 flex-1 overflow-hidden',
                                          isIgnored && 'line-through'
                                        )}
                                      >
                                        <p className="font-medium" title={river.RiverName}>
                                          {river.RiverName && river.RiverName.length > 28
                                            ? river.RiverName.slice(0, 28) + '…'
                                            : river.RiverName}
                                        </p>
                                        <p className="text-muted-foreground text-[10px]">
                                          {river.WFD_Status && `WFD: ${river.WFD_Status}`}
                                          {river.Length_km && ` · ${river.Length_km.toFixed(1)} km`}
                                        </p>
                                      </div>
                                      <div className="flex shrink-0 items-center gap-0.5">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setIgnoredItems((prev) => {
                                              const next = new Set(prev)
                                              if (isIgnored) {
                                                next.delete(itemKey)
                                              } else {
                                                next.add(itemKey)
                                              }
                                              return next
                                            })
                                            setHasUnsavedChanges(true)
                                          }}
                                          className={cn(
                                            'rounded p-1 transition-colors',
                                            isIgnored
                                              ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                                              : 'text-gray-400 hover:bg-gray-200 hover:text-amber-600'
                                          )}
                                          title={isIgnored ? 'Show on map' : 'Hide from map'}
                                        >
                                          {isIgnored ? (
                                            <Eye className="h-3 w-3" />
                                          ) : (
                                            <EyeOff className="h-3 w-3" />
                                          )}
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setDeletedItems((prev) => {
                                              const next = new Set(prev)
                                              next.add(itemKey)
                                              return next
                                            })
                                            setHasUnsavedChanges(true)
                                          }}
                                          className="rounded p-1 text-gray-400 transition-colors hover:bg-red-100 hover:text-red-600"
                                          title="Remove from list"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </div>
                                  )
                                })}
                                {filteredRivers.length > displayCount && (
                                  <button
                                    onClick={() => {
                                      setShowAllItems((prev) => {
                                        const next = new Set(prev)
                                        if (isShowingAll) {
                                          next.delete('rivers')
                                        } else {
                                          next.add('rivers')
                                        }
                                        return next
                                      })
                                    }}
                                    className="text-muted-foreground sticky bottom-0 w-full bg-gray-50/90 py-1 text-center text-[10px] backdrop-blur-sm transition-colors hover:bg-gray-100 hover:text-gray-700"
                                  >
                                    {isShowingAll
                                      ? 'Show less'
                                      : `+${filteredRivers.length - displayCount} more rivers`}
                                  </button>
                                )}
                              </div>
                            ) : !layerDataLoading.rivers ? (
                              <p className="text-muted-foreground py-2 text-center text-xs">
                                No rivers found in buffer zone
                              </p>
                            ) : null
                          })()}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>

                  {/* EPA Lakes */}
                  <div className="mb-2 rounded-lg border">
                    <Collapsible
                      open={expandedLayers.has('lakes')}
                      onOpenChange={(open) => {
                        setExpandedLayers((prev) => {
                          const next = new Set(prev)
                          if (open) next.add('lakes')
                          else next.delete('lakes')
                          return next
                        })
                      }}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex w-full cursor-pointer items-center justify-between p-2 hover:bg-gray-50">
                          <div className="flex items-center gap-2">
                            <div
                              role="checkbox"
                              aria-checked={visibleLayers.includes('lakes')}
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleLayerToggle('lakes')
                                setHasUnsavedChanges(true)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleLayerToggle('lakes')
                                  setHasUnsavedChanges(true)
                                }
                              }}
                              className={cn(
                                'flex h-4 w-4 cursor-pointer items-center justify-center rounded border-2',
                                visibleLayers.includes('lakes')
                                  ? 'border-emerald-500 bg-emerald-500'
                                  : 'border-gray-300'
                              )}
                            >
                              {visibleLayers.includes('lakes') && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </div>
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: '#0369a1' }}
                            />
                            <span className="text-sm font-medium">Lakes</span>
                            {layerDataLoading.lakes ? (
                              <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">
                                {layerData.lakes.length}
                              </Badge>
                            )}
                          </div>
                          <ChevronDown
                            className={cn(
                              'h-4 w-4 text-gray-400 transition-transform',
                              expandedLayers.has('lakes') && 'rotate-180'
                            )}
                          />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t bg-gray-50/50 p-2">
                          {(() => {
                            const filteredLakes = layerData.lakes.filter(
                              (lake) => !deletedItems.has(`lake-${lake.LakeCode}`)
                            )
                            const displayCount = 5
                            const isShowingAll = showAllItems.has('lakes')
                            const lakesToShow = isShowingAll
                              ? filteredLakes
                              : filteredLakes.slice(0, displayCount)
                            return filteredLakes.length > 0 ? (
                              <div className="max-h-64 space-y-1 overflow-x-hidden overflow-y-auto">
                                {lakesToShow.map((lake, idx) => {
                                  const itemKey = `lake-${lake.LakeCode}`
                                  const isIgnored = ignoredItems.has(itemKey)
                                  return (
                                    <div
                                      key={`${lake.LakeCode}-${idx}`}
                                      onClick={() => {
                                        if (lake.geometry) {
                                          const coords =
                                            lake.geometry.type === 'Polygon'
                                              ? lake.geometry.coordinates[0]
                                              : lake.geometry.type === 'MultiPolygon'
                                                ? lake.geometry.coordinates[0][0]
                                                : null
                                          if (coords && coords.length > 0) {
                                            const lats = coords.map((c: number[]) => c[1])
                                            const lngs = coords.map((c: number[]) => c[0])
                                            const centerLat =
                                              (Math.min(...lats) + Math.max(...lats)) / 2
                                            const centerLng =
                                              (Math.min(...lngs) + Math.max(...lngs)) / 2
                                            setFlyToLocation({
                                              center: [centerLat, centerLng],
                                              zoom: 13,
                                              key: `${lake.LakeCode}-${Date.now()}`,
                                            })
                                          }
                                        }
                                      }}
                                      className={cn(
                                        'group flex cursor-pointer items-start gap-1.5 rounded p-1.5 text-xs transition-colors',
                                        isIgnored
                                          ? 'bg-gray-100 opacity-50'
                                          : 'bg-white hover:bg-gray-100'
                                      )}
                                    >
                                      <span
                                        className="mt-1 h-2 w-2 shrink-0 rounded-full"
                                        style={{ backgroundColor: '#0369a1' }}
                                      />
                                      <div
                                        className={cn(
                                          'min-w-0 flex-1 overflow-hidden',
                                          isIgnored && 'line-through'
                                        )}
                                      >
                                        <p className="font-medium" title={lake.LakeName}>
                                          {lake.LakeName && lake.LakeName.length > 28
                                            ? lake.LakeName.slice(0, 28) + '…'
                                            : lake.LakeName}
                                        </p>
                                        <p className="text-muted-foreground text-[10px]">
                                          {lake.WFD_Status && `WFD: ${lake.WFD_Status}`}
                                          {lake.Area_ha && ` · ${lake.Area_ha.toFixed(0)} ha`}
                                        </p>
                                      </div>
                                      <div className="flex shrink-0 items-center gap-0.5">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setIgnoredItems((prev) => {
                                              const next = new Set(prev)
                                              if (isIgnored) {
                                                next.delete(itemKey)
                                              } else {
                                                next.add(itemKey)
                                              }
                                              return next
                                            })
                                            setHasUnsavedChanges(true)
                                          }}
                                          className={cn(
                                            'rounded p-1 transition-colors',
                                            isIgnored
                                              ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                                              : 'text-gray-400 hover:bg-gray-200 hover:text-amber-600'
                                          )}
                                          title={isIgnored ? 'Show on map' : 'Hide from map'}
                                        >
                                          {isIgnored ? (
                                            <Eye className="h-3 w-3" />
                                          ) : (
                                            <EyeOff className="h-3 w-3" />
                                          )}
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setDeletedItems((prev) => {
                                              const next = new Set(prev)
                                              next.add(itemKey)
                                              return next
                                            })
                                            setHasUnsavedChanges(true)
                                          }}
                                          className="rounded p-1 text-gray-400 transition-colors hover:bg-red-100 hover:text-red-600"
                                          title="Remove from list"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </div>
                                  )
                                })}
                                {filteredLakes.length > displayCount && (
                                  <button
                                    onClick={() => {
                                      setShowAllItems((prev) => {
                                        const next = new Set(prev)
                                        if (isShowingAll) {
                                          next.delete('lakes')
                                        } else {
                                          next.add('lakes')
                                        }
                                        return next
                                      })
                                    }}
                                    className="text-muted-foreground sticky bottom-0 w-full bg-gray-50/90 py-1 text-center text-[10px] backdrop-blur-sm transition-colors hover:bg-gray-100 hover:text-gray-700"
                                  >
                                    {isShowingAll
                                      ? 'Show less'
                                      : `+${filteredLakes.length - displayCount} more lakes`}
                                  </button>
                                )}
                              </div>
                            ) : !layerDataLoading.lakes ? (
                              <p className="text-muted-foreground py-2 text-center text-xs">
                                No lakes found in buffer zone
                              </p>
                            ) : null
                          })()}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>

                  {/* EPA Catchments */}
                  <div className="mb-2 rounded-lg border">
                    <Collapsible
                      open={expandedLayers.has('catchments')}
                      onOpenChange={(open) => {
                        setExpandedLayers((prev) => {
                          const next = new Set(prev)
                          if (open) next.add('catchments')
                          else next.delete('catchments')
                          return next
                        })
                      }}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex w-full cursor-pointer items-center justify-between p-2 hover:bg-gray-50">
                          <div className="flex items-center gap-2">
                            <div
                              role="checkbox"
                              aria-checked={visibleLayers.includes('catchments')}
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleLayerToggle('catchments')
                                setHasUnsavedChanges(true)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleLayerToggle('catchments')
                                  setHasUnsavedChanges(true)
                                }
                              }}
                              className={cn(
                                'flex h-4 w-4 cursor-pointer items-center justify-center rounded border-2',
                                visibleLayers.includes('catchments')
                                  ? 'border-emerald-500 bg-emerald-500'
                                  : 'border-gray-300'
                              )}
                            >
                              {visibleLayers.includes('catchments') && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </div>
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: '#38bdf8' }}
                            />
                            <span className="text-sm font-medium">Catchments</span>
                            {layerDataLoading.catchments ? (
                              <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">
                                {layerData.catchments.length}
                              </Badge>
                            )}
                          </div>
                          <ChevronDown
                            className={cn(
                              'h-4 w-4 text-gray-400 transition-transform',
                              expandedLayers.has('catchments') && 'rotate-180'
                            )}
                          />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t bg-gray-50/50 p-2">
                          {(() => {
                            const filteredCatchments = layerData.catchments.filter(
                              (catchment) => !deletedItems.has(`catchment-${catchment.CatchmentId}`)
                            )
                            const displayCount = 5
                            const isShowingAll = showAllItems.has('catchments')
                            const catchmentsToShow = isShowingAll
                              ? filteredCatchments
                              : filteredCatchments.slice(0, displayCount)
                            return filteredCatchments.length > 0 ? (
                              <div className="max-h-64 space-y-1 overflow-x-hidden overflow-y-auto">
                                {catchmentsToShow.map((catchment, idx) => {
                                  const itemKey = `catchment-${catchment.CatchmentId}`
                                  const isIgnored = ignoredItems.has(itemKey)
                                  return (
                                    <div
                                      key={`${catchment.CatchmentId}-${idx}`}
                                      onClick={() => {
                                        if (catchment.geometry) {
                                          const coords =
                                            catchment.geometry.type === 'Polygon'
                                              ? catchment.geometry.coordinates[0]
                                              : catchment.geometry.type === 'MultiPolygon'
                                                ? catchment.geometry.coordinates[0][0]
                                                : null
                                          if (coords && coords.length > 0) {
                                            const lats = coords.map((c: number[]) => c[1])
                                            const lngs = coords.map((c: number[]) => c[0])
                                            const centerLat =
                                              (Math.min(...lats) + Math.max(...lats)) / 2
                                            const centerLng =
                                              (Math.min(...lngs) + Math.max(...lngs)) / 2
                                            setFlyToLocation({
                                              center: [centerLat, centerLng],
                                              zoom: 11,
                                              key: `${catchment.CatchmentId}-${Date.now()}`,
                                            })
                                          }
                                        }
                                      }}
                                      className={cn(
                                        'group flex cursor-pointer items-start gap-1.5 rounded p-1.5 text-xs transition-colors',
                                        isIgnored
                                          ? 'bg-gray-100 opacity-50'
                                          : 'bg-white hover:bg-gray-100'
                                      )}
                                    >
                                      <span
                                        className="mt-1 h-2 w-2 shrink-0 rounded-full"
                                        style={{ backgroundColor: '#38bdf8' }}
                                      />
                                      <div
                                        className={cn(
                                          'min-w-0 flex-1 overflow-hidden',
                                          isIgnored && 'line-through'
                                        )}
                                      >
                                        <p className="font-medium" title={catchment.CatchmentName}>
                                          {catchment.CatchmentName &&
                                          catchment.CatchmentName.length > 28
                                            ? catchment.CatchmentName.slice(0, 28) + '…'
                                            : catchment.CatchmentName}
                                        </p>
                                        <p className="text-muted-foreground text-[10px]">
                                          {catchment.Area_km2 &&
                                            `${catchment.Area_km2.toFixed(0)} km²`}
                                          {catchment.RiverBasinDistrict &&
                                            ` · ${catchment.RiverBasinDistrict}`}
                                        </p>
                                      </div>
                                      <div className="flex shrink-0 items-center gap-0.5">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setIgnoredItems((prev) => {
                                              const next = new Set(prev)
                                              if (isIgnored) {
                                                next.delete(itemKey)
                                              } else {
                                                next.add(itemKey)
                                              }
                                              return next
                                            })
                                            setHasUnsavedChanges(true)
                                          }}
                                          className={cn(
                                            'rounded p-1 transition-colors',
                                            isIgnored
                                              ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                                              : 'text-gray-400 hover:bg-gray-200 hover:text-amber-600'
                                          )}
                                          title={isIgnored ? 'Show on map' : 'Hide from map'}
                                        >
                                          {isIgnored ? (
                                            <Eye className="h-3 w-3" />
                                          ) : (
                                            <EyeOff className="h-3 w-3" />
                                          )}
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setDeletedItems((prev) => {
                                              const next = new Set(prev)
                                              next.add(itemKey)
                                              return next
                                            })
                                            setHasUnsavedChanges(true)
                                          }}
                                          className="rounded p-1 text-gray-400 transition-colors hover:bg-red-100 hover:text-red-600"
                                          title="Remove from list"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </div>
                                  )
                                })}
                                {filteredCatchments.length > displayCount && (
                                  <button
                                    onClick={() => {
                                      setShowAllItems((prev) => {
                                        const next = new Set(prev)
                                        if (isShowingAll) {
                                          next.delete('catchments')
                                        } else {
                                          next.add('catchments')
                                        }
                                        return next
                                      })
                                    }}
                                    className="text-muted-foreground sticky bottom-0 w-full bg-gray-50/90 py-1 text-center text-[10px] backdrop-blur-sm transition-colors hover:bg-gray-100 hover:text-gray-700"
                                  >
                                    {isShowingAll
                                      ? 'Show less'
                                      : `+${filteredCatchments.length - displayCount} more catchments`}
                                  </button>
                                )}
                              </div>
                            ) : !layerDataLoading.catchments ? (
                              <p className="text-muted-foreground py-2 text-center text-xs">
                                No catchments found in buffer zone
                              </p>
                            ) : null
                          })()}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>

                  {/* Geology & Terrain - Coming soon */}
                  <div className="rounded-lg border border-dashed bg-gray-50/50 p-3">
                    <p className="text-muted-foreground text-center text-xs">
                      Geology & Terrain layers coming soon
                    </p>
                  </div>
                </div>
              </ScrollArea>

              {/* Footer with Save & Complete buttons */}
              <div className="space-y-2 border-t bg-gray-50 p-3">
                <Button
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges || updateBoundary.isPending}
                  variant="outline"
                  className="w-full"
                  size="sm"
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
                  size="sm"
                >
                  {completeStep.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Save & Continue
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

          {canGoNext ? (
            <Button size={isMapMode ? 'sm' : 'default'} onClick={goNext}>
              Next
              <ChevronRight className={cn(isMapMode ? 'ml-1 h-3 w-3' : 'ml-2 h-4 w-4')} />
            </Button>
          ) : (
            <div className="w-20" />
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
