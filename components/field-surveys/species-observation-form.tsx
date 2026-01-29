"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, MapPin, Camera, Search, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export interface SpeciesObservation {
  id: string;
  surveyId: string;
  speciesNameScientific: string;
  speciesNameCommon?: string;
  taxonGroup: TaxonGroup;
  count?: number;
  abundanceDafor?: DaforAbundance;
  evidenceType: EvidenceType;
  behaviorNotes?: string;
  location?: { lat: number; lng: number };
  gpsAccuracy?: number;
  photos?: string[];
  isProtected: boolean;
  designation?: string;
  confidenceLevel: ConfidenceLevel;
  needsVerification: boolean;
  verifiedBy?: string;
  createdAt: string;
}

export type TaxonGroup =
  | "mammals"
  | "birds"
  | "reptiles"
  | "amphibians"
  | "fish"
  | "invertebrates"
  | "plants"
  | "fungi"
  | "other";

export type DaforAbundance = "D" | "A" | "F" | "O" | "R";

export type EvidenceType =
  | "visual"
  | "audio"
  | "tracks"
  | "droppings"
  | "feeding_signs"
  | "nest_burrow"
  | "dead_specimen"
  | "dna_sample"
  | "camera_trap"
  | "other";

export type ConfidenceLevel = "certain" | "probable" | "possible";

const observationFormSchema = z.object({
  speciesNameScientific: z.string().min(1, "Scientific name is required"),
  speciesNameCommon: z.string().optional(),
  taxonGroup: z.enum([
    "mammals",
    "birds",
    "reptiles",
    "amphibians",
    "fish",
    "invertebrates",
    "plants",
    "fungi",
    "other",
  ]),
  count: z.string().optional(),
  abundanceDafor: z.enum(["D", "A", "F", "O", "R"]).optional(),
  evidenceType: z.enum([
    "visual",
    "audio",
    "tracks",
    "droppings",
    "feeding_signs",
    "nest_burrow",
    "dead_specimen",
    "dna_sample",
    "camera_trap",
    "other",
  ]),
  behaviorNotes: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  gpsAccuracy: z.string().optional(),
  isProtected: z.boolean(),
  designation: z.string().optional(),
  confidenceLevel: z.enum(["certain", "probable", "possible"]),
  needsVerification: z.boolean(),
  notes: z.string().optional(),
});

type ObservationFormValues = z.infer<typeof observationFormSchema>;

interface SpeciesObservationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<SpeciesObservation>) => Promise<void>;
  initialData?: Partial<SpeciesObservation>;
  surveyId: string;
}

const TAXON_GROUPS: { value: TaxonGroup; label: string }[] = [
  { value: "mammals", label: "Mammals" },
  { value: "birds", label: "Birds" },
  { value: "reptiles", label: "Reptiles" },
  { value: "amphibians", label: "Amphibians" },
  { value: "fish", label: "Fish" },
  { value: "invertebrates", label: "Invertebrates" },
  { value: "plants", label: "Plants" },
  { value: "fungi", label: "Fungi" },
  { value: "other", label: "Other" },
];

const EVIDENCE_TYPES: { value: EvidenceType; label: string }[] = [
  { value: "visual", label: "Visual Sighting" },
  { value: "audio", label: "Audio/Call" },
  { value: "tracks", label: "Tracks/Footprints" },
  { value: "droppings", label: "Droppings/Scat" },
  { value: "feeding_signs", label: "Feeding Signs" },
  { value: "nest_burrow", label: "Nest/Burrow/Roost" },
  { value: "dead_specimen", label: "Dead Specimen" },
  { value: "dna_sample", label: "DNA Sample" },
  { value: "camera_trap", label: "Camera Trap" },
  { value: "other", label: "Other" },
];

const DAFOR_LABELS: { value: DaforAbundance; label: string; description: string }[] = [
  { value: "D", label: "Dominant", description: ">75% cover" },
  { value: "A", label: "Abundant", description: "51-75% cover" },
  { value: "F", label: "Frequent", description: "26-50% cover" },
  { value: "O", label: "Occasional", description: "11-25% cover" },
  { value: "R", label: "Rare", description: "<11% cover" },
];

const CONFIDENCE_LEVELS: { value: ConfidenceLevel; label: string }[] = [
  { value: "certain", label: "Certain" },
  { value: "probable", label: "Probable" },
  { value: "possible", label: "Possible" },
];

