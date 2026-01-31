'use client'

import * as React from 'react'
import { Plus, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { DeskResearchFinding, FindingType } from './finding-card'

interface ManualFindingFormProps {
  projectId: string
  onSave: (finding: DeskResearchFinding) => void
  trigger?: React.ReactNode
}

const FINDING_TYPES: Array<{ value: FindingType; label: string; description: string }> = [
  {
    value: 'designated_site',
    label: 'Designated Site',
    description: 'SAC, SPA, NHA, or other protected area',
  },
  {
    value: 'species_record',
    label: 'Species Record',
    description: 'Historical species observation or record',
  },
  {
    value: 'water_quality',
    label: 'Water Quality',
    description: 'River, lake, or water body information',
  },
  {
    value: 'catchment',
    label: 'Catchment',
    description: 'Catchment or watershed data',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Other relevant ecological information',
  },
]

export function ManualFindingForm({ projectId, onSave, trigger }: ManualFindingFormProps) {
  const [open, setOpen] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const [dataType, setDataType] = React.useState<FindingType>('other')
  const [content, setContent] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [sourceUrl, setSourceUrl] = React.useState('')
  const [siteCode, setSiteCode] = React.useState('')
  const [scientificName, setScientificName] = React.useState('')

  const resetForm = () => {
    setTitle('')
    setDataType('other')
    setContent('')
    setNotes('')
    setSourceUrl('')
    setSiteCode('')
    setScientificName('')
  }

  const handleSave = () => {
    if (!title.trim()) return

    const finding: DeskResearchFinding = {
      id: `manual-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      source: 'manual',
      dataType,
      title: title.trim(),
      content: content.trim() || undefined,
      notes: notes.trim() || undefined,
      sourceUrl: sourceUrl.trim() || undefined,
      isSaved: true, // Manual findings are saved immediately
      metadata: {
        siteCode: siteCode.trim() || undefined,
        scientificName: scientificName.trim() || undefined,
      },
    }

    onSave(finding)
    resetForm()
    setOpen(false)
  }

  const isValid = title.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Manual Finding
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Manual Finding</DialogTitle>
          <DialogDescription>
            Add a finding from your own research that isn&apos;t available through automated
            searches.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="e.g., Protected badger sett identified"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Finding Type */}
          <div className="space-y-2">
            <Label htmlFor="dataType">Type</Label>
            <Select value={dataType} onValueChange={(v) => setDataType(v as FindingType)}>
              <SelectTrigger id="dataType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FINDING_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex flex-col">
                      <span>{type.label}</span>
                      <span className="text-muted-foreground text-xs">{type.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Description</Label>
            <Textarea
              id="content"
              placeholder="Describe the finding in detail..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
            />
          </div>

          {/* Conditional Fields based on type */}
          {(dataType === 'designated_site' || dataType === 'water_quality') && (
            <div className="space-y-2">
              <Label htmlFor="siteCode">Site/Feature Code</Label>
              <Input
                id="siteCode"
                placeholder="e.g., 001234"
                value={siteCode}
                onChange={(e) => setSiteCode(e.target.value)}
              />
            </div>
          )}

          {dataType === 'species_record' && (
            <div className="space-y-2">
              <Label htmlFor="scientificName">Scientific Name</Label>
              <Input
                id="scientificName"
                placeholder="e.g., Meles meles"
                value={scientificName}
                onChange={(e) => setScientificName(e.target.value)}
              />
            </div>
          )}

          {/* Source URL */}
          <div className="space-y-2">
            <Label htmlFor="sourceUrl">Source URL (optional)</Label>
            <Input
              id="sourceUrl"
              type="url"
              placeholder="https://..."
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about relevance or follow-up actions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            <Plus className="mr-2 h-4 w-4" />
            Add Finding
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
