'use client'

import * as React from 'react'
import { Globe, Database, Pencil, FileUp, Clock } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export type GISSourceId = 'arcgis' | 'qgis' | 'manual' | 'upload'

interface GISSourceOption {
  id: GISSourceId
  label: string
  description: string
  icon: typeof Globe
  color: string
  comingSoon: boolean
}

const gisSourceOptions: GISSourceOption[] = [
  {
    id: 'arcgis',
    label: 'ArcGIS Online',
    description: 'Import from ArcGIS',
    icon: Globe,
    color: 'bg-blue-500',
    comingSoon: true,
  },
  {
    id: 'qgis',
    label: 'QGIS',
    description: 'Import from PostGIS',
    icon: Database,
    color: 'bg-green-600',
    comingSoon: true,
  },
  {
    id: 'manual',
    label: 'Draw on Map',
    description: 'Draw boundary manually',
    icon: Pencil,
    color: 'bg-amber-500',
    comingSoon: false,
  },
  {
    id: 'upload',
    label: 'Upload File',
    description: 'GeoJSON or Shapefile',
    icon: FileUp,
    color: 'bg-purple-500',
    comingSoon: false,
  },
]

interface SourceSelectionPanelProps {
  selectedSource: GISSourceId | null
  fileInputRef: React.RefObject<HTMLInputElement | null>
  isProcessing: boolean
  onSourceSelect: (source: string) => void
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
}

export function SourceSelectionPanel({
  selectedSource,
  fileInputRef,
  isProcessing,
  onSourceSelect,
  onFileUpload,
}: SourceSelectionPanelProps) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <h3 className="mb-2 text-center text-xl font-semibold">
          How would you like to define your boundary?
        </h3>
        <p className="text-muted-foreground mb-8 text-center">Choose a method to get started</p>

        <div className="grid grid-cols-2 gap-4">
          {gisSourceOptions.map((option) => {
            const Icon = option.icon
            const isSelected = selectedSource === option.id

            return (
              <button
                key={option.id}
                onClick={() => !option.comingSoon && onSourceSelect(option.id)}
                disabled={option.comingSoon}
                className={cn(
                  'relative flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all',
                  option.comingSoon && 'cursor-not-allowed opacity-50',
                  !option.comingSoon && 'hover:border-emerald-400 hover:shadow-lg',
                  isSelected && 'border-emerald-500 bg-emerald-50 shadow-lg dark:bg-emerald-950'
                )}
              >
                {option.comingSoon && (
                  <Badge variant="secondary" className="absolute -top-2 -right-2">
                    <Clock className="mr-1 h-3 w-3" /> Soon
                  </Badge>
                )}
                <div
                  className={cn(
                    'flex h-14 w-14 items-center justify-center rounded-xl',
                    option.color
                  )}
                >
                  <Icon className="h-7 w-7 text-white" />
                </div>
                <div className="text-center">
                  <h4 className="font-semibold">{option.label}</h4>
                  <p className="text-muted-foreground text-sm">{option.description}</p>
                </div>
              </button>
            )
          })}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".geojson,.json,.shp,.zip"
          className="hidden"
          onChange={onFileUpload}
          disabled={isProcessing}
        />
      </div>
    </div>
  )
}
