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
import { useUpdateSurvey } from '@/hooks/queries/use-survey-hooks'
import type { Survey } from '@/types/database'

const schema = z.object({
  notes: z.string().nullable(),
  status: z.enum(['planned', 'in_progress', 'completed', 'approved']),
})

type FormValues = z.infer<typeof schema>

interface SurveyEditDialogProps {
  survey: Survey | null
  onOpenChange: (open: boolean) => void
}

export function SurveyEditDialog({ survey, onOpenChange }: SurveyEditDialogProps) {
  const { toast } = useToast()
  const updateSurvey = useUpdateSurvey()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { notes: null, status: 'planned' },
  })

  useEffect(() => {
    if (survey) {
      form.reset({
        notes: survey.notes ?? null,
        status: survey.status,
      })
    }
  }, [survey, form])

  const onSubmit = async (values: FormValues) => {
    if (!survey) return
    try {
      await updateSurvey.mutateAsync({
        surveyId: survey.id,
        updates: {
          notes: values.notes,
          status: values.status,
        },
      })
      toast({ title: 'Survey updated' })
      onOpenChange(false)
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update survey.' })
    }
  }

  return (
    <Dialog open={!!survey} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Survey</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      rows={4}
                      placeholder="Add notes..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateSurvey.isPending}>
                {updateSurvey.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
