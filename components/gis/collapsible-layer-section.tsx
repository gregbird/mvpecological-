'use client'

import * as React from 'react'
import { Check, ChevronDown, Eye, EyeOff, Loader2, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

export interface CollapsibleLayerSectionProps<T> {
  /** Unique key for this layer (e.g. 'rivers', 'lakes', 'catchments') */
  layerKey: string
  /** Display label (e.g. 'Rivers') */
  label: string
  /** Dot color for the layer */
  color: string
  /** Data items to display */
  items: T[]
  /** Whether items are loading */
  isLoading: boolean
  /** Extract unique ID from an item (used for itemKey prefix) */
  getId: (item: T) => string
  /** Extract display name from an item */
  getName: (item: T) => string
  /** Render metadata line (the small text below the name) */
  getMetadata: (item: T) => string
  /** Extract center coordinates [lat, lng] for fly-to, or null */
  getCenter: (item: T) => [number, number] | null
  /** Zoom level for fly-to */
  zoomLevel: number
  /** Item prefix for deleted/ignored keys (e.g. 'river', 'lake') */
  itemPrefix: string
  /** "No X found in buffer zone" empty state */
  emptyMessage: string
  /** Whether the layer checkbox is checked */
  isVisible: boolean
  /** Whether the collapsible is expanded */
  isExpanded: boolean
  /** Toggle layer visibility (checkbox) */
  onToggleVisibility: () => void
  /** Toggle expand/collapse */
  onToggleExpand: (open: boolean) => void
  /** Set of deleted item keys */
  deletedItems: Set<string>
  /** Set of ignored (hidden) item keys */
  ignoredItems: Set<string>
  /** Toggle ignore state for an item */
  onToggleIgnore: (itemKey: string) => void
  /** Delete (remove) an item */
  onDelete: (itemKey: string) => void
  /** Fly to a location on the map */
  onFlyTo: (center: [number, number], zoom: number, key: string) => void
  /** Whether to show all items (vs capped at displayCount) */
  showAll: boolean
  /** Toggle show-all state */
  onToggleShowAll: () => void
}

const DISPLAY_COUNT = 5

export function CollapsibleLayerSection<T>({
  layerKey,
  label,
  color,
  items,
  isLoading,
  getId,
  getName,
  getMetadata,
  getCenter,
  zoomLevel,
  itemPrefix,
  emptyMessage,
  isVisible,
  isExpanded,
  onToggleVisibility,
  onToggleExpand,
  deletedItems,
  ignoredItems,
  onToggleIgnore,
  onDelete,
  onFlyTo,
  showAll,
  onToggleShowAll,
}: CollapsibleLayerSectionProps<T>) {
  const filteredItems = items.filter((item) => !deletedItems.has(`${itemPrefix}-${getId(item)}`))
  const itemsToShow = showAll ? filteredItems : filteredItems.slice(0, DISPLAY_COUNT)

  return (
    <div className="mb-2 rounded-lg border">
      <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
        <CollapsibleTrigger asChild>
          <div className="flex w-full cursor-pointer items-center justify-between p-2 hover:bg-gray-50">
            <div className="flex items-center gap-2">
              <div
                role="checkbox"
                aria-checked={isVisible}
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleVisibility()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    e.stopPropagation()
                    onToggleVisibility()
                  }
                }}
                className={cn(
                  'flex h-4 w-4 cursor-pointer items-center justify-center rounded border-2',
                  isVisible ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'
                )}
              >
                {isVisible && <Check className="h-3 w-3 text-white" />}
              </div>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-sm font-medium">{label}</span>
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
              ) : (
                <Badge variant="secondary" className="text-[10px]">
                  {items.length}
                </Badge>
              )}
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-gray-400 transition-transform',
                isExpanded && 'rotate-180'
              )}
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t bg-gray-50/50 p-2">
            {filteredItems.length > 0 ? (
              <div className="max-h-64 space-y-1 overflow-x-hidden overflow-y-auto">
                {itemsToShow.map((item, idx) => {
                  const id = getId(item)
                  const itemKey = `${itemPrefix}-${id}`
                  const isIgnored = ignoredItems.has(itemKey)
                  const name = getName(item)
                  const metadata = getMetadata(item)
                  const center = getCenter(item)

                  return (
                    <div
                      key={`${id}-${idx}`}
                      onClick={() => {
                        if (center) {
                          onFlyTo(center, zoomLevel, `${id}-${Date.now()}`)
                        }
                      }}
                      className={cn(
                        'group flex cursor-pointer items-start gap-1.5 rounded p-1.5 text-xs transition-colors',
                        isIgnored ? 'bg-gray-100 opacity-50' : 'bg-white hover:bg-gray-100'
                      )}
                    >
                      <span
                        className="mt-1 h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <div
                        className={cn(
                          'min-w-0 flex-1 overflow-hidden',
                          isIgnored && 'line-through'
                        )}
                      >
                        <p className="font-medium" title={name}>
                          {name && name.length > 28 ? name.slice(0, 28) + '\u2026' : name}
                        </p>
                        {metadata && (
                          <p className="text-muted-foreground text-[10px]">{metadata}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onToggleIgnore(itemKey)
                          }}
                          className={cn(
                            'rounded p-1 transition-colors',
                            isIgnored
                              ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                              : 'text-gray-400 hover:bg-gray-200 hover:text-amber-600'
                          )}
                          title={isIgnored ? 'Show on map' : 'Hide from map'}
                        >
                          {isIgnored ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onDelete(itemKey)
                          }}
                          className="rounded p-1 text-gray-400 transition-colors hover:bg-red-100 hover:text-red-600"
                          title="Remove from list"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )
                })}
                {filteredItems.length > DISPLAY_COUNT && (
                  <button
                    onClick={onToggleShowAll}
                    className="text-muted-foreground sticky bottom-0 w-full bg-gray-50/90 py-1 text-center text-[10px] backdrop-blur-sm transition-colors hover:bg-gray-100 hover:text-gray-700"
                  >
                    {showAll
                      ? 'Show less'
                      : `+${filteredItems.length - DISPLAY_COUNT} more ${layerKey}`}
                  </button>
                )}
              </div>
            ) : !isLoading ? (
              <p className="text-muted-foreground py-2 text-center text-xs">{emptyMessage}</p>
            ) : null}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
