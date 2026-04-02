'use client'

import { useEffect } from 'react'
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
import { useToast } from '@/hooks/use-toast'
import { useUpdateHabitat } from '@/hooks/queries/use-habitat-hooks'
import type { HabitatPolygon } from '@/types/database'

const schema = z.object({
  fossitt_code: z.string().min(1, 'Fossitt code is required'),
  fossitt_name: z.string().min(1, 'Habitat name is required'),
  area_hectares: z.number().min(0).nullable(),
  condition: z.string().nullable(),
  survey_method: z.string().nullable(),
  eu_annex_code: z.string().nullable(),
  evaluation: z.string().nullable(),
  threats: z.string().nullable(),
  notes: z.string().nullable(),
})

type FormValues = z.infer<typeof schema>

interface HabitatEditDialogProps {
  habitat: HabitatPolygon | null
  onOpenChange: (open: boolean) => void
  projectId?: string
}

export function HabitatEditDialog({ habitat, onOpenChange, projectId }: HabitatEditDialogProps) {
  const { toast } = useToast()
  const updateHabitat = useUpdateHabitat()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fossitt_code: '',
      fossitt_name: '',
      area_hectares: null,
      condition: null,
      survey_method: null,
      eu_annex_code: null,
      evaluation: null,
      threats: null,
      notes: null,
    },
  })

  useEffect(() => {
    if (habitat) {
      form.reset({
        fossitt_code: habitat.fossitt_code,
        fossitt_name: habitat.fossitt_name,
        area_hectares: habitat.area_hectares ?? null,
        condition: habitat.condition ?? null,
        survey_method: habitat.survey_method ?? null,
        eu_annex_code: habitat.eu_annex_code ?? null,
        evaluation: habitat.evaluation ?? null,
        threats: habitat.threats?.join(', ') ?? null,
        notes: habitat.notes ?? null,
      })
    }
  }, [habitat, form])

  const onSubmit = async (values: FormValues) => {
    if (!habitat) return
    try {
      await updateHabitat.mutateAsync({
        habitatId: habitat.id,
        projectId,
        updates: {
          fossitt_code: values.fossitt_code,
          fossitt_name: values.fossitt_name,
          area_hectares: values.area_hectares,
          condition: values.condition,
          survey_method: values.survey_method,
          eu_annex_code: values.eu_annex_code,
          evaluation: values.evaluation,
          threats: values.threats
            ? values.threats
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
            : null,
          notes: values.notes,
        },
      })
      toast({ title: 'Habitat updated' })
      onOpenChange(false)
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update habitat.' })
    }
  }

  return (
    <Dialog open={!!habitat} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Habitat</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fossitt_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fossitt Code</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. GA1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="area_hectares"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Area (ha)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value ? Number(e.target.value) : null)
                        }
                        placeholder="0.00"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="fossitt_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Habitat Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Improved agricultural grassland" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condition</FormLabel>
                    <Select
                      value={field.value ?? ''}
                      onValueChange={(v) => field.onChange(v || null)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="excellent">Excellent</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="poor">Poor</SelectItem>
                        <SelectItem value="bad">Bad</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="survey_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Survey Method</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        placeholder="e.g. Walkover"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="eu_annex_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>EU Annex I Code</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      placeholder="e.g. 6210"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="evaluation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Evaluation</FormLabel>
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(v) => field.onChange(v || null)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select evaluation" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="international">International</SelectItem>
                      <SelectItem value="national">National</SelectItem>
                      <SelectItem value="county">County</SelectItem>
                      <SelectItem value="high_local">High Local</SelectItem>
                      <SelectItem value="local">Local</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="threats"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Threats</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      placeholder="Comma-separated, e.g. grazing, drainage"
                    />
                  </FormControl>
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
                      rows={2}
                      placeholder="Additional notes..."
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
              <Button type="submit" disabled={updateHabitat.isPending}>
                {updateHabitat.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
