'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  // Projects
  getProject,
  getProjects,
  getAssignedProjects,
  createProject,
  updateProject,
  updateProjectBoundary,
  type ProjectWithRelations,
  // Workflow
  getWorkflowSteps,
  getWorkflowStep,
  initializeWorkflowSteps,
  updateWorkflowStep,
  completeWorkflowStep,
  startWorkflowStep,
  submitForReview,
  calculateProgress,
  getCurrentStep,
  // Surveys
  getProjectSurveys,
  getSurvey,
  createSurvey,
  updateSurvey,
  deleteSurvey,
  updateSurveyStatus,
  getSurveyStats,
  type SurveyWithSurveyor,
  // Habitats
  getProjectHabitats,
  getSurveyHabitats,
  getHabitat,
  createHabitat,
  updateHabitat,
  deleteHabitat,
  getHabitatStats,
  // Observations
  getSurveyObservations,
  getProjectObservations,
  getObservation,
  createObservation,
  updateObservation,
  deleteObservation,
  verifyObservation,
  getObservationStats,
  // Findings
  getProjectFindings,
  getSavedFindings,
  getFinding,
  createFinding,
  updateFinding,
  deleteFinding,
  toggleFindingSaved,
  updateFindingNotes,
  getFindingsStats,
  bulkSaveFindings,
  // Reports
  getProjectReports,
  getLatestReport,
  getReport,
  createReport,
  updateReport,
  updateReportContent,
  updateReportStatus,
  deleteReport,
} from '@/lib/supabase/queries'
import type {
  Project,
  WorkflowStep,
  Survey,
  HabitatPolygon,
  SpeciesObservation,
  DeskResearchFinding,
  Report,
  InsertTables,
  UpdateTables,
} from '@/types/database'

// ============================================
// PROJECT HOOKS
// ============================================

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
    enabled: !!projectId,
  })
}

export function useProjects(organizationId: string) {
  return useQuery({
    queryKey: ['projects', organizationId],
    queryFn: () => getProjects(organizationId),
    enabled: !!organizationId,
  })
}

export function useAssignedProjects(userId: string) {
  return useQuery({
    queryKey: ['assigned-projects', userId],
    queryFn: () => getAssignedProjects(userId),
    enabled: !!userId,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (project: InsertTables<'projects'>) => createProject(project),
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['projects'] })
        queryClient.invalidateQueries({ queryKey: ['assigned-projects'] })
      }
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      updates,
    }: {
      projectId: string
      updates: UpdateTables<'projects'>
    }) => updateProject(projectId, updates),
    onSuccess: (data, variables) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] })
        queryClient.invalidateQueries({ queryKey: ['projects'] })
      }
    },
  })
}

export function useUpdateProjectBoundary() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      boundary,
      centerPoint,
      gridReference,
    }: {
      projectId: string
      boundary: unknown
      centerPoint: unknown
      gridReference: string
    }) => updateProjectBoundary(projectId, boundary, centerPoint, gridReference),
    onSuccess: (data, variables) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] })
      }
    },
  })
}

// ============================================
// WORKFLOW HOOKS
// ============================================

export function useWorkflowSteps(projectId: string) {
  return useQuery({
    queryKey: ['workflow-steps', projectId],
    queryFn: () => getWorkflowSteps(projectId),
    enabled: !!projectId,
  })
}

export function useWorkflowStep(projectId: string, stepNumber: number) {
  return useQuery({
    queryKey: ['workflow-step', projectId, stepNumber],
    queryFn: () => getWorkflowStep(projectId, stepNumber),
    enabled: !!projectId && stepNumber > 0,
  })
}

export function useInitializeWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (projectId: string) => initializeWorkflowSteps(projectId),
    onSuccess: (data, projectId) => {
      if (data.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['workflow-steps', projectId] })
      }
    },
  })
}

export function useUpdateWorkflowStep() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      stepId,
      updates,
    }: {
      stepId: string
      updates: UpdateTables<'workflow_steps'>
    }) => updateWorkflowStep(stepId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-steps'] })
    },
  })
}

export function useCompleteWorkflowStep() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, stepNumber }: { projectId: string; stepNumber: number }) =>
      completeWorkflowStep(projectId, stepNumber),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-steps', variables.projectId] })
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] })
    },
  })
}

export function useStartWorkflowStep() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, stepNumber }: { projectId: string; stepNumber: number }) =>
      startWorkflowStep(projectId, stepNumber),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-steps', variables.projectId] })
    },
  })
}

