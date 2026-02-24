'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { useToast } from '@/hooks/use-toast'
import { SURVEY_TYPES } from '@/lib/config/template-types'
import { useUpsertSurveyTemplate } from '@/hooks/queries/use-template-management-hooks'
import type { Database } from '@/types/database'

type SurveyTemplate = Database['public']['Tables']['survey_templates']['Row']

const surveyTemplateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  is_active: z.boolean(),
})

type SurveyTemplateFormData = z.infer<typeof surveyTemplateSchema>

interface SurveyTemplateEditorProps {
  organizationId: string
  surveyTypeId: string
  existingTemplate: SurveyTemplate | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SurveyTemplateEditor({
  organizationId,
  surveyTypeId,
  existingTemplate,
  open,
  onOpenChange,
}: SurveyTemplateEditorProps) {
  const { toast } = useToast()
  const upsertMutation = useUpsertSurveyTemplate(organizationId)
  const surveyType = SURVEY_TYPES.find((s) => s.id === surveyTypeId)

  const form = useForm<SurveyTemplateFormData>({
    resolver: zodResolver(surveyTemplateSchema),
    defaultValues: {
      name: existingTemplate?.name ?? surveyType?.label ?? '',
      description: existingTemplate?.description ?? surveyType?.description ?? '',
      is_active: existingTemplate?.is_active ?? true,
    },
  })

  const onSubmit = async (data: SurveyTemplateFormData) => {
    try {
      await upsertMutation.mutateAsync({
        organization_id: organizationId,
        survey_type: surveyTypeId,
        name: data.name,
        description: data.description || null,
        is_active: data.is_active,
        default_fields: existingTemplate?.default_fields ?? {},
      })
      toast({ title: 'Template saved', description: `${data.name} template has been updated` })
      onOpenChange(false)
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save template' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Survey Template</DialogTitle>
          <DialogDescription>
            Customize the {surveyType?.label} survey template for your organization
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
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
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <FormLabel>Active</FormLabel>
                    <FormDescription>
                      When disabled, this survey type won&apos;t appear in project creation
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={upsertMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {upsertMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Template
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
