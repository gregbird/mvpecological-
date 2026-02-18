'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useUpdateTargetNote } from '@/hooks/queries/use-target-note-hooks'
import type { TargetNote } from '@/types/database'

const CATEGORIES = [
  { value: 'access_point', label: 'Access Point' },
  { value: 'check_feature', label: 'Check Feature' },
  { value: 'habitat', label: 'Habitat' },
  { value: 'fauna', label: 'Fauna' },
  { value: 'flora', label: 'Flora' },
  { value: 'management', label: 'Management' },
  { value: 'damage', label: 'Damage' },
  { value: 'ownership', label: 'Ownership' },
] as const

const schema = z.object({
  category: z.string(),
  description: z.string().nullable(),
  priority: z.string().nullable(),
})

type FormValues = z.infer<typeof schema>

interface TargetNoteEditDialogProps {
  targetNote: TargetNote | null
  onOpenChange: (open: boolean) => void
}

export function TargetNoteEditDialog({ targetNote, onOpenChange }: TargetNoteEditDialogProps) {
  const { toast } = useToast()
  const updateNote = useUpdateTargetNote()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'other', description: null, priority: null },
  })

  useEffect(() => {
    if (targetNote) {
      form.reset({
        category: targetNote.category,
        description: targetNote.description ?? null,
        priority: targetNote.priority ?? null,
      })
    }
  }, [targetNote, form])

  const onSubmit = async (values: FormValues) => {
    if (!targetNote) return
    try {
      await updateNote.mutateAsync({
        noteId: targetNote.id,
        updates: {
          category: values.category,
          description: values.description,
          priority: values.priority,
        },
      })
      toast({ title: 'Target note updated' })
      onOpenChange(false)
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update target note.',
      })
    }
  }

  return (
    <Dialog open={!!targetNote} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Target Note</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      rows={4}
                      placeholder="Describe the observation..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(v) => field.onChange(v || null)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateNote.isPending}>
                {updateNote.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
