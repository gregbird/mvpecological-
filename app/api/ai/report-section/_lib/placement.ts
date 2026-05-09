import type { PlacementCategory, PlacementOption } from './types'

export type SectionMode = 'main' | 'appendix' | 'default'

/**
 * Step 5 (Data Analysis) lets the ecologist tag every record with a placement
 * preference: 'main', 'appendix', 'both', or 'exclude'. This module turns those
 * preferences into a filter applied to the records bound for AI generation,
 * scoped by which section is being generated.
 */
export interface PlacementContext {
  preferences: Partial<Record<PlacementCategory, Record<string, PlacementOption>>> | undefined
  mode: SectionMode
}

export function getSectionMode(sectionId: string): SectionMode {
  if (sectionId === 'appendices') return 'appendix'
  if (sectionId === 'results' || sectionId === 'baseline') return 'main'
  return 'default'
}

export function placementOf(
  ctx: PlacementContext,
  category: PlacementCategory,
  recordId: string
): PlacementOption {
  return ctx.preferences?.[category]?.[recordId] ?? 'both'
}

export function applyPlacement<T extends { id: string }>(
  ctx: PlacementContext,
  records: T[],
  category: PlacementCategory
): T[] {
  if (ctx.mode === 'appendix') {
    return records.filter((r) => {
      const p = placementOf(ctx, category, r.id)
      return p === 'appendix' || p === 'both'
    })
  }
  if (ctx.mode === 'main') {
    return records.filter((r) => {
      const p = placementOf(ctx, category, r.id)
      return p === 'main' || p === 'both'
    })
  }
  return records.filter((r) => placementOf(ctx, category, r.id) !== 'exclude')
}
