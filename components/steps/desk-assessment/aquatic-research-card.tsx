'use client'

import * as React from 'react'
import { AlertTriangle, ChevronDown, Droplets } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { AiAnalysisBlock } from '@/components/steps/desk-assessment/research-shared'
import type { AquaticResearchResult } from '@/lib/supabase/queries/aquatic-research'

const statusColor: Record<string, string> = {
  Good: 'text-green-600',
  Moderate: 'text-amber-600',
  Poor: 'text-orange-600',
  Bad: 'text-red-600',
  High: 'text-green-600',
}

export function AquaticCard({ result }: { result: AquaticResearchResult }) {
  const [expanded, setExpanded] = React.useState(false)

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        className="flex w-full items-start gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-100">
          <Droplets className="h-3.5 w-3.5 text-cyan-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-foreground truncate text-sm font-semibold">
              {result.water_body_name}
            </p>
            <Badge variant="outline" className="text-[10px]">
              {result.water_body_type}
            </Badge>
          </div>
          <p className="text-xs text-gray-500">
            {result.water_body_code}
            {result.current_status && (
              <span className={cn('ml-1.5 font-medium', statusColor[result.current_status] || '')}>
                · {result.current_status}
              </span>
            )}
            {result.catchment_name && ` · ${result.catchment_name}`}
          </p>
        </div>
        <ChevronDown
          className={cn(
            'mt-1 h-4 w-4 shrink-0 text-gray-400 transition-transform',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {expanded && (
        <div className="border-t px-3 pb-3">
          {result.linked_sac_name && (
            <div className="mt-2">
              <h4 className="mb-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
                Linked SAC
              </h4>
              <p className="text-xs text-gray-600">
                {result.linked_sac_name} ({result.linked_sac_code})
              </p>
            </div>
          )}
          {result.failures.length > 0 && (
            <div className="mt-2">
              <h4 className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                Failures ({result.failures.length})
              </h4>
              <div className="flex flex-wrap gap-1">
                {result.failures.map((f, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="border-red-200 bg-red-50 text-[10px] text-red-600"
                  >
                    {f.Name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          <AiAnalysisBlock analysis={result.ai_analysis} />
        </div>
      )}
    </Card>
  )
}
