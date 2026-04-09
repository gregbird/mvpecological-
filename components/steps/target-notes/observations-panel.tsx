'use client'

import dynamic from 'next/dynamic'
import { AlertCircle, Loader2 } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IRELAND_CENTER } from '@/lib/config/map-constants'
import { ObservationListItem, TAXON_LABELS } from './observation-list-item'
import type { SpeciesObservation } from '@/types/database'

// Dynamic import for map
const DynamicProjectMap = dynamic(
  () => import('@/components/maps/project-map').then((mod) => mod.ProjectMap),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted/50 flex h-100 items-center justify-center rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ),
  }
)

interface Survey {
  id: string
  survey_type: string
  survey_date: string
  visit_group_id?: string | null
  visit_number?: number | null
}

interface ObservationsPanelProps {
  surveys: Survey[]
  filteredObservations: SpeciesObservation[]
  observationsByTaxon: Record<string, SpeciesObservation[]>
  selectedSurveyId: string
  onSurveyChange: (surveyId: string) => void
  activeTab: string
  onActiveTabChange: (tab: string) => void
  selectedObservation: SpeciesObservation | null
  onSelectObservation: (observation: SpeciesObservation) => void
  onEditObservation: (observation: SpeciesObservation) => void
  onDeleteObservation: (observation: SpeciesObservation) => void
  projectBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  projectCenter?: { lat: number; lng: number }
}

export function ObservationsPanel({
  surveys,
  filteredObservations,
  observationsByTaxon,
  selectedSurveyId,
  onSurveyChange,
  activeTab,
  onActiveTabChange,
  selectedObservation,
  onSelectObservation,
  onEditObservation,
  onDeleteObservation,
  projectBoundary,
  projectCenter,
}: ObservationsPanelProps) {
  return (
    <div className="flex flex-col">
      {surveys.length === 0 ? (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Surveys Available</AlertTitle>
          <AlertDescription>Please complete Step 4 (Field Research) first.</AlertDescription>
        </Alert>
      ) : null}

      {/* Survey Filter */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm font-medium">Survey:</span>
        <Select
          value={selectedSurveyId || 'all'}
          onValueChange={(value) => onSurveyChange(value === 'all' ? '' : value)}
        >
          <SelectTrigger className="w-50">
            <SelectValue placeholder="All surveys" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All surveys</SelectItem>
            {surveys.map((survey) => (
              <SelectItem key={survey.id} value={survey.id}>
                {survey.survey_type}
                {survey.visit_number != null ? ` - Visit ${survey.visit_number}` : ''} -{' '}
                {new Date(survey.survey_date).toLocaleDateString()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Observations Content - Stacked: map on top, list below */}
      <div className="flex flex-col gap-4">
        {/* Map */}
        <Card className="flex flex-col">
          <CardHeader className="py-3">
            <CardTitle className="text-base">Observation Map</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="h-[62vh] min-h-[440px] overflow-hidden rounded-lg border">
              <DynamicProjectMap
                center={projectCenter ? [projectCenter.lat, projectCenter.lng] : IRELAND_CENTER}
                zoom={projectCenter ? 14 : 7}
                boundary={projectBoundary}
                observationPoints={{
                  type: 'FeatureCollection',
                  features: filteredObservations
                    .filter((o) => o.location)
                    .map((o) => ({
                      type: 'Feature' as const,
                      geometry: o.location as GeoJSON.Point,
                      properties: {
                        id: o.id,
                        name: o.species_name_common || o.species_name_scientific,
                        isProtected: o.is_protected || false,
                      },
                    })),
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Observation List */}
        <Card className="flex h-[440px] shrink-0 flex-col">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Species Observations</CardTitle>
              <Badge variant="secondary">{filteredObservations.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-auto p-3 pt-0">
            <Tabs
              value={activeTab}
              onValueChange={onActiveTabChange}
              className="flex h-full flex-col"
            >
              <TabsList className="flex h-auto flex-wrap gap-1">
                <TabsTrigger value="all" className="text-xs">
                  All ({filteredObservations.length})
                </TabsTrigger>
                {Object.entries(observationsByTaxon)
                  .slice(0, 4)
                  .map(([taxon, obs]) => (
                    <TabsTrigger key={taxon} value={taxon} className="text-xs">
                      {TAXON_LABELS[taxon] || taxon} ({obs.length})
                    </TabsTrigger>
                  ))}
              </TabsList>

              <TabsContent value="all" className="mt-3 min-h-0 flex-1 overflow-auto">
                {filteredObservations.length === 0 ? (
                  <div className="text-muted-foreground py-8 text-center text-sm">
                    No observations yet. Click &quot;Add Observation&quot; to record species
                    sightings.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredObservations.map((obs) => (
                      <ObservationListItem
                        key={obs.id}
                        observation={obs}
                        isSelected={selectedObservation?.id === obs.id}
                        onSelect={() => onSelectObservation(obs)}
                        onEdit={() => onEditObservation(obs)}
                        onDelete={() => onDeleteObservation(obs)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              {Object.entries(observationsByTaxon).map(([taxon, taxonObs]) => (
                <TabsContent
                  key={taxon}
                  value={taxon}
                  className="mt-3 min-h-0 flex-1 overflow-auto"
                >
                  <div className="space-y-2">
                    {taxonObs.map((obs) => (
                      <ObservationListItem
                        key={obs.id}
                        observation={obs}
                        isSelected={selectedObservation?.id === obs.id}
                        onSelect={() => onSelectObservation(obs)}
                        onEdit={() => onEditObservation(obs)}
                        onDelete={() => onDeleteObservation(obs)}
                      />
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
