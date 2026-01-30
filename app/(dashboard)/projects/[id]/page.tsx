'use client'

import * as React from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  ChevronRight,
  Map,
  Search,
  FileCheck,
  Clipboard,
  Target,
  Sparkles,
  CheckCircle,
  Send,
  BarChart3,
  ExternalLink,
  Save,
  Trash2,
  Plus,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

// Workflow steps
const workflowSteps = [
  {
    number: 1,
    label: 'GIS Mapping',
    phase: 'initial-setup',
    icon: Map,
    description: 'Upload project map and define boundaries',
  },
  {
    number: 2,
    label: 'Data Gathering',
    phase: 'desk-research',
    icon: Search,
    description: 'Gather data from external sources (NPWS, NBDC, EPA)',
  },
  {
    number: 3,
    label: 'Desk Assessment',
    phase: 'desk-research',
    icon: FileCheck,
    description: 'Complete desk-based assessment',
  },
  {
    number: 4,
    label: 'Field Survey',
    phase: 'field-research',
    icon: Clipboard,
    description: 'Plan and conduct field survey',
  },
  {
    number: 5,
    label: 'Habitat Mapping',
    phase: 'field-research',
    icon: Map,
    description: 'Map habitats using Fossitt codes',
  },
  {
    number: 6,
    label: 'Target Notes',
    phase: 'field-research',
    icon: Target,
    description: 'Add target notes and observations',
  },
  {
    number: 7,
    label: 'Data Analysis',
    phase: 'reporting',
    icon: BarChart3,
    description: 'Analyse collected data',
  },
  {
    number: 8,
    label: 'AI Draft',
    phase: 'reporting',
    icon: Sparkles,
    description: 'Generate AI-assisted draft',
  },
  {
    number: 9,
    label: 'Quality Review',
    phase: 'reporting',
    icon: CheckCircle,
    description: 'Review and quality check',
  },
  {
    number: 10,
    label: 'Final Submission',
    phase: 'reporting',
    icon: Send,
    description: 'Submit final report',
  },
]

// Mock project data
const mockProject = {
  id: '1',
  code: 'KNP-2024-001',
  name: 'Killarney National Park Assessment',
  client: 'National Parks and Wildlife Service',
  location: 'Co. Kerry',
  gridReference: 'V 96842 89043',
  dueDate: '30 Apr 2024',
  currentStep: 2,
  progress: 20,
}

// Mock desk research data for Step 2
const mockDeskResearchFindings = [
  {
    id: '1',
    source: 'NPWS',
    type: 'Designated Site',
    title: 'Killarney National Park SAC (000365)',
    summary:
      'Site designated for Annex I habitats including Old sessile oak woods, Blanket bogs, and Yew woodlands. Contains important populations of Kerry Slug and Lesser Horseshoe Bat.',
    saved: true,
  },
  {
    id: '2',
    source: 'NBDC',
    type: 'Species Record',
    title: 'Red Deer (Cervus elaphus)',
    summary:
      '47 records within 2km radius. Native population of significant conservation importance. Most recent sighting: March 2024.',
    saved: true,
  },
  {
    id: '3',
    source: 'EPA',
    type: 'Water Quality',
    title: 'Lough Leane Water Body',
    summary:
      'Status: Good. WFD classification indicates moderate ecological status. Recent improvements noted following catchment management.',
    saved: false,
  },
]

export default function ProjectDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const stepParam = searchParams.get('step')

  const currentStep = stepParam ? parseInt(stepParam) : mockProject.currentStep
  const currentStepData = workflowSteps.find((s) => s.number === currentStep) || workflowSteps[0]
  const StepIcon = currentStepData.icon

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="px-6 py-4">
          {/* Breadcrumb */}
          <Link
            href="/projects"
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Link>

          {/* Project Info */}
          <div className="flex items-start justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="font-mono text-sm text-gray-500">{mockProject.code}</span>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">{mockProject.name}</h1>
              <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                <span>{mockProject.client}</span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {mockProject.location}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {mockProject.dueDate}
                </span>
              </div>
            </div>

            <div className="text-right">
              <div className="mb-1 flex items-center gap-2">
                <Progress value={mockProject.progress} className="h-2 w-24" />
                <span className="text-sm font-medium text-gray-700">{mockProject.progress}%</span>
              </div>
              <p className="text-xs text-gray-500">Step {currentStep}/10</p>
            </div>
          </div>
        </div>

        {/* Current Step Header */}
        <div className="border-t border-emerald-100 bg-emerald-50 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 text-white">
              <StepIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium tracking-wider text-emerald-600 uppercase">
                  Step {currentStep}
                </span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">{currentStepData.label}</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Step'e göre değişir */}
      <div className="p-6">
        {currentStep === 1 && <GISMappingStep />}
        {currentStep === 2 && <DataGatheringStep findings={mockDeskResearchFindings} />}
        {currentStep === 3 && <DeskAssessmentStep />}
        {currentStep === 4 && <FieldSurveyStep />}
        {currentStep === 5 && <HabitatMappingStep />}
        {currentStep === 6 && <TargetNotesStep />}
        {currentStep === 7 && <DataAnalysisStep />}
        {currentStep === 8 && <AIDraftStep />}
        {currentStep === 9 && <QualityReviewStep />}
        {currentStep === 10 && <FinalSubmissionStep />}
      </div>
    </div>
  )
}

