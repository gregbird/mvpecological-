'use client'

import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { useUpdateFinding } from '@/hooks/queries/use-finding-hooks'
import type { DeskResearchFinding } from '@/types/database'

const DATA_TYPES = [
  { value: 'designated_site', label: 'Designated Site' },
  { value: 'species_record', label: 'Species Record' },
  { value: 'water_quality', label: 'Water Quality' },
  { value: 'catchment', label: 'Catchment' },
  { value: 'other', label: 'Other' },
] as const

const SOURCES = [
  { value: 'npws', label: 'NPWS' },
  { value: 'gbif', label: 'GBIF' },
  { value: 'nbdc', label: 'NBDC' },
  { value: 'epa', label: 'EPA' },
  { value: 'catchments', label: 'Catchments' },
  { value: 'manual', label: 'Manual' },
] as const

const SOURCE_TYPE_MAP: Record<string, string[]> = {
  npws: ['designated_site', 'other'],
  gbif: ['species_record', 'other'],
  nbdc: ['species_record', 'other'],
  epa: ['water_quality', 'catchment', 'other'],
  catchments: ['catchment', 'other'],
  manual: ['designated_site', 'species_record', 'water_quality', 'catchment', 'other'],
}

const SOURCE_DEFAULT_TYPE: Record<string, string> = {
  npws: 'designated_site',
  gbif: 'species_record',
  nbdc: 'species_record',
  epa: 'water_quality',
  catchments: 'catchment',
  manual: 'other',
}

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  source: z.enum(['npws', 'gbif', 'nbdc', 'epa', 'catchments', 'manual', 'company_reports']),
  data_type: z.enum([
    'designated_site',
    'species_record',
    'water_quality',
    'catchment',
    'company_report',
    'other',
  ]),
  relevance_level: z.string().nullable(),
  notes: z.string().nullable(),
})

type FormValues = z.infer<typeof schema>

interface FindingEditDialogProps {
  finding: DeskResearchFinding | null
  onOpenChange: (open: boolean) => void
}

export function FindingEditDialog({ finding, onOpenChange }: FindingEditDialogProps) {
  const { toast } = useToast()
  const updateFinding = useUpdateFinding()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      source: 'manual',
      data_type: 'other',
      relevance_level: null,
      notes: null,
    },
  })

  const watchedSource = form.watch('source')

  const availableTypes = useMemo(
    () => DATA_TYPES.filter((t) => (SOURCE_TYPE_MAP[watchedSource] ?? []).includes(t.value)),
    [watchedSource]
  )

  useEffect(() => {
    if (finding) {
      form.reset({
        title: finding.title,
        source: finding.source,
        data_type: finding.data_type,
        relevance_level: finding.relevance_level ?? null,
        notes: finding.notes ?? null,
      })
    }
  }, [finding, form])

  // When source changes, auto-set type to the default for that source if current type is not valid
  useEffect(() => {
    const allowed = SOURCE_TYPE_MAP[watchedSource] ?? []
    const currentType = form.getValues('data_type')
    if (!allowed.includes(currentType)) {
      form.setValue('data_type', SOURCE_DEFAULT_TYPE[watchedSource] as FormValues['data_type'])
    }
  }, [watchedSource, form])

  const onSubmit = async (values: FormValues) => {
    if (!finding) return
    try {
      await updateFinding.mutateAsync({
        findingId: finding.id,
        updates: {
          title: values.title,
          source: values.source,
          data_type: values.data_type,
          relevance_level: values.relevance_level,
          notes: values.notes,
        },
      })
      toast({ title: 'Finding updated' })
      onOpenChange(false)
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update finding.' })
    }
  }

  return (
    <Dialog open={!!finding} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Finding</DialogTitle>
        </DialogHeader>

        {/* Read-only info */}
        {finding && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {finding.distance_from_boundary_km != null && (
                <span className="text-muted-foreground">
                  Distance: {finding.distance_from_boundary_km.toFixed(2)} km
                </span>
              )}
              {finding.is_protected && (
                <Badge variant="destructive" className="text-xs">
                  Protected
                </Badge>
              )}
            </div>
            <Separator />
          </>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Finding title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SOURCES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
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
              name="data_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
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
              name="relevance_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relevance</FormLabel>
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(v) => field.onChange(v || null)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select relevance" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
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
                      placeholder="Ecologist notes about this finding..."
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
              <Button type="submit" disabled={updateFinding.isPending}>
                {updateFinding.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
