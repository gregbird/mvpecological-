'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { CalendarIcon, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

import { useRole } from '@/contexts/role-context'
import { createClient } from '@/lib/supabase/client'
import {
  useSurveyTemplateByType,
  useSurveyTemplates,
} from '@/hooks/queries/use-template-management-hooks'
import { getDefaultFieldsForType, parseTemplateFields } from '@/lib/config/survey-field-definitions'
import type { SurveyTemplateFields } from '@/lib/config/survey-field-definitions'
import { TemplateSectionsRenderer } from './survey-template-fields/template-sections-renderer'
import { PhotoUpload } from '@/components/ui/photo-upload'
import type { Survey, SurveyType, WeatherData } from './survey-card'
import type { Profile } from '@/types/database'

type FieldValue = string | number | boolean | string[] | null

const surveyFormSchema = z.object({
  surveyType: z.enum([
    'walkover',
    'habitat_mapping',
    'releve_survey',
    'bat_survey',
    'bird_survey',
    'mammal_survey',
    'aquatic_survey',
    'botanical_survey',
    'invertebrate_survey',
    'biodiversity_net_gain',
    'other',
  ]),
  surveyDate: z.date({ message: 'Survey date is required' }),
  surveyorId: z.string().min(1, 'Surveyor is required'),
  expectedSurveyCount: z.string().optional(),
  notes: z.string().optional(),
})

type SurveyFormValues = z.infer<typeof surveyFormSchema>

interface SurveyFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Partial<Survey>) => Promise<void>
  initialData?: Partial<Survey>
  projectId: string
  organizationId?: string
  /** When adding a visit to an existing group */
  addVisitMode?: {
    visitGroupId: string
    surveyType: SurveyType
    visitNumber: number
  }
}

const SURVEY_TYPES: { value: SurveyType; label: string }[] = [
  { value: 'walkover', label: 'Walkover Survey' },
  { value: 'habitat_mapping', label: 'Habitat Mapping' },
  { value: 'releve_survey', label: 'Relevé Survey' },
  { value: 'bat_survey', label: 'Bat Survey' },
  { value: 'bird_survey', label: 'Bird Survey' },
  { value: 'mammal_survey', label: 'Mammal Survey' },
  { value: 'aquatic_survey', label: 'Aquatic Survey' },
  { value: 'botanical_survey', label: 'Botanical Survey' },
  { value: 'invertebrate_survey', label: 'Invertebrate Survey' },
  { value: 'other', label: 'Other Survey' },
]

