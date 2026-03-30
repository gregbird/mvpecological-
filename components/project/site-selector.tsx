'use client'

import * as React from 'react'
import { MapPin } from 'lucide-react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProjectSites } from '@/hooks/queries/use-site-hooks'
import type { ProjectSiteWithGeoJSON } from '@/lib/supabase/queries/project-sites'

interface SiteSelectorProps {
  projectId: string
  /** Session storage key suffix for persisting selection per step */
  stepKey: string
  onSiteChange: (site: ProjectSiteWithGeoJSON | null) => void
  /** Show "All Sites" option (for aggregate views) */
  showAllOption?: boolean
  className?: string
}

export function SiteSelector({
  projectId,
  stepKey,
  onSiteChange,
  showAllOption = false,
  className,
}: SiteSelectorProps) {
  const { data: sites = [] } = useProjectSites(projectId)
  const storageKey = `site-selection-${stepKey}-${projectId}`

  const [selectedSiteId, setSelectedSiteId] = React.useState<string>(() => {
    if (typeof window === 'undefined') return 'all'
    return sessionStorage.getItem(storageKey) ?? 'all'
  })

  // Fire initial selection on mount / when sites load
  React.useEffect(() => {
    if (sites.length === 0) return
    if (selectedSiteId === 'all') {
      onSiteChange(null)
    } else {
      const site = sites.find((s) => s.id === selectedSiteId)
      if (site) {
        onSiteChange(site)
      } else {
        // Selected site no longer exists — reset to all
        setSelectedSiteId('all')
        sessionStorage.setItem(storageKey, 'all')
        onSiteChange(null)
      }
    }
  }, [sites]) // eslint-disable-line react-hooks/exhaustive-deps

  // Don't render if only 1 site (single-site projects behave as before)
  if (sites.length <= 1) return null

  const handleChange = (value: string) => {
    setSelectedSiteId(value)
    sessionStorage.setItem(storageKey, value)

    if (value === 'all') {
      onSiteChange(null)
    } else {
      const site = sites.find((s) => s.id === value)
      onSiteChange(site ?? null)
    }
  }

  return (
    <div className={className}>
      <Select value={selectedSiteId} onValueChange={handleChange}>
        <SelectTrigger className="h-8 w-48 text-xs">
          <MapPin className="mr-1 h-3 w-3" />
          <SelectValue placeholder="Select site" />
        </SelectTrigger>
        <SelectContent>
          {showAllOption && <SelectItem value="all">All Sites</SelectItem>}
          {sites.map((site) => (
            <SelectItem key={site.id} value={site.id}>
              {site.site_code}
              {site.county ? ` — Co. ${site.county}` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
