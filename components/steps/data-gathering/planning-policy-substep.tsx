'use client'

import * as React from 'react'
import { ExternalLink, FileText, Leaf, BookOpen, CheckCircle2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  COUNTY_DEVELOPMENT_PLANS,
  getCountyNames,
  findPlanByCounty,
  type CountyDevelopmentPlan,
} from '@/lib/data/county-development-plans'
import type { Project } from '@/types/database'

interface PlanningPolicySubStepProps {
  project: Project
  isActive?: boolean
}

export function PlanningPolicySubStep({ project }: PlanningPolicySubStepProps) {
  const [selectedCounty, setSelectedCounty] = React.useState(() => {
    if (project.county && findPlanByCounty(project.county)) {
      return project.county
    }
    return ''
  })

  const selectedPlan = selectedCounty ? findPlanByCounty(selectedCounty) : undefined

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <h3 className="mb-1 flex items-center gap-2 font-semibold">
          <BookOpen className="h-4 w-4 text-indigo-600" />
          Planning Policy
        </h3>
        <p className="text-muted-foreground text-sm">
          Select the county where the project site is located. The relevant County Development Plan
          and biodiversity references will be shown automatically.
        </p>
      </div>

      {/* County Selector */}
      <div className="border-b p-4">
        <label className="text-sm font-medium">County / Local Authority</label>
        <Select value={selectedCounty} onValueChange={setSelectedCounty}>
          <SelectTrigger className="mt-1.5 w-full max-w-sm">
            <SelectValue placeholder="Select a county..." />
          </SelectTrigger>
          <SelectContent>
            {getCountyNames().map((county) => (
              <SelectItem key={county} value={county}>
                {county}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Plan Details */}
      <div className="flex-1 overflow-y-auto p-4">
        {!selectedCounty && (
          <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
            Select a county above to view planning policy references.
          </div>
        )}

        {selectedPlan && <PlanCard plan={selectedPlan} />}
      </div>
    </div>
  )
}

function PlanCard({ plan }: { plan: CountyDevelopmentPlan }) {
  return (
    <div className="space-y-4">
      {/* County Development Plan */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-start justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <h4 className="font-semibold">County Development Plan</h4>
            </div>
            <Badge variant="secondary">{plan.period}</Badge>
          </div>

          <p className="mb-3 text-sm">{plan.planName}</p>
          <p className="text-muted-foreground mb-4 text-xs">{plan.authority}</p>

          <div className="flex flex-wrap gap-2">
            <a
              href={plan.planUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
            >
              <ExternalLink className="h-3 w-3" />
              View Full Plan
            </a>
            <a
              href={plan.biodiversityChapterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              <Leaf className="h-3 w-3" />
              {plan.biodiversityChapterName}
            </a>
          </div>
        </CardContent>
      </Card>

      {/* County Biodiversity Action Plan */}
      {plan.biodiversityActionPlanUrl && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Leaf className="h-5 w-5 text-emerald-600" />
              <h4 className="font-semibold">County Biodiversity Action Plan</h4>
            </div>

            <p className="text-muted-foreground mb-3 text-sm">
              Local biodiversity action plans set out priorities for habitat and species
              conservation at county level. These complement the development plan&apos;s
              biodiversity objectives.
            </p>

            <a
              href={plan.biodiversityActionPlanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              <ExternalLink className="h-3 w-3" />
              View Biodiversity Action Plans
            </a>
          </CardContent>
        </Card>
      )}

      {/* What to look for */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-amber-600" />
            <h4 className="font-semibold">Key Sections for Ecological Assessment</h4>
          </div>

          <ul className="space-y-1.5 text-sm">
            {KEY_SECTIONS.map((section) => (
              <li key={section} className="text-muted-foreground flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                {section}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* All 31 plans reference */}
      <details className="rounded-lg border">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
          All {COUNTY_DEVELOPMENT_PLANS.length} County Development Plans
        </summary>
        <div className="max-h-64 overflow-y-auto border-t px-4 py-2">
          {COUNTY_DEVELOPMENT_PLANS.map((p) => (
            <div
              key={p.county}
              className="flex items-center justify-between border-b py-2 last:border-b-0"
            >
              <div className="text-sm">
                <span className="font-medium">{p.county}</span>
                <span className="text-muted-foreground ml-2 text-xs">{p.period}</span>
              </div>
              <a
                href={p.planUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}

const KEY_SECTIONS = [
  'Designated sites: SACs, SPAs, NHAs, pNHAs (Natura 2000 network)',
  'Ecological networks and wildlife corridors',
  'Green and blue infrastructure objectives',
  'Biodiversity policy objectives (e.g. NPO 59, NPO 60)',
  'Appropriate Assessment requirements for new developments',
  'Protected species and habitats',
  'Water Framework Directive compliance',
  'Invasive species management',
  'Trees, hedgerows, and woodland protection policies',
  'Pollinator Plan implementation',
]
