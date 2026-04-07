'use client'

import * as React from 'react'
import type { Project, DeskResearchFinding } from '@/types/database'
import type { TargetNoteWithCreator } from '@/lib/supabase/queries/target-notes'
import type { ProjectSiteWithGeoJSON } from '@/lib/supabase/queries/project-sites'
import { useProjectSites } from '@/hooks/queries/use-site-hooks'
import { useToast } from '@/hooks/use-toast'

// Helpers to extract data from raw_data
function getAISummary(finding: DeskResearchFinding): string | null {
  const rawData = finding.raw_data as Record<string, unknown> | null
  if (!rawData) return null
  const metadata = rawData.metadata as Record<string, unknown> | undefined
  if (metadata?.aiSummary && typeof metadata.aiSummary === 'string') {
    return metadata.aiSummary
  }
  return null
}

function getDeepResearch(finding: DeskResearchFinding): string | null {
  const rawData = finding.raw_data as Record<string, unknown> | null
  if (!rawData) return null
  const deepResearch = rawData.deepResearch as Record<string, unknown> | undefined
  if (deepResearch?.aiAnalysis && typeof deepResearch.aiAnalysis === 'string') {
    return deepResearch.aiAnalysis
  }
  return null
}

function getSiteType(finding: DeskResearchFinding): string | null {
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
  targetNotes: TargetNoteWithCreator[]
) {
  const { toast } = useToast()

  const exportAsCSV = () => {
    const headers = [
      'Title',
      'Scientific Name',
      'Source',
      'Type',
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
      return [
        f.title,
        (metadata?.scientificName as string) || '',
        f.source.toUpperCase(),
        f.data_type.replace(/_/g, ' '),
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
    downloadBlob(blob, `${project.name.replace(/\s+/g, '_')}_findings.csv`)
  }

  const exportAsGeoJSON = () => {
    const withLocation = savedFindings.filter((f) => f.location)
    const excluded = savedFindings.length - withLocation.length

    const features = withLocation.map((f) => {
      const aiSummary = getAISummary(f)
      const deepResearch = getDeepResearch(f)
      const siteType = getSiteType(f)
      return {
        type: 'Feature' as const,
        geometry: f.location as GeoJSON.Geometry,
        properties: {
          id: f.id,
          title: f.title,
          source: f.source,
          dataType: f.data_type,
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
    downloadBlob(blob, `${project.name.replace(/\s+/g, '_')}_findings.geojson`)
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
      findings: savedFindings.map((f) => {
        const aiSummary = getAISummary(f)
        const deepResearch = getDeepResearch(f)
        const siteType = getSiteType(f)
        return {
          id: f.id,
          title: f.title,
          source: f.source,
          dataType: f.data_type,
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
        category: n.category,
        title: n.title,
        description: n.description,
        priority: n.priority,
        isVerified: n.is_verified,
      })),
      exportedAt: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    downloadBlob(blob, `${project.name.replace(/\s+/g, '_')}_data.json`)
  }

  return { exportAsCSV, exportAsGeoJSON, exportAsJSON }
}

// Re-export helpers for use in other components
export { getAISummary, getDeepResearch, getSiteType }
