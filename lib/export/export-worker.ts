/// <reference lib="webworker" />
/**
 * Export Web Worker — runs PDF/DOCX/HTML generation off the main thread.
 *
 * Browser stays responsive even for large reports (75+ row tables that
 * previously locked the UI for 5–10 seconds).
 *
 * Message protocol:
 *   IN:  { id, type: 'pdf' | 'docx' | 'html', options: PeaExportOptions }
 *   OUT: { id, ok: true, blob: Blob } | { id, ok: false, error: string }
 */

import type { PeaExportOptions } from './pdf-generator'

interface ExportRequest {
  id: number
  type: 'pdf' | 'docx' | 'html'
  options: PeaExportOptions
}

type ExportResponse =
  | { id: number; ok: true; blob: Blob }
  | { id: number; ok: false; error: string }
  | { id: number; ok: 'progress'; step: string; elapsedMs: number }

const ctx = self as unknown as DedicatedWorkerGlobalScope

ctx.onmessage = async (event: MessageEvent<ExportRequest>) => {
  const { id, type, options } = event.data
  const startedAt = Date.now()
  const progress = (step: string) => {
    const response: ExportResponse = {
      id,
      ok: 'progress',
      step,
      elapsedMs: Date.now() - startedAt,
    }
    ctx.postMessage(response)
  }

  try {
    progress(`worker received ${type} request`)
    let blob: Blob

    if (type === 'pdf') {
      progress('importing pdf-generator')
      const { generatePeaPdf } = await import('./pdf-generator')
      progress('starting generatePeaPdf')
      const doc = await generatePeaPdf(options, progress)
      progress('pdf rendered, serialising to blob')
      blob = doc.output('blob')
    } else if (type === 'docx') {
      progress('importing docx-generator')
      const { generatePeaDocx } = await import('./docx-generator')
      progress('starting generatePeaDocx')
      blob = await generatePeaDocx(options, progress)
    } else if (type === 'html') {
      progress('importing pdf-generator')
      const { generatePeaHtml } = await import('./pdf-generator')
      progress('starting generatePeaHtml')
      const html = generatePeaHtml(options)
      blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    } else {
      throw new Error(`Unknown export type: ${type}`)
    }

    progress('done')
    const response: ExportResponse = { id, ok: true, blob }
    ctx.postMessage(response)
  } catch (error) {
    const response: ExportResponse = {
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
    ctx.postMessage(response)
  }
}
