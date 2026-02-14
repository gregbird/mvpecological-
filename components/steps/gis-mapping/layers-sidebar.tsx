'use client'

import * as React from 'react'
import { Check, ChevronDown, Loader2, Save, Eye, EyeOff, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CollapsibleLayerSection } from '@/components/gis/collapsible-layer-section'
import { DATASET_GROUPS } from '@/lib/config/dataset-layers'
import type { NPWSDesignatedSite } from '@/lib/external-apis/npws'
import type { EPARiver, EPALake, EPACatchment } from '@/lib/external-apis/epa'
import type { LayerDataState } from '@/hooks/gis/use-layer-data'

// --- Geometry center helpers ---
function getLineCenterFromGeometry(geometry?: GeoJSON.Geometry): [number, number] | null {
  if (!geometry) return null
  const coords =
    geometry.type === 'LineString'
      ? geometry.coordinates
      : geometry.type === 'MultiLineString'
        ? geometry.coordinates[0]
        : null
  if (!coords || coords.length === 0) return null
  const lats = coords.map((c: GeoJSON.Position) => c[1])
  const lngs = coords.map((c: GeoJSON.Position) => c[0])
  return [(Math.min(...lats) + Math.max(...lats)) / 2, (Math.min(...lngs) + Math.max(...lngs)) / 2]
}

function getPolygonCenterFromGeometry(geometry?: GeoJSON.Geometry): [number, number] | null {
  if (!geometry) return null
  const coords =
    geometry.type === 'Polygon'
      ? geometry.coordinates[0]
      : geometry.type === 'MultiPolygon'
        ? geometry.coordinates[0][0]
        : null
  if (!coords || coords.length === 0) return null
  const lats = coords.map((c: GeoJSON.Position) => c[1])
  const lngs = coords.map((c: GeoJSON.Position) => c[0])
  return [(Math.min(...lats) + Math.max(...lats)) / 2, (Math.min(...lngs) + Math.max(...lngs)) / 2]
}

interface LayersSidebarProps {
  enabledBuffers: number[]
  visibleLayers: string[]
  layerData: LayerDataState
  layerDataLoading: Record<string, boolean>
  expandedLayers: Set<string>
  ignoredItems: Set<string>
  deletedItems: Set<string>
  showAllItems: Set<string>
  isSaving: boolean
  isCompleting: boolean
  canComplete: boolean
  hasUnsavedChanges: boolean
  onLayerToggle: (layerId: string) => void
  onToggleIgnore: (itemKey: string) => void
  onDeleteItem: (itemKey: string) => void
  onToggleExpand: (layerKey: string, open: boolean) => void
  onToggleShowAll: (category: string) => void
  onFlyTo: (center: [number, number], zoom: number, key: string) => void
  onSetVisibleLayers: (updater: (prev: string[]) => string[]) => void
  onMarkUnsaved: () => void
  onSave: () => void
  onComplete: () => void
}

