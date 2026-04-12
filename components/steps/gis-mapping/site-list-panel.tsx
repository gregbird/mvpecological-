'use client'

import * as React from 'react'
import { Trash2, MapPin, Pencil, Scissors } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { calculateAreaHa } from '@/lib/gis'
import { AttributeEditor } from '@/components/gis/attribute-editor'
import { SITE_ATTRIBUTE_FIELDS } from '@/lib/config/site-attributes'
import { SiteInfoCard } from './site-info-card'
import type { SiteState } from '@/hooks/gis/use-site-management'

interface SiteListPanelProps {
  sites: SiteState[]
  activeSiteIndex: number
  onSelectSite: (index: number) => void
  onRemoveSite: (index: number) => void
  onRenameSite: (index: number, code: string) => void
  onUpdateAttributes: (attributes: Record<string, unknown>) => void
  onClipToLayer?: () => void
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
  onRemoveSite,
  onRenameSite,
  onUpdateAttributes,
  onClipToLayer,
  boundaryInfo,
  locationInfo,
  isLoadingLocation,
}: SiteListPanelProps) {
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null)
  const [editValue, setEditValue] = React.useState('')
  const activeItemRef = React.useRef<HTMLDivElement>(null)

  // Extra attribute keys from shapefile that aren't in the predefined field list
  const activeAttributes = sites[activeSiteIndex]?.attributes ?? {}
  const extraKeys = React.useMemo(() => {
    const predefined = new Set(SITE_ATTRIBUTE_FIELDS.map((f) => f.key))
    return Object.keys(activeAttributes).filter((k) => !predefined.has(k))
  }, [activeAttributes])

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

  // Auto-scroll to active site when it changes
  React.useEffect(() => {
    activeItemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeSiteIndex])

  return (
    <div className="border-border flex w-80 flex-col border-l">
      {/* Header */}
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Sites</h3>
        <p className="text-muted-foreground text-xs">
          {sites.length} site{sites.length !== 1 ? 's' : ''} — draw polygon to add
        </p>
      </div>

      {/* Site list */}
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {sites.map((site, index) => {
            const isActive = index === activeSiteIndex
            const hasBoundary = !!site.boundary

            return (
              <div
                key={site.id ?? `new-${index}`}
                ref={isActive ? activeItemRef : undefined}
                role="button"
                tabIndex={0}
                onClick={() => onSelectSite(index)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelectSite(index)
                  }
                }}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-2 rounded-lg border-2 p-3 text-left transition-all',
                  isActive
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950'
                    : 'border-transparent hover:border-gray-200 hover:bg-gray-50 dark:hover:border-gray-700 dark:hover:bg-gray-800'
                )}
              >
                {/* Site number badge */}
                <div
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    hasBoundary
                      ? isActive
                        ? 'bg-emerald-500 text-white'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                      : 'bg-gray-100 text-gray-400 dark:bg-gray-800'
                  )}
                >
                  {hasBoundary ? index + 1 : <MapPin className="h-3.5 w-3.5" />}
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
                      <span className="truncate text-sm font-medium">{site.siteCode}</span>
                      {hasBoundary && (
                        <span className="text-muted-foreground block text-xs">
                          {calculateAreaHa(site.boundary!).toFixed(1)} ha
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Actions — only on active site */}
                {isActive && editingIndex !== index && (
                  <div className="flex shrink-0 gap-0.5">
                    <button
                      type="button"
                      className="hover:bg-accent flex h-6 w-6 items-center justify-center rounded-md"
                      onClick={(e) => {
                        e.stopPropagation()
                        startRename(index)
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    {sites.length > 1 && (
                      <button
                        type="button"
                        className="flex h-6 w-6 items-center justify-center rounded-md text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemoveSite(index)
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* Active site info + attributes — always mounted to prevent layout bounce */}
      <div className="max-h-[55vh] overflow-y-auto border-t">
        <div
          className={cn(
            'p-4 transition-opacity duration-150',
            sites[activeSiteIndex]?.boundary ? 'opacity-100' : 'pointer-events-none opacity-0'
          )}
        >
          <SiteInfoCard
            boundaryInfo={boundaryInfo}
            locationInfo={locationInfo}
            isLoadingLocation={isLoadingLocation}
          />
          {onClipToLayer && (
            <button
              type="button"
              className="text-muted-foreground hover:bg-muted hover:text-foreground mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
              onClick={onClipToLayer}
            >
              <Scissors className="h-3 w-3" />
              Clip to Layer
            </button>
          )}
          <div className="mt-4 border-t pt-3">
            <AttributeEditor
              attributes={activeAttributes}
              onChange={onUpdateAttributes}
              extraKeys={extraKeys}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
