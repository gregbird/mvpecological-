'use client'

import * as React from 'react'
import type { Project, DeskResearchFinding } from '@/types/database'
import type { TargetNoteWithCreator } from '@/lib/supabase/queries/target-notes'
import type { ProjectSiteWithGeoJSON } from '@/lib/supabase/queries/project-sites'
import { useProjectSites } from '@/hooks/queries/use-site-hooks'
import { useToast } from '@/hooks/use-toast'

// Helpers to extract display data. Prefer the typed columns populated by
// Aşama 1's dual-write; fall back to raw_data for rows that pre-date the
// migration (or for fields not yet migrated, like deepResearch).
function getAISummary(finding: DeskResearchFinding): string | null {
  if (finding.ai_summary) return finding.ai_summary
  const rawData = finding.raw_data as Record<string, unknown> | null
  if (!rawData) return null
  // Habitat stores at top level; everything else nests under metadata.
  if (typeof rawData.aiSummary === 'string') return rawData.aiSummary
  const metadata = rawData.metadata as Record<string, unknown> | undefined
  if (metadata?.aiSummary && typeof metadata.aiSummary === 'string') {
    return metadata.aiSummary
  }
  return null
}

function getDeepResearch(finding: DeskResearchFinding): string | null {
  // deepResearch.aiAnalysis is NOT migrated to a column — stays in raw_data.
  const rawData = finding.raw_data as Record<string, unknown> | null
  if (!rawData) return null
  const deepResearch = rawData.deepResearch as Record<string, unknown> | undefined
  if (deepResearch?.aiAnalysis && typeof deepResearch.aiAnalysis === 'string') {
    return deepResearch.aiAnalysis
  }
  return null
}

function getSiteType(finding: DeskResearchFinding): string | null {
  if (finding.site_type) return finding.site_type
  const rawData = finding.raw_data as Record<string, unknown> | null
  if (!rawData) return null
  const metadata = rawData.metadata as Record<string, unknown> | undefined
  return (metadata?.siteType as string) || null
}

