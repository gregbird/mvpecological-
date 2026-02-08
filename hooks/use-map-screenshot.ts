'use client'

import { useCallback, useState } from 'react'
import { toPng } from 'html-to-image'
import type { MapStepName } from '@/lib/map-screenshots/types'

const MAX_WIDTH = 1200

interface UseMapScreenshotOptions {
  containerRef: React.RefObject<HTMLDivElement | null>
  projectId: string
  stepName: MapStepName
}

interface UseMapScreenshotResult {
  capture: () => Promise<string | null>
  isCapturing: boolean
}

/**
 * Resize and compress a dataUrl PNG to a smaller JPEG using canvas
 */
function compressImage(dataUrl: string, maxWidth: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width)
      const width = Math.round(img.width * scale)
      const height = Math.round(img.height * scale)

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)

      // JPEG at 0.7 quality → ~50-100KB instead of 3-5MB PNG
      resolve(canvas.toDataURL('image/jpeg', 0.7))
    }
    img.onerror = () => resolve(dataUrl) // fallback to original
    img.src = dataUrl
  })
}

export function useMapScreenshot({
  containerRef,
}: UseMapScreenshotOptions): UseMapScreenshotResult {
  const [isCapturing, setIsCapturing] = useState(false)

  const capture = useCallback(async (): Promise<string | null> => {
    const container = containerRef.current
    if (!container || isCapturing) return null

    setIsCapturing(true)

    try {
      // Close any open popups by finding the Leaflet map instance
      const mapContainer = container.querySelector('.leaflet-container') as HTMLElement | null
      if (mapContainer) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const leafletMap = (mapContainer as any)._leaflet_map
        if (leafletMap) {
          leafletMap.closePopup()
        }
      }

      // Wait for tiles to finish loading
      await new Promise<void>((resolve) => {
        const checkTiles = () => {
          const loadingTiles = container.querySelectorAll('.leaflet-tile-loading')
          if (loadingTiles.length === 0) {
            resolve()
          } else {
            setTimeout(checkTiles, 200)
          }
        }
        checkTiles()
      })

      // Extra buffer for rendering
      await new Promise((resolve) => setTimeout(resolve, 300))

      const rawDataUrl = await toPng(container, {
        pixelRatio: 1,
        cacheBust: true,
        filter: (node: HTMLElement) => {
          if (!(node instanceof HTMLElement)) return true
          if (node.getAttribute?.('data-map-control') === 'true') return false
          if (
            node.classList?.contains('leaflet-control-zoom') ||
            node.classList?.contains('leaflet-draw')
          ) {
            return false
          }
          return true
        },
      })

      // Compress: resize to max 1200px width + JPEG quality 0.7
      const compressed = await compressImage(rawDataUrl, MAX_WIDTH)
      return compressed
    } catch (error) {
      console.error('Map screenshot capture failed:', error)
      return null
    } finally {
      setIsCapturing(false)
    }
  }, [containerRef, isCapturing])

  return { capture, isCapturing }
}
