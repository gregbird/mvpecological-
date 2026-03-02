'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Loader2, FileText } from 'lucide-react'
import { DropboxIcon } from '@/components/icons/dropbox-icon'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRole } from '@/contexts/role-context'
import { useDropboxConnection } from '@/hooks/queries/use-document-hooks'
import { DropboxConnectionCard } from '@/components/search/dropbox-connection-card'
import { FolderSelector } from '@/components/search/folder-selector'
import { IndexedDocumentsList } from '@/components/search/indexed-documents-list'
import { DocumentSearch } from '@/components/search/document-search'
import { useToast } from '@/hooks/use-toast'

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, permissions, isLoading: isRoleLoading } = useRole()
  const { toast } = useToast()

  const organizationId = user?.organization_id ?? ''
  const { data: connection, isLoading: isConnectionLoading } = useDropboxConnection(organizationId)

  // Handle callback results
  React.useEffect(() => {
    if (searchParams.get('connected') === 'true') {
      toast({
        title: 'Dropbox Connected',
        description: 'Your Dropbox account has been linked successfully.',
      })
    }
    const error = searchParams.get('error')
    if (error) {
      const errorMessages: Record<string, string> = {
        dropbox_not_configured:
          'Dropbox integration is not configured. Please add DROPBOX_APP_KEY and DROPBOX_APP_SECRET environment variables.',
        auth_initiation_failed: 'Failed to start Dropbox authentication. Please try again.',
        token_exchange_failed: 'Failed to complete Dropbox authentication. Please try again.',
      }
      toast({
        title: 'Connection Failed',
        description:
          errorMessages[error] ?? `Dropbox connection error: ${error.replace(/_/g, ' ')}`,
        variant: 'destructive',
      })
    }
  }, [searchParams, toast])

  // Permission guard
  React.useEffect(() => {
    if (!isRoleLoading && !permissions.canManageDocuments) {
      router.push('/projects')
    }
  }, [isRoleLoading, permissions.canManageDocuments, router])

  if (isRoleLoading || isConnectionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0061FE]">
            <DropboxIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Document Search</h1>
            <p className="mt-1 text-gray-600">
              Connect your Dropbox to index ecological reports and search across your firm&apos;s
              document library
            </p>
          </div>
        </div>
      </div>

      {!organizationId ? (
        <div className="py-16 text-center text-gray-500">
          <Search className="mx-auto mb-3 h-12 w-12 text-gray-300" />
          <p>No organization found. Please contact your administrator.</p>
        </div>
      ) : (
        <Tabs defaultValue={connection ? 'documents' : 'connection'} className="space-y-6">
          <TabsList className="bg-white">
            <TabsTrigger value="connection" className="gap-1.5">
              <DropboxIcon className="h-3.5 w-3.5" />
              Connection
            </TabsTrigger>
            <TabsTrigger value="documents" disabled={!connection} className="gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="search" disabled={!connection} className="gap-1.5">
              <Search className="h-3.5 w-3.5" />
              Search
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connection">
            <DropboxConnectionCard
              organizationId={organizationId}
              connection={connection ?? null}
            />
          </TabsContent>

          <TabsContent value="documents">
            {connection && (
              <div className="space-y-6">
                <FolderSelector connectionId={connection.id} />
                <IndexedDocumentsList connectionId={connection.id} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="search">
            <DocumentSearch organizationId={organizationId} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
