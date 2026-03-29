'use client'

import * as React from 'react'
import { Plus, Trash2, MapPin, Check, Pencil } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { calculateAreaHa } from '@/lib/gis'
import { SiteInfoCard } from './site-info-card'
import type { SiteState } from '@/hooks/gis/use-site-management'

interface SiteListPanelProps {
  sites: SiteState[]
  activeSiteIndex: number
  onSelectSite: (index: number) => void
  onAddSite: () => void
  onRemoveSite: (index: number) => void
  onRenameSite: (index: number, code: string) => void
  boundaryInfo: {
    centerLat: string
    centerLng: string
    area: string
    perimeter: string
    gridRef: string
    pointCount: number
  } | null
  locationInfo: {
    county?: string
    townland?: string
    province?: string
  } | null
  isLoadingLocation?: boolean
}

export function SiteListPanel({
  sites,
  activeSiteIndex,
  onSelectSite,
  onAddSite,
  onRemoveSite,
  onRenameSite,
  boundaryInfo,
  locationInfo,
  isLoadingLocation,
}: SiteListPanelProps) {
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null)
  const [editValue, setEditValue] = React.useState('')

  const startRename = (index: number) => {
    setEditingIndex(index)
    setEditValue(sites[index].siteCode)
  }

  const commitRename = () => {
    if (editingIndex !== null && editValue.trim()) {
      onRenameSite(editingIndex, editValue.trim())
    }
    setEditingIndex(null)
  }

  return (
    <div className="border-border flex w-80 flex-col border-l">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <h3 className="text-sm font-semibold">Sites</h3>
          <p className="text-muted-foreground text-xs">
            {sites.length} site{sites.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onAddSite}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add Site
        </Button>
      </div>

      {/* Site list */}
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {sites.map((site, index) => {
            const isActive = index === activeSiteIndex
            const hasBoundary = !!site.boundary

            return (
              <button
                key={site.id ?? `new-${index}`}
                onClick={() => onSelectSite(index)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg border-2 p-3 text-left transition-all',
                  isActive
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950'
                    : 'border-transparent hover:border-gray-200 hover:bg-gray-50 dark:hover:border-gray-700 dark:hover:bg-gray-800'
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                    hasBoundary
                      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400'
                      : 'bg-gray-100 text-gray-400 dark:bg-gray-800'
                  )}
                >
                  {hasBoundary ? <Check className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                </div>

                <div className="min-w-0 flex-1">
                  {editingIndex === index ? (
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename()
                        if (e.key === 'Escape') setEditingIndex(null)
                      }}
                      className="h-6 text-xs"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium">{site.siteCode}</span>
                        {site.isDirty && (
                          <Badge variant="outline" className="px-1 py-0 text-[9px]">
                            unsaved
                          </Badge>
                        )}
                      </div>
                      {site.county && (
                        <span className="text-muted-foreground text-xs">Co. {site.county}</span>
                      )}
                      {hasBoundary && (
                        <span className="text-muted-foreground text-xs">
                          {' · '}
                          {calculateAreaHa(site.boundary!).toFixed(1)} ha
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Actions */}
                {isActive && editingIndex !== index && (
                  <div className="flex shrink-0 gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation()
                        startRename(index)
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    {sites.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-400 hover:text-red-600"
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemoveSite(index)
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </ScrollArea>

      {/* Active site info */}
      {sites[activeSiteIndex]?.boundary && (
        <div className="border-t p-4">
          <SiteInfoCard
            boundaryInfo={boundaryInfo}
            locationInfo={locationInfo}
            isLoadingLocation={isLoadingLocation}
          />
        </div>
      )}
    </div>
  )
}
