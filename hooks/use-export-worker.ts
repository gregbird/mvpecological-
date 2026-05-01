'use client'

import * as React from 'react'
import type { PeaExportOptions } from '@/lib/export/pdf-generator'

export type ExportType = 'pdf' | 'docx' | 'html'

interface PendingRequest {
  resolve: (blob: Blob) => void
  reject: (error: Error) => void
}

/**
 * Lazy-initialised Web Worker for PDF/DOCX/HTML export. Keeps the main
 * thread responsive even when generating large reports (75+ row tables
 * used to lock the UI for ~10 seconds).
 *
 * Multiple concurrent calls are supported — each request is correlated
 * by a monotonic id.
 */
export function useExportWorker() {
  const workerRef = React.useRef<Worker | null>(null)
  const pendingRef = React.useRef<Map<number, PendingRequest>>(new Map())
  const idRef = React.useRef(0)

  const ensureWorker = React.useCallback((): Worker => {
    if (workerRef.current) return workerRef.current

    const worker = new Worker(new URL('../lib/export/export-worker.ts', import.meta.url), {
      type: 'module',
    })

    worker.onmessage = (event: MessageEvent) => {
      const data = event.data as
        | { id: number; ok: true; blob: Blob }
        | { id: number; ok: false; error: string }
        | { id: number; ok: 'progress'; step: string; elapsedMs: number }

      // Progress events: log to main-thread console so we can see where the
      // worker is in the pipeline (workers can't surface to DevTools console
      // by default — postMessage relay is the simplest visibility).
      if (data.ok === 'progress') {
        console.log(`[export-worker] +${data.elapsedMs}ms — ${data.step}`)
        return
      }

      const pending = pendingRef.current.get(data.id)
      if (!pending) return
      pendingRef.current.delete(data.id)
      if (data.ok === true) {
        pending.resolve(data.blob)
      } else {
        console.error('[export-worker] generation failed:', data.error)
        pending.reject(new Error(data.error))
      }
    }

    worker.onerror = (event) => {
      const message = event.message || 'Export worker crashed'
      console.error('[export-worker] worker error:', event)
      pendingRef.current.forEach((p) => p.reject(new Error(message)))
      pendingRef.current.clear()
      worker.terminate()
      workerRef.current = null
    }

    worker.onmessageerror = (event) => {
      console.error('[export-worker] message clone error:', event)
      pendingRef.current.forEach((p) =>
        p.reject(new Error('Failed to serialize export options for worker'))
      )
      pendingRef.current.clear()
    }

    workerRef.current = worker
    return worker
  }, [])

  React.useEffect(() => {
    return () => {
      workerRef.current?.terminate()
      workerRef.current = null
      pendingRef.current.forEach((p) => p.reject(new Error('Component unmounted')))
      pendingRef.current.clear()
    }
  }, [])

  const runExport = React.useCallback(
    (type: ExportType, options: PeaExportOptions): Promise<Blob> => {
      const worker = ensureWorker()
      return new Promise<Blob>((resolve, reject) => {
        const id = ++idRef.current
        pendingRef.current.set(id, { resolve, reject })
        worker.postMessage({ id, type, options })
      })
    },
    [ensureWorker]
  )

  /** Hard-cancel any in-flight export. Terminates the worker so a stuck
   *  generation (e.g. a hung image fetch) doesn't keep CPU/memory busy. */
  const cancelExport = React.useCallback(() => {
    if (!workerRef.current) return
    workerRef.current.terminate()
    workerRef.current = null
    pendingRef.current.forEach((p) => p.reject(new Error('Export cancelled')))
    pendingRef.current.clear()
  }, [])

  return { runExport, cancelExport }
}
