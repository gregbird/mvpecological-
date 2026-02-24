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
import { useUpsertReportTemplate } from '@/hooks/queries/use-template-management-hooks'
import {
  REPORT_TYPES,
  DEFAULT_SECTIONS_BY_TYPE,
  OTHER_DEFAULT_SECTIONS,
} from '@/lib/config/template-types'
import { sectionsToJson } from '@/lib/supabase/queries/templates'

const newTemplateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  baseType: z.string().min(1, 'Please select a base template'),
})

type NewTemplateFormData = z.infer<typeof newTemplateSchema>

interface NewReportTemplateDialogProps {
  organizationId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewReportTemplateDialog({
  organizationId,
  open,
  onOpenChange,
}: NewReportTemplateDialogProps) {
  const { toast } = useToast()
  const upsertMutation = useUpsertReportTemplate(organizationId)

  const form = useForm<NewTemplateFormData>({
    resolver: zodResolver(newTemplateSchema),
    defaultValues: {
      name: '',
      description: '',
      baseType: 'blank',
    },
  })

  const onSubmit = async (data: NewTemplateFormData) => {
    const customId = `custom_${crypto.randomUUID().slice(0, 8)}`

    // Get sections from base template or create blank sections
    const baseSections =
      data.baseType === 'blank'
        ? OTHER_DEFAULT_SECTIONS
        : (DEFAULT_SECTIONS_BY_TYPE[data.baseType] ?? OTHER_DEFAULT_SECTIONS)

    const sections = baseSections.map((s) => ({
      id: s.id,
      title: s.title,
      template: s.defaultTemplate,
    }))

    try {
      await upsertMutation.mutateAsync({
        organization_id: organizationId,
        report_type: customId,
        name: data.name,
        description: data.description || null,
        use_custom: true,
        sections: sectionsToJson(sections),
        is_active: true,
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
          <DialogTitle>Create New Report Template</DialogTitle>
          <DialogDescription>
            Create a custom report template for your organization
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
                    <Input placeholder="e.g., Invasive Species Report" {...field} />
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
                    <Input placeholder="Brief description of this report type" {...field} />
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
                      {REPORT_TYPES.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          Copy from: {type.name}
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
