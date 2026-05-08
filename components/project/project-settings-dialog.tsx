'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { useUpdateProject } from '@/hooks/queries/use-project-hooks'
import {
  useProjectReportTypes,
  useSetProjectReportTypes,
} from '@/hooks/queries/use-project-report-types'
import { REPORT_TYPES } from '@/lib/config/template-types'
import type { Project, ProjectStatus, HealthStatus } from '@/types/database'

const ASSESSMENT_REPORTS = REPORT_TYPES.filter((r) =>
  ['pea', 'ecia', 'aa_screening', 'aa_stage2', 'nia'].includes(r.id)
)
const TECHNICAL_REPORTS = REPORT_TYPES.filter((r) =>
  ['bat_survey', 'bird_survey', 'habitat_survey', 'protected_species', 'other'].includes(r.id)
)

const PROJECT_STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
]

const HEALTH_STATUS_OPTIONS: { value: HealthStatus; label: string }[] = [
  { value: 'on_track', label: 'On Track' },
  { value: 'at_risk', label: 'At Risk' },
  { value: 'overdue', label: 'Overdue' },
]

const settingsSchema = z.object({
  siteCode: z.string().optional(),
  reportTypes: z.array(z.string()).optional(),
  clientName: z.string().optional(),
  expectedStartDate: z.string().optional(),
  expectedEndDate: z.string().optional(),
  budgetDays: z.string().optional(),
  status: z.enum(['draft', 'active', 'completed', 'archived']),
  healthStatus: z.enum(['on_track', 'at_risk', 'overdue']),
})

type SettingsFormData = z.infer<typeof settingsSchema>

type ProjectWithClient = Project & {
  client?: { id: string; name: string } | null
}

interface ProjectSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: ProjectWithClient
}

export function ProjectSettingsDialog({ open, onOpenChange, project }: ProjectSettingsDialogProps) {
  const { toast } = useToast()
  const updateProject = useUpdateProject()
  const setReportTypes = useSetProjectReportTypes()
  const { data: currentReportTypes } = useProjectReportTypes(project.id)
  const [existingClients, setExistingClients] = React.useState<string[]>([])

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      siteCode: '',
      reportTypes: [],
      clientName: '',
      expectedStartDate: '',
      expectedEndDate: '',
      budgetDays: '',
      status: 'active',
      healthStatus: 'on_track',
    },
  })

  // Reset form when dialog opens with current project data
  React.useEffect(() => {
    if (!open) return
    form.reset({
      siteCode: project.site_code ?? '',
      reportTypes: currentReportTypes ?? [],
      clientName: project.client?.name ?? '',
      expectedStartDate: project.expected_start_date ?? '',
      expectedEndDate: project.expected_end_date ?? '',
      budgetDays: project.budget_days != null ? String(project.budget_days) : '',
      status: project.status,
      healthStatus: project.health_status,
    })
  }, [open, project, currentReportTypes, form])

  // Fetch existing clients in the org for autocomplete
  React.useEffect(() => {
    if (!open || !project.organization_id) return
    let cancelled = false
    const supabase = createClient()
    void supabase
      .from('clients')
      .select('name')
      .eq('organization_id', project.organization_id)
      .order('name', { ascending: true })
      .then(({ data }) => {
        if (cancelled || !data) return
        setExistingClients(data.map((c) => c.name).filter(Boolean))
      })
    return () => {
      cancelled = true
    }
  }, [open, project.organization_id])

  const onSubmit = async (data: SettingsFormData) => {
    try {
      const supabase = createClient()

      // Resolve client_id from typed name (find-or-create)
      let clientId: string | null = null
      const trimmedClientName = data.clientName?.trim()
      if (trimmedClientName) {
        const { data: existingClient, error: clientLookupError } = await supabase
          .from('clients')
          .select('id')
          .eq('organization_id', project.organization_id)
          .ilike('name', trimmedClientName)
          .maybeSingle()

        if (clientLookupError) throw clientLookupError

        if (existingClient) {
          clientId = existingClient.id
        } else {
          const { data: newClient, error: clientInsertError } = await supabase
            .from('clients')
            .insert({
              name: trimmedClientName,
              organization_id: project.organization_id,
            })
            .select('id')
            .single()

          if (clientInsertError) throw clientInsertError
          clientId = newClient.id
        }
      }

      const types = data.reportTypes ?? []

      await updateProject.mutateAsync({
        projectId: project.id,
        updates: {
          site_code: data.siteCode?.trim() || null,
          client_id: clientId,
          survey_type: types[0] ?? null,
          expected_start_date: data.expectedStartDate || null,
          expected_end_date: data.expectedEndDate || null,
          budget_days: data.budgetDays ? parseInt(data.budgetDays) : null,
          status: data.status,
          health_status: data.healthStatus,
        },
      })

      await setReportTypes.mutateAsync({
        projectId: project.id,
        reportTypes: types,
      })

      toast({
        title: 'Project settings saved',
        description: 'Your changes have been applied.',
      })
      onOpenChange(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Please try again later.'
      toast({
        variant: 'destructive',
        title: 'Failed to save settings',
        description: message,
      })
    }
  }

  const isSubmitting = form.formState.isSubmitting || updateProject.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Project Settings</DialogTitle>
          <DialogDescription>
            Update project metadata, lifecycle status, and assigned report types.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="siteCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Site Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., BWF-2025-001" disabled={isSubmitting} {...field} />
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
                    Add or remove report types as the project scope evolves.
                  </p>
                  <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1">
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
                                disabled={isSubmitting}
                              />
                            </FormControl>
                            <span className="text-sm leading-tight">{type.name}</span>
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
              name="clientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Energia Renewables"
                      list="settings-client-suggestions"
                      autoComplete="off"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <datalist id="settings-client-suggestions">
                    {existingClients.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                  <p className="text-muted-foreground text-xs">
                    Start typing to pick an existing client, or enter a new name to add it.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="expectedStartDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" disabled={isSubmitting} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expectedEndDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected End Date</FormLabel>
                    <FormControl>
                      <Input type="date" disabled={isSubmitting} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="budgetDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget (Days)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g., 20"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <p className="text-muted-foreground text-xs">
                    Estimated total person-days for the project.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROJECT_STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
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
                name="healthStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Health</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {HEALTH_STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
