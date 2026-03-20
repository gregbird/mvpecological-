'use client'

import * as React from 'react'
import {
  FileText,
  Loader2,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useIndexedDocuments, useDeleteIndexedDocument } from '@/hooks/queries/use-document-hooks'

interface IndexedDocumentsListProps {
  connectionId: string
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; badge: string; color: string }> = {
  ready: {
    icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
    badge: 'Indexed',
    color: 'border-green-200 bg-green-50 text-green-700',
  },
  indexing: {
    icon: <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />,
    badge: 'Indexing',
    color: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  pending: {
    icon: <Clock className="h-4 w-4 text-gray-500" />,
    badge: 'Pending',
    color:
      'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  error: {
    icon: <AlertCircle className="h-4 w-4 text-red-600" />,
    badge: 'Error',
    color: 'border-red-200 bg-red-50 text-red-700',
  },
}

export function IndexedDocumentsList({ connectionId }: IndexedDocumentsListProps) {
  const { data: documents = [], isLoading } = useIndexedDocuments(connectionId)
  const deleteMutation = useDeleteIndexedDocument()

  const readyCount = documents.filter((d) => d.status === 'ready').length
  const totalChunks = documents.reduce((sum, d) => sum + (d.total_chunks ?? 0), 0)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
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
          <div className="py-8 text-center text-sm text-gray-500">
            <FileText className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            No documents indexed yet. Browse and select files above to get started.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {documents.map((doc) => {
              const config = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.pending
              return (
                <div key={doc.id} className="flex items-center gap-3 py-3">
                  {config.icon}
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate text-sm font-medium">{doc.file_name}</p>
                    <p className="truncate text-xs text-gray-500">{doc.file_path}</p>
                  </div>
                  <Badge variant="outline" className={config.color}>
                    {config.badge}
                  </Badge>
                  {doc.total_chunks != null && doc.total_chunks > 0 && (
                    <span className="text-xs text-gray-400">{doc.total_chunks} chunks</span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-red-600"
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
