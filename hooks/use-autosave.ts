import { useCallback, useEffect, useRef, useState } from 'react'

type AutosaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error'

interface UseAutosaveOptions {
  /** Delay in ms after last change before saving (default: 30000 = 30s) */
  delay?: number
  /** Whether autosave is enabled */
  enabled?: boolean
  /** Async function that performs the save */
  onSave: () => Promise<void>
}

interface UseAutosaveReturn {
  /** Current autosave status */
  status: AutosaveStatus
  /** Timestamp of last successful save */
  lastSavedAt: Date | null
  /** Call this whenever content changes */
  markDirty: () => void
  /** Manually trigger save (resets timer) */
  saveNow: () => Promise<void>
}

export function useAutosave({
  delay = 30_000,
  enabled = true,
  onSave,
}: UseAutosaveOptions): UseAutosaveReturn {
  const [status, setStatus] = useState<AutosaveStatus>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSavingRef = useRef(false)
  const onSaveRef = useRef(onSave)

  // Keep onSave ref fresh to avoid stale closures
  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const performSave = useCallback(async () => {
    if (isSavingRef.current) return
    isSavingRef.current = true
    setStatus('saving')

    try {
      await onSaveRef.current()
      setStatus('saved')
      setLastSavedAt(new Date())
    } catch {
      setStatus('error')
    } finally {
      isSavingRef.current = false
    }
  }, [])

  const markDirty = useCallback(() => {
    if (!enabled) return
    setStatus('unsaved')
    clearTimer()
    timerRef.current = setTimeout(() => {
      void performSave()
    }, delay)
  }, [enabled, delay, clearTimer, performSave])

  const saveNow = useCallback(async () => {
    clearTimer()
    await performSave()
  }, [clearTimer, performSave])

  // Warn before closing with unsaved changes
  useEffect(() => {
    if (!enabled) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (status === 'unsaved' || status === 'saving') {
        e.preventDefault()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [enabled, status])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => clearTimer()
  }, [clearTimer])

  return { status, lastSavedAt, markDirty, saveNow }
}
