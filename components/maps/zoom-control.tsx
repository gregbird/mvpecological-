'use client'

import * as React from 'react'
import { Minus, Plus } from 'lucide-react'
import type { Map as LeafletMap } from 'leaflet'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ZoomControlProps {
  mapRef: React.MutableRefObject<LeafletMap | null>
  className?: string
}

export function ZoomControl({ mapRef, className }: ZoomControlProps) {
  return (
    <div data-map-control="true" className={cn('flex flex-row items-center gap-1', className)}>
      <Button
        variant="secondary"
        size="icon"
        className="h-7 w-7 shadow-md"
        onClick={() => mapRef.current?.zoomOut()}
        aria-label="Zoom out"
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="secondary"
        size="icon"
        className="h-7 w-7 shadow-md"
        onClick={() => mapRef.current?.zoomIn()}
        aria-label="Zoom in"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
