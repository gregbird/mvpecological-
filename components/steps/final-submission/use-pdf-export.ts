'use client'

import * as React from 'react'
import { useToast } from '@/hooks/use-toast'
import type { useExportWorker } from '@/hooks/use-export-worker'

interface UsePdfExportArgs {
  exportFormat: string
  buildExportOptions: () => ReturnType<typeof Object>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runExport: ReturnType<typeof useExportWorker>['runExport']
  cancelExport: ReturnType<typeof useExportWorker>['cancelExport']
  baseFilename: () => string
  yieldToBrowser: () => Promise<void>
}

/**
 * Wraps the PDF/DOCX/HTML print + export flow + Cancel button. Keeps the
 * abortRef + isExporting state colocated so the parent step doesn't have to
 * juggle them inline.
 */
export function usePdfExport({
  exportFormat,
  buildExportOptions,
  runExport,
  cancelExport,
  baseFilename,
  yieldToBrowser,
}: UsePdfExportArgs) {
  const { toast } = useToast()
  const [isExporting, setIsExporting] = React.useState(false)
  const abortRef = React.useRef(false)

  const handleCancel = () => {
    abortRef.current = true
    cancelExport()
    setIsExporting(false)
    toast({ title: 'Export cancelled' })
  }

  const handlePrint = async () => {
    abortRef.current = false
    setIsExporting(true)
    await yieldToBrowser()
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = await runExport('pdf', buildExportOptions() as any)
      if (abortRef.current) return
      const url = URL.createObjectURL(blob)
      const win = window.open(url, '_blank')
      if (win) win.focus()
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch {
      if (!abortRef.current) {
        toast({
          title: 'Print failed',
          description: 'Could not generate print preview.',
          variant: 'destructive',
        })
      }
    } finally {
      setIsExporting(false)
    }
  }

  const handleExport = async () => {
    abortRef.current = false
    setIsExporting(true)
    await yieldToBrowser()
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const exportOptions = buildExportOptions() as any
      const filename = baseFilename()

      if (exportFormat === 'pdf' || exportFormat === 'html' || exportFormat === 'docx') {
        const blob = await runExport(exportFormat, exportOptions)
        if (abortRef.current) return
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `${filename}.${exportFormat}`
        link.click()
        URL.revokeObjectURL(link.href)
      }

      toast({
        title: 'Report exported',
        description: `Report has been exported as ${filename}.${exportFormat}`,
      })
    } catch (error) {
      if (!abortRef.current) {
        toast({
          variant: 'destructive',
          title: 'Export failed',
          description: error instanceof Error ? error.message : 'Failed to export report.',
        })
      }
    } finally {
      setIsExporting(false)
    }
  }

  return { isExporting, setIsExporting, handlePrint, handleExport, handleCancel }
}
