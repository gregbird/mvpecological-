'use client'

import * as React from 'react'
import { useToast } from '@/hooks/use-toast'
import { useUpdateWorkflowStep } from '@/hooks/queries/use-workflow-hooks'
import { groupFindingsByType } from '@/lib/utils/group-findings-by-type'
import type { DeskResearchFinding, Json, WorkflowStep } from '@/types/database'

interface PerSiteInsight {
  content: string
  updatedAt: string
}

interface AiInsightsMetadata {
  aiInsights?: string
  aiInsightsUpdatedAt?: string
  aiInsightsBySite?: Record<string, PerSiteInsight>
}

interface UseAiInsightsOptions {
  workflowStep: WorkflowStep
  projectId: string
  projectName: string
  projectLocation: string
  savedFindings: DeskResearchFinding[]
  /** When set, insights are stored per-site under metadata.aiInsightsBySite[siteId] */
  siteId?: string | null
}

function readInsightsFromMetadata(
  metadata: WorkflowStep['metadata'],
  siteId: string | null | undefined
): string | null {
  const meta = (metadata as AiInsightsMetadata | null) || null
  if (!meta) return null
  if (siteId) {
    const slot = meta.aiInsightsBySite?.[siteId]
    if (slot?.content) return slot.content
    // Fallback to project-level insight so newly added sites immediately show context
    return meta.aiInsights ?? null
  }
  return meta.aiInsights ?? null
}

/**
 * Does site-specific insights content exist for this site?
 *
 * Used by the auto-trigger so that switching to a site for the first time
 * still fires generation — even when `readInsightsFromMetadata` returned the
 * project-level fallback for display. Without this split, a multi-site
 * project with project-level insights would NEVER auto-generate per-site
 * summaries: the fallback makes the UI look satisfied, the auto-trigger
 * sees non-null insights and bails out.
 */
function hasSiteSpecificInsights(
  metadata: WorkflowStep['metadata'],
  siteId: string | null | undefined
): boolean {
  const meta = (metadata as AiInsightsMetadata | null) || null
  if (!meta) return false
  if (siteId) {
    return Boolean(meta.aiInsightsBySite?.[siteId]?.content)
  }
  return Boolean(meta.aiInsights)
}

export function useAiInsights({
  workflowStep,
  projectId,
  projectName,
  projectLocation,
  savedFindings,
  siteId = null,
}: UseAiInsightsOptions) {
  const { toast } = useToast()
  const updateWorkflowStep = useUpdateWorkflowStep()

  const [isGenerating, setIsGenerating] = React.useState(false)
  const [insights, setInsights] = React.useState<string | null>(() =>
    readInsightsFromMetadata(workflowStep.metadata, siteId)
  )

  // Sync when workflow step metadata or site selection changes (e.g. navigating back, switching site)
  React.useEffect(() => {
    setInsights(readInsightsFromMetadata(workflowStep.metadata, siteId))
  }, [workflowStep.metadata, siteId])

  // Persist AI insights to workflow step metadata.
  // Per-site mode writes to metadata.aiInsightsBySite[siteId]; legacy "All Sites" mode writes
  // to metadata.aiInsights so single-site projects (and All Sites view) keep working unchanged.
  const persistInsights = React.useCallback(
    (value: string) => {
      const existingMeta = ((workflowStep.metadata as AiInsightsMetadata | null) ?? {}) as Record<
        string,
        unknown
      > &
        AiInsightsMetadata
      const now = new Date().toISOString()

      const nextMeta: AiInsightsMetadata & Record<string, unknown> = { ...existingMeta }
      if (siteId) {
        nextMeta.aiInsightsBySite = {
          ...(existingMeta.aiInsightsBySite ?? {}),
          [siteId]: { content: value, updatedAt: now },
        }
      } else {
        nextMeta.aiInsights = value
        nextMeta.aiInsightsUpdatedAt = now
      }

      updateWorkflowStep
        .mutateAsync({
          stepId: workflowStep.id,
          updates: {
            metadata: nextMeta as unknown as Json,
          },
        })
        .catch((err) => console.error('Failed to persist AI insights:', err))
    },
    [workflowStep.id, workflowStep.metadata, updateWorkflowStep, siteId]
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
        body: JSON.stringify({ projectId, projectName, projectLocation, siteId }),
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
    siteId,
  ])

  // Auto-trigger on mount (or after site switch) if no SITE-SPECIFIC insights
  // for current scope exist. Checking `insights` alone would falsely skip
  // generation whenever the project-level fallback is being displayed —
  // breaking multi-site projects completely.
  // Tracks the previously auto-triggered siteId so switching site re-arms.
  // 800ms debounce prevents a storm of OpenAI calls on rapid site clicks.
  const autoTriggeredForRef = React.useRef<string | null | undefined>(undefined)
  const siteHasOwnInsights = hasSiteSpecificInsights(workflowStep.metadata, siteId)
  React.useEffect(() => {
    if (siteHasOwnInsights || isGenerating || savedFindings.length === 0) return
    if (autoTriggeredForRef.current === siteId) return

    const timer = window.setTimeout(() => {
      autoTriggeredForRef.current = siteId
      generate()
    }, 800)
    return () => window.clearTimeout(timer)
  }, [siteHasOwnInsights, savedFindings.length, isGenerating, generate, siteId])

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
