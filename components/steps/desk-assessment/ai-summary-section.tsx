'use client'

import { EcologicalSummaryPanel } from '@/components/desk-research/ecological-summary-panel'

interface AiSummarySectionProps {
  insights: string | null
  isGenerating: boolean
  findingsCount: number
  onRegenerate: () => void
  onInsightsChange: (updated: string) => void
}

export function AiSummarySection({
  insights,
  isGenerating,
  findingsCount,
  onRegenerate,
  onInsightsChange,
}: AiSummarySectionProps) {
  return (
    <EcologicalSummaryPanel
      insights={insights}
      isGenerating={isGenerating}
      findingsCount={findingsCount}
      onRegenerate={onRegenerate}
      onInsightsChange={onInsightsChange}
    />
  )
}