export function LayersSidebar({
  enabledBuffers,
  visibleLayers,
  layerData,
  layerDataLoading,
  expandedLayers,
  ignoredItems,
  deletedItems,
  showAllItems,
  isSaving,
  isCompleting,
  canComplete,
  hasUnsavedChanges,
  onLayerToggle,
  onToggleIgnore,
  onDeleteItem,
  onToggleExpand,
  onToggleShowAll,
  onFlyTo,
  onSetVisibleLayers,
  onMarkUnsaved,
  onSave,
  onComplete,
}: LayersSidebarProps) {
  return (
    <div className="border-border flex w-80 shrink-0 flex-col overflow-hidden border-l bg-white">
      {/* Header */}
      <div className="border-b px-3 py-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Data Layers</h3>
          <Badge variant="outline" className="text-[10px]">
            {enabledBuffers.length > 0 ? `${Math.max(...enabledBuffers)} km` : '5 km'}
          </Badge>
        </div>
        <p className="text-muted-foreground text-xs">
          {visibleLayers.length} active · Toggle to view data
        </p>
      </div>

      {/* Layer list */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="w-full overflow-hidden p-2">
          {/* NPWS Designated Sites */}
          <NPWSLayerSection
            layerData={layerData}
            layerDataLoading={layerDataLoading}
            visibleLayers={visibleLayers}
            expandedLayers={expandedLayers}
            ignoredItems={ignoredItems}
            deletedItems={deletedItems}
            showAllItems={showAllItems}
            onToggleExpand={onToggleExpand}
            onSetVisibleLayers={onSetVisibleLayers}
            onLayerToggle={onLayerToggle}
            onToggleIgnore={onToggleIgnore}
            onDeleteItem={onDeleteItem}
            onToggleShowAll={onToggleShowAll}
            onFlyTo={onFlyTo}
            onMarkUnsaved={onMarkUnsaved}
          />

          {/* EPA Rivers */}
          <CollapsibleLayerSection<EPARiver>
            layerKey="rivers"
            label="Rivers"
            color="#0284c7"
            items={layerData.rivers}
            isLoading={!!layerDataLoading.rivers}
            getId={(r) => r.RiverCode}
            getName={(r) => r.RiverName}
            getMetadata={(r) =>
              [
                r.WFD_Status && `WFD: ${r.WFD_Status}`,
                r.Length_km && `${r.Length_km.toFixed(1)} km`,
              ]
                .filter(Boolean)
                .join(' \u00b7 ')
            }
            getCenter={(r) => getLineCenterFromGeometry(r.geometry)}
            zoomLevel={13}
            itemPrefix="river"
            emptyMessage="No rivers found in buffer zone"
            isVisible={visibleLayers.includes('rivers')}
            isExpanded={expandedLayers.has('rivers')}
            onToggleVisibility={() => {
              onLayerToggle('rivers')
              onMarkUnsaved()
            }}
            onToggleExpand={(open) => onToggleExpand('rivers', open)}
            deletedItems={deletedItems}
            ignoredItems={ignoredItems}
            onToggleIgnore={(k) => {
              onToggleIgnore(k)
              onMarkUnsaved()
            }}
            onDelete={(k) => {
              onDeleteItem(k)
              onMarkUnsaved()
            }}
            onFlyTo={(center, zoom, key) => onFlyTo(center, zoom, key)}
            showAll={showAllItems.has('rivers')}
            onToggleShowAll={() => onToggleShowAll('rivers')}
          />

          {/* EPA Lakes */}
          <CollapsibleLayerSection<EPALake>
            layerKey="lakes"
            label="Lakes"
            color="#0369a1"
            items={layerData.lakes}
            isLoading={!!layerDataLoading.lakes}
            getId={(l) => l.LakeCode}
            getName={(l) => l.LakeName}
            getMetadata={(l) =>
              [l.WFD_Status && `WFD: ${l.WFD_Status}`, l.Area_ha && `${l.Area_ha.toFixed(0)} ha`]
                .filter(Boolean)
                .join(' \u00b7 ')
            }
            getCenter={(l) => getPolygonCenterFromGeometry(l.geometry)}
            zoomLevel={13}
            itemPrefix="lake"
            emptyMessage="No lakes found in buffer zone"
            isVisible={visibleLayers.includes('lakes')}
            isExpanded={expandedLayers.has('lakes')}
            onToggleVisibility={() => {
              onLayerToggle('lakes')
              onMarkUnsaved()
            }}
            onToggleExpand={(open) => onToggleExpand('lakes', open)}
            deletedItems={deletedItems}
            ignoredItems={ignoredItems}
            onToggleIgnore={(k) => {
              onToggleIgnore(k)
              onMarkUnsaved()
            }}
            onDelete={(k) => {
              onDeleteItem(k)
              onMarkUnsaved()
            }}
            onFlyTo={(center, zoom, key) => onFlyTo(center, zoom, key)}
            showAll={showAllItems.has('lakes')}
            onToggleShowAll={() => onToggleShowAll('lakes')}
          />

          {/* EPA Catchments */}
          <CollapsibleLayerSection<EPACatchment>
            layerKey="catchments"
            label="Catchments"
            color="#38bdf8"
            items={layerData.catchments}
            isLoading={!!layerDataLoading.catchments}
            getId={(c) => c.CatchmentId}
            getName={(c) => c.CatchmentName}
            getMetadata={(c) =>
              [c.Area_km2 && `${c.Area_km2.toFixed(0)} km\u00b2`, c.RiverBasinDistrict]
                .filter(Boolean)
                .join(' \u00b7 ')
            }
            getCenter={(c) => getPolygonCenterFromGeometry(c.geometry)}
            zoomLevel={11}
            itemPrefix="catchment"
            emptyMessage="No catchments found in buffer zone"
            isVisible={visibleLayers.includes('catchments')}
            isExpanded={expandedLayers.has('catchments')}
            onToggleVisibility={() => {
              onLayerToggle('catchments')
              onMarkUnsaved()
            }}
            onToggleExpand={(open) => onToggleExpand('catchments', open)}
            deletedItems={deletedItems}
            ignoredItems={ignoredItems}
            onToggleIgnore={(k) => {
              onToggleIgnore(k)
              onMarkUnsaved()
            }}
            onDelete={(k) => {
              onDeleteItem(k)
              onMarkUnsaved()
            }}
            onFlyTo={(center, zoom, key) => onFlyTo(center, zoom, key)}
            showAll={showAllItems.has('catchments')}
            onToggleShowAll={() => onToggleShowAll('catchments')}
          />

          {/* Geology & Terrain - Coming soon */}
          <div className="rounded-lg border border-dashed bg-gray-50/50 p-3">
            <p className="text-muted-foreground text-center text-xs">
              Geology & Terrain layers coming soon
            </p>
          </div>
        </div>
      </ScrollArea>

      {/* Footer with Save & Complete buttons */}
      <div className="space-y-2 border-t bg-gray-50 p-3">
        <Button
          onClick={onSave}
          disabled={!hasUnsavedChanges || isSaving}
          variant="outline"
          className="w-full"
          size="sm"
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
        <Button
          onClick={onComplete}
          disabled={!canComplete || isCompleting || isSaving}
          className="w-full bg-emerald-600 hover:bg-emerald-700"
          size="sm"
        >
          {isCompleting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          Save & Continue
        </Button>
      </div>
    </div>
  )
}

// NPWS section extracted (inline NPWS sites with custom toggle + list)
function NPWSLayerSection({
  layerData,
  layerDataLoading,
  visibleLayers,
  expandedLayers,
  ignoredItems,
  deletedItems,
  showAllItems,
  onToggleExpand,
  onSetVisibleLayers,
  onLayerToggle,
  onToggleIgnore,
  onDeleteItem,
  onToggleShowAll,
  onFlyTo,
  onMarkUnsaved,
}: {
  layerData: LayerDataState
  layerDataLoading: Record<string, boolean>
  visibleLayers: string[]
  expandedLayers: Set<string>
  ignoredItems: Set<string>
  deletedItems: Set<string>
  showAllItems: Set<string>
  onToggleExpand: (key: string, open: boolean) => void
  onSetVisibleLayers: (updater: (prev: string[]) => string[]) => void
  onLayerToggle: (layerId: string) => void
  onToggleIgnore: (key: string) => void
  onDeleteItem: (key: string) => void
  onToggleShowAll: (key: string) => void
  onFlyTo: (center: [number, number], zoom: number, key: string) => void
  onMarkUnsaved: () => void
}) {
  const layerToSiteType: Record<string, string> = {
    sac: 'SAC',
    spa: 'SPA',
    nha: 'NHA',
    pnha: 'pNHA',
  }
  const npwsLayers = ['sac', 'spa', 'nha', 'pnha']
  const anyEnabled = visibleLayers.some((l) => npwsLayers.includes(l))
  const allEnabled = npwsLayers.every((l) => visibleLayers.includes(l))

  const selectedTypes = npwsLayers
    .filter((l) => visibleLayers.includes(l))
    .map((l) => layerToSiteType[l])

  const filteredSites = layerData.npwsSites.filter(
    (site) =>
      selectedTypes.includes(site.SITE_TYPE || '') &&
      !deletedItems.has(`npws-${site.SITE_TYPE}-${site.SITECODE}`)
  )

  const displayCount = 5
  const isShowingAll = showAllItems.has('npws')
  const sitesToShow = isShowingAll ? filteredSites : filteredSites.slice(0, displayCount)

  const toggleAllNpws = () => {
    if (allEnabled) {
      onSetVisibleLayers((prev) => prev.filter((l) => !npwsLayers.includes(l)))
    } else {
      onSetVisibleLayers((prev) => [...new Set([...prev, ...npwsLayers])])
    }
    onMarkUnsaved()
  }

  return (
    <div className="mb-2 rounded-lg border">
      <Collapsible
        open={expandedLayers.has('npws')}
        onOpenChange={(open) => onToggleExpand('npws', open)}
      >
        <CollapsibleTrigger asChild>
          <div className="flex w-full min-w-0 cursor-pointer items-center justify-between p-2 hover:bg-gray-50">
            <div className="flex min-w-0 items-center gap-2">
              <div
                role="checkbox"
                aria-checked={anyEnabled}
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleAllNpws()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    e.stopPropagation()
                    toggleAllNpws()
                  }
                }}
                className={cn(
                  'flex h-4 w-4 cursor-pointer items-center justify-center rounded border-2',
                  anyEnabled ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'
                )}
              >
                {anyEnabled && <Check className="h-3 w-3 text-white" />}
              </div>
              <span className="text-sm font-medium">Designated Sites</span>
              {layerDataLoading.npws ? (
                <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
              ) : (
                <Badge variant="secondary" className="text-[10px]">
                  {filteredSites.length}
                </Badge>
              )}
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-gray-400 transition-transform',
                expandedLayers.has('npws') && 'rotate-180'
              )}
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t bg-gray-50/50 p-2">
            {/* Layer toggles */}
            <div className="mb-2 flex flex-wrap gap-1">
              {npwsLayers.map((layerId) => {
                const layer = DATASET_GROUPS.find((g) => g.id === 'npws')?.layers.find(
                  (l) => l.id === layerId
                )
                const isEnabled = visibleLayers.includes(layerId)
                return (
                  <button
                    key={layerId}
                    onClick={() => {
                      onLayerToggle(layerId)
                      onMarkUnsaved()
                    }}
                    className={cn(
                      'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors',
                      isEnabled
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    )}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: layer?.color }}
                    />
                    {layerId.toUpperCase()}
                  </button>
                )
              })}
            </div>
            {/* Sites list */}
            {filteredSites.length > 0 ? (
              <div className="max-h-64 space-y-1 overflow-x-hidden overflow-y-auto">
                {sitesToShow.map((site, idx) => (
                  <NPWSSiteRow
                    key={`${site.SITE_TYPE}-${site.SITECODE}-${idx}`}
                    site={site}
                    isIgnored={ignoredItems.has(`npws-${site.SITE_TYPE}-${site.SITECODE}`)}
                    onToggleIgnore={() => {
                      onToggleIgnore(`npws-${site.SITE_TYPE}-${site.SITECODE}`)
                      onMarkUnsaved()
                    }}
                    onDelete={() => {
                      onDeleteItem(`npws-${site.SITE_TYPE}-${site.SITECODE}`)
                      onMarkUnsaved()
                    }}
                    onFlyTo={onFlyTo}
                  />
                ))}
                {filteredSites.length > displayCount && (
                  <button
                    onClick={() => onToggleShowAll('npws')}
                    className="text-muted-foreground sticky bottom-0 w-full bg-gray-50/90 py-1 text-center text-[10px] backdrop-blur-sm transition-colors hover:bg-gray-100 hover:text-gray-700"
                  >
                    {isShowingAll
                      ? 'Show less'
                      : `+${filteredSites.length - displayCount} more sites`}
                  </button>
                )}
              </div>
            ) : !layerDataLoading.npws ? (
              <p className="text-muted-foreground py-2 text-center text-xs">
                No sites found in buffer zone
              </p>
            ) : null}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