export function useSubmitForReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, stepNumber }: { projectId: string; stepNumber: number }) =>
      submitForReview(projectId, stepNumber),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-steps', variables.projectId] })
    },
  })
}

// Helper hooks for workflow
export function useProjectProgress(projectId: string) {
  const { data: steps } = useWorkflowSteps(projectId)
  return steps ? calculateProgress(steps) : 0
}

export function useCurrentStepNumber(projectId: string) {
  const { data: steps } = useWorkflowSteps(projectId)
  return steps ? getCurrentStep(steps) : 1
}

// ============================================
// SURVEY HOOKS
// ============================================

export function useSurveys(projectId: string) {
  return useQuery({
    queryKey: ['surveys', projectId],
    queryFn: () => getProjectSurveys(projectId),
    enabled: !!projectId,
  })
}

export function useSurvey(surveyId: string) {
  return useQuery({
    queryKey: ['survey', surveyId],
    queryFn: () => getSurvey(surveyId),
    enabled: !!surveyId,
  })
}

export function useSurveyStats(projectId: string) {
  return useQuery({
    queryKey: ['survey-stats', projectId],
    queryFn: () => getSurveyStats(projectId),
    enabled: !!projectId,
  })
}

export function useCreateSurvey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (survey: InsertTables<'surveys'>) => createSurvey(survey),
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['surveys'] })
        queryClient.invalidateQueries({ queryKey: ['survey-stats'] })
      }
    },
  })
}

export function useUpdateSurvey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ surveyId, updates }: { surveyId: string; updates: UpdateTables<'surveys'> }) =>
      updateSurvey(surveyId, updates),
    onSuccess: (data, variables) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['survey', variables.surveyId] })
        queryClient.invalidateQueries({ queryKey: ['surveys'] })
        queryClient.invalidateQueries({ queryKey: ['survey-stats'] })
      }
    },
  })
}

export function useDeleteSurvey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (surveyId: string) => deleteSurvey(surveyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
      queryClient.invalidateQueries({ queryKey: ['survey-stats'] })
    },
  })
}

// ============================================
// HABITAT HOOKS
// ============================================

export function useHabitats(projectId: string) {
  return useQuery({
    queryKey: ['habitats', projectId],
    queryFn: () => getProjectHabitats(projectId),
    enabled: !!projectId,
  })
}

export function useSurveyHabitats(surveyId: string) {
  return useQuery({
    queryKey: ['survey-habitats', surveyId],
    queryFn: () => getSurveyHabitats(surveyId),
    enabled: !!surveyId,
  })
}

export function useHabitatStats(projectId: string) {
  return useQuery({
    queryKey: ['habitat-stats', projectId],
    queryFn: () => getHabitatStats(projectId),
    enabled: !!projectId,
  })
}

export function useCreateHabitat() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (habitat: InsertTables<'habitat_polygons'>) => createHabitat(habitat),
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['habitats'] })
        queryClient.invalidateQueries({ queryKey: ['habitat-stats'] })
      }
    },
  })
}

export function useUpdateHabitat() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      habitatId,
      updates,
    }: {
      habitatId: string
      updates: UpdateTables<'habitat_polygons'>
    }) => updateHabitat(habitatId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habitats'] })
      queryClient.invalidateQueries({ queryKey: ['habitat-stats'] })
    },
  })
}

export function useDeleteHabitat() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (habitatId: string) => deleteHabitat(habitatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habitats'] })
      queryClient.invalidateQueries({ queryKey: ['habitat-stats'] })
    },
  })
}

// ============================================
// OBSERVATION HOOKS
// ============================================

export function useObservations(surveyId: string) {
  return useQuery({
    queryKey: ['observations', surveyId],
    queryFn: () => getSurveyObservations(surveyId),
    enabled: !!surveyId,
  })
}

export function useProjectObservations(projectId: string) {
  return useQuery({
    queryKey: ['project-observations', projectId],
    queryFn: () => getProjectObservations(projectId),
    enabled: !!projectId,
  })
}

export function useObservationStats(projectId: string) {
  return useQuery({
    queryKey: ['observation-stats', projectId],
    queryFn: () => getObservationStats(projectId),
    enabled: !!projectId,
  })
}

export function useCreateObservation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (observation: InsertTables<'species_observations'>) =>
      createObservation(observation),
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['observations'] })
        queryClient.invalidateQueries({ queryKey: ['project-observations'] })
        queryClient.invalidateQueries({ queryKey: ['observation-stats'] })
      }
    },
  })
}

