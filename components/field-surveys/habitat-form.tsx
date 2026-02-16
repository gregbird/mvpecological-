'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2, Search, ImageIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { PhotoUpload } from '@/components/ui/photo-upload'
import { FOSSITT_HABITATS, getHabitatByCode, type FossittHabitat } from '@/lib/data/fossitt-codes'

export interface HabitatPolygon {
  id: string
  projectId: string
  surveyId?: string
  fossittCode: string
  fossittName: string
  boundary?: GeoJSON.Polygon
  areaHectares?: number
  condition: HabitatCondition
  notes?: string
  photos?: string[]
  euAnnexCode?: string
  evaluation?: HabitatEvaluation
  threats?: string
  surveyMethod?: string
  listedSpecies?: string
  createdAt: string
}

export type HabitatEvaluation = 'low_local' | 'high_local' | 'county' | 'national' | 'international'

export type HabitatCondition = 'excellent' | 'good' | 'moderate' | 'poor' | 'bad'

const EVALUATION_OPTIONS: { value: HabitatEvaluation; label: string }[] = [
  { value: 'low_local', label: 'Low Local' },
  { value: 'high_local', label: 'High Local' },
  { value: 'county', label: 'County' },
  { value: 'national', label: 'National' },
  { value: 'international', label: 'International' },
]

const habitatFormSchema = z.object({
  fossittCode: z.string().min(1, 'Fossitt code is required'),
  condition: z.enum(['excellent', 'good', 'moderate', 'poor', 'bad']),
  areaHectares: z.string().optional(),
  notes: z.string().optional(),
  euAnnexCode: z.string().optional(),
  evaluation: z.enum(['low_local', 'high_local', 'county', 'national', 'international']).optional(),
  threats: z.string().optional(),
  surveyMethod: z.string().optional(),
  listedSpecies: z.string().optional(),
})

type HabitatFormValues = z.infer<typeof habitatFormSchema>

interface HabitatFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Partial<HabitatPolygon>) => Promise<void>
  initialData?: Partial<HabitatPolygon>
  projectId: string
  surveyId?: string
}

const CONDITION_OPTIONS: { value: HabitatCondition; label: string; description: string }[] = [
  {
    value: 'excellent',
    label: 'Excellent',
    description: 'Near-natural condition, high species diversity, minimal disturbance',
  },
  {
    value: 'good',
    label: 'Good',
    description: 'Good condition with minor impacts, typical species present',
  },
  {
    value: 'moderate',
    label: 'Moderate',
    description: 'Some degradation, reduced species diversity or structure',
  },
  {
    value: 'poor',
    label: 'Poor',
    description: 'Significant degradation, loss of characteristic species',
  },
  {
    value: 'bad',
    label: 'Bad',
    description: 'Severely degraded, may require restoration',
  },
]

