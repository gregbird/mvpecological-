'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Plus, Map, Calendar } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ProjectMap } from '@/components/maps/project-map'
import { SurveyCard, type Survey, type SurveyStatus } from '@/components/field-surveys/survey-card'
import { SurveyForm } from '@/components/field-surveys/survey-form'
import { useToast } from '@/hooks/use-toast'

// Mock project data - will be fetched from Supabase
const mockProject = {
  id: '1',
  name: 'Ballymore Wind Farm EcIA',
  site_code: 'BWF-2024-001',
  grid_reference: 'N 23456 12345',
  center: { lat: 53.45, lng: -7.85 } as { lat: number; lng: number },
  boundary: {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'Polygon' as const,
      coordinates: [
        [
          [-7.87, 53.44],
          [-7.83, 53.44],
          [-7.83, 53.46],
          [-7.87, 53.46],
          [-7.87, 53.44],
        ],
      ],
    },
  },
}

// Mock surveys data
const mockSurveys: Survey[] = [
  {
    id: '1',
    surveyType: 'walkover',
    surveyDate: '2024-03-15',
    startTime: '09:00',
    endTime: '16:30',
    status: 'completed',
    surveyor: { id: '1', name: "Dr. Sarah O'Brien" },
    weather: {
      temperature: 12,
      windSpeed: 15,
      windDirection: 'SW',
      cloudCover: 60,
      precipitation: 'Light Rain',
      visibility: 'Good',
    },
    notes: 'Initial walkover survey to assess habitats and identify ecological features.',
    observationCount: 45,
    habitatCount: 8,
  },
  {
    id: '2',
    surveyType: 'habitat_mapping',
    surveyDate: '2024-04-02',
    startTime: '08:30',
    endTime: '17:00',
    status: 'completed',
    surveyor: { id: '2', name: 'Michael Murphy' },
    weather: {
      temperature: 14,
      windSpeed: 8,
      cloudCover: 40,
      precipitation: 'None',
      visibility: 'Excellent',
    },
    notes: 'Detailed habitat mapping following Fossitt classification.',
    observationCount: 0,
    habitatCount: 12,
  },
  {
    id: '3',
    surveyType: 'bird_survey',
    surveyDate: '2024-04-10',
    startTime: '05:30',
    endTime: '09:00',
    status: 'completed',
    surveyor: { id: '1', name: "Dr. Sarah O'Brien" },
    weather: {
      temperature: 8,
      windSpeed: 5,
      cloudCover: 20,
      precipitation: 'None',
      visibility: 'Excellent',
    },
    notes: 'Dawn breeding bird survey - transect method.',
    observationCount: 32,
    habitatCount: 0,
  },
  {
    id: '4',
    surveyType: 'bat_survey',
    surveyDate: '2024-05-20',
    status: 'in_progress',
    surveyor: { id: '3', name: 'Emma Kelly' },
    notes: 'Dusk bat activity survey at identified roost locations.',
    observationCount: 0,
    habitatCount: 0,
  },
]

