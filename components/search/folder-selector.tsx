'use client'

import * as React from 'react'
import { Folder, FileText, ChevronRight, ChevronDown, Loader2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { useIndexDocuments } from '@/hooks/queries/use-document-hooks'
import { useToast } from '@/hooks/use-toast'

/**
 * Progress state for client-driven sequential indexing.
 *
 * We submit one file per request rather than one request with N files because:
 *   1. Each file runs the full pipeline (extract → chunk → summary → embeddings
 *      → entity extraction), which is heavy enough that 3-4 large PDFs can
 *      exceed a serverless maxDuration.
 *   2. Per-file requests give us real progress to show the user instead of a
 *      single spinner that runs for minutes.
 *   3. One failed file doesn't poison the rest of the batch.
 */
interface IndexProgress {
  total: number
  completed: number
  errors: number
  currentFile: string | null
  cancelled: boolean
}

interface FileEntry {
  name: string
  path: string
  isFolder: boolean
  size: number
  modified: string | null
  extension: string | null
}

interface FolderSelectorProps {
  connectionId: string
}

export function FolderSelector({ connectionId }: FolderSelectorProps) {
  const [entries, setEntries] = React.useState<FileEntry[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [selectedFiles, setSelectedFiles] = React.useState<Set<string>>(new Set())
  const [expandedFolders, setExpandedFolders] = React.useState<Set<string>>(new Set())
  const [folderContents, setFolderContents] = React.useState<Record<string, FileEntry[]>>({})
  const [progress, setProgress] = React.useState<IndexProgress | null>(null)
  // Ref wrapper so the cancel button can flip the flag mid-loop without
  // triggering a re-render that would reset the progress view.
  const cancelRef = React.useRef(false)
  const indexMutation = useIndexDocuments()
  const { toast } = useToast()

  // Suppress unused variable warning - connectionId used for context
  void connectionId

  const loadFolder = React.useCallback(
    async (path: string) => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/dropbox/files?path=${encodeURIComponent(path)}`)
        if (!response.ok) throw new Error('Failed to load files')
        const data = await response.json()
        if (path === '' || path === '/') {
          setEntries(data.entries)
        } else {
          setFolderContents((prev) => ({ ...prev, [path]: data.entries }))
        }
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to load Dropbox files',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    },
    [toast]
  )

  React.useEffect(() => {
    loadFolder('')
  }, [loadFolder])

  const toggleFolder = async (path: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
      if (!folderContents[path]) {
        await loadFolder(path)
      }
    }
    setExpandedFolders(newExpanded)
  }

  const toggleFile = (path: string) => {
    const newSelected = new Set(selectedFiles)
    if (newSelected.has(path)) {
      newSelected.delete(path)
    } else {
      newSelected.add(path)
    }
    setSelectedFiles(newSelected)
  }

  const selectAllInView = (fileEntries: FileEntry[]) => {
    const newSelected = new Set(selectedFiles)
    const files = fileEntries.filter((e) => !e.isFolder)
    files.forEach((f) => newSelected.add(f.path))
    setSelectedFiles(newSelected)
  }

  const handleIndex = async () => {
    if (selectedFiles.size === 0) return
    const paths = Array.from(selectedFiles)

    cancelRef.current = false
    setProgress({
      total: paths.length,
      completed: 0,
      errors: 0,
      currentFile: null,
      cancelled: false,
    })

    // Submit one file at a time. Each request is bounded by the per-file
    // pipeline cost (~5-30s), so the collection as a whole can run for as long
    // as the user is willing to wait, without ever hitting serverless timeout.
    let completed = 0
    let errors = 0
    for (const filePath of paths) {
      if (cancelRef.current) break

      const fileName = filePath.split('/').pop() ?? filePath
      setProgress((prev) => (prev ? { ...prev, currentFile: fileName } : prev))

      try {
        await indexMutation.mutateAsync({ filePaths: [filePath] })
        completed += 1
      } catch (error) {
        errors += 1
        // Non-fatal: continue the loop so a single failure doesn't block the rest.
        console.error(`Failed to index ${filePath}:`, error)
      }

      setProgress((prev) => (prev ? { ...prev, completed: completed + errors, errors } : prev))
    }

    const wasCancelled = cancelRef.current
    setProgress((prev) => (prev ? { ...prev, cancelled: wasCancelled } : prev))

    if (wasCancelled) {
      toast({
        title: 'Indexing cancelled',
        description: `${completed} file(s) indexed before cancellation. ${errors} failed.`,
      })
    } else if (errors > 0) {
      toast({
        title: 'Indexing complete with errors',
        description: `${completed} indexed, ${errors} failed. Check the Indexed Documents list for error details.`,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Indexing complete',
        description: `${completed} file(s) indexed successfully.`,
      })
    }

    setSelectedFiles(new Set())
    // Leave the progress banner visible for ~2s so users see the final count,
    // then clear.
    setTimeout(() => setProgress(null), 2500)
  }

  const cancelIndexing = () => {
    cancelRef.current = true
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const renderEntries = (fileEntries: FileEntry[], depth: number = 0) => {
    return fileEntries.map((entry) => (
      <div key={entry.path}>
        <div
          className="hover:bg-muted/50 flex items-center gap-2 rounded-lg px-3 py-2"
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
        >
          {entry.isFolder ? (
            <button
              onClick={() => toggleFolder(entry.path)}
              className="flex flex-1 items-center gap-2 text-left"
            >
              {expandedFolders.has(entry.path) ? (
                <ChevronDown className="text-muted-foreground h-4 w-4" />
              ) : (
                <ChevronRight className="text-muted-foreground h-4 w-4" />
              )}
              <Folder className="h-4 w-4 text-yellow-500" />
              <span className="text-foreground text-sm font-medium">{entry.name}</span>
            </button>
          ) : (
            <>
              <Checkbox
                checked={selectedFiles.has(entry.path)}
                onCheckedChange={() => toggleFile(entry.path)}
              />
              <FileText className="h-4 w-4 text-blue-500" />
              <span className="text-foreground flex-1 text-sm">{entry.name}</span>
              <span className="text-muted-foreground text-xs">{formatSize(entry.size)}</span>
            </>
          )}
        </div>
        {entry.isFolder &&
          expandedFolders.has(entry.path) &&
          folderContents[entry.path] &&
          renderEntries(folderContents[entry.path], depth + 1)}
      </div>
    ))
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Browse & Index Files</CardTitle>
            <CardDescription>Select PDF and DOCX files to index for searching</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectAllInView(entries)}
              disabled={progress !== null}
            >
              Select All
            </Button>
            <Button
              size="sm"
              onClick={handleIndex}
              disabled={selectedFiles.size === 0 || progress !== null}
              className="gap-2"
            >
              {progress !== null ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Index {selectedFiles.size > 0 ? `(${selectedFiles.size})` : ''}
            </Button>
          </div>
        </div>
      </CardHeader>
      {progress !== null && (
        <div className="border-border bg-muted/30 dark:bg-muted/20 space-y-2 border-y px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-foreground text-sm font-medium">
                {progress.cancelled
                  ? 'Cancelled'
                  : progress.completed === progress.total
                    ? 'Complete'
                    : `Indexing ${progress.completed + 1} of ${progress.total}…`}
              </p>
              {progress.currentFile &&
                !progress.cancelled &&
                progress.completed !== progress.total && (
                  <p className="text-muted-foreground truncate text-xs">{progress.currentFile}</p>
                )}
              {(progress.errors > 0 || progress.completed > 0) && (
                <p className="text-muted-foreground text-xs">
                  {progress.completed - progress.errors} indexed
                  {progress.errors > 0 && ` · ${progress.errors} failed`}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs tabular-nums">
                {Math.round((progress.completed / progress.total) * 100)}%
              </span>
              {!progress.cancelled && progress.completed !== progress.total && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive h-7 gap-1 px-2"
                  onClick={cancelIndexing}
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </Button>
              )}
            </div>
          </div>
          <Progress value={(progress.completed / progress.total) * 100} className="h-1.5" />
        </div>
      )}
      <CardContent>
        {isLoading && entries.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
            <span className="text-muted-foreground ml-2 text-sm">Loading files...</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            No PDF or DOCX files found in your Dropbox
          </div>
        ) : (
          <div className="border-border max-h-96 overflow-y-auto rounded-lg border">
            {renderEntries(entries)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
