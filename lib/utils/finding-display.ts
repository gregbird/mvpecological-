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
