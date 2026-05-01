import type { DeskResearchFinding } from '@/types/database'

export function getAISummary(finding: DeskResearchFinding): string | null {
  if (finding.ai_summary) return finding.ai_summary
  const rawData = finding.raw_data as Record<string, unknown> | null
  if (!rawData) return null
  if (typeof rawData.aiSummary === 'string') return rawData.aiSummary
  const metadata = rawData.metadata as Record<string, unknown> | undefined
  if (metadata?.aiSummary && typeof metadata.aiSummary === 'string') {
    return metadata.aiSummary
  }
  // Aquatic: deep research save writes to raw_data.aquaticResearch.aiAnalysis
  // but never to ai_summary column. Use it as the displayed summary.
  const aquaticResearch = rawData.aquaticResearch as Record<string, unknown> | undefined
  if (aquaticResearch?.aiAnalysis && typeof aquaticResearch.aiAnalysis === 'string') {
    return aquaticResearch.aiAnalysis
  }
  // Designated sites: there is no separate "AI summary" — the multi-section
  // AI Analysis panel in Step 2 is the deep research output. Surface it here
  // so Step 3's dialog has something to show.
  const deepResearch = rawData.deepResearch as Record<string, unknown> | undefined
  if (deepResearch?.aiAnalysis && typeof deepResearch.aiAnalysis === 'string') {
    return deepResearch.aiAnalysis
  }
  return null
}

export function getDeepResearch(finding: DeskResearchFinding): string | null {
  const rawData = finding.raw_data as Record<string, unknown> | null
  if (!rawData) return null
  const deepResearch = rawData.deepResearch as Record<string, unknown> | undefined
  if (deepResearch?.aiAnalysis && typeof deepResearch.aiAnalysis === 'string') {
    return deepResearch.aiAnalysis
  }
  return null
}
