'use client'

import { Loader2, MapPin, ImageIcon } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import {
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
import { Checkbox } from '@/components/ui/checkbox'
import { PhotoUpload } from '@/components/ui/photo-upload'
import type {
  TaxonGroup,
  EvidenceType,
  DaforAbundance,
  ConfidenceLevel,
} from './species-observation-form'

// ---- Constants ----

export const TAXON_GROUPS: { value: TaxonGroup; label: string }[] = [
  { value: 'mammal', label: 'Mammals' },
  { value: 'bird', label: 'Birds' },
  { value: 'reptile', label: 'Reptiles' },
  { value: 'amphibian', label: 'Amphibians' },
  { value: 'fish', label: 'Fish' },
  { value: 'invertebrate', label: 'Invertebrates' },
  { value: 'plant', label: 'Plants' },
  { value: 'fungi', label: 'Fungi' },
  { value: 'other', label: 'Other' },
]

export const EVIDENCE_TYPES: { value: EvidenceType; label: string }[] = [
  { value: 'visual', label: 'Visual Sighting' },
  { value: 'audio', label: 'Audio/Call' },
  { value: 'tracks', label: 'Tracks/Footprints' },
  { value: 'droppings', label: 'Droppings/Scat' },
  { value: 'feeding_signs', label: 'Feeding Signs' },
  { value: 'nest_burrow', label: 'Nest/Burrow/Roost' },
  { value: 'dead_specimen', label: 'Dead Specimen' },
  { value: 'dna_sample', label: 'DNA Sample' },
  { value: 'camera_trap', label: 'Camera Trap' },
  { value: 'other', label: 'Other' },
]

export const DAFOR_LABELS: { value: DaforAbundance; label: string; description: string }[] = [
  { value: 'D', label: 'Dominant', description: '>75% cover' },
  { value: 'A', label: 'Abundant', description: '51-75% cover' },
  { value: 'F', label: 'Frequent', description: '26-50% cover' },
  { value: 'O', label: 'Occasional', description: '11-25% cover' },
  { value: 'R', label: 'Rare', description: '<11% cover' },
]

export const CONFIDENCE_LEVELS: { value: ConfidenceLevel; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

export const PROTECTED_SPECIES = [
  'Lutra lutra',
  'Martes martes',
  'Meles meles',
  'Sciurus vulgaris',
  'Erinaceus europaeus',
  'Rhinolophus hipposideros',
  'Plecotus auritus',
  'Pipistrellus pipistrellus',
  'Lacerta vivipara',
  'Bufo bufo',
  'Rana temporaria',
  'Triturus vulgaris',
  'Salmo salar',
  'Lampetra fluviatilis',
  'Margaritifera margaritifera',
]

// ---- Form value type (matches Zod schema in parent) ----

interface ObservationFormValues {
  speciesNameScientific: string
  speciesNameCommon?: string
  taxonGroup: TaxonGroup
  count?: string
  abundanceDafor?: DaforAbundance
  evidenceType: EvidenceType
  behaviorNotes?: string
  latitude?: string
  longitude?: string
  gpsAccuracy?: string
  isProtected: boolean
  designation?: string
  confidenceLevel: ConfidenceLevel
  needsVerification: boolean
  notes?: string
}

// ---- Species Identification Section ----

interface SpeciesIdSectionProps {
  form: UseFormReturn<ObservationFormValues>
}

export function SpeciesIdSection({ form }: SpeciesIdSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Species Identification</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="speciesNameScientific"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Scientific Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Lutra lutra" className="italic" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="speciesNameCommon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Common Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., European Otter" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="taxonGroup"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Taxon Group *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {TAXON_GROUPS.map((group) => (
                    <SelectItem key={group.value} value={group.value}>
                      {group.label}
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
          name="confidenceLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confidence Level *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select confidence" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CONFIDENCE_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}

// ---- Evidence & Abundance Section ----

interface EvidenceSectionProps {
  form: UseFormReturn<ObservationFormValues>
}

export function EvidenceSection({ form }: EvidenceSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Evidence & Abundance</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField
          control={form.control}
          name="evidenceType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Evidence Type *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select evidence" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {EVIDENCE_TYPES.map((type) => (
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
          name="count"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Count</FormLabel>
              <FormControl>
                <Input type="number" min="1" placeholder="e.g., 3" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="abundanceDafor"
          render={({ field }) => (
            <FormItem>
              <FormLabel>DAFOR Abundance</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select abundance" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {DAFOR_LABELS.map((dafor) => (
                    <SelectItem key={dafor.value} value={dafor.value}>
                      {dafor.value} - {dafor.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                For plants: D=Dominant, A=Abundant, F=Frequent, O=Occasional, R=Rare
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="behaviorNotes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Behavior/Activity Notes</FormLabel>
            <FormControl>
              <Textarea
                placeholder="e.g., Foraging along riverbank, territorial call, breeding behavior..."
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

// ---- Location Section ----

interface LocationSectionProps {
  form: UseFormReturn<ObservationFormValues>
  isGettingLocation: boolean
  onGetLocation: () => void
}

export function LocationSection({ form, isGettingLocation, onGetLocation }: LocationSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Location</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onGetLocation}
          disabled={isGettingLocation}
        >
          {isGettingLocation ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="mr-2 h-4 w-4" />
          )}
          Get Current Location
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField
          control={form.control}
          name="latitude"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Latitude</FormLabel>
              <FormControl>
                <Input type="number" step="0.000001" placeholder="e.g., 53.349805" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="longitude"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Longitude</FormLabel>
              <FormControl>
                <Input type="number" step="0.000001" placeholder="e.g., -6.260310" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="gpsAccuracy"
          render={({ field }) => (
            <FormItem>
              <FormLabel>GPS Accuracy (m)</FormLabel>
              <FormControl>
                <Input type="number" step="0.1" placeholder="e.g., 5.0" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}

// ---- Protection Status Section ----

interface ProtectionSectionProps {
  form: UseFormReturn<ObservationFormValues>
}

export function ProtectionSection({ form }: ProtectionSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Protection Status</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="isProtected"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Protected Species</FormLabel>
                <FormDescription>
                  Species protected under Wildlife Act or EU Directives
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="needsVerification"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Needs Verification</FormLabel>
                <FormDescription>Flag for senior ecologist review</FormDescription>
              </div>
            </FormItem>
          )}
        />
      </div>

      {form.watch('isProtected') && (
        <FormField
          control={form.control}
          name="designation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Legal Designation</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Wildlife Act, Habitats Directive Annex II/IV"
                  {...field}
                />
              </FormControl>
              <FormDescription>Relevant legislation protecting this species</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  )
}

// ---- Photos Section ----

interface PhotosSectionProps {
  projectId: string
  entityId?: string
  photos: string[]
  onPhotosChange: (photos: string[]) => void
  disabled: boolean
}

export function PhotosSection({
  projectId,
  entityId,
  photos,
  onPhotosChange,
  disabled,
}: PhotosSectionProps) {
  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <ImageIcon className="h-4 w-4" />
        Photos (Optional)
      </h3>
      <PhotoUpload
        projectId={projectId}
        entityType="observation"
        entityId={entityId}
        photos={photos}
        onPhotosChange={onPhotosChange}
        maxPhotos={10}
        disabled={disabled}
      />
    </div>
  )
}
