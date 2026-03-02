'use client'

import * as React from 'react'
import { Search, FileText, Loader2, ChevronDown, ChevronUp, File, Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useDocumentSearch } from '@/hooks/queries/use-document-hooks'
import { getAIAnswer } from '@/lib/dropbox/search'
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
    <div className="rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-emerald-200">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <FileText className="h-4 w-4 text-blue-500" />
        <span className="text-sm font-medium text-gray-900">{result.file_name}</span>
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
      <p className="text-sm leading-relaxed text-gray-600">
        {highlightMatch(displayText, searchQuery)}
        {isLong && !expanded && '...'}
      </p>
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
      <p className="mt-2 text-xs text-gray-400">{result.file_path}</p>
    </div>
  )
}

export function DocumentSearch({ organizationId }: DocumentSearchProps) {
  const [query, setQuery] = React.useState('')
  const [debouncedQuery, setDebouncedQuery] = React.useState('')
  const [aiAnswer, setAiAnswer] = React.useState<AIAnswerResponse | null>(null)
  const [aiLoading, setAiLoading] = React.useState(false)

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

  // Fetch AI answer
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Search Documents</CardTitle>
        <CardDescription>
          Search across all indexed ecological reports using full-text search
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
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

        {debouncedQuery.length > 0 && debouncedQuery.length < 3 && (
          <p className="text-sm text-gray-500">Type at least 3 characters to search</p>
        )}

        {!isLoading && debouncedQuery.length >= 3 && results.length === 0 && (
          <div className="py-8 text-center text-sm text-gray-500">
            <Search className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            No results found for &quot;{debouncedQuery}&quot;
          </div>
        )}

        {/* AI Answer */}
        {debouncedQuery.length >= 3 && (aiLoading || aiAnswer) && (
          <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4">
            <div className="mb-1 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">AI Answer</span>
            </div>
            {aiLoading ? (
              <div className="flex items-center gap-2 text-sm text-purple-600">
                <Loader2 className="h-3 w-3 animate-spin" />
                Analyzing documents...
              </div>
            ) : aiAnswer ? (
              <>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-700">
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
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
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
      </CardContent>
    </Card>
  )
}
