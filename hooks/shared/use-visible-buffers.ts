'use client'

import * as React from 'react'

const STORAGE_KEY = 'map-visible-buffers'

function readStored(): number[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.every((n) => typeof n === 'number')) return parsed
    return null
  } catch {
    return null
  }
}

function writeStored(values: number[]) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(values))
  } catch {
    // sessionStorage may be full or disabled
  }
}

/**
 * Session-wide state for which buffer rings are rendered on maps.
 * Persists across steps so a user who hides the 10km ring on Step 2
 * still sees it hidden on Step 3's map.
 *
 * If the stored selection has no overlap with the current project's
 * buffer distances (e.g. switched projects), falls back to all visible.
 */
export function useVisibleBuffers(bufferDistances: number[] | undefined) {
  const [visible, setVisible] = React.useState<Set<number>>(() => {
    const stored = readStored()
    if (stored && bufferDistances && bufferDistances.length > 0) {
      const intersection = stored.filter((d) => bufferDistances.includes(d))
      if (intersection.length > 0) return new Set(intersection)
    }
    return new Set(bufferDistances ?? [])
  })

  // When the project's buffer distances change (project switch, Step 1 edit),
  // reconcile: keep previously-visible entries that still exist; if none do,
  // default to all visible.
  const distanceKey = React.useMemo(
    () =>
      bufferDistances
        ?.slice()
        .sort((a, b) => a - b)
        .join(','),
    [bufferDistances]
  )
  const prevKeyRef = React.useRef(distanceKey)
  if (prevKeyRef.current !== distanceKey) {
    prevKeyRef.current = distanceKey
    const available = bufferDistances ?? []
    const stored = readStored()
    const base = stored ?? Array.from(visible)
    const kept = base.filter((d) => available.includes(d))
    setVisible(new Set(kept.length > 0 ? kept : available))
  }

  const toggle = React.useCallback((distance: number) => {
    setVisible((prev) => {
      const next = new Set(prev)
      if (next.has(distance)) next.delete(distance)
      else next.add(distance)
      writeStored(Array.from(next))
      return next
    })
  }, [])

  const setAll = React.useCallback(
    (on: boolean) => {
      const next = on ? new Set(bufferDistances ?? []) : new Set<number>()
      writeStored(Array.from(next))
      setVisible(next)
    },
    [bufferDistances]
  )

  return { visible, toggle, setAll }
}
