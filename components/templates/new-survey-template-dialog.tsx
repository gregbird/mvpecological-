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
import { useToast } from '@/hooks/use-toast'
import { useUpsertSurveyTemplate } from '@/hooks/queries/use-template-management-hooks'
import {
  FIELD_SURVEY_TYPES,
  getDefaultFieldsForType,
  templateFieldsToJson,
} from '@/lib/config/survey-field-definitions'

const newSurveyTemplateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  baseType: z.string().min(1, 'Please select a base template'),
})

type NewSurveyTemplateFormData = z.infer<typeof newSurveyTemplateSchema>

interface NewSurveyTemplateDialogProps {
  organizationId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewSurveyTemplateDialog({
  organizationId,
  open,
  onOpenChange,
}: NewSurveyTemplateDialogProps) {
  const { toast } = useToast()
  const upsertMutation = useUpsertSurveyTemplate(organizationId)

  const form = useForm<NewSurveyTemplateFormData>({
    resolver: zodResolver(newSurveyTemplateSchema),
    defaultValues: {
      name: '',
      description: '',
      baseType: 'blank',
    },
  })

  const onSubmit = async (data: NewSurveyTemplateFormData) => {
    const customId = `custom_${crypto.randomUUID().slice(0, 8)}`

    const baseFields =
      data.baseType === 'blank'
        ? getDefaultFieldsForType('other')
        : getDefaultFieldsForType(data.baseType)

    try {
      await upsertMutation.mutateAsync({
        organization_id: organizationId,
        survey_type: customId,
        name: data.name,
        description: data.description || null,
        is_active: true,
        default_fields: baseFields ? templateFieldsToJson(baseFields) : {},
      })
      toast({ title: 'Template created', description: `${data.name} has been created` })
      form.reset()
      onOpenChange(false)
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create template' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Survey Template</DialogTitle>
          <DialogDescription>
            Create a custom survey template for your organization
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Hedgerow Assessment" {...field} />
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
                    <Input placeholder="Brief description of this survey type" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="baseType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base Template</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a base template" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="blank">Start from scratch</SelectItem>
                      {FIELD_SURVEY_TYPES.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          Copy from: {type.label}
                        </SelectItem>
                      ))}
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
              <Button
                type="submit"
                disabled={upsertMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {upsertMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Template
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
