'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getDropboxConnection,
  getIndexedDocuments,
  disconnectDropbox,
  deleteIndexedDocument,
} from '@/lib/supabase/queries/documents'
import { searchDocuments, type DocumentSearchResult } from '@/lib/dropbox/search'

export function useDropboxConnection(organizationId: string) {
  return useQuery({
    queryKey: ['dropbox-connection', organizationId],
    queryFn: () => getDropboxConnection(organizationId),
    enabled: !!organizationId,
  })
}

export function useIndexedDocuments(connectionId: string) {
  return useQuery({
    queryKey: ['indexed-documents', connectionId],
    queryFn: () => getIndexedDocuments(connectionId),
    enabled: !!connectionId,
  })
}

export function useDisconnectDropbox() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (connectionId: string) => disconnectDropbox(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dropbox-connection'] })
      queryClient.invalidateQueries({ queryKey: ['indexed-documents'] })
    },
  })
}

export function useDeleteIndexedDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (documentId: string) => deleteIndexedDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indexed-documents'] })
    },
  })
}

export function useDocumentSearch(organizationId: string, query: string) {
  return useQuery<DocumentSearchResult[]>({
    queryKey: ['document-search', organizationId, query],
    queryFn: () => searchDocuments(organizationId, query),
    enabled: !!organizationId && query.trim().length >= 3,
  })
}

export function useIndexDocuments() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { filePaths: string[] }) => {
      const response = await fetch('/api/dropbox/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to index documents')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indexed-documents'] })
    },
  })
}
