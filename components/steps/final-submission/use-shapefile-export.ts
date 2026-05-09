'use client'

import { useToast } from '@/hooks/use-toast'
import type { ProjectSiteWithGeoJSON } from '@/lib/supabase/queries/project-sites'
import type { Project } from '@/types/database'

interface UseShapefileExportArgs {
  project: Project
  sites: ProjectSiteWithGeoJSON[] | undefined
  selectedSiteId: string | null
  activeSiteCode: string | undefined
  setIsExporting: (v: boolean) => void
  yieldToBrowser: () => Promise<void>
}

/**
 * Builds a shapefile bundle (site boundaries + habitat polygons + target notes)
 * from PostGIS geometries fetched on demand. Kept as a hook so the JSX card
 * stays a pure presentational component and the heavy GIS logic doesn't bloat
 * the step file.
 */
export function useShapefileExport({
  project,
  sites,
  selectedSiteId,
  activeSiteCode,
  setIsExporting,
  yieldToBrowser,
}: UseShapefileExportArgs) {
  const { toast } = useToast()

  return async () => {
    setIsExporting(true)
    await yieldToBrowser()
    try {
      const { exportProjectShapefile } = await import('@/lib/gis/shapefile-export')
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      // Sites already have GeoJSON boundary via RPC. Filter to active site if
      // the user narrowed the export scope.
      const boundaries = (sites || [])
        .filter((s) => s.boundary && (!selectedSiteId || s.id === selectedSiteId))
        .map((s) => ({
          boundary: s.boundary as GeoJSON.Feature<GeoJSON.Polygon>,
          siteName: s.site_name || undefined,
          siteCode: s.site_code || undefined,
          attributes: (s.attributes as Record<string, unknown>) || undefined,
        }))

      // Habitat boundaries are PostGIS geometry — fetch as GeoJSON via SQL
      let habitatData: {
        geometry: GeoJSON.Polygon
        fossittCode?: string
        fossittName?: string
        areaHa?: number
        condition?: string
      }[] = []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: habitatRows, error: rpcError } = await (supabase.rpc as any)(
        'get_habitat_polygons_geojson',
        { p_project_id: project.id }
      )
      if (rpcError) {
        console.error('Failed to fetch habitat polygons:', rpcError)
      }

      if (habitatRows && Array.isArray(habitatRows)) {
        habitatData = (habitatRows as Record<string, unknown>[])
          .filter((r) => r.boundary_geojson)
          .map((r) => ({
            geometry: r.boundary_geojson as unknown as GeoJSON.Polygon,
            fossittCode: (r.fossitt_code as string) || undefined,
            fossittName: (r.fossitt_name as string) || undefined,
            areaHa: (r.area_hectares as number) || undefined,
            condition: (r.condition as string) || undefined,
          }))
      }

      // target_notes.location is a PostGIS geometry point — extract via SQL
      const { data: targetNotesData } = await supabase
        .from('target_notes')
        .select('id, title, category, description, location')
        .eq('project_id', project.id)
        .eq('include_in_report', true)

      const targetNotes = (targetNotesData || [])
        .filter((tn) => tn.location != null)
        .map((tn) => {
          const loc = tn.location as unknown as {
            type: string
            coordinates: [number, number]
          } | null
          const coords: [number, number] = loc?.coordinates ?? [0, 0]
          return {
            coordinates: coords,
            noteNumber: tn.title,
            category: tn.category,
            label: tn.title,
            description: tn.description || '',
            date: undefined,
          }
        })

      const blob = await exportProjectShapefile({
        boundaries,
        habitats: habitatData,
        targetNotes,
        projectName: project.name,
      })

      const shapefileSiteSuffix = activeSiteCode ? `_${activeSiteCode.replace(/\s+/g, '-')}` : ''
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${project.site_code || project.id}${shapefileSiteSuffix}_shapefiles.zip`
      link.click()
      URL.revokeObjectURL(link.href)
      toast({ title: 'Shapefiles exported' })
    } catch (err) {
      console.error('Shapefile export error:', err)
      toast({
        variant: 'destructive',
        title: 'Shapefile export failed',
        description: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setIsExporting(false)
    }
  }
}