// Common protected species in Ireland
const PROTECTED_SPECIES = [
  "Lutra lutra", // Otter
  "Martes martes", // Pine Marten
  "Meles meles", // Badger
  "Sciurus vulgaris", // Red Squirrel
  "Erinaceus europaeus", // Hedgehog
  "Rhinolophus hipposideros", // Lesser Horseshoe Bat
  "Plecotus auritus", // Brown Long-eared Bat
  "Pipistrellus pipistrellus", // Common Pipistrelle
  "Lacerta vivipara", // Common Lizard
  "Bufo bufo", // Common Toad
  "Rana temporaria", // Common Frog
  "Triturus vulgaris", // Smooth Newt
  "Salmo salar", // Atlantic Salmon
  "Lampetra fluviatilis", // River Lamprey
  "Margaritifera margaritifera", // Freshwater Pearl Mussel
];

export function SpeciesObservationForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  surveyId,
}: SpeciesObservationFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isGettingLocation, setIsGettingLocation] = React.useState(false);
  const [isProtectedSpecies, setIsProtectedSpecies] = React.useState(
    initialData?.isProtected || false
  );

  const form = useForm<ObservationFormValues>({
    resolver: zodResolver(observationFormSchema),
    defaultValues: {
      speciesNameScientific: initialData?.speciesNameScientific || "",
      speciesNameCommon: initialData?.speciesNameCommon || "",
      taxonGroup: initialData?.taxonGroup || "mammals",
      count: initialData?.count?.toString() || "",
      abundanceDafor: initialData?.abundanceDafor,
      evidenceType: initialData?.evidenceType || "visual",
      behaviorNotes: initialData?.behaviorNotes || "",
      latitude: initialData?.location?.lat?.toString() || "",
      longitude: initialData?.location?.lng?.toString() || "",
      gpsAccuracy: initialData?.gpsAccuracy?.toString() || "",
      isProtected: initialData?.isProtected || false,
      designation: initialData?.designation || "",
      confidenceLevel: initialData?.confidenceLevel || "certain",
      needsVerification: initialData?.needsVerification || false,
      notes: "",
    },
  });

  // Check if species is protected when scientific name changes
  const scientificName = form.watch("speciesNameScientific");
  React.useEffect(() => {
    const isProtected = PROTECTED_SPECIES.some(
      (species) => species.toLowerCase() === scientificName.toLowerCase()
    );
    setIsProtectedSpecies(isProtected);
    if (isProtected) {
      form.setValue("isProtected", true);
    }
  }, [scientificName, form]);

  const handleGetLocation = async () => {
    if (!navigator.geolocation) {
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        form.setValue("latitude", position.coords.latitude.toFixed(6));
        form.setValue("longitude", position.coords.longitude.toFixed(6));
        if (position.coords.accuracy) {
          form.setValue("gpsAccuracy", position.coords.accuracy.toFixed(1));
        }
        setIsGettingLocation(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (values: ObservationFormValues) => {
    setIsSubmitting(true);
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
            ? {
                lat: parseFloat(values.latitude),
                lng: parseFloat(values.longitude),
              }
            : undefined,
        gpsAccuracy: values.gpsAccuracy ? parseFloat(values.gpsAccuracy) : undefined,
        isProtected: values.isProtected,
        designation: values.designation || undefined,
        confidenceLevel: values.confidenceLevel,
        needsVerification: values.needsVerification,
      });

      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Error submitting observation:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData?.id ? "Edit Observation" : "Record Species Observation"}
          </DialogTitle>
          <DialogDescription>
            {initialData?.id
              ? "Update the observation details below."
              : "Enter the details of the species observation."}
          </DialogDescription>
        </DialogHeader>

        {isProtectedSpecies && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This species is protected under Irish/EU wildlife legislation.
              Ensure all observations are recorded accurately for regulatory purposes.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Species Identification */}
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
                        <Input
                          placeholder="e.g., Lutra lutra"
                          className="italic"
                          {...field}
                        />
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
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
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
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
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

            {/* Evidence and Count */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Evidence & Abundance</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="evidenceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Evidence Type *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
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
                        <Input
                          type="number"
                          min="1"
                          placeholder="e.g., 3"
                          {...field}
                        />
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
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
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
                      <FormDescription>For plants: D=Dominant, A=Abundant, F=Frequent, O=Occasional, R=Rare</FormDescription>
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

            {/* Location */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Location</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGetLocation}
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
                        <Input
                          type="number"
                          step="0.000001"
                          placeholder="e.g., 53.349805"
                          {...field}
                        />
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
                        <Input
                          type="number"
                          step="0.000001"
                          placeholder="e.g., -6.260310"
                          {...field}
                        />
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
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="e.g., 5.0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Protection Status */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Protection Status</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="isProtected"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
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
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Needs Verification</FormLabel>
                        <FormDescription>
                          Flag for senior ecologist review
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {form.watch("isProtected") && (
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
                      <FormDescription>
                        Relevant legislation protecting this species
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initialData?.id ? "Update Observation" : "Save Observation"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