export function useUpdateObservation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      observationId,
      updates,
    }: {
      observationId: string
      updates: UpdateTables<'species_observations'>
    }) => updateObservation(observationId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['observations'] })
      queryClient.invalidateQueries({ queryKey: ['project-observations'] })
      queryClient.invalidateQueries({ queryKey: ['observation-stats'] })
    },
  })
}

export function useDeleteObservation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (observationId: string) => deleteObservation(observationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['observations'] })
      queryClient.invalidateQueries({ queryKey: ['project-observations'] })
      queryClient.invalidateQueries({ queryKey: ['observation-stats'] })
    },
  })
}

export function useVerifyObservation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ observationId, verifierId }: { observationId: string; verifierId: string }) =>
      verifyObservation(observationId, verifierId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['observations'] })
      queryClient.invalidateQueries({ queryKey: ['observation-stats'] })
    },
  })
}

// ============================================
// FINDINGS HOOKS
// ============================================

export function useFindings(projectId: string) {
  return useQuery({
    queryKey: ['findings', projectId],
    queryFn: () => getProjectFindings(projectId),
    enabled: !!projectId,
  })
}

export function useSavedFindings(projectId: string) {
  return useQuery({
    queryKey: ['saved-findings', projectId],
    queryFn: () => getSavedFindings(projectId),
    enabled: !!projectId,
  })
}

export function useFindingsStats(projectId: string) {
  return useQuery({
    queryKey: ['findings-stats', projectId],
    queryFn: () => getFindingsStats(projectId),
    enabled: !!projectId,
  })
}

export function useCreateFinding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (finding: InsertTables<'desk_research_findings'>) => createFinding(finding),
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['findings'] })
        queryClient.invalidateQueries({ queryKey: ['saved-findings'] })
        queryClient.invalidateQueries({ queryKey: ['findings-stats'] })
      }
    },
  })
}

export function useUpdateFinding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      findingId,
      updates,
    }: {
      findingId: string
      updates: UpdateTables<'desk_research_findings'>
    }) => updateFinding(findingId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['findings'] })
      queryClient.invalidateQueries({ queryKey: ['saved-findings'] })
      queryClient.invalidateQueries({ queryKey: ['findings-stats'] })
    },
  })
}

export function useDeleteFinding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (findingId: string) => deleteFinding(findingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['findings'] })
      queryClient.invalidateQueries({ queryKey: ['saved-findings'] })
      queryClient.invalidateQueries({ queryKey: ['findings-stats'] })
    },
  })
}

export function useToggleFindingSaved() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ findingId, isSaved }: { findingId: string; isSaved: boolean }) =>
      toggleFindingSaved(findingId, isSaved),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['findings'] })
      queryClient.invalidateQueries({ queryKey: ['saved-findings'] })
      queryClient.invalidateQueries({ queryKey: ['findings-stats'] })
    },
  })
}

export function useBulkSaveFindings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (findings: InsertTables<'desk_research_findings'>[]) => bulkSaveFindings(findings),
    onSuccess: (data) => {
      if (data.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['findings'] })
        queryClient.invalidateQueries({ queryKey: ['saved-findings'] })
        queryClient.invalidateQueries({ queryKey: ['findings-stats'] })
      }
    },
  })
}

// ============================================
// REPORT HOOKS
// ============================================

export function useReports(projectId: string) {
  return useQuery({
    queryKey: ['reports', projectId],
    queryFn: () => getProjectReports(projectId),
    enabled: !!projectId,
  })
}

export function useLatestReport(projectId: string) {
  return useQuery({
    queryKey: ['latest-report', projectId],
    queryFn: () => getLatestReport(projectId),
    enabled: !!projectId,
  })
}

export function useReport(reportId: string) {
  return useQuery({
    queryKey: ['report', reportId],
    queryFn: () => getReport(reportId),
    enabled: !!reportId,
  })
}

export function useCreateReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (report: InsertTables<'reports'>) => createReport(report),
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['reports'] })
        queryClient.invalidateQueries({ queryKey: ['latest-report'] })
      }
    },
  })
}

export function useUpdateReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ reportId, updates }: { reportId: string; updates: UpdateTables<'reports'> }) =>
      updateReport(reportId, updates),
    onSuccess: (data, variables) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['report', variables.reportId] })
        queryClient.invalidateQueries({ queryKey: ['reports'] })
        queryClient.invalidateQueries({ queryKey: ['latest-report'] })
      }
    },
  })
}

export function useDeleteReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (reportId: string) => deleteReport(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['latest-report'] })
    },
  })
}
