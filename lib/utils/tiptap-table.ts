import type { AppendixData } from '@/lib/export/appendix-data'

interface TiptapNode {
  type: string
  attrs?: Record<string, unknown>
  content?: TiptapNode[]
  text?: string
}

function textCell(text: string, isHeader: boolean): TiptapNode {
  return {
    type: isHeader ? 'tableHeader' : 'tableCell',
    content: [
      {
        type: 'paragraph',
        content: text ? [{ type: 'text', text }] : [],
      },
    ],
  }
}

function row(cells: string[], isHeader: boolean): TiptapNode {
  return {
    type: 'tableRow',
    content: cells.map((c) => textCell(c, isHeader)),
  }
}

export function buildTiptapTable(headers: string[], rows: string[][]): TiptapNode {
  return {
    type: 'table',
    content: [row(headers, true), ...rows.map((r) => row(r, false))],
  }
}

export function buildDesignatedSitesTable(data: AppendixData): TiptapNode | null {
  if (!data.designatedSites.length) return null
  return buildTiptapTable(
    ['Name', 'Site Number', 'Distance', 'AI Summary'],
    data.designatedSites.map((s) => [
      s.name,
      `${s.siteNumber} (${s.siteType})`,
      s.distanceKm,
      s.aiSummary,
    ])
  )
}

export function buildSpeciesTable(data: AppendixData): TiptapNode | null {
  if (!data.speciesRecords.length) return null
  return buildTiptapTable(
    ['Name', 'AI Summary', 'Protection Status'],
    data.speciesRecords.map((s) => [s.name, s.aiSummary, s.protectionStatus])
  )
}

export function buildAquaticTable(data: AppendixData): TiptapNode | null {
  if (!data.aquaticFeatures.length) return null
  return buildTiptapTable(
    ['Name', 'Type', 'WFD Status', 'Distance'],
    data.aquaticFeatures.map((a) => [a.name, a.waterBodyType, a.wfdStatus, a.distanceKm])
  )
}
