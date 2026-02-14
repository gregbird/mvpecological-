'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
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
import { useCreateTargetNote } from '@/hooks/queries/use-target-note-hooks'
import type { TargetNoteCategory, TargetNotePriority } from '@/types/database'

interface TargetNoteFormProps {
  projectId: string
  userId: string
  findingId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

const CATEGORIES: { value: TargetNoteCategory; label: string; description: string }[] = [
  { value: 'access_point', label: 'Access Point', description: 'Entry or exit point to check' },
  { value: 'check_feature', label: 'Check Feature', description: 'Feature to verify in the field' },
  { value: 'habitat', label: 'Habitat', description: 'Habitat area to survey' },
  { value: 'fauna', label: 'Fauna', description: 'Animal species to look for' },
  { value: 'flora', label: 'Flora', description: 'Plant species to look for' },
  { value: 'management', label: 'Management', description: 'Land management practices' },
  { value: 'damage', label: 'Damage', description: 'Potential damage or threats' },
  { value: 'ownership', label: 'Ownership', description: 'Land ownership or access issues' },
]

const PRIORITIES: { value: TargetNotePriority; label: string }[] = [
  { value: 'high', label: 'High Priority' },
  { value: 'normal', label: 'Normal Priority' },
  { value: 'low', label: 'Low Priority' },
]

export function TargetNoteForm({
  projectId,
  userId,
  findingId,
  onSuccess,
  onCancel,
}: TargetNoteFormProps) {
  const createNote = useCreateTargetNote()

  const [category, setCategory] = React.useState<TargetNoteCategory>('check_feature')
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [priority, setPriority] = React.useState<TargetNotePriority>('normal')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) return

    try {
      await createNote.mutateAsync({
        project_id: projectId,
        finding_id: findingId || null,
        category,
        title: title.trim(),
        description: description.trim() || null,
        priority,
        created_by: userId,
      })

      onSuccess?.()
    } catch (error) {
      console.error('Error creating target note:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select value={category} onValueChange={(v) => setCategory(v as TargetNoteCategory)}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                <div>
                  <div className="font-medium">{cat.label}</div>
                  <div className="text-muted-foreground text-xs">{cat.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="e.g., Check for badger sett near field edge"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          placeholder="Add details for the field surveyor..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      {/* Priority */}
      <div className="space-y-2">
        <Label htmlFor="priority">Priority</Label>
        <Select value={priority} onValueChange={(v) => setPriority(v as TargetNotePriority)}>
          <SelectTrigger>
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            {PRIORITIES.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={!title.trim() || createNote.isPending} className="flex-1">
          {createNote.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Note'
          )}
        </Button>
      </div>
    </form>
  )
}
