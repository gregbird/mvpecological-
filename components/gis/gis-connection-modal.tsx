'use client'

import * as React from 'react'
import { Globe, Database, Pencil, ArrowRight, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ArcGISConnection } from './arcgis-connection'
import { QGISConnection } from './qgis-connection'

export type GISSourceType = 'arcgis' | 'qgis' | 'manual' | null

interface GISConnectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSourceSelect: (source: GISSourceType) => void
  onBoundaryImport?: (boundary: GeoJSON.Feature<GeoJSON.Polygon>) => void
}

const gisOptions = [
  {
    id: 'arcgis' as const,
    label: 'ArcGIS Online',
    description: 'Connect to ArcGIS Online or import from ArcGIS REST services',
    icon: Globe,
    color: 'bg-blue-500',
  },
  {
    id: 'qgis' as const,
    label: 'QGIS',
    description: 'Import from QGIS database or PostGIS connection',
    icon: Database,
    color: 'bg-green-500',
  },
  {
    id: 'manual' as const,
    label: 'Manual Drawing',
    description: 'Draw boundaries manually on the map',
    icon: Pencil,
    color: 'bg-amber-500',
  },
]

export function GISConnectionModal({
  open,
  onOpenChange,
  onSourceSelect,
  onBoundaryImport,
}: GISConnectionModalProps) {
  const [selectedSource, setSelectedSource] = React.useState<GISSourceType>(null)
  const [step, setStep] = React.useState<'select' | 'connect'>('select')

  const handleSourceClick = (source: GISSourceType) => {
    if (source === 'manual') {
      onSourceSelect(source)
      onOpenChange(false)
      return
    }
    setSelectedSource(source)
    setStep('connect')
  }

  const handleBack = () => {
    setStep('select')
    setSelectedSource(null)
  }

  const handleClose = () => {
    setStep('select')
    setSelectedSource(null)
    onOpenChange(false)
  }

  const handleBoundaryImport = (boundary: GeoJSON.Feature<GeoJSON.Polygon>) => {
    onBoundaryImport?.(boundary)
    onSourceSelect(selectedSource)
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 'select'
              ? 'Connect to Your GIS Tool'
              : selectedSource === 'arcgis'
                ? 'Connect to ArcGIS Online'
                : 'Connect to QGIS'}
          </DialogTitle>
          <DialogDescription>
            {step === 'select'
              ? 'Choose how you would like to define your project boundary'
              : selectedSource === 'arcgis'
                ? 'Import boundaries from ArcGIS Online or REST services'
                : 'Connect to a PostGIS database to import boundaries'}
          </DialogDescription>
        </DialogHeader>

        {step === 'select' ? (
          <div className="mt-4 space-y-3">
            {gisOptions.map((option) => {
              const Icon = option.icon
              return (
                <button
                  key={option.id}
                  onClick={() => handleSourceClick(option.id)}
                  className={cn(
                    'group flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-all',
                    'border-border hover:border-emerald-300 hover:bg-emerald-50/50',
                    'dark:hover:border-emerald-700 dark:hover:bg-emerald-950/20'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-lg',
                      option.color
                    )}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-foreground font-semibold">{option.label}</h3>
                    <p className="text-muted-foreground mt-0.5 text-sm">{option.description}</p>
                  </div>
                  <ArrowRight className="text-muted-foreground h-5 w-5 transition-transform group-hover:translate-x-1" />
                </button>
              )
            })}
          </div>
        ) : (
          <div className="mt-4">
            <Button variant="ghost" size="sm" onClick={handleBack} className="mb-4">
              <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
              Back to options
            </Button>

            {selectedSource === 'arcgis' && (
              <ArcGISConnection onImport={handleBoundaryImport} onCancel={handleClose} />
            )}

            {selectedSource === 'qgis' && (
              <QGISConnection onImport={handleBoundaryImport} onCancel={handleClose} />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
