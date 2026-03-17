'use client'

import * as React from 'react'
import { Link2, Info } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { useSurveys } from '@/hooks/queries/use-survey-hooks'
import {
  useReportSurveyLinks,
  useSetReportSurveyLinks,
} from '@/hooks/queries/use-report-survey-links'
import { FIELD_SURVEY_TYPE_LABELS } from '@/lib/config/survey'

interface SurveyLinkPanelProps {
  projectId: string
  reportType: string
}

export function SurveyLinkPanel({ projectId, reportType }: SurveyLinkPanelProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const { data: surveys } = useSurveys(projectId)
  const { data: linkedIds } = useReportSurveyLinks(projectId, reportType)
  const setLinks = useSetReportSurveyLinks()

  const surveyList = surveys ?? []
  const currentLinks = linkedIds ?? []
  const hasLinks = currentLinks.length > 0

  if (surveyList.length === 0) return null

  const toggleSurvey = (surveyId: string) => {
    const next = currentLinks.includes(surveyId)
      ? currentLinks.filter((id) => id !== surveyId)
      : [...currentLinks, surveyId]
    setLinks.mutate({ projectId, reportType, surveyIds: next })
  }

  const linkAll = () => {
    setLinks.mutate({
      projectId,
      reportType,
      surveyIds: surveyList.map((s) => s.id),
    })
  }

  const unlinkAll = () => {
    setLinks.mutate({ projectId, reportType, surveyIds: [] })
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
          <Link2 className="h-3.5 w-3.5" />
          Survey Data Sources
          {hasLinks && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
              {currentLinks.length}/{surveyList.length}
            </Badge>
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 rounded-md border p-3">
        <div className="mb-2 flex items-start gap-2 text-xs text-gray-500">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            Select which surveys this report should use. When none are selected, all surveys are
            included by default.
          </span>
        </div>

        <div className="mb-2 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-xs"
            onClick={linkAll}
            disabled={setLinks.isPending}
          >
            Select All
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-xs"
            onClick={unlinkAll}
            disabled={setLinks.isPending}
          >
            Clear All
          </Button>
        </div>

        <div className="space-y-1.5">
          {surveyList.map((survey) => (
            <div key={survey.id} className="flex items-center gap-2">
              <Checkbox
                id={`survey-link-${survey.id}`}
                checked={currentLinks.includes(survey.id)}
                onCheckedChange={() => toggleSurvey(survey.id)}
                disabled={setLinks.isPending}
              />
              <label htmlFor={`survey-link-${survey.id}`} className="text-sm">
                {FIELD_SURVEY_TYPE_LABELS[survey.survey_type] || survey.survey_type}
                {survey.survey_date && (
                  <span className="text-muted-foreground ml-1.5 text-xs">
                    ({new Date(survey.survey_date).toLocaleDateString('en-IE')})
                  </span>
                )}
              </label>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
