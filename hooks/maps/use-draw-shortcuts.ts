'use client'

import * as React from 'react'
import type { Map as LeafletMap } from 'leaflet'

interface DrawShortcutOptions {
  /** The Leaflet map instance */
  map: LeafletMap | null
  /** Whether drawing is enabled (editable mode) */
  enabled: boolean
  /** Undo callback (Ctrl/Cmd+Z) */
  onUndo: () => void
  /** Redo callback (Ctrl/Cmd+Shift+Z) */
  onRedo: () => void
}

/**
 * Registers keyboard shortcuts on the map container:
 * - Ctrl/Cmd+Z for undo
 * - Ctrl/Cmd+Shift+Z for redo
 * - Escape to cancel any active Geoman draw/edit mode
 */
export function useDrawShortcuts({ map, enabled, onUndo, onRedo }: DrawShortcutOptions) {
  const onUndoRef = React.useRef(onUndo)
  onUndoRef.current = onUndo
  const onRedoRef = React.useRef(onRedo)
  onRedoRef.current = onRedo

  React.useEffect(() => {
    if (!map || !enabled) return

    const container = map.getContainer()
    // Make container focusable for keyboard events
    if (!container.getAttribute('tabindex')) {
      container.setAttribute('tabindex', '0')
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.includes('Mac')
      const mod = isMac ? e.metaKey : e.ctrlKey

      if (mod && !e.shiftKey && e.key === 'z') {
        e.preventDefault()
        onUndoRef.current()
      } else if (mod && e.shiftKey && e.key === 'z') {
        e.preventDefault()
        onRedoRef.current()
      } else if (e.key === 'Escape') {
        // Cancel any active draw/edit mode
        if (map.pm?.globalDrawModeEnabled()) map.pm.disableDraw()
        if (map.pm?.globalEditModeEnabled()) map.pm.disableGlobalEditMode()
        if (map.pm?.globalRemovalModeEnabled()) map.pm.disableGlobalRemovalMode()
        if (map.pm?.globalDragModeEnabled()) map.pm.disableGlobalDragMode()
        if (map.pm?.globalCutModeEnabled()) map.pm.disableGlobalCutMode()
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  }, [map, enabled])
}
