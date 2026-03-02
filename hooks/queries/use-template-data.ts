import { useMemo } from 'react'
import { useSavedFindings } from './use-finding-hooks'
import { useHabitats } from './use-habitat-hooks'
import { useProjectObservations } from './use-observation-hooks'
import { useSurveys } from './use-survey-hooks'
import { useReleveSurveys, useReleveSpeciesByProject } from './use-releve-hooks'
import type { TemplateData } from '@/lib/templates/template-renderer'
import type { Project } from '@/types/database'

export function useTemplateData(project: Project) {
  const { data: findings, isLoading: loadingFindings } = useSavedFindings(project.id)
  const { data: habitats, isLoading: loadingHabitats } = useHabitats(project.id)
  const { data: observations, isLoading: loadingObservations } = useProjectObservations(project.id)
  const { data: surveys, isLoading: loadingSurveys } = useSurveys(project.id)
  const { data: releveSurveys, isLoading: loadingReleve } = useReleveSurveys(project.id)
  const { data: releveSpecies, isLoading: loadingReleveSpecies } = useReleveSpeciesByProject(
    project.id
  )

  const isLoading =
    loadingFindings ||
    loadingHabitats ||
    loadingObservations ||
    loadingSurveys ||
    loadingReleve ||
    loadingReleveSpecies

  const templateData: TemplateData | undefined = useMemo(() => {
    if (isLoading) return undefined

    return {
      project,
      findings: findings ?? [],
      habitats: habitats ?? [],
      observations: observations ?? [],
      surveys: surveys ?? [],
      releveSurveys: releveSurveys ?? [],
      releveSpecies: releveSpecies ?? [],
    }
  }, [project, findings, habitats, observations, surveys, releveSurveys, releveSpecies, isLoading])

  return { templateData, isLoading }
}
