'use client'

import * as React from 'react'
import {
  Search,
  FileText,
  Save,
  Loader2,
  ExternalLink,
  BookOpen,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  File,
  Sparkles,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useDocumentSearch } from '@/hooks/queries/use-document-hooks'
import { useCreateFinding, useSavedFindings } from '@/hooks/queries/use-finding-hooks'
import { getIndexedDocumentCount, getAIAnswer } from '@/lib/dropbox/search'
import type { DocumentSearchResult, AIAnswerResponse } from '@/lib/dropbox/search'
import { useRole } from '@/contexts/role-context'
import { useToast } from '@/hooks/use-toast'
import type { Project } from '@/types/database'

interface CompanyReportsSubStepProps {
  project: Project
  userId: string
  isActive?: boolean
}

/** Highlight matching terms in text */
function highlightMatch(text: string, searchQuery: string): React.ReactNode {
  if (!searchQuery.trim()) return text
  const words = searchQuery.trim().split(/\s+/)
  const pattern = new RegExp(
    `(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'gi'
  )
  const parts = text.split(pattern)
  return parts.map((part, i) =>
    pattern.test(part) ? (
      <mark key={i} className="rounded bg-yellow-200 px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

function ExtensionBadge({ extension }: { extension: string | null }) {
  if (!extension) return null
  const isPdf = extension === 'pdf'
  return (
    <Badge
      variant="outline"
      className={
        isPdf ? 'border-red-200 bg-red-50 text-red-700' : 'border-blue-200 bg-blue-50 text-blue-700'
      }
    >
      <File className="mr-1 h-3 w-3" />
      {extension.toUpperCase()}
    </Badge>
  )
}

function ResultCard({
  result,
  searchQuery,
  saved,
  saving,
  onSave,
}: {
  result: DocumentSearchResult
  searchQuery: string
  saved: boolean
  saving: boolean
  onSave: () => void
}) {
  const [expanded, setExpanded] = React.useState(false)
  const PREVIEW_LEN = 300
  const isLong = result.content.length > PREVIEW_LEN
  const displayText = expanded ? result.content : result.content.slice(0, PREVIEW_LEN)

  return (
    <Card className={saved ? 'border-green-200 bg-green-50/50' : ''}>
      <CardContent className="p-3">
        {/* Header row */}
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-blue-500" />
            <span className="text-foreground text-sm font-medium">{result.file_name}</span>
            <ExtensionBadge extension={result.file_extension} />
            {result.total_chunks != null && result.total_chunks > 1 && (
              <Badge variant="secondary" className="text-xs">
                Section {result.chunk_index + 1} of {result.total_chunks}
              </Badge>
            )}
          </div>
          <Button
            variant={saved ? 'ghost' : 'outline'}
            size="sm"
            disabled={saved || saving}
            onClick={onSave}
            className="shrink-0"
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : saved ? (
              <>
                <CheckCircle2 className="mr-1 h-3 w-3 text-green-600" />
                Saved
              </>
            ) : (
              <>
                <Save className="mr-1 h-3 w-3" />
                Save
              </>
            )}
          </Button>
        </div>

        {/* Content with highlight */}
        <p className="text-xs leading-relaxed text-gray-600">
          {highlightMatch(displayText, searchQuery)}
          {isLong && !expanded && '...'}
        </p>

        {/* Expand/collapse */}
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-1 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                Show more
              </>
            )}
          </button>
        )}

        {/* Footer: file path */}
        <p className="mt-2 text-xs text-gray-400">{result.file_path}</p>
      </CardContent>
    </Card>
  )
}

export function CompanyReportsSubStep({ project, userId, isActive }: CompanyReportsSubStepProps) {
  const [query, setQuery] = React.useState('')
  const [debouncedQuery, setDebouncedQuery] = React.useState('')
  const [hasDocuments, setHasDocuments] = React.useState<boolean | null>(null)
  const [savingIds, setSavingIds] = React.useState<Set<string>>(new Set())
  const [aiAnswer, setAiAnswer] = React.useState<AIAnswerResponse | null>(null)
  const [aiLoading, setAiLoading] = React.useState(false)

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

  // Fetch AI answer when debounced query changes
  React.useEffect(() => {
    if (debouncedQuery.length < 3) {
      setAiAnswer(null)
      return
    }
    setAiLoading(true)
    getAIAnswer(debouncedQuery)
      .then(setAiAnswer)
      .catch(() => setAiAnswer(null))
      .finally(() => setAiLoading(false))
  }, [debouncedQuery])

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

  const handleSave = async (result: DocumentSearchResult) => {
    setSavingIds((prev) => new Set(prev).add(result.chunk_id))
    try {
      await createFinding.mutateAsync({
        project_id: project.id,
        created_by: userId,
        source: 'company_reports',
        data_type: 'company_report',
        title: `${result.file_name}${result.page_start ? ` (p.${result.page_start})` : ''}`,
        content: result.content.slice(0, 500),
        is_saved: true,
        raw_data: {
          chunkId: result.chunk_id,
          documentId: result.document_id,
          fileName: result.file_name,
          filePath: result.file_path,
          fileExtension: result.file_extension,
          pageStart: result.page_start,
          pageEnd: result.page_end,
          chunkIndex: result.chunk_index,
          totalChunks: result.total_chunks,
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
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <BookOpen className="h-8 w-8 text-gray-400" />
        </div>
        <div>
          <h3 className="text-foreground text-lg font-semibold">No Documents Indexed</h3>
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
            <h3 className="text-foreground font-semibold">Company Reports</h3>
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

        {/* AI Answer */}
        {debouncedQuery.length >= 3 && (aiLoading || aiAnswer) && (
          <Card className="mb-4 border-purple-200 bg-purple-50/50">
            <CardContent className="p-3">
              <div className="mb-1 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">AI Answer</span>
              </div>
              {aiLoading ? (
                <div className="flex items-center gap-2 text-xs text-purple-600">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Analyzing documents...
                </div>
              ) : aiAnswer ? (
                <>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                    {aiAnswer.answer}
                  </p>
                  {aiAnswer.sources.length > 0 && (
                    <p className="mt-2 text-xs text-purple-500">
                      Sources:{' '}
                      {aiAnswer.sources.map((s) => `${s.fileName} (§${s.section})`).join(', ')}
                    </p>
                  )}
                </>
              ) : null}
            </CardContent>
          </Card>
        )}

        {results.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              {results.length} result{results.length !== 1 ? 's' : ''}
            </p>
            {results.map((result) => (
              <ResultCard
                key={result.chunk_id}
                result={result}
                searchQuery={debouncedQuery}
                saved={isAlreadySaved(result.chunk_id)}
                saving={savingIds.has(result.chunk_id)}
                onSave={() => handleSave(result)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