export function SurveyForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  projectId,
  organizationId,
  addVisitMode,
}: SurveyFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [teamMembers, setTeamMembers] = React.useState<Profile[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = React.useState(true)
  const [templateFieldValues, setTemplateFieldValues] = React.useState<Record<string, FieldValue>>(
    {}
  )
  const { user } = useRole()
  const [surveyPhotos, setSurveyPhotos] = React.useState<string[]>([])

  // Load existing photos when editing a survey
  React.useEffect(() => {
    if (!open || !initialData?.id) {
      setSurveyPhotos([])
      return
    }
    const supabase = createClient()
    supabase
      .from('photos')
      .select('storage_path')
      .eq('survey_id', initialData.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          const urls = data.map((p) => {
            const { data: urlData } = supabase.storage
              .from('project-photos')
              .getPublicUrl(p.storage_path)
            return urlData.publicUrl
          })
          setSurveyPhotos(urls)
        }
      })
  }, [open, initialData?.id])

  const form = useForm<SurveyFormValues>({
    resolver: zodResolver(surveyFormSchema),
    defaultValues: {
      surveyType: addVisitMode?.surveyType || initialData?.surveyType || 'walkover',
      surveyDate: initialData?.surveyDate ? new Date(initialData.surveyDate) : new Date(),
      surveyorId: initialData?.surveyor?.id || '',
      expectedSurveyCount:
        initialData?.expectedSurveyCount?.toString() ||
        (
          initialData?.weather as Record<string, unknown> | undefined
        )?.expectedSurveyCount?.toString() ||
        '',
      notes: initialData?.notes || '',
    },
  })

  // Reset form when dialog opens with different data (edit vs create)
  React.useEffect(() => {
    if (open) {
      form.reset({
        surveyType: addVisitMode?.surveyType || initialData?.surveyType || 'walkover',
        surveyDate: initialData?.surveyDate ? new Date(initialData.surveyDate) : new Date(),
        surveyorId: initialData?.surveyor?.id || '',
        expectedSurveyCount:
          initialData?.expectedSurveyCount?.toString() ||
          (
            initialData?.weather as Record<string, unknown> | undefined
          )?.expectedSurveyCount?.toString() ||
          '',
        notes: initialData?.notes || '',
      })
    }
  }, [open, initialData, form, addVisitMode])

  const selectedSurveyType = form.watch('surveyType')
  const orgId = organizationId ?? user?.organization_id

  // Fetch all org survey templates to filter inactive types
  const { data: allOrgTemplates } = useSurveyTemplates(orgId ?? undefined)

  // Filter survey types: hide those explicitly set as inactive by the org
  const activeSurveyTypes = React.useMemo(() => {
    if (!allOrgTemplates?.length) return SURVEY_TYPES
    const inactiveTypes = new Set(
      allOrgTemplates.filter((t) => !t.is_active).map((t) => t.survey_type)
    )
    return SURVEY_TYPES.filter((type) => !inactiveTypes.has(type.value))
  }, [allOrgTemplates])

  // Reset survey type if the current selection is no longer active
  React.useEffect(() => {
    if (initialData?.surveyType) return // Don't reset when editing existing survey
    const currentType = form.getValues('surveyType')
    const isCurrentActive = activeSurveyTypes.some((t) => t.value === currentType)
    if (!isCurrentActive) {
      const firstActive = activeSurveyTypes[0]?.value as SurveyFormValues['surveyType'] | undefined
      if (firstActive) {
        form.setValue('surveyType', firstActive)
      } else {
        form.resetField('surveyType', { defaultValue: '' as SurveyFormValues['surveyType'] })
      }
    }
  }, [activeSurveyTypes, form, initialData?.surveyType])

  // Fetch org template for selected survey type
  const { data: orgTemplate } = useSurveyTemplateByType(orgId ?? undefined, selectedSurveyType)

  // Resolve effective template fields
  const effectiveTemplate: SurveyTemplateFields | null = React.useMemo(() => {
    if (selectedSurveyType === 'releve_survey') return null
    // Don't show template fields if the selected type is not in active list
    if (!activeSurveyTypes.some((t) => t.value === selectedSurveyType)) return null
    const saved = orgTemplate?.default_fields
      ? parseTemplateFields(orgTemplate.default_fields)
      : null
    return saved ?? getDefaultFieldsForType(selectedSurveyType)
  }, [orgTemplate, selectedSurveyType, activeSurveyTypes])

  // Initialize template field values from existing survey weather data
  React.useEffect(() => {
    if (initialData?.weather && typeof initialData.weather === 'object') {
      const weather = initialData.weather as Record<string, unknown>
      const saved = (weather.templateFields as Record<string, FieldValue>) ?? {}
      setTemplateFieldValues(saved)
    } else {
      setTemplateFieldValues({})
    }
  }, [initialData?.weather])

  // Reset template field values when survey type changes (only for new surveys)
  React.useEffect(() => {
    if (!initialData?.id) {
      setTemplateFieldValues({})
    }
  }, [selectedSurveyType, initialData?.id])

  // Fetch team members from organization
  React.useEffect(() => {
    async function fetchTeamMembers() {
      setIsLoadingMembers(true)

      try {
        const supabase = createClient()

        let query = supabase.from('profiles').select('*').order('full_name', { ascending: true })

        if (user?.organization_id) {
          query = query.eq('organization_id', user.organization_id)
        }

        const { data: members, error } = await query

        if (error) throw error
        setTeamMembers(members || [])
      } catch (err) {
        console.error('Error fetching team members:', err)
      } finally {
        setIsLoadingMembers(false)
      }
    }

    if (open) {
      fetchTeamMembers()
    }
  }, [open, user?.organization_id])

  const handleTemplateFieldChange = (key: string, value: FieldValue) => {
    setTemplateFieldValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (values: SurveyFormValues) => {
    setIsSubmitting(true)
    try {
      const surveyor = teamMembers.find((s) => s.id === values.surveyorId)

      // Build weather JSONB with template fields
      const weatherData: WeatherData = {
        expectedSurveyCount: values.expectedSurveyCount
          ? parseInt(values.expectedSurveyCount)
          : undefined,
      }

      // Include template field values if any exist
      const hasTemplateValues = Object.values(templateFieldValues).some(
        (v) => v !== null && v !== undefined && v !== ''
      )
      if (hasTemplateValues) {
        weatherData.templateFields = templateFieldValues
      }

      await onSubmit({
        id: initialData?.id,
        surveyType: values.surveyType,
        surveyDate: format(values.surveyDate, 'yyyy-MM-dd'),
        surveyor: surveyor
          ? { id: surveyor.id, name: surveyor.full_name }
          : { id: values.surveyorId, name: 'Unknown' },
        expectedSurveyCount: values.expectedSurveyCount
          ? parseInt(values.expectedSurveyCount)
          : undefined,
        weather: weatherData,
        notes: values.notes || undefined,
        status: initialData?.status || 'planned',
        visitGroupId: addVisitMode?.visitGroupId,
        visitNumber: addVisitMode?.visitNumber,
      })

      onOpenChange(false)
      form.reset()
      setTemplateFieldValues({})
    } catch (error) {
      console.error('Error submitting survey:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {addVisitMode
              ? `Add Visit ${addVisitMode.visitNumber}`
              : initialData?.id
                ? 'Edit Survey'
                : 'Plan New Survey'}
          </DialogTitle>
          <DialogDescription>
            {addVisitMode
              ? `Adding a new visit to this ${SURVEY_TYPES.find((t) => t.value === addVisitMode.surveyType)?.label ?? 'survey'} group.`
              : initialData?.id
                ? 'Update the survey details below.'
                : 'Enter the details for the new field survey.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Survey Type and Date */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="surveyType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Survey Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!!addVisitMode}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeSurveyTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {addVisitMode && (
                      <FormDescription>
                        Survey type is inherited from the visit group.
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="surveyDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Survey Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Surveyor and Expected Survey Count */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="surveyorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Surveyor</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={isLoadingMembers ? 'Loading...' : 'Select surveyor'}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingMembers ? (
                          <SelectItem value="_loading" disabled>
                            Loading team members...
                          </SelectItem>
                        ) : teamMembers.length === 0 ? (
                          <SelectItem value="_none" disabled>
                            No team members found
                          </SelectItem>
                        ) : (
                          teamMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.full_name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {addVisitMode ? (
                <FormItem>
                  <FormLabel>Visit Number</FormLabel>
                  <FormControl>
                    <Input type="number" value={addVisitMode.visitNumber} disabled />
                  </FormControl>
                  <FormDescription>Auto-assigned based on existing visits.</FormDescription>
                </FormItem>
              ) : (
                <FormField
                  control={form.control}
                  name="expectedSurveyCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Surveys Expected</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" placeholder="e.g., 3" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional notes about the survey..."
                      className="min-h-25"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    General observations, access notes, or other relevant information.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Template-driven fields */}
            {effectiveTemplate && (
              <div className="space-y-3 border-t pt-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Survey-Specific Fields
                </p>
                <TemplateSectionsRenderer
                  templateFields={effectiveTemplate}
                  values={templateFieldValues}
                  onChange={handleTemplateFieldChange}
                />
              </div>
            )}

            {/* Photos (only when editing an existing survey) */}
            {initialData?.id && (
              <div className="space-y-2 border-t pt-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Survey Photos
                </p>
                <PhotoUpload
                  projectId={projectId}
                  entityType="survey"
                  entityId={initialData.id}
                  photos={surveyPhotos}
                  onPhotosChange={setSurveyPhotos}
                  maxPhotos={10}
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initialData?.id ? 'Update Survey' : 'Create Survey'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
