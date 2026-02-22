'use client'

import * as React from 'react'
import { Loader2, ImageIcon } from 'lucide-react'
import { getAllScreenshots } from '@/lib/map-screenshots/storage'
import type { MapScreenshot } from '@/lib/map-screenshots/types'

interface AssetPanelScreenshotsProps {
  projectId: string
}

export function AssetPanelScreenshots({ projectId }: AssetPanelScreenshotsProps) {
  const [screenshots, setScreenshots] = React.useState<MapScreenshot[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    getAllScreenshots(projectId).then((data) => {
      if (!cancelled) {
        setScreenshots(data)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [projectId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
      </div>
    )
  }

  if (screenshots.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center text-xs">
        <ImageIcon className="h-8 w-8 opacity-40" />
        <p>No map screenshots captured yet.</p>
        <p>Capture screenshots from the GIS Mapping or Data Analysis steps.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {screenshots.map((ss) => (
        <div
          key={ss.id}
          className="group relative cursor-pointer overflow-hidden rounded-md border"
          title={ss.label}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ss.url}
            alt={ss.label}
            className="h-20 w-full object-cover transition-transform group-hover:scale-105"
          />
          <div className="bg-background/80 absolute inset-x-0 bottom-0 px-1.5 py-0.5">
            <p className="truncate text-[10px] font-medium">{ss.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
