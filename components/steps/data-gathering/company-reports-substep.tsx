'use client'

import * as React from 'react'
import { Search, FileText, Save, Loader2, ExternalLink, BookOpen } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useDocumentSearch } from '@/hooks/queries/use-document-hooks'
import { useCreateFinding, useSavedFindings } from '@/hooks/queries/use-finding-hooks'
import { getIndexedDocumentCount } from '@/lib/dropbox/search'
import { useRole } from '@/contexts/role-context'
import { useToast } from '@/hooks/use-toast'
import type { Project } from '@/types/database'

interface CompanyReportsSubStepProps {
  project: Project
  userId: string
  isActive?: boolean
}

export function CompanyReportsSubStep({ project, userId, isActive }: CompanyReportsSubStepProps) {
  const [query, setQuery] = React.useState('')
  const [debouncedQuery, setDebouncedQuery] = React.useState('')
  const [hasDocuments, setHasDocuments] = React.useState<boolean | null>(null)
  const [savingIds, setSavingIds] = React.useState<Set<string>>(new Set())

  const { user } = useRole()
  const { toast } = useToast()
  const organizationId = user?.organization_id ?? ''
  const createFinding = useCreateFinding()
  const { data: savedFindings = [] } = useSavedFindings(project.id)

  const {
    data: results = [],
    isLoading,
    isFetching,
  } = useDocumentSearch(organizationId, debouncedQuery)

  // Debounce
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  // Check if organization has indexed documents
  React.useEffect(() => {
    if (!organizationId || !isActive) return
    getIndexedDocumentCount(organizationId).then((count) => setHasDocuments(count > 0))
  }, [organizationId, isActive])

  const isAlreadySaved = (chunkId: string) => {
    return savedFindings.some((f) => {
      const raw = f.raw_data as Record<string, unknown> | null
      return raw?.chunkId === chunkId
    })
  }

  const handleSave = async (result: {
    chunk_id: string
    document_id: string
    file_name: string
    file_path: string
    content: string
    page_start: number | null
    page_end: number | null
    rank: number
  }) => {
    setSavingIds((prev) => new Set(prev).add(result.chunk_id))
    try {
      await createFinding.mutateAsync({
        project_id: project.id,
        created_by: userId,
        source: 'company_reports' as 'manual',
        data_type: 'other',
        title: `${result.file_name}${result.page_start ? ` (p.${result.page_start})` : ''}`,
        content: result.content.slice(0, 500),
        is_saved: true,
        raw_data: {
          chunkId: result.chunk_id,
          documentId: result.document_id,
          fileName: result.file_name,
          filePath: result.file_path,
          pageStart: result.page_start,
          pageEnd: result.page_end,
          rank: result.rank,
          searchQuery: debouncedQuery,
        },
      })
      toast({ title: 'Saved', description: `Finding from ${result.file_name} saved` })
    } catch {
      toast({ title: 'Error', description: 'Failed to save finding', variant: 'destructive' })
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev)
        next.delete(result.chunk_id)
        return next
      })
    }
  }

  // No indexed documents
  if (hasDocuments === false) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <BookOpen className="h-8 w-8 text-gray-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">No Documents Indexed</h3>
          <p className="mt-1 text-sm text-gray-600">
            Your organization has not connected a document library yet. Ask your administrator to
            connect Dropbox from the Search page.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href="/search" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Go to Search Settings
          </a>
        </Button>
      </div>
    )
  }

  // Loading state
  if (hasDocuments === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b p-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-purple-600" />
          <div>
            <h3 className="font-semibold text-gray-900">Company Reports</h3>
            <p className="text-xs text-gray-500">
              Search your organization&apos;s indexed document library
            </p>
          </div>
        </div>
        <div className="relative mt-3">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search for species, habitats, site names..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
          {isFetching && (
            <Loader2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4">
        {debouncedQuery.length > 0 && debouncedQuery.length < 3 && (
          <p className="text-center text-sm text-gray-500">Type at least 3 characters to search</p>
        )}

        {!isLoading && debouncedQuery.length >= 3 && results.length === 0 && (
          <div className="py-8 text-center text-sm text-gray-500">
            <Search className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            No results found for &quot;{debouncedQuery}&quot;
          </div>
        )}

        {debouncedQuery.length < 3 && !isFetching && (
          <div className="py-8 text-center text-sm text-gray-500">
            <Search className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            Search your firm&apos;s previous ecological reports
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              {results.length} result{results.length !== 1 ? 's' : ''}
            </p>
            {results.map((result) => {
              const saved = isAlreadySaved(result.chunk_id)
              const saving = savingIds.has(result.chunk_id)
              return (
                <Card
                  key={result.chunk_id}
                  className={saved ? 'border-green-200 bg-green-50/50' : ''}
                >
                  <CardContent className="p-3">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-blue-500" />
                        <span className="text-sm font-medium text-gray-900">
                          {result.file_name}
                        </span>
                        {result.page_start != null && (
                          <Badge variant="outline" className="text-xs">
                            p.{result.page_start}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant={saved ? 'ghost' : 'outline'}
                        size="sm"
                        disabled={saved || saving}
                        onClick={() => handleSave(result)}
                        className="shrink-0"
                      >
                        {saving ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : saved ? (
                          <>Saved</>
                        ) : (
                          <>
                            <Save className="mr-1 h-3 w-3" />
                            Save
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="line-clamp-3 text-xs leading-relaxed text-gray-600">
                      {result.content.slice(0, 300)}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
