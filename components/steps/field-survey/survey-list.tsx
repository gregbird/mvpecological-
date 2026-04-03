'use client'

import * as React from 'react'
import { Plus, ChevronDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { SurveyCard, type Survey as SurveyCardType } from '@/components/field-surveys/survey-card'
import { FIELD_SURVEY_TYPE_LABELS } from '@/lib/config/survey'
import type { SurveyGroup } from '@/lib/utils/survey-groups'

interface SurveyListProps {
  filteredSurveys: SurveyCardType[]
  surveyGroups: SurveyGroup[]
  standaloneSurveys: { id: string }[]
  surveysByStatus: Record<string, SurveyCardType[]>
  activeTab: string
  onActiveTabChange: (tab: string) => void
  highlightedSurveyId: string | null
  canAssignStaff: boolean
  onView: (survey: SurveyCardType) => void
  onEdit: (survey: SurveyCardType) => void
  onDelete: (survey: SurveyCardType) => void
  onComplete: (survey: SurveyCardType) => void
  onAssignStaff: (survey: SurveyCardType) => void
  onAddVisit: (survey: SurveyCardType) => void
}

export function SurveyList({
  filteredSurveys,
  surveyGroups,
  standaloneSurveys,
  surveysByStatus,
  activeTab,
  onActiveTabChange,
  highlightedSurveyId,
  canAssignStaff,
  onView,
  onEdit,
  onDelete,
  onComplete,
  onAssignStaff,
  onAddVisit,
}: SurveyListProps) {
  return (
    <Tabs value={activeTab} onValueChange={onActiveTabChange}>
      <TabsList>
        <TabsTrigger value="all">All ({filteredSurveys.length})</TabsTrigger>
        <TabsTrigger value="in_progress">
          In Progress ({surveysByStatus.in_progress.length})
        </TabsTrigger>
        <TabsTrigger value="completed">Completed ({surveysByStatus.completed.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="mt-4">
        <ScrollArea className="h-100">
          <div className="space-y-4 pr-4">
            {/* Visit Groups */}
            {surveyGroups.map((group) => {
              const groupCards = filteredSurveys.filter(
                (s) => s.visitGroupId === group.visitGroupId
              )
              const typeLabel = FIELD_SURVEY_TYPE_LABELS[group.surveyType] || group.surveyType
              return (
                <Collapsible key={group.visitGroupId} defaultOpen>
                  <div className="bg-card rounded-lg border">
                    <CollapsibleTrigger asChild>
                      <div className="flex cursor-pointer items-center justify-between p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{typeLabel}</span>
                          <Badge variant="outline" className="text-xs">
                            {group.completedVisits}/{group.totalVisits} visits
                          </Badge>
                          {group.canComplete && (
                            <Badge variant="default" className="bg-green-600 text-xs">
                              All Complete
                            </Badge>
                          )}
                        </div>
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="grid gap-3 border-t p-3 sm:grid-cols-2 lg:grid-cols-3">
                        {groupCards.map((survey) => (
                          <SurveyCard
                            key={survey.id}
                            survey={survey}
                            onView={onView}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onComplete={onComplete}
                            onAssignStaff={canAssignStaff ? onAssignStaff : undefined}
                            isHighlighted={survey.id === highlightedSurveyId}
                          />
                        ))}
                      </div>
                      {/* Add Visit button — group level */}
                      {!groupCards.every((s) => s.status === 'completed') && (
                        <div className="border-t px-3 py-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-dashed"
                            onClick={() => onAddVisit(groupCards[0])}
                          >
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            Add Visit
                          </Button>
                        </div>
                      )}
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )
            })}

            {/* Standalone surveys (no visit group) */}
            {standaloneSurveys.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredSurveys
                  .filter((s) => !s.visitGroupId)
                  .map((survey) => (
                    <SurveyCard
                      key={survey.id}
                      survey={survey}
                      onView={onView}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onComplete={onComplete}
                      onAssignStaff={canAssignStaff ? onAssignStaff : undefined}
                      onAddVisit={onAddVisit}
                      isHighlighted={survey.id === highlightedSurveyId}
                    />
                  ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </TabsContent>

      {Object.entries(surveysByStatus).map(([status, statusSurveys]) => (
        <TabsContent key={status} value={status} className="mt-4">
          <ScrollArea className="h-100">
            {statusSurveys.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center text-sm">
                No {status.replace('_', ' ')} surveys
              </div>
            ) : (
              <div className="grid gap-4 pr-4 sm:grid-cols-2 lg:grid-cols-3">
                {[...statusSurveys]
                  .sort((a, b) => (a.visitNumber ?? 0) - (b.visitNumber ?? 0))
                  .map((survey) => (
                    <SurveyCard
                      key={survey.id}
                      survey={survey}
                      onView={onView}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onComplete={onComplete}
                      onAssignStaff={canAssignStaff ? onAssignStaff : undefined}
                      onAddVisit={onAddVisit}
                      isHighlighted={survey.id === highlightedSurveyId}
                    />
                  ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      ))}
    </Tabs>
  )
}