export default function FieldSurveysPage() {
  const params = useParams()
  const projectId = params.id as string
  const { toast } = useToast()

  const [surveys, setSurveys] = React.useState<Survey[]>(mockSurveys)
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [typeFilter, setTypeFilter] = React.useState<string>('all')
  const [showMap, setShowMap] = React.useState(true)
  const [showSurveyForm, setShowSurveyForm] = React.useState(false)
  const [editingSurvey, setEditingSurvey] = React.useState<Survey | undefined>()
  const [activeTab, setActiveTab] = React.useState('surveys')

  // Filter surveys
  const filteredSurveys = React.useMemo(() => {
    return surveys.filter((survey) => {
      if (statusFilter !== 'all' && survey.status !== statusFilter) return false
      if (typeFilter !== 'all' && survey.surveyType !== typeFilter) return false
      return true
    })
  }, [surveys, statusFilter, typeFilter])

  // Group surveys by status
  const surveyStats = React.useMemo(() => {
    const stats = {
      total: surveys.length,
      in_progress: surveys.filter((s) => s.status === 'in_progress').length,
      completed: surveys.filter((s) => s.status === 'completed').length,
      totalObservations: surveys.reduce((acc, s) => acc + (s.observationCount || 0), 0),
      totalHabitats: surveys.reduce((acc, s) => acc + (s.habitatCount || 0), 0),
    }
    return stats
  }, [surveys])

  const handleCreateSurvey = async (data: Partial<Survey>) => {
    const newSurvey: Survey = {
      ...data,
      id: `${Date.now()}`,
      status: 'in_progress',
      observationCount: 0,
      habitatCount: 0,
    } as Survey

    setSurveys((prev) => [...prev, newSurvey])
    toast({
      title: 'Survey created',
      description: `${newSurvey.surveyType.replace(/_/g, ' ')} survey scheduled for ${newSurvey.surveyDate}.`,
    })
  }

  const handleUpdateSurvey = async (data: Partial<Survey>) => {
    setSurveys((prev) => prev.map((s) => (s.id === data.id ? { ...s, ...data } : s)))
    toast({
      title: 'Survey updated',
      description: 'The survey has been updated successfully.',
    })
  }

  const handleDeleteSurvey = (survey: Survey) => {
    setSurveys((prev) => prev.filter((s) => s.id !== survey.id))
    toast({
      title: 'Survey deleted',
      description: 'The survey has been removed.',
    })
  }

  const handleEditSurvey = (survey: Survey) => {
    setEditingSurvey(survey)
    setShowSurveyForm(true)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/projects/${projectId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Field Surveys</h1>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-muted-foreground">{mockProject.name}</span>
              <Badge variant="outline">{mockProject.site_code}</Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showMap ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowMap(!showMap)}
          >
            <Map className="mr-2 h-4 w-4" />
            {showMap ? 'Hide Map' : 'Show Map'}
          </Button>
          <Button
            onClick={() => {
              setEditingSurvey(undefined)
              setShowSurveyForm(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Plan Survey
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{surveyStats.total}</p>
              <p className="text-muted-foreground text-sm">Total Surveys</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{surveyStats.in_progress}</p>
              <p className="text-muted-foreground text-sm">In Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{surveyStats.completed}</p>
              <p className="text-muted-foreground text-sm">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className={`grid gap-6 ${showMap ? 'lg:grid-cols-2' : ''}`}>
        {/* Surveys List */}
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="surveys">
                Surveys
                <Badge variant="secondary" className="ml-2">
                  {filteredSurveys.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="calendar">
                <Calendar className="mr-2 h-4 w-4" />
                Calendar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="surveys" className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-35">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-45">
                    <SelectValue placeholder="Survey Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="walkover">Walkover</SelectItem>
                    <SelectItem value="habitat_mapping">Habitat Mapping</SelectItem>
                    <SelectItem value="bat_survey">Bat Survey</SelectItem>
                    <SelectItem value="bird_survey">Bird Survey</SelectItem>
                    <SelectItem value="mammal_survey">Mammal Survey</SelectItem>
                    <SelectItem value="aquatic_survey">Aquatic Survey</SelectItem>
                    <SelectItem value="botanical_survey">Botanical Survey</SelectItem>
                    <SelectItem value="invertebrate_survey">Invertebrate Survey</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Survey Cards */}
              {filteredSurveys.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Calendar className="text-muted-foreground mb-4 h-12 w-12" />
                    <h3 className="mb-2 font-semibold">No surveys found</h3>
                    <p className="text-muted-foreground max-w-sm text-center text-sm">
                      {statusFilter !== 'all' || typeFilter !== 'all'
                        ? 'Try adjusting your filters to see more surveys.'
                        : 'Plan your first field survey to get started.'}
                    </p>
                    {statusFilter === 'all' && typeFilter === 'all' && (
                      <Button className="mt-4" onClick={() => setShowSurveyForm(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Plan Survey
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredSurveys.map((survey) => (
                    <SurveyCard
                      key={survey.id}
                      survey={survey}
                      onView={() => {
                        // TODO: Navigate to survey detail page
                      }}
                      onEdit={handleEditSurvey}
                      onDelete={handleDeleteSurvey}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="calendar">
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="text-muted-foreground mb-4 h-12 w-12" />
                  <h3 className="mb-2 font-semibold">Calendar View</h3>
                  <p className="text-muted-foreground text-center text-sm">
                    Calendar view coming soon. Use the Surveys tab to manage field surveys.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Map */}
        {showMap && (
          <Card className="h-fit lg:sticky lg:top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Survey Locations</CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectMap
                className="h-125"
                center={[mockProject.center.lng, mockProject.center.lat]}
                zoom={12}
                boundary={mockProject.boundary}
              />
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="bg-muted/50 rounded p-2">
                  <p className="font-medium">{surveyStats.totalObservations}</p>
                  <p className="text-muted-foreground text-xs">Species Observations</p>
                </div>
                <div className="bg-muted/50 rounded p-2">
                  <p className="font-medium">{surveyStats.totalHabitats}</p>
                  <p className="text-muted-foreground text-xs">Habitat Polygons</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Survey Form Dialog */}
      <SurveyForm
        open={showSurveyForm}
        onOpenChange={(open) => {
          setShowSurveyForm(open)
          if (!open) setEditingSurvey(undefined)
        }}
        onSubmit={editingSurvey ? handleUpdateSurvey : handleCreateSurvey}
        initialData={editingSurvey}
        projectId={projectId}
      />
    </div>
  )
}
