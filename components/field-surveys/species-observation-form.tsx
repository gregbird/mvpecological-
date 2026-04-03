'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2, AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  PROTECTED_SPECIES,
  SpeciesIdSection,
  EvidenceSection,
  LocationSection,
  ProtectionSection,
  PhotosSection,
} from './observation-form-sections'

export interface SpeciesObservation {
  id: string
  surveyId: string
  speciesNameScientific: string
  speciesNameCommon?: string
  taxonGroup: TaxonGroup
  count?: number
  abundanceDafor?: DaforAbundance
  evidenceType: EvidenceType
  behaviorNotes?: string
  location?: { lat: number; lng: number }
  gpsAccuracy?: number
  photos?: string[]
  isProtected: boolean
  designation?: string
  confidenceLevel: ConfidenceLevel
  needsVerification: boolean
  verifiedBy?: string
  createdAt: string
}

export type TaxonGroup =
  | 'mammal'
  | 'bird'
  | 'reptile'
  | 'amphibian'
  | 'fish'
  | 'invertebrate'
  | 'plant'
  | 'fungi'
  | 'other'

export type DaforAbundance = 'D' | 'A' | 'F' | 'O' | 'R'

export type EvidenceType =
  | 'visual'
  | 'audio'
  | 'tracks'
  | 'droppings'
  | 'feeding_signs'
  | 'nest_burrow'
  | 'dead_specimen'
  | 'dna_sample'
  | 'camera_trap'
  | 'other'

export type ConfidenceLevel = 'high' | 'medium' | 'low'

const observationFormSchema = z.object({
  speciesNameScientific: z.string().min(1, 'Scientific name is required'),
  speciesNameCommon: z.string().optional(),
  taxonGroup: z.enum([
    'mammal',
    'bird',
    'reptile',
    'amphibian',
    'fish',
    'invertebrate',
    'plant',
    'fungi',
    'other',
  ]),
  count: z.string().optional(),
  abundanceDafor: z.enum(['D', 'A', 'F', 'O', 'R']).optional(),
  evidenceType: z.enum([
    'visual',
    'audio',
    'tracks',
    'droppings',
    'feeding_signs',
    'nest_burrow',
    'dead_specimen',
    'dna_sample',
    'camera_trap',
    'other',
  ]),
  behaviorNotes: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  gpsAccuracy: z.string().optional(),
  isProtected: z.boolean(),
  designation: z.string().optional(),
  confidenceLevel: z.enum(['high', 'medium', 'low']),
  needsVerification: z.boolean(),
  notes: z.string().optional(),
})

type ObservationFormValues = z.infer<typeof observationFormSchema>

interface SpeciesObservationFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Partial<SpeciesObservation>) => Promise<void>
  initialData?: Partial<SpeciesObservation>
  surveyId: string
  projectId?: string
}

