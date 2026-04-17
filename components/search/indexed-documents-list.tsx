'use client'

import * as React from 'react'
import {
  FileText,
  Loader2,
  Trash2,
  RefreshCw,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  useIndexedDocuments,
  useDeleteIndexedDocument,
  useIndexDocuments,
} from '@/hooks/queries/use-document-hooks'
import { useToast } from '@/hooks/use-toast'

interface IndexedDocumentsListProps {
  connectionId: string
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; badge: string; color: string }> = {
  ready: {
    icon: <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />,
    badge: 'Indexed',
    color:
      'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300',
  },
  indexing: {
    icon: <RefreshCw className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />,
    badge: 'Indexing',
    color:
      'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
  },
  pending: {
    icon: <Clock className="text-muted-foreground h-4 w-4" />,
    badge: 'Pending',
    color: 'border-border bg-muted/40 text-muted-foreground',
  },
  error: {
    icon: <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />,
    badge: 'Error',
    color:
      'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300',
  },
}

export function IndexedDocumentsList({ connectionId }: IndexedDocumentsListProps) {
  const { data: documents = [], isLoading } = useIndexedDocuments(connectionId)
  const deleteMutation = useDeleteIndexedDocument()
  const indexMutation = useIndexDocuments()
  const { toast } = useToast()
  const [reprocessingPath, setReprocessingPath] = React.useState<string | null>(null)

  const handleReprocess = async (filePath: string, fileName: string) => {
    setReprocessingPath(filePath)
    try {
      await indexMutation.mutateAsync({ filePaths: [filePath], force: true })
      toast({
        title: 'Re-processing complete',
        description: `${fileName} ran through the updated pipeline (new summary, entity mentions, embeddings).`,
      })
    } catch (error) {
      toast({
        title: 'Re-process failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setReprocessingPath(null)
    }
  }

  const readyCount = documents.filter((d) => d.status === 'ready').length
  const totalChunks = documents.reduce((sum, d) => sum + (d.total_chunks ?? 0), 0)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Indexed Documents</CardTitle>
            <CardDescription>
              {readyCount} document{readyCount !== 1 ? 's' : ''} indexed, {totalChunks} searchable
              chunks
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            <FileText className="text-muted-foreground/40 mx-auto mb-2 h-8 w-8" />
            No documents indexed yet. Browse and select files above to get started.
          </div>
        ) : (
          <div className="divide-border divide-y">
            {documents.map((doc) => {
              const config = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.pending
              return (
                <div key={doc.id} className="flex items-center gap-3 py-3">
                  {config.icon}
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate text-sm font-medium">{doc.file_name}</p>
                    <p className="text-muted-foreground truncate text-xs">{doc.file_path}</p>
                  </div>
                  <Badge variant="outline" className={config.color}>
                    {config.badge}
                  </Badge>
                  {doc.total_chunks != null && doc.total_chunks > 0 && (
                    <span className="text-muted-foreground text-xs">{doc.total_chunks} chunks</span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground h-8 w-8"
                    onClick={() => handleReprocess(doc.file_path, doc.file_name)}
                    disabled={reprocessingPath === doc.file_path || doc.status === 'indexing'}
                    title="Re-process with latest pipeline (new summary, entity mentions)"
                  >
                    {reprocessingPath === doc.file_path ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCw className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive h-8 w-8"
                    onClick={() => deleteMutation.mutate(doc.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
