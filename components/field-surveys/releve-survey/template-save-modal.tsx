'use client'

import * as React from 'react'
import { Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useCreateReleveTemplate } from '@/hooks/queries/use-releve-hooks'
import type { CustomFieldDefinition } from './types'

interface TemplateSaveModalProps {
  definitions: CustomFieldDefinition[]
}

export function TemplateSaveModal({ definitions }: TemplateSaveModalProps) {
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const { toast } = useToast()
  const createTemplate = useCreateReleveTemplate()

  const handleSave = async () => {
    if (!name.trim()) return

    try {
      await createTemplate.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        custom_fields: definitions,
      })
      toast({ title: 'Template saved' })
      setOpen(false)
      setName('')
      setDescription('')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save template'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    }
  }

  if (definitions.length === 0) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Save className="mr-1.5 h-3.5 w-3.5" />
          Save Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Template Name *</Label>
            <Input
              className="mt-1 h-8 text-sm"
              placeholder="e.g. Wetland Relevé"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea
              className="mt-1 min-h-16 text-sm"
              placeholder="Optional description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium">Custom fields to save:</p>
            <div className="flex flex-wrap gap-1.5">
              {definitions.map((d) => (
                <Badge key={d.id} variant="secondary" className="text-xs">
                  {d.name} <span className="text-muted-foreground ml-1">({d.type})</span>
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={!name.trim() || createTemplate.isPending}
            >
              {createTemplate.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Save Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
