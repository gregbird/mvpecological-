'use client'

import * as React from 'react'
import { Search, FileText, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useDocumentSearch } from '@/hooks/queries/use-document-hooks'

interface DocumentSearchProps {
  organizationId: string
}

export function DocumentSearch({ organizationId }: DocumentSearchProps) {
  const [query, setQuery] = React.useState('')
  const [debouncedQuery, setDebouncedQuery] = React.useState('')

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

  /** Highlight matching terms in text */
  const highlightMatch = (text: string, searchQuery: string) => {
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

  const truncateContent = (content: string, maxLength: number = 300) => {
    if (content.length <= maxLength) return content
    return content.slice(0, maxLength) + '...'
  }

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

        {results.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              {results.length} result{results.length !== 1 ? 's' : ''} found
            </p>
            {results.map((result) => (
              <div
                key={result.chunk_id}
                className="rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-emerald-200"
              >
                <div className="mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium text-gray-900">{result.file_name}</span>
                  {result.page_start != null && (
                    <Badge variant="outline" className="text-xs">
                      Page {result.page_start}
                      {result.page_end && result.page_end !== result.page_start
                        ? `-${result.page_end}`
                        : ''}
                    </Badge>
                  )}
                  <Badge variant="outline" className="ml-auto text-xs text-gray-500">
                    Relevance: {(result.rank * 100).toFixed(0)}%
                  </Badge>
                </div>
                <p className="text-sm leading-relaxed text-gray-600">
                  {highlightMatch(truncateContent(result.content), debouncedQuery)}
                </p>
                <p className="mt-1 text-xs text-gray-400">{result.file_path}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
