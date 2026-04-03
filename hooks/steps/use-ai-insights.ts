'use client'

import * as React from 'react'
import { useToast } from '@/hooks/use-toast'
import { useUpdateWorkflowStep } from '@/hooks/queries/use-workflow-hooks'
import { groupFindingsByType } from '@/lib/utils/group-findings-by-type'
import type { DeskResearchFinding, WorkflowStep } from '@/types/database'

interface UseAiInsightsOptions {
  workflowStep: WorkflowStep
  projectId: string
  projectName: string
  projectLocation: string
  savedFindings: DeskResearchFinding[]
}

export function useAiInsights({
  workflowStep,
  projectId,
  projectName,
  projectLocation,
  savedFindings,
}: UseAiInsightsOptions) {
  const { toast } = useToast()
  const updateWorkflowStep = useUpdateWorkflowStep()

  const [isGenerating, setIsGenerating] = React.useState(false)
  const [insights, setInsights] = React.useState<string | null>(() => {
    const meta = workflowStep.metadata as Record<string, unknown> | null
    return (meta?.aiInsights as string) || null
  })

  // Sync when workflow step metadata changes (e.g. navigating back)
  React.useEffect(() => {
    const meta = workflowStep.metadata as Record<string, unknown> | null
    if (meta?.aiInsights && typeof meta.aiInsights === 'string') {
      setInsights(meta.aiInsights)
    }
  }, [workflowStep.metadata])

  // Persist AI insights to workflow step metadata
  const persistInsights = React.useCallback(
    (value: string) => {
      const existingMeta = (workflowStep.metadata as Record<string, unknown>) || {}
      updateWorkflowStep
        .mutateAsync({
          stepId: workflowStep.id,
          updates: {
            metadata: {
              ...existingMeta,
              aiInsights: value,
              aiInsightsUpdatedAt: new Date().toISOString(),
            },
          },
        })
        .catch((err) => console.error('Failed to persist AI insights:', err))
    },
    [workflowStep.id, workflowStep.metadata, updateWorkflowStep]
  )

  const findingsByType = React.useMemo(() => groupFindingsByType(savedFindings), [savedFindings])

  const protectedSpeciesCount = savedFindings.filter(
    (f) => f.data_type === 'species_record' && (f.raw_data as Record<string, unknown>)?.isProtected
  ).length

  const highRelevanceCount = React.useMemo(() => {
    return savedFindings.filter((f) => {
      if (!f.notes?.startsWith('{')) return false
      try {
        return JSON.parse(f.notes).relevance === 'high'
      } catch {
        return false
      }
    }).length
  }, [savedFindings])

  // Generate AI insights (with fallback template)
  const generate = React.useCallback(async () => {
    setIsGenerating(true)

    try {
      const response = await fetch('/api/ai/desk-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, projectName, projectLocation }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to generate insights')
      }

      const data = await response.json()
      setInsights(data.insights)
      persistInsights(data.insights)
    } catch {
      // Fallback to template-based insights
      const designatedSites = findingsByType.designated_site || []
      const speciesRecords = findingsByType.species_record || []
      const aquaticFeatures = findingsByType.aquatic || []

      const fallback = buildFallbackInsights({
        designatedSites,
        speciesRecords,
        aquaticFeatures,
        protectedSpeciesCount,
        highRelevanceCount,
      })

      setInsights(fallback)
      persistInsights(fallback)

      toast({
        variant: 'destructive',
        title: 'AI Analysis Failed',
        description: 'Using template-based insights instead.',
      })
    } finally {
      setIsGenerating(false)
    }
  }, [
    projectId,
    projectName,
    projectLocation,
    findingsByType,
    protectedSpeciesCount,
    highRelevanceCount,
    persistInsights,
    toast,
  ])

  // Auto-trigger on mount if no insights
  const autoTriggeredRef = React.useRef(false)
  React.useEffect(() => {
    if (!insights && savedFindings.length > 0 && !isGenerating && !autoTriggeredRef.current) {
      autoTriggeredRef.current = true
      generate()
    }
  }, [insights, savedFindings.length, isGenerating, generate])

  return {
    insights,
    isGenerating,
    generate,
    setInsights,
    persistInsights,
  }
}

// ── Fallback template builder ──

interface FallbackParams {
  designatedSites: DeskResearchFinding[]
  speciesRecords: DeskResearchFinding[]
  aquaticFeatures: DeskResearchFinding[]
  protectedSpeciesCount: number
  highRelevanceCount: number
}

function buildFallbackInsights({
  designatedSites,
  speciesRecords,
  aquaticFeatures,
  protectedSpeciesCount,
  highRelevanceCount,
}: FallbackParams): string {
  return `## Key Findings Summary

### Designated Sites (${designatedSites.length} found)
${
  designatedSites.length > 0
    ? `- ${designatedSites
        .map((s) => s.title)
        .slice(0, 3)
        .join(
          '\n- '
        )}${designatedSites.length > 3 ? `\n- ...and ${designatedSites.length - 3} more` : ''}`
    : '- No designated sites found within search area'
}

### Species Records (${speciesRecords.length} found)
${
  speciesRecords.length > 0
    ? `- ${protectedSpeciesCount} protected species identified
- Key species: ${speciesRecords
        .map((s) => s.title)
        .slice(0, 3)
        .join(', ')}`
    : '- No historical species records found'
}

### Aquatic Features (${aquaticFeatures.length} found)
${
  aquaticFeatures.length > 0
    ? `- ${aquaticFeatures
        .map((s) => s.title)
        .slice(0, 2)
        .join('\n- ')}`
    : '- No aquatic features identified'
}

## Risk Assessment

${designatedSites.length > 0 ? `⚠️ **SAC/SPA Proximity**: ${designatedSites.length} designated site(s) within buffer zone. Appropriate Assessment screening may be required.` : ''}

${protectedSpeciesCount > 0 ? `⚠️ **Protected Species**: ${protectedSpeciesCount} protected species recorded historically. Targeted field surveys recommended.` : ''}

## Recommended Actions

1. ${highRelevanceCount > 0 ? `Review ${highRelevanceCount} high-relevance findings before field survey` : 'Assess findings and assign relevance levels'}
2. ${protectedSpeciesCount > 0 ? 'Plan species-specific surveys for protected species' : 'Standard habitat survey recommended'}
3. ${designatedSites.length > 0 ? 'Consider connectivity assessment for nearby designated sites' : 'Document baseline habitat conditions'}

## Survey Timing Considerations

- **Breeding Birds**: March - July
- **Bats**: May - September
- **Badger**: Year-round (avoid breeding season Feb-June for sett disturbance)
- **Otter**: Year-round

---
*Note: AI analysis unavailable. This is a template-based summary.*`
}
