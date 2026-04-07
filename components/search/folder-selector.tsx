'use client'

import * as React from 'react'
import { Folder, FileText, ChevronRight, ChevronDown, Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { useIndexDocuments } from '@/hooks/queries/use-document-hooks'
import { useToast } from '@/hooks/use-toast'

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
    try {
      const result = await indexMutation.mutateAsync({ filePaths: Array.from(selectedFiles) })
      toast({
        title: 'Indexing Complete',
        description: `${result.indexed} files indexed, ${result.unchanged} unchanged, ${result.errors} errors`,
      })
      setSelectedFiles(new Set())
    } catch {
      toast({
        title: 'Indexing Failed',
        description: 'Some files could not be indexed',
        variant: 'destructive',
      })
    }
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
            <Button variant="outline" size="sm" onClick={() => selectAllInView(entries)}>
              Select All
            </Button>
            <Button
              size="sm"
              onClick={handleIndex}
              disabled={selectedFiles.size === 0 || indexMutation.isPending}
              className="gap-2"
            >
              {indexMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Index {selectedFiles.size > 0 ? `(${selectedFiles.size})` : ''}
            </Button>
          </div>
        </div>
      </CardHeader>
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
