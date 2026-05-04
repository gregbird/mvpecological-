'use client'

import { useCallback, useState } from 'react'
import { toPng } from 'html-to-image'
import type { MapStepName } from '@/lib/map-screenshots/types'

const DEFAULT_MAX_WIDTH = 1200

interface UseMapScreenshotOptions {
  containerRef: React.RefObject<HTMLDivElement | null>
  projectId: string
  stepName: MapStepName
}

interface UseMapScreenshotResult {
  capture: (targetWidth?: number) => Promise<string | null>
  isCapturing: boolean
}

/**
 * Rasterize each Leaflet SVG renderer that has Heritage hatch patterns into
 * an `<image>` overlay placed at the same position. html-to-image's foreign-
 * object trick can drop SVG `<pattern>` fills when the cloned subtree is
 * serialized — patterns sometimes paint as flat fills in the output PNG.
 * Pre-rasterizing the SVG to a data URL guarantees the pattern strokes are
 * baked into pixels before the screenshot capture runs.
 *
 * Returns a restore function to undo the swap so the user-facing map keeps
 * its live SVG patterns after the screenshot.
 */
async function rasterizeHatchedSvgLayers(container: HTMLElement): Promise<() => void> {
  const svgs = Array.from(container.querySelectorAll('svg')) as SVGSVGElement[]
  // Only swap SVGs that actually carry Heritage pattern defs — leaving the
  // rest untouched preserves performance for the common case.
  const hatched = svgs.filter((svg) => svg.querySelector('defs[data-heritage-patterns]'))
  if (hatched.length === 0) return () => {}

  const restorers: (() => void)[] = []

  for (const svg of hatched) {
    try {
      // Serialize the live SVG (with current viewBox + pattern defs intact)
      // into a self-contained data URL.
      const clone = svg.cloneNode(true) as SVGSVGElement
      const rect = svg.getBoundingClientRect()
      const w = Math.round(rect.width)
      const h = Math.round(rect.height)
      if (w === 0 || h === 0) continue
      // Ensure xmlns is present — required for standalone SVG decoding.
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      clone.setAttribute('width', String(w))
      clone.setAttribute('height', String(h))
      const svgString = new XMLSerializer().serializeToString(clone)
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)

      const bitmap = await new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => resolve(null)
        img.src = url
      })
      if (!bitmap) {
        URL.revokeObjectURL(url)
        continue
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        continue
      }
      ctx.drawImage(bitmap, 0, 0, w, h)
      URL.revokeObjectURL(url)
      const pngDataUrl = canvas.toDataURL('image/png')

      // Replace the live <svg> children with a single <image> that displays
      // the rasterized snapshot. We keep the <svg> root so the layout doesn't
      // shift — html-to-image just sees an <image> instead of a stack of
      // <path fill="url(#hc-...)"> elements that it might mishandle.
      const originalChildren = Array.from(svg.childNodes)
      const ns = 'http://www.w3.org/2000/svg'
      const placeholder = document.createElementNS(ns, 'image')
      placeholder.setAttribute('href', pngDataUrl)
      placeholder.setAttribute('x', '0')
      placeholder.setAttribute('y', '0')
      placeholder.setAttribute('width', String(w))
      placeholder.setAttribute('height', String(h))
      placeholder.setAttribute('data-hatch-raster', 'true')

      // Stash originals into a fragment for cheap restore.
      const stash = document.createDocumentFragment()
      for (const child of originalChildren) stash.appendChild(child)
      svg.appendChild(placeholder)

      restorers.push(() => {
        svg.removeChild(placeholder)
        for (const child of Array.from(stash.childNodes)) svg.appendChild(child)
      })
    } catch {
      // If anything fails for one SVG, leave it as-is — the screenshot will
      // still capture (just without the pattern guarantee for that layer).
    }
  }

  return () => {
    for (const restore of restorers) restore()
  }
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

  const capture = useCallback(
    async (targetWidth?: number): Promise<string | null> => {
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

        // Pre-rasterize Heritage Council hatch patterns. Without this, html-
        // to-image's serializer can drop SVG <pattern> fills, so the captured
        // screenshot would show flat colours instead of the hatched fills the
        // user sees on screen — and that screenshot is what flows into PDF /
        // DOCX exports later. Restored after capture.
        const restoreHatch = await rasterizeHatchedSvgLayers(container)

        // Use higher pixelRatio when target width exceeds container width
        // so the output image matches the requested page dimensions
        const containerWidth = container.offsetWidth
        const desiredWidth = targetWidth || DEFAULT_MAX_WIDTH
        const pixelRatio = Math.max(1, Math.ceil(desiredWidth / containerWidth))

        let rawDataUrl: string
        try {
          rawDataUrl = await toPng(container, {
            pixelRatio,
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
        } finally {
          // Always restore the live SVG layers even if html-to-image throws.
          restoreHatch()
        }

        // Compress: resize to target width + JPEG quality 0.7
        const compressed = await compressImage(rawDataUrl, desiredWidth)
        return compressed
      } catch (error) {
        console.error('Map screenshot capture failed:', error)
        return null
      } finally {
        setIsCapturing(false)
      }
    },
    [containerRef, isCapturing]
  )

  return { capture, isCapturing }
}