// Step 1: GIS Mapping
function GISMappingStep() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>GIS Map</CardTitle>
        <CardDescription>Upload or draw project boundaries</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-96 items-center justify-center rounded-lg bg-gray-100">
          <div className="text-center">
            <Map className="mx-auto mb-3 h-12 w-12 text-gray-400" />
            <p className="mb-4 text-gray-500">Click to upload map</p>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Upload Shapefile
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Step 2: Data Gathering
function DataGatheringStep({ findings }: { findings: typeof mockDeskResearchFindings }) {
  return (
    <div className="space-y-6">
      {/* Search Sources */}
      <Card>
        <CardHeader>
          <CardTitle>Data Sources</CardTitle>
          <CardDescription>Automatically gather data from external sources</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {['NPWS', 'NBDC', 'EPA', 'Catchments.ie'].map((source) => (
              <Button key={source} variant="outline" className="h-auto flex-col gap-1 py-3">
                <Search className="h-5 w-5" />
                <span>{source}</span>
              </Button>
            ))}
          </div>
          <Button className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700">
            <Sparkles className="mr-2 h-4 w-4" />
            Search All Sources with AI
          </Button>
        </CardContent>
      </Card>

      {/* Findings */}
      <Card>
        <CardHeader>
          <CardTitle>Findings</CardTitle>
          <CardDescription>{findings.length} results found</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {findings.map((finding) => (
            <div
              key={finding.id}
              className={cn(
                'rounded-lg border p-4',
                finding.saved ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-white'
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {finding.source}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {finding.type}
                    </Badge>
                  </div>
                  <h4 className="mb-1 font-medium text-gray-900">{finding.title}</h4>
                  <p className="text-sm text-gray-600">{finding.summary}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  {finding.saved ? (
                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-emerald-600 hover:text-emerald-700"
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Next Step */}
      <div className="flex justify-end">
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          Next Step
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// Step 3: Desk Assessment
function DeskAssessmentStep() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Desk Assessment</CardTitle>
        <CardDescription>Evaluate gathered data and add notes</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-500">Assessment form coming soon...</p>
      </CardContent>
    </Card>
  )
}

// Step 4: Field Survey
function FieldSurveyStep() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Field Survey</CardTitle>
        <CardDescription>Plan field survey and send to mobile device</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-500">Field survey planning coming soon...</p>
      </CardContent>
    </Card>
  )
}

// Step 5: Habitat Mapping
function HabitatMappingStep() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Habitat Mapping</CardTitle>
        <CardDescription>Create habitat polygons with Fossitt codes</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-500">Habitat map coming soon...</p>
      </CardContent>
    </Card>
  )
}

// Step 6: Target Notes
function TargetNotesStep() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Target Notes</CardTitle>
        <CardDescription>Important observations and notes</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-500">Target notes list coming soon...</p>
      </CardContent>
    </Card>
  )
}

// Step 7: Data Analysis
function DataAnalysisStep() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Analysis</CardTitle>
        <CardDescription>Analysis of collected data</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-500">Data analysis coming soon...</p>
      </CardContent>
    </Card>
  )
}

// Step 8: AI Draft
function AIDraftStep() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Draft Generation</CardTitle>
        <CardDescription>Generate report draft with AI assistance</CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <Sparkles className="mr-2 h-4 w-4" />
          Generate Draft
        </Button>
      </CardContent>
    </Card>
  )
}

// Step 9: Quality Review
function QualityReviewStep() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quality Review</CardTitle>
        <CardDescription>Review and approve report</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-500">Quality review form coming soon...</p>
      </CardContent>
    </Card>
  )
}

// Step 10: Final Submission
function FinalSubmissionStep() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Final Submission</CardTitle>
        <CardDescription>Finalise and submit report</CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <Send className="mr-2 h-4 w-4" />
          Submit Report
        </Button>
      </CardContent>
    </Card>
  )
}