export function HabitatForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  projectId,
  surveyId,
}: HabitatFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [codeSearchOpen, setCodeSearchOpen] = React.useState(false)
  const [photos, setPhotos] = React.useState<string[]>(initialData?.photos || [])
  const [selectedHabitat, setSelectedHabitat] = React.useState<FossittHabitat | null>(
    initialData?.fossittCode ? getHabitatByCode(initialData.fossittCode) || null : null
  )

  const form = useForm<HabitatFormValues>({
    resolver: zodResolver(habitatFormSchema),
    defaultValues: {
      fossittCode: initialData?.fossittCode || '',
      condition: initialData?.condition || 'good',
      areaHectares: initialData?.areaHectares?.toString() || '',
      notes: initialData?.notes || '',
      euAnnexCode: initialData?.euAnnexCode || '',
      evaluation: initialData?.evaluation,
      threats: initialData?.threats || '',
      surveyMethod: initialData?.surveyMethod || '',
      listedSpecies: initialData?.listedSpecies || '',
    },
  })

  const handleSelectHabitat = (habitat: FossittHabitat) => {
    setSelectedHabitat(habitat)
    form.setValue('fossittCode', habitat.code)
    setCodeSearchOpen(false)
  }

  const handleSubmit = async (values: HabitatFormValues) => {
    setIsSubmitting(true)
    try {
      const habitat = getHabitatByCode(values.fossittCode)

      await onSubmit({
        id: initialData?.id,
        projectId,
        surveyId,
        fossittCode: values.fossittCode,
        fossittName: habitat?.name || values.fossittCode,
        condition: values.condition,
        areaHectares: values.areaHectares ? parseFloat(values.areaHectares) : undefined,
        notes: values.notes || undefined,
        euAnnexCode: values.euAnnexCode || undefined,
        evaluation: values.evaluation,
        threats: values.threats || undefined,
        surveyMethod: values.surveyMethod || undefined,
        listedSpecies: values.listedSpecies || undefined,
        photos: photos.length > 0 ? photos : undefined,
      })

      onOpenChange(false)
      form.reset()
      setSelectedHabitat(null)
    } catch (error) {
      console.error('Error submitting habitat:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Group habitats by level 1 category
  const groupedHabitats = React.useMemo(() => {
    const level1Habitats = FOSSITT_HABITATS.filter((h) => h.level === 1)
    return level1Habitats.map((l1) => ({
      category: l1,
      habitats: FOSSITT_HABITATS.filter((h) => h.level === 3 && h.code.startsWith(l1.code)),
    }))
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData?.id ? 'Edit Habitat' : 'Record Habitat Polygon'}</DialogTitle>
          <DialogDescription>
            {initialData?.id
              ? 'Update the habitat classification details.'
              : 'Enter the Fossitt habitat code and condition assessment.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Fossitt Code Selection */}
            <FormField
              control={form.control}
              name="fossittCode"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fossitt Habitat Code *</FormLabel>
                  <Popover open={codeSearchOpen} onOpenChange={setCodeSearchOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn('justify-between', !field.value && 'text-muted-foreground')}
                        >
                          {selectedHabitat ? (
                            <div className="flex items-center gap-2">
                              <span
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: selectedHabitat.color }}
                              />
                              <span className="font-mono">{selectedHabitat.code}</span>
                              <span className="text-muted-foreground">-</span>
                              <span className="truncate">{selectedHabitat.name}</span>
                            </div>
                          ) : (
                            'Select habitat code...'
                          )}
                          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-125 p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search by code or name..." />
                        <CommandList>
                          <CommandEmpty>No habitat found.</CommandEmpty>
                          <ScrollArea className="h-75">
                            {groupedHabitats.map((group) => (
                              <CommandGroup
                                key={group.category.code}
                                heading={
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="h-2 w-2 rounded-full"
                                      style={{ backgroundColor: group.category.color }}
                                    />
                                    {group.category.name}
                                  </div>
                                }
                              >
                                {group.habitats.map((habitat) => (
                                  <CommandItem
                                    key={habitat.code}
                                    value={`${habitat.code} ${habitat.name}`}
                                    onSelect={() => handleSelectHabitat(habitat)}
                                  >
                                    <div className="flex w-full items-center gap-2">
                                      <span
                                        className="h-2 w-2 shrink-0 rounded-full"
                                        style={{ backgroundColor: habitat.color }}
                                      />
                                      <span className="w-10 shrink-0 font-mono text-sm">
                                        {habitat.code}
                                      </span>
                                      <span className="truncate">{habitat.name}</span>
                                      {habitat.annex1 && (
                                        <Badge
                                          variant="secondary"
                                          className="ml-auto shrink-0 text-xs"
                                        >
                                          Annex I
                                        </Badge>
                                      )}
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            ))}
                          </ScrollArea>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Select the appropriate Fossitt habitat code from the classification.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Show selected habitat details */}
            {selectedHabitat && (
              <div className="bg-muted/30 rounded-lg border p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="mt-0.5 h-4 w-4 shrink-0 rounded"
                    style={{ backgroundColor: selectedHabitat.color }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium">{selectedHabitat.code}</span>
                      <span className="font-medium">{selectedHabitat.name}</span>
                    </div>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Level {selectedHabitat.level} habitat
                      {selectedHabitat.parent && ` (Parent: ${selectedHabitat.parent})`}
                    </p>
                    {selectedHabitat.annex1 && (
                      <div className="mt-2">
                        <Badge variant="secondary">
                          EU Habitats Directive Annex I: {selectedHabitat.annex1}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Condition Assessment */}
            <FormField
              control={form.control}
              name="condition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Habitat Condition *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CONDITION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex flex-col">
                            <span>{option.label}</span>
                            <span className="text-muted-foreground text-xs">
                              {option.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Assess the ecological condition of the habitat polygon.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Area */}
            <FormField
              control={form.control}
              name="areaHectares"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Area (hectares)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="e.g., 2.5" {...field} />
                  </FormControl>
                  <FormDescription>
                    If drawn on map, area will be calculated automatically.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about the habitat (species composition, management, threats, etc.)..."
                      className="min-h-25"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* EU Annex Code */}
            <FormField
              control={form.control}
              name="euAnnexCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>EU Annex I Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        selectedHabitat?.annex1
                          ? `Suggested: ${selectedHabitat.annex1}`
                          : 'e.g., 91A0 Old sessile oak woods'
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    EU Habitats Directive Annex I habitat code, if applicable.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Evaluation */}
            <FormField
              control={form.control}
              name="evaluation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ecological Evaluation</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select evaluation level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EVALUATION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Ecological importance/value of this habitat.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Survey Method */}
            <FormField
              control={form.control}
              name="surveyMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Survey Method</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Smith et al. (2011) Level 3" {...field} />
                  </FormControl>
                  <FormDescription>
                    Survey methodology reference used for this habitat.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Threats */}
            <FormField
              control={form.control}
              name="threats"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Threats</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Overgrazing, invasive species encroachment, drainage..."
                      className="min-h-20"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Current or potential threats to this habitat.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Listed Species */}
            <FormField
              control={form.control}
              name="listedSpecies"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Listed Species</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Lutra lutra (Otter), Rhinolophus hipposideros (Lesser Horseshoe Bat)..."
                      className="min-h-20"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Protected or notable species associated with this habitat.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Photos */}
            <div className="space-y-2">
              <FormLabel className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Photos (Optional)
              </FormLabel>
              <PhotoUpload
                projectId={projectId}
                entityType="habitat"
                entityId={initialData?.id}
                photos={photos}
                onPhotosChange={setPhotos}
                maxPhotos={10}
                disabled={isSubmitting}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initialData?.id ? 'Update Habitat' : 'Save Habitat'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
