import { useMemo } from 'react'
import { useSavedFindings } from './use-finding-hooks'
import { useHabitats } from './use-habitat-hooks'
import { useProjectObservations } from './use-observation-hooks'
import { useSurveys } from './use-survey-hooks'
import type { TemplateData } from '@/lib/templates/template-renderer'
import type { Project } from '@/types/database'

export function useTemplateData(project: Project) {
  const { data: findings, isLoading: loadingFindings } = useSavedFindings(project.id)
  const { data: habitats, isLoading: loadingHabitats } = useHabitats(project.id)
  const { data: observations, isLoading: loadingObservations } = useProjectObservations(project.id)
  const { data: surveys, isLoading: loadingSurveys } = useSurveys(project.id)

  const isLoading = loadingFindings || loadingHabitats || loadingObservations || loadingSurveys

  const templateData: TemplateData | undefined = useMemo(() => {
    if (isLoading) return undefined

    return {
      project,
      findings: findings ?? [],
      habitats: habitats ?? [],
      observations: observations ?? [],
      surveys: surveys ?? [],
    }
  }, [project, findings, habitats, observations, surveys, isLoading])

  return { templateData, isLoading }
}