export function SpeciesObservationForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  surveyId,
  projectId,
}: SpeciesObservationFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isGettingLocation, setIsGettingLocation] = React.useState(false)
  const [photos, setPhotos] = React.useState<string[]>(initialData?.photos || [])
  const [isProtectedSpecies, setIsProtectedSpecies] = React.useState(
    initialData?.isProtected || false
  )

  const form = useForm<ObservationFormValues>({
    resolver: zodResolver(observationFormSchema),
    defaultValues: {
      speciesNameScientific: initialData?.speciesNameScientific || '',
      speciesNameCommon: initialData?.speciesNameCommon || '',
      taxonGroup: initialData?.taxonGroup || 'mammal',
      count: initialData?.count?.toString() || '',
      abundanceDafor: initialData?.abundanceDafor,
      evidenceType: initialData?.evidenceType || 'visual',
      behaviorNotes: initialData?.behaviorNotes || '',
      latitude: initialData?.location?.lat?.toString() || '',
      longitude: initialData?.location?.lng?.toString() || '',
      gpsAccuracy: initialData?.gpsAccuracy?.toString() || '',
      isProtected: initialData?.isProtected || false,
      designation: initialData?.designation || '',
      confidenceLevel: initialData?.confidenceLevel || 'high',
      needsVerification: initialData?.needsVerification || false,
      notes: '',
    },
  })

  // Reset form when dialog opens with new data
  React.useEffect(() => {
    if (open) {
      form.reset({
        speciesNameScientific: initialData?.speciesNameScientific || '',
        speciesNameCommon: initialData?.speciesNameCommon || '',
        taxonGroup: initialData?.taxonGroup || 'mammal',
        count: initialData?.count?.toString() || '',
        abundanceDafor: initialData?.abundanceDafor,
        evidenceType: initialData?.evidenceType || 'visual',
        behaviorNotes: initialData?.behaviorNotes || '',
        latitude: initialData?.location?.lat?.toString() || '',
        longitude: initialData?.location?.lng?.toString() || '',
        gpsAccuracy: initialData?.gpsAccuracy?.toString() || '',
        isProtected: initialData?.isProtected || false,
        designation: initialData?.designation || '',
        confidenceLevel: initialData?.confidenceLevel || 'high',
        needsVerification: initialData?.needsVerification || false,
        notes: '',
      })
      setPhotos(initialData?.photos || [])
      setIsProtectedSpecies(initialData?.isProtected || false)
    }
  }, [open, initialData, form])

  // Check if species is protected when scientific name changes
  const scientificName = form.watch('speciesNameScientific')
  React.useEffect(() => {
    const isProtected = PROTECTED_SPECIES.some(
      (species) => species.toLowerCase() === scientificName.toLowerCase()
    )
    setIsProtectedSpecies(isProtected)
    if (isProtected) {
      form.setValue('isProtected', true)
    }
  }, [scientificName, form])

  const handleGetLocation = async () => {
    if (!navigator.geolocation) return

    setIsGettingLocation(true)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        form.setValue('latitude', position.coords.latitude.toFixed(6))
        form.setValue('longitude', position.coords.longitude.toFixed(6))
        if (position.coords.accuracy) {
          form.setValue('gpsAccuracy', position.coords.accuracy.toFixed(1))
        }
        setIsGettingLocation(false)
      },
      (error) => {
        console.error('Error getting location:', error)
        setIsGettingLocation(false)
      },
      { enableHighAccuracy: true }
    )
  }

  const handleSubmit = async (values: ObservationFormValues) => {
    setIsSubmitting(true)
    try {
      await onSubmit({
        id: initialData?.id,
        surveyId,
        speciesNameScientific: values.speciesNameScientific,
        speciesNameCommon: values.speciesNameCommon || undefined,
        taxonGroup: values.taxonGroup,
        count: values.count ? parseInt(values.count) : undefined,
        abundanceDafor: values.abundanceDafor,
        evidenceType: values.evidenceType,
        behaviorNotes: values.behaviorNotes || undefined,
        location:
          values.latitude && values.longitude
            ? { lat: parseFloat(values.latitude), lng: parseFloat(values.longitude) }
            : undefined,
        gpsAccuracy: values.gpsAccuracy ? parseFloat(values.gpsAccuracy) : undefined,
        isProtected: values.isProtected,
        designation: values.designation || undefined,
        confidenceLevel: values.confidenceLevel,
        needsVerification: values.needsVerification,
        photos: photos.length > 0 ? photos : undefined,
      })

      onOpenChange(false)
      form.reset()
      setPhotos([])
    } catch (error) {
      console.error('Error submitting observation:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData?.id ? 'Edit Observation' : 'Record Species Observation'}
          </DialogTitle>
          <DialogDescription>
            {initialData?.id
              ? 'Update the observation details below.'
              : 'Enter the details of the species observation.'}
          </DialogDescription>
        </DialogHeader>

        {isProtectedSpecies && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This species is protected under Irish/EU wildlife legislation. Ensure all observations
              are recorded accurately for regulatory purposes.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <SpeciesIdSection form={form} />
            <EvidenceSection form={form} />
            <LocationSection
              form={form}
              isGettingLocation={isGettingLocation}
              onGetLocation={handleGetLocation}
            />
            <ProtectionSection form={form} />

            {projectId && (
              <PhotosSection
                projectId={projectId}
                entityId={initialData?.id}
                photos={photos}
                onPhotosChange={setPhotos}
                disabled={isSubmitting}
              />
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initialData?.id ? 'Update Observation' : 'Save Observation'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