/** CSV-safe escape: double quotes inside, collapse newlines */
function csvEscape(val: string): string {
  return val.replace(/"/g, '""').replace(/[\r\n]+/g, ' ')
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function useExportFindings(
  project: Project,
  savedFindings: DeskResearchFinding[],
  targetNotes: TargetNoteWithCreator[],
  selectedSite?: ProjectSiteWithGeoJSON | null
) {
  const { toast } = useToast()
  const { data: projectSites = [] } = useProjectSites(project.id)

  // Map site_id → site_code so each finding/note row can resolve its site label
  const siteIdToCode = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const s of projectSites) {
      if (s.site_code) map.set(s.id, s.site_code)
    }
    return map
  }, [projectSites])

  // Filename suffix: explicit single site → use its code; otherwise multi-site
  // export → "_AllSites"; single-site project → no suffix.
  const isMultiSite = projectSites.length > 1
  const filenameSiteSuffix = selectedSite?.site_code
    ? `_${selectedSite.site_code.replace(/\s+/g, '-')}`
    : isMultiSite
      ? '_AllSites'
      : ''

  const baseFilename = `${project.name.replace(/\s+/g, '_')}${filenameSiteSuffix}`

  const exportAsCSV = () => {
    const headers = [
      'Title',
      'Scientific Name',
      'Source',
      'Type',
      'Site Code',
      'Taxon Group',
      'Site Type',
      'Distance (km)',
      'Protected',
      'Red List Status',
      'Designations',
      'Content',
      'Notes',
      'AI Summary',
      'Deep Research',
    ]
    const rows = savedFindings.map((f) => {
      const aiSummary = getAISummary(f)
      const deepResearch = getDeepResearch(f)
      const siteType = getSiteType(f)
      const rawData = f.raw_data as Record<string, unknown> | null
      const metadata = rawData?.metadata as Record<string, unknown> | undefined
      const siteCode = f.site_id ? (siteIdToCode.get(f.site_id) ?? '') : ''
      return [
        f.title,
        (metadata?.scientificName as string) || '',
        f.source.toUpperCase(),
        f.data_type.replace(/_/g, ' '),
        siteCode,
        (metadata?.taxonGroup as string) || '',
        siteType || '',
        f.distance_from_boundary_km?.toFixed(2) || '',
        f.is_protected ? 'Yes' : 'No',
        f.red_list_status || '',
        (metadata?.designations as string) || '',
        f.content || '',
        f.notes || '',
        aiSummary || '',
        deepResearch || '',
      ]
    })

    const csv = [
      headers.join(','),
      ...rows.map((r) => r.map((c) => `"${csvEscape(c)}"`).join(',')),
    ].join('\n')

    // UTF-8 BOM for Excel compatibility
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    downloadBlob(blob, `${baseFilename}_findings.csv`)
  }

  const exportAsGeoJSON = () => {
    const withLocation = savedFindings.filter((f) => f.location)
    const excluded = savedFindings.length - withLocation.length

    const features = withLocation.map((f) => {
      const aiSummary = getAISummary(f)
      const deepResearch = getDeepResearch(f)
      const siteType = getSiteType(f)
      const siteCode = f.site_id ? siteIdToCode.get(f.site_id) : undefined
      return {
        type: 'Feature' as const,
        geometry: f.location as GeoJSON.Geometry,
        properties: {
          id: f.id,
          title: f.title,
          source: f.source,
          dataType: f.data_type,
          siteId: f.site_id || undefined,
          siteCode,
          siteType: siteType || undefined,
          distance_km: f.distance_from_boundary_km,
          isProtected: f.is_protected,
          redListStatus: f.red_list_status,
          content: f.content,
          aiSummary: aiSummary || undefined,
          deepResearch: deepResearch || undefined,
        },
      }
    })

    if (excluded > 0) {
      toast({
        title: 'GeoJSON exported',
        description: `${features.length} findings with location data exported. ${excluded} findings without coordinates were excluded.`,
      })
    }

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features,
    }

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' })
    downloadBlob(blob, `${baseFilename}_findings.geojson`)
  }

  const exportAsJSON = () => {
    const data = {
      project: {
        id: project.id,
        name: project.name,
        gridReference: project.grid_reference,
        county: project.county,
        townland: project.townland,
      },
      // Include site context so the consumer knows which scope this export covers
      sites: projectSites.map((s) => ({
        id: s.id,
        siteCode: s.site_code,
        siteName: s.site_name,
        county: s.county,
        townland: s.townland,
      })),
      activeSite: selectedSite
        ? {
            id: selectedSite.id,
            siteCode: selectedSite.site_code,
            siteName: selectedSite.site_name,
          }
        : null,
      findings: savedFindings.map((f) => {
        const aiSummary = getAISummary(f)
        const deepResearch = getDeepResearch(f)
        const siteType = getSiteType(f)
        return {
          id: f.id,
          title: f.title,
          source: f.source,
          dataType: f.data_type,
          siteId: f.site_id || undefined,
          siteCode: f.site_id ? siteIdToCode.get(f.site_id) : undefined,
          siteType: siteType || undefined,
          content: f.content,
          distance_km: f.distance_from_boundary_km,
          isProtected: f.is_protected,
          redListStatus: f.red_list_status,
          notes: f.notes || undefined,
          aiSummary: aiSummary || undefined,
          deepResearch: deepResearch || undefined,
          rawData: f.raw_data,
        }
      }),
      targetNotes: targetNotes.map((n) => ({
        id: n.id,
        siteId: n.site_id || undefined,
        siteCode: n.site_id ? siteIdToCode.get(n.site_id) : undefined,
        category: n.category,
        title: n.title,
        description: n.description,
        priority: n.priority,
        isVerified: n.is_verified,
      })),
      exportedAt: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    downloadBlob(blob, `${baseFilename}_data.json`)
  }

  return { exportAsCSV, exportAsGeoJSON, exportAsJSON }
}

// Re-export helpers for use in other components
export { getAISummary, getDeepResearch, getSiteType }
