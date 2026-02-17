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
import type { Survey, SurveyType, WeatherData } from './survey-card'
import type { Profile } from '@/types/database'

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
  projectId: _projectId,
}: SurveyFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [teamMembers, setTeamMembers] = React.useState<Profile[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = React.useState(true)
  const { user } = useRole()

  // Fetch team members from organization
  React.useEffect(() => {
    async function fetchTeamMembers() {
      setIsLoadingMembers(true)

      try {
        const supabase = createClient()

        // If user has organization_id, filter by it; otherwise get all profiles
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

  const form = useForm<SurveyFormValues>({
    resolver: zodResolver(surveyFormSchema),
    defaultValues: {
      surveyType: initialData?.surveyType || 'walkover',
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

  const handleSubmit = async (values: SurveyFormValues) => {
    setIsSubmitting(true)
    try {
      const surveyor = teamMembers.find((s) => s.id === values.surveyorId)

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
        weather: {
          expectedSurveyCount: values.expectedSurveyCount
            ? parseInt(values.expectedSurveyCount)
            : undefined,
        } as WeatherData,
        notes: values.notes || undefined,
        status: initialData?.status || 'planned',
      })

      onOpenChange(false)
      form.reset()
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
          <DialogTitle>{initialData?.id ? 'Edit Survey' : 'Plan New Survey'}</DialogTitle>
          <DialogDescription>
            {initialData?.id
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SURVEY_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
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
