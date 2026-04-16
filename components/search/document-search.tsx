'use client'

import * as React from 'react'
import {
  Search,
  FileText,
  Loader2,
  ChevronDown,
  ChevronUp,
  File,
  Sparkles,
  FolderOpen,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useDocumentSearch } from '@/hooks/queries/use-document-hooks'
import { getAIAnswer, getIndexedDocumentCount } from '@/lib/dropbox/search'
import type { DocumentSearchResult, AIAnswerResponse } from '@/lib/dropbox/search'

interface DocumentSearchProps {
  organizationId: string
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
      <mark
        key={i}
        className="rounded bg-yellow-200 px-0.5 dark:bg-yellow-900 dark:text-yellow-100"
      >
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
        isPdf
          ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300'
          : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300'
      }
    >
      <File className="mr-1 h-3 w-3" />
      {extension.toUpperCase()}
    </Badge>
  )
}

function SearchResultCard({
  result,
  searchQuery,
}: {
  result: DocumentSearchResult
  searchQuery: string
}) {
  const [expanded, setExpanded] = React.useState(false)
  const PREVIEW_LEN = 300
  const isLong = result.content.length > PREVIEW_LEN
  const displayText = expanded ? result.content : result.content.slice(0, PREVIEW_LEN)

  return (
    <div className="border-border bg-card rounded-lg border p-4 transition-colors hover:border-emerald-300 dark:hover:border-emerald-700">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <FileText className="h-4 w-4 text-blue-500" />
        <span className="text-foreground text-sm font-medium">{result.file_name}</span>
        <ExtensionBadge extension={result.file_extension} />
        {result.total_chunks != null && result.total_chunks > 1 && (
          <Badge variant="secondary" className="text-xs">
            Section {result.chunk_index + 1} of {result.total_chunks}
          </Badge>
        )}
        {result.page_start != null && (
          <Badge variant="outline" className="text-xs">
            Page {result.page_start}
            {result.page_end && result.page_end !== result.page_start ? `-${result.page_end}` : ''}
          </Badge>
        )}
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {highlightMatch(displayText, searchQuery)}
        {isLong && !expanded && '...'}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
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
      <p className="text-muted-foreground/70 mt-2 text-xs">{result.file_path}</p>
    </div>
  )
}

export function DocumentSearch({ organizationId }: DocumentSearchProps) {
  const [query, setQuery] = React.useState('')
  const [debouncedQuery, setDebouncedQuery] = React.useState('')
  const [aiAnswer, setAiAnswer] = React.useState<AIAnswerResponse | null>(null)
  const [aiLoading, setAiLoading] = React.useState(false)
  const [documentCount, setDocumentCount] = React.useState<number | null>(null)

  // Check if organization has indexed documents
  React.useEffect(() => {
    if (!organizationId) return
    getIndexedDocumentCount(organizationId).then(setDocumentCount)
  }, [organizationId])

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const {
    data: results = [],
    isLoading,
    isFetching,
  } = useDocumentSearch(organizationId, debouncedQuery)

  // Fetch AI answer (skip if no documents indexed)
  React.useEffect(() => {
    if (debouncedQuery.length < 3 || documentCount === 0) {
      setAiAnswer(null)
      return
    }
    setAiLoading(true)
    getAIAnswer(debouncedQuery)
      .then(setAiAnswer)
      .catch(() => setAiAnswer(null))
      .finally(() => setAiLoading(false))
  }, [debouncedQuery, documentCount])

  const hasNoDocuments = documentCount === 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Search Documents</CardTitle>
        <CardDescription>
          Search across all indexed ecological reports using full-text search
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasNoDocuments ? (
          <div className="border-border bg-muted/40 dark:bg-muted/30 rounded-lg border border-dashed p-8 text-center">
            <FolderOpen className="text-muted-foreground/60 mx-auto mb-3 h-10 w-10" />
            <h4 className="text-foreground text-sm font-semibold">No documents indexed yet</h4>
            <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
              Go to the <span className="font-medium">Documents</span> tab, select folders or files
              from your Dropbox, then click <span className="font-medium">Index</span>. Once
              indexing is complete, you can search across your report library here.
            </p>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Search for species, habitats, site names..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
              />
              {isFetching && (
                <Loader2 className="text-muted-foreground absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin" />
              )}
            </div>

            {debouncedQuery.length > 0 && debouncedQuery.length < 3 && (
              <p className="text-muted-foreground text-sm">Type at least 3 characters to search</p>
            )}

            {!isLoading && debouncedQuery.length >= 3 && results.length === 0 && (
              <div className="text-muted-foreground py-8 text-center text-sm">
                <Search className="text-muted-foreground/50 mx-auto mb-2 h-8 w-8" />
                No results found for &quot;{debouncedQuery}&quot;
              </div>
            )}

            {/* AI Answer */}
            {debouncedQuery.length >= 3 && (aiLoading || aiAnswer) && (
              <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-800 dark:bg-purple-950/50">
                <div className="mb-1 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-medium text-purple-900 dark:text-purple-200">
                    AI Answer
                  </span>
                </div>
                {aiLoading ? (
                  <div className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Analyzing documents...
                  </div>
                ) : aiAnswer ? (
                  <>
                    <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                      {aiAnswer.answer}
                    </p>
                    {aiAnswer.sources.length > 0 && (
                      <p className="mt-2 text-xs text-purple-500 dark:text-purple-400">
                        Sources:{' '}
                        {aiAnswer.sources.map((s) => `${s.fileName} (§${s.section})`).join(', ')}
                      </p>
                    )}
                  </>
                ) : null}
              </div>
            )}

            {results.length > 0 && (
              <div className="space-y-3">
                <p className="text-muted-foreground text-sm">
                  {results.length} result{results.length !== 1 ? 's' : ''} found
                </p>
                {results.map((result) => (
                  <SearchResultCard
                    key={result.chunk_id}
                    result={result}
                    searchQuery={debouncedQuery}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
