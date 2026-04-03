'use client'

import * as React from 'react'
import type { FindingDisplay } from '@/components/steps/data-gathering/findings-list'
import type { SubstepShellConfig } from '@/components/steps/data-gathering/data-gathering-substep-shell'
import { getBoundingBox } from '@/lib/gis/bounding-box'
import { useToast } from '@/hooks/use-toast'

interface UseShellSearchParams {
  config: SubstepShellConfig
  allBoundaries?: GeoJSON.Feature<GeoJSON.Polygon>[]
  searchBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  projectBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  projectCenter?: { lat: number; lng: number }
  selectedBuffer: number
  setSearchResults: React.Dispatch<React.SetStateAction<FindingDisplay[]>>
  performSearchRef: React.MutableRefObject<(() => Promise<void>) | null>
}

interface UseShellSearchReturn {
  isSearching: boolean
  searchProgress: string | null
  performSearch: () => Promise<void>
}

export function useShellSearch({
  config,
  allBoundaries,
  searchBoundary,
  projectBoundary,
  projectCenter,
  selectedBuffer,
  setSearchResults,
  performSearchRef,
}: UseShellSearchParams): UseShellSearchReturn {
  const { toast } = useToast()
  const [isSearching, setIsSearching] = React.useState(false)
  const [searchProgress, setSearchProgress] = React.useState<string | null>(null)

  const performSearch = React.useCallback(async () => {
    // Multi-site "All Sites" mode: search all site boundaries in parallel and merge
    if (allBoundaries && allBoundaries.length > 0) {
      setIsSearching(true)
      setSearchProgress(`${allBoundaries.length} sites...`)
      setSearchResults([])

      try {
        const tasks = allBoundaries
          .map((boundary) => {
            const bbox = getBoundingBox(boundary, null, selectedBuffer)
            if (!bbox) return null
            return config.performSearch({
              bbox: {
                minLat: bbox.minLat,
                maxLat: bbox.maxLat,
                minLng: bbox.minLng,
                maxLng: bbox.maxLng,
              },
              buffer: selectedBuffer,
              boundary,
            })
          })
          .filter(Boolean) as Promise<FindingDisplay[]>[]

        const results = await Promise.all(tasks)

        // Merge results, dedup by id
        const merged: FindingDisplay[] = []
        const seenIds = new Set<string>()
        for (const findings of results) {
          for (const f of findings) {
            if (!seenIds.has(f.id)) {
              seenIds.add(f.id)
              merged.push(f)
            }
          }
        }

        setSearchResults(merged)

        if (config.onPostSearch && merged.length > 0) {
          config.onPostSearch(merged, setSearchResults)
        }
      } catch (error) {
        console.error(`${config.cacheKeyPrefix} search error:`, error)
        toast({
          variant: 'destructive',
          title: 'Search failed',
          description: `Could not fetch data from ${config.searchButtonLabel.replace('Search ', '')}.`,
        })
      } finally {
        setIsSearching(false)
        setSearchProgress(null)
      }
      return
    }

    // Single site or specific site
    const effectiveBoundary = searchBoundary ?? projectBoundary
    const bbox = getBoundingBox(effectiveBoundary, projectCenter, selectedBuffer)
    if (!bbox) {
      toast({
        variant: 'destructive',
        title: 'No boundary',
        description: 'Please define a project boundary first.',
      })
      return
    }

    setIsSearching(true)
    setSearchResults([])

    try {
      const findings = await config.performSearch({
        bbox: {
          minLat: bbox.minLat,
          maxLat: bbox.maxLat,
          minLng: bbox.minLng,
          maxLng: bbox.maxLng,
        },
        buffer: selectedBuffer,
        boundary: effectiveBoundary,
      })

      setSearchResults(findings)

      if (config.onPostSearch && findings.length > 0) {
        config.onPostSearch(findings, setSearchResults)
      }
    } catch (error) {
      console.error(`${config.cacheKeyPrefix} search error:`, error)
      toast({
        variant: 'destructive',
        title: 'Search failed',
        description: `Could not fetch data from ${config.searchButtonLabel.replace('Search ', '')}.`,
      })
    } finally {
      setIsSearching(false)
    }
  }, [
    allBoundaries,
    searchBoundary,
    projectBoundary,
    projectCenter,
    selectedBuffer,
    setSearchResults,
    config,
    toast,
  ])

  // Assign ref so useSubstepSearch can trigger performSearch
  performSearchRef.current = performSearch

  return { isSearching, searchProgress, performSearch }
}
