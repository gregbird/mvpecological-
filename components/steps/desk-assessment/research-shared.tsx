'use client'

import { Bug } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  AI Analysis block (reused by all card types)                       */
/* ------------------------------------------------------------------ */

export function AiAnalysisBlock({ analysis }: { analysis: string | null }) {
  if (!analysis) return null
  return (
    <div className="mt-2">
      <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
        <Bug className="h-3.5 w-3.5 text-purple-600" />
        AI Analysis
      </h4>
      <div className="prose prose-xs dark:prose-invert max-w-none rounded-lg bg-gray-50 p-2.5 text-xs dark:bg-gray-800">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysis}</ReactMarkdown>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Section divider (used between card groups)                         */
/* ------------------------------------------------------------------ */

export function SectionDivider({
  icon: Icon,
  iconColor,
  label,
  count,
}: {
  icon: React.ElementType
  iconColor: string
  label: string
  count: number
}) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <Icon className={cn('h-3.5 w-3.5', iconColor)} />
      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
        {label} ({count})
      </span>
      <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
    </div>
  )
}
