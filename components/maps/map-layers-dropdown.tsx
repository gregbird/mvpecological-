'use client'

import * as React from 'react'
import { Layers } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TILE_LAYERS } from '@/lib/config/map-constants'
import type { MapStyle } from '@/lib/config/map-constants'
import type { MapLayer } from '@/components/maps/map-types'
import type { Map as LeafletMap } from 'leaflet'

interface MapLayersDropdownProps {
  currentStyle: MapStyle
  setCurrentStyle: (style: MapStyle) => void
  mapRef: React.MutableRefObject<LeafletMap | null>
  /** Portal container for the dropdown (typically the map container div) */
  portalContainer?: HTMLElement | null
  /** Toggle-able data layers (used in project-map.tsx) */
  dataLayers?: MapLayer[]
  onToggleLayer?: (layerId: string) => void
  /** Individual toggle states (used in project-map-with-draw.tsx) */
  showCounties?: boolean
  onToggleCounties?: () => void
  showTownlands?: boolean
  onToggleTownlands?: () => void
  /** Bat records GBIF overlay */
  showBatRecords: boolean
  onToggleBatRecords: (checked: boolean) => void
  /** BirdWatch Ireland I-WEBS layers */
  iwebsVisibleLayers: string[]
  onToggleIwebsLayer: (layerId: string, checked: boolean) => void
}

export function MapLayersDropdown({
  currentStyle,
  setCurrentStyle,
  mapRef,
  portalContainer,
  dataLayers,
  onToggleLayer,
  showCounties,
  onToggleCounties,
  showTownlands,
  onToggleTownlands,
  showBatRecords,
  onToggleBatRecords,
  iwebsVisibleLayers,
  onToggleIwebsLayer,
}: MapLayersDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm" className="shadow-md">
          <Layers className="mr-2 h-4 w-4" />
          Layers
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="z-9999 max-h-[70vh] overflow-y-auto"
        container={portalContainer}
      >
        <DropdownMenuLabel>Base Map</DropdownMenuLabel>
        {(Object.keys(TILE_LAYERS) as MapStyle[]).map((style) => (
          <DropdownMenuCheckboxItem
            onSelect={(e) => e.preventDefault()}
            key={style}
            checked={currentStyle === style}
            onCheckedChange={() => {
              setCurrentStyle(style)
              const config = TILE_LAYERS[style]
              if (config.minZoom && mapRef.current) {
                const map = mapRef.current
                if (map.getZoom() < config.minZoom) {
                  map.setZoom(config.minZoom)
                }
                map.setMinZoom(config.minZoom)
              } else if (mapRef.current) {
                mapRef.current.setMinZoom(0)
              }
            }}
          >
            {TILE_LAYERS[style].label}
          </DropdownMenuCheckboxItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Data Layers</DropdownMenuLabel>

        {/* MapLayer-based toggles (project-map.tsx) */}
        {dataLayers &&
          onToggleLayer &&
          dataLayers.map((layer) => (
            <DropdownMenuCheckboxItem
              onSelect={(e) => e.preventDefault()}
              key={layer.id}
              checked={layer.visible}
              onCheckedChange={() => onToggleLayer(layer.id)}
            >
              <div className="flex items-center gap-2">
                {layer.color && (
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: layer.color }} />
                )}
                {layer.name}
              </div>
            </DropdownMenuCheckboxItem>
          ))}

        {/* Individual toggle-based data layers (project-map-with-draw.tsx) */}
        {onToggleCounties && (
          <DropdownMenuCheckboxItem
            onSelect={(e) => e.preventDefault()}
            checked={showCounties}
            onCheckedChange={onToggleCounties}
          >
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: '#f97316' }} />
              County Boundaries
            </div>
          </DropdownMenuCheckboxItem>
        )}
        {onToggleTownlands && (
          <DropdownMenuCheckboxItem
            onSelect={(e) => e.preventDefault()}
            checked={showTownlands}
            onCheckedChange={onToggleTownlands}
          >
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: '#a855f7' }} />
              Townlands (zoom 12+)
            </div>
          </DropdownMenuCheckboxItem>
        )}

        <DropdownMenuCheckboxItem
          onSelect={(e) => e.preventDefault()}
          checked={showBatRecords}
          onCheckedChange={(checked) => onToggleBatRecords(checked === true)}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs leading-none" style={{ color: '#f59e0b' }}>
              ▲
            </span>
            Bat Records (GBIF)
          </div>
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>BirdWatch Ireland</DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          onSelect={(e) => e.preventDefault()}
          checked={iwebsVisibleLayers.includes('iwebs_boundaries')}
          onCheckedChange={(checked) => onToggleIwebsLayer('iwebs_boundaries', checked === true)}
        >
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: '#0ea5e9' }} />
            I-WEBS Boundaries
          </div>
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          onSelect={(e) => e.preventDefault()}
          checked={iwebsVisibleLayers.includes('iwebs_sites')}
          onCheckedChange={(checked) => onToggleIwebsLayer('iwebs_sites', checked === true)}
        >
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: '#2563eb' }} />
            I-WEBS Sites
          </div>
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          onSelect={(e) => e.preventDefault()}
          checked={iwebsVisibleLayers.includes('iwebs_subsites')}
          onCheckedChange={(checked) => onToggleIwebsLayer('iwebs_subsites', checked === true)}
        >
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: '#7c3aed' }} />
            I-WEBS Sub-sites
          </div>
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
