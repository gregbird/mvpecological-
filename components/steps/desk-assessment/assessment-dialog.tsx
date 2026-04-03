'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useUpdateFinding } from '@/hooks/queries/use-finding-hooks'
import type { DeskResearchFinding } from '@/types/database'

export type Relevance = 'high' | 'medium' | 'low' | 'none'

export const RELEVANCE_CONFIG: Record<
  Relevance,
  { label: string; color: string; bgColor: string; description: string }
> = {
  high: {
    label: 'High',
    color: 'text-red-700',
    bgColor: 'bg-red-100 border-red-200',
    description: 'Critical - requires field survey attention',
  },
  medium: {
    label: 'Medium',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100 border-amber-200',
    description: 'Relevant - should be considered',
  },
  low: {
    label: 'Low',
    color: 'text-green-700',
    bgColor: 'bg-green-100 border-green-200',
    description: 'Minor relevance to project',
  },
  none: {
    label: 'None',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 border-gray-200 dark:bg-gray-800 dark:border-gray-700',
    description: 'Not applicable to this project',
  },
}

export interface FindingWithRelevance extends DeskResearchFinding {
  relevance: Relevance
  parsedNotes: string
}

interface AssessmentDialogProps {
  finding: FindingWithRelevance | null
  onClose: () => void
}

export function AssessmentDialog({ finding, onClose }: AssessmentDialogProps) {
  const { toast } = useToast()
  const updateFinding = useUpdateFinding()

  const [notes, setNotes] = React.useState('')
  const [relevance, setRelevance] = React.useState<Relevance>('medium')

  // Sync state when finding changes
  React.useEffect(() => {
    if (finding) {
      setNotes(finding.parsedNotes)
      setRelevance(finding.relevance)
    }
  }, [finding])

  const handleSave = async () => {
    if (!finding) return

    try {
      const structuredNotes = JSON.stringify({
        relevance,
        notes,
        assessedAt: new Date().toISOString(),
      })

      await updateFinding.mutateAsync({
        findingId: finding.id,
        updates: { notes: structuredNotes },
      })

      onClose()
    } catch {
      toast({ variant: 'destructive', title: 'Error saving assessment' })
    }
  }

  return (
    <Dialog open={!!finding} onOpenChange={(open) => !open && onClose()} modal={false}>
      <DialogContent className="max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Assess Finding</DialogTitle>
          <DialogDescription className="line-clamp-2">{finding?.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {finding?.content && (
            <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
              {finding.content}
            </div>
          )}

          <div className="space-y-2">
            <Label>Relevance Level</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['high', 'medium', 'low', 'none'] as const).map((key) => {
                const config = RELEVANCE_CONFIG[key]
                const isSelected = relevance === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRelevance(key)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border p-3 text-left transition-all',
                      isSelected
                        ? cn(config.bgColor, 'ring-2 ring-offset-1', {
                            'ring-red-500': key === 'high',
                            'ring-amber-500': key === 'medium',
                            'ring-green-500': key === 'low',
                            'ring-gray-400': key === 'none',
                          })
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-800'
                    )}
                  >
                    <div
                      className={cn('h-3 w-3 rounded-full', {
                        'bg-red-500': key === 'high',
                        'bg-amber-500': key === 'medium',
                        'bg-green-500': key === 'low',
                        'bg-gray-400': key === 'none',
                      })}
                    />
                    <div>
                      <div className="text-sm font-medium">{config.label}</div>
                      <div className="text-muted-foreground text-xs">{config.description}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assessment Notes</Label>
            <Textarea
              placeholder="Add notes about this finding's relevance..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateFinding.isPending}>
            {updateFinding.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Assessment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