function NPWSSiteRow({
  site,
  isIgnored,
  onToggleIgnore,
  onDelete,
  onFlyTo,
}: {
  site: NPWSDesignatedSite
  isIgnored: boolean
  onToggleIgnore: () => void
  onDelete: () => void
  onFlyTo: (center: [number, number], zoom: number, key: string) => void
}) {
  const handleClick = () => {
    if (site.geometry) {
      const center = getPolygonCenterFromGeometry(site.geometry)
      if (center) {
        onFlyTo(center, 13, `${site.SITECODE}-${Date.now()}`)
      }
    }
  }

  const siteColor =
    site.SITE_TYPE === 'SAC'
      ? '#10b981'
      : site.SITE_TYPE === 'SPA'
        ? '#3b82f6'
        : site.SITE_TYPE === 'NHA'
          ? '#8b5cf6'
          : '#a855f7'

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group flex cursor-pointer items-start gap-1.5 rounded p-1.5 text-xs transition-colors',
        isIgnored ? 'bg-gray-100 opacity-50' : 'bg-white hover:bg-gray-100'
      )}
    >
      <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: siteColor }} />
      <div className={cn('min-w-0 flex-1 overflow-hidden', isIgnored && 'line-through')}>
        <p className="font-medium" title={site.SITENAME}>
          {site.SITENAME && site.SITENAME.length > 28
            ? site.SITENAME.slice(0, 28) + '…'
            : site.SITENAME}
        </p>
        <p className="text-muted-foreground text-[10px]">
          {site.SITE_TYPE} · {site.AREA_HA?.toFixed(0)} ha
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleIgnore()
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
            onDelete()
          }}
          className="rounded p-1 text-gray-400 transition-colors hover:bg-red-100 hover:text-red-600"
          title="Remove from list"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}
