'use client'

import * as React from 'react'
import { Save, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { DeskResearchFinding } from './finding-card'

interface FindingEditModalProps {
  finding: DeskResearchFinding | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (finding: DeskResearchFinding, notes: string, relevance?: string) => void
}

const RELEVANCE_OPTIONS = [
  { value: 'high', label: 'High', description: 'Directly relevant to the project' },
  { value: 'medium', label: 'Medium', description: 'Potentially relevant, needs consideration' },
  { value: 'low', label: 'Low', description: 'Minor relevance to the project' },
  { value: 'none', label: 'None', description: 'Not relevant to this project' },
]

const SOURCE_LABELS: Record<string, string> = {
  npws: 'NPWS',
  gbif: 'GBIF',
  nbdc: 'NBDC',
  epa: 'EPA',
  catchments: 'Catchments.ie',
  manual: 'Manual',
}

export function FindingEditModal({ finding, open, onOpenChange, onSave }: FindingEditModalProps) {
  const [notes, setNotes] = React.useState('')
  const [relevance, setRelevance] = React.useState<string>('')

  // Reset form when finding changes
  React.useEffect(() => {
    if (finding) {
      // Parse existing notes if they contain relevance info
      const existingNotes = finding.notes || ''
      if (existingNotes.startsWith('[')) {
        const match = existingNotes.match(/^\[(high|medium|low|none)\]\s*(.*)$/i)
        if (match) {
          setRelevance(match[1].toLowerCase())
          setNotes(match[2] || '')
        } else {
          setNotes(existingNotes)
          setRelevance('')
        }
      } else {
        setNotes(existingNotes)
        setRelevance('')
      }
    }
  }, [finding])

  const handleSave = () => {
    if (!finding) return

    // Format notes with relevance prefix if set
    const formattedNotes = relevance ? `[${relevance}] ${notes}`.trim() : notes

    onSave(finding, formattedNotes, relevance)
    onOpenChange(false)
  }

  if (!finding) {
    return (
      <Dialog open={false} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg" />
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Finding</DialogTitle>
          <DialogDescription>
            Add notes and assess the relevance of this finding to your project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Finding Info */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="secondary">{SOURCE_LABELS[finding.source] || finding.source}</Badge>
              <Badge variant="outline">{finding.dataType.replace('_', ' ')}</Badge>
            </div>
            <h4 className="font-semibold">{finding.title}</h4>
            {finding.content && (
              <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">{finding.content}</p>
            )}
          </div>

          {/* Relevance Selection */}
          <div className="space-y-2">
            <Label htmlFor="relevance">Relevance Assessment</Label>
            <Select value={relevance} onValueChange={setRelevance}>
              <SelectTrigger id="relevance">
                <SelectValue placeholder="Select relevance level..." />
              </SelectTrigger>
              <SelectContent>
                {RELEVANCE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-muted-foreground text-xs">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add notes about this finding, how it relates to the project, or any follow-up actions needed..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>

          {/* Metadata Display */}
          {finding.metadata && (
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Additional Information</Label>
              <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {finding.metadata.siteCode && <span>Code: {finding.metadata.siteCode}</span>}
                {finding.metadata.scientificName && (
                  <span className="italic">{finding.metadata.scientificName}</span>
                )}
                {finding.metadata.recordCount && (
                  <span>Records: {finding.metadata.recordCount}</span>
                )}
                {finding.metadata.recordDate && <span>Date: {finding.metadata.recordDate}</span>}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
