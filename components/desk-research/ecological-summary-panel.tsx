'use client'

import * as React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Sparkles,
  MapPin,
  Bug,
  Droplets,
  RefreshCw,
  Pencil,
  Check,
  X,
  Brain,
  Loader2,
  FileText,
  Trees,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'

// ============================================================
// Types & Config
// ============================================================

interface ParsedCategory {
  title: string
  content: string
  bulletCount: number
}

const CATEGORY_CONFIG: Record<string, { icon: string; color: string; bgColor: string }> = {
  'Designated Areas': { icon: 'map-pin', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  Habitats: { icon: 'trees', color: 'text-green-600', bgColor: 'bg-green-100' },
  Species: { icon: 'bug', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  'Aquatic Features': { icon: 'droplets', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  'Document Review': { icon: 'file-text', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
}

function parseInsightsIntoCategories(markdown: string): ParsedCategory[] {
  const categories: ParsedCategory[] = []
  const sections = markdown.split(/^## /m).filter(Boolean)

  for (const section of sections) {
    const newlineIdx = section.indexOf('\n')
    if (newlineIdx === -1) continue

    const title = section.substring(0, newlineIdx).trim()
    const content = section.substring(newlineIdx + 1).trim()
    const bulletCount = (content.match(/^- /gm) || []).length

    categories.push({ title, content, bulletCount })
  }

  return categories
}

function getCategoryIcon(title: string) {
  switch (title) {
    case 'Designated Areas':
      return MapPin
    case 'Habitats':
      return Trees
    case 'Species':
      return Bug
    case 'Aquatic Features':
      return Droplets
    case 'Document Review':
      return FileText
    default:
      return Sparkles
  }
}

// ============================================================
// Component
// ============================================================

interface EcologicalSummaryPanelProps {
  insights: string | null
  isGenerating: boolean
  findingsCount: number
  onRegenerate: () => void
  onInsightsChange: (insights: string) => void
}

export function EcologicalSummaryPanel({
  insights,
  isGenerating,
  findingsCount,
  onRegenerate,
  onInsightsChange,
}: EcologicalSummaryPanelProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [editedContent, setEditedContent] = React.useState('')
  const [isExpanded, setIsExpanded] = React.useState(false)

  const parsedCategories = React.useMemo(() => {
    if (!insights) return []
    return parseInsightsIntoCategories(insights)
  }, [insights])

  // Loading state
  if (isGenerating) {
    return (
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center">
        <Loader2 className="mb-4 h-12 w-12 animate-spin text-purple-500" />
        <h3 className="text-lg font-semibold">Generating Ecological Summary</h3>
        <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-relaxed">
          Analyzing {findingsCount} findings across designated areas, habitats, species, and aquatic
          features...
        </p>
      </div>
    )
  }

  // Empty state
  if (!insights) {
    return (
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center">
        <Brain className="mb-4 h-16 w-16 text-gray-300" />
        <h3 className="text-lg font-semibold">Ecological Summary</h3>
        <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-relaxed">
          Click <strong>&quot;Generate AI Analysis&quot;</strong> to get an automated ecological
          summary of your findings across 4 categories.
        </p>
      </div>
    )
  }

  const totalBullets = parsedCategories.reduce((sum, c) => sum + c.bulletCount, 0)

  return (
    <div className={cn('max-w-none', isEditing && 'flex min-h-0 flex-1 flex-col')}>
      {/* Header with actions */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => !isEditing && setIsExpanded(!isExpanded)}
          disabled={isEditing}
          className="flex items-center gap-2 text-left disabled:cursor-default"
        >
          <Sparkles className="h-5 w-5 text-purple-500" />
          <h3 className="m-0 text-lg font-semibold">Ecological Summary</h3>
          {!isEditing && parsedCategories.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {parsedCategories.length} sections · {totalBullets} bullets
            </Badge>
          )}
        </button>
        <div className="flex items-center gap-1">
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onInsightsChange(editedContent)
                  setIsEditing(false)
                }}
              >
                <Check className="mr-1 h-3 w-3" />
                Save
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                <X className="mr-1 h-3 w-3" />
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditedContent(insights)
                  setIsEditing(true)
                }}
              >
                <Pencil className="mr-1 h-3 w-3" />
                Edit
              </Button>
              <Button variant="ghost" size="sm" onClick={onRegenerate}>
                <RefreshCw className="mr-1 h-3 w-3" />
                Regenerate
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                aria-label={isExpanded ? 'Collapse summary' : 'Expand summary'}
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="mr-1 h-3 w-3" />
                    Collapse
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-1 h-3 w-3" />
                    Expand
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {isEditing ? (
        <Textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          className="h-full min-h-[600px] w-full flex-1 resize-none font-mono text-sm"
          placeholder="Edit the AI analysis in markdown..."
        />
      ) : !isExpanded ? null : parsedCategories.length > 0 ? (
        <div className="space-y-6 rounded-lg border bg-gray-50 p-4 dark:bg-gray-800">
          {parsedCategories.map((category) => {
            const config = CATEGORY_CONFIG[category.title]
            const CategoryIcon = getCategoryIcon(category.title)

            return (
              <div key={category.title}>
                <div className="mb-2 flex items-center gap-2">
                  <div
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                      config?.bgColor || 'bg-gray-100 dark:bg-gray-800'
                    )}
                  >
                    <CategoryIcon className={cn('h-3.5 w-3.5', config?.color || 'text-gray-600')} />
                  </div>
                  <h4 className="font-semibold">{category.title}</h4>
                  {category.bulletCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {category.bulletCount}
                    </Badge>
                  )}
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none pl-9">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{category.content}</ReactMarkdown>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="prose prose-sm dark:prose-invert max-w-none overflow-x-auto rounded-lg border bg-gray-50 p-4 dark:bg-gray-800">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{insights}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}
