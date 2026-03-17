'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { setProjectReportTypes } from '@/lib/supabase/queries/project-report-types'
import { REPORT_TYPES } from '@/lib/config/template-types'

const ASSESSMENT_REPORTS = REPORT_TYPES.filter((r) =>
  ['pea', 'ecia', 'aa_screening', 'aa_stage2', 'nia'].includes(r.id)
)
const TECHNICAL_REPORTS = REPORT_TYPES.filter((r) =>
  ['bat_survey', 'bird_survey', 'habitat_survey', 'protected_species', 'other'].includes(r.id)
)

const quickCreateSchema = z.object({
  name: z.string().min(3, 'Project name must be at least 3 characters'),
  reportTypes: z.array(z.string()).optional(),
  location: z.string().optional(),
})

type QuickCreateFormData = z.infer<typeof quickCreateSchema>

interface QuickCreateProjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  userId: string
}

export function QuickCreateProjectModal({
  open,
  onOpenChange,
  organizationId,
  userId,
}: QuickCreateProjectModalProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = React.useState(false)

  const form = useForm<QuickCreateFormData>({
    resolver: zodResolver(quickCreateSchema),
    defaultValues: {
      name: '',
      reportTypes: [],
      location: '',
    },
  })

  const generateSiteCode = (name: string) => {
    const initials = name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 3)
    const year = new Date().getFullYear()
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')
    return `${initials}-${year}-${random}`
  }

  const onSubmit = async (data: QuickCreateFormData) => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const siteCode = generateSiteCode(data.name)
      const selectedTypes = data.reportTypes ?? []

      // Create project (survey_type = first selected type for backward compat)
      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          name: data.name,
          site_code: siteCode,
          survey_type: selectedTypes[0] || null,
          county: data.location || null,
          organization_id: organizationId,
          created_by: userId,
          status: 'active',
        })
        .select()
        .single()

      if (error) throw error

      // Insert into project_report_types junction table
      if (selectedTypes.length > 0) {
        await setProjectReportTypes(project.id, selectedTypes)
      }

      onOpenChange(false)
      form.reset()
      router.push(`/projects/${project.id}`)
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      toast({
        variant: 'destructive',
        title: 'Failed to create project',
        description: errorObj?.message || 'Please try again later.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle className="text-xl font-bold">Quick Create Project</DialogTitle>
        <DialogDescription className="text-sm text-gray-500">
          Create a new project with minimal details. You can fill in the rest later.
        </DialogDescription>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-2 space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Ballymore Wind Farm"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reportTypes"
              render={() => (
                <FormItem>
                  <FormLabel>Report Types</FormLabel>
                  <p className="text-muted-foreground text-xs">
                    Select one or more. You can add more later.
                  </p>
                  <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1">
                    {[...ASSESSMENT_REPORTS, ...TECHNICAL_REPORTS].map((type) => (
                      <FormField
                        key={type.id}
                        control={form.control}
                        name="reportTypes"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(type.id)}
                                onCheckedChange={(checked) => {
                                  const current = field.value ?? []
                                  field.onChange(
                                    checked
                                      ? [...current, type.id]
                                      : current.filter((v) => v !== type.id)
                                  )
                                }}
                                disabled={isLoading}
                              />
                            </FormControl>
                            <span className="text-xs leading-tight">{type.name}</span>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Co. Kerry" disabled={isLoading} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Project
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
