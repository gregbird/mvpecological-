"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Survey, SurveyType } from "./survey-card";

const surveyFormSchema = z.object({
  surveyType: z.enum([
    "walkover",
    "habitat_mapping",
    "bat_survey",
    "bird_survey",
    "mammal_survey",
    "aquatic_survey",
    "botanical_survey",
    "invertebrate_survey",
    "other",
  ]),
  surveyDate: z.date({ message: "Survey date is required" }),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  surveyorId: z.string().min(1, "Surveyor is required"),
  temperature: z.string().optional(),
  windSpeed: z.string().optional(),
  windDirection: z.string().optional(),
  cloudCover: z.string().optional(),
  precipitation: z.string().optional(),
  visibility: z.string().optional(),
  notes: z.string().optional(),
});

type SurveyFormValues = z.infer<typeof surveyFormSchema>;

interface SurveyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<Survey>) => Promise<void>;
  initialData?: Partial<Survey>;
  projectId: string;
}

const SURVEY_TYPES: { value: SurveyType; label: string }[] = [
  { value: "walkover", label: "Walkover Survey" },
  { value: "habitat_mapping", label: "Habitat Mapping" },
  { value: "bat_survey", label: "Bat Survey" },
  { value: "bird_survey", label: "Bird Survey" },
  { value: "mammal_survey", label: "Mammal Survey" },
  { value: "aquatic_survey", label: "Aquatic Survey" },
  { value: "botanical_survey", label: "Botanical Survey" },
  { value: "invertebrate_survey", label: "Invertebrate Survey" },
  { value: "other", label: "Other Survey" },
];

const WIND_DIRECTIONS = [
  "N", "NE", "E", "SE", "S", "SW", "W", "NW", "Calm", "Variable",
];

const PRECIPITATION_OPTIONS = [
  "None", "Light Rain", "Moderate Rain", "Heavy Rain", "Drizzle", "Showers", "Snow",
];

const VISIBILITY_OPTIONS = [
  "Excellent", "Good", "Moderate", "Poor", "Very Poor",
];

// Mock surveyors - will be fetched from Supabase
const MOCK_SURVEYORS = [
  { id: "1", name: "Dr. Sarah O'Brien" },
  { id: "2", name: "Michael Murphy" },
  { id: "3", name: "Emma Kelly" },
];

export function SurveyForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  projectId,
}: SurveyFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<SurveyFormValues>({
    resolver: zodResolver(surveyFormSchema),
    defaultValues: {
      surveyType: initialData?.surveyType || "walkover",
      surveyDate: initialData?.surveyDate
        ? new Date(initialData.surveyDate)
        : new Date(),
      startTime: initialData?.startTime || "",
      endTime: initialData?.endTime || "",
      surveyorId: initialData?.surveyor?.id || "",
      temperature: initialData?.weather?.temperature?.toString() || "",
      windSpeed: initialData?.weather?.windSpeed?.toString() || "",
      windDirection: initialData?.weather?.windDirection || "",
      cloudCover: initialData?.weather?.cloudCover?.toString() || "",
      precipitation: initialData?.weather?.precipitation || "",
      visibility: initialData?.weather?.visibility || "",
      notes: initialData?.notes || "",
    },
  });

  const handleSubmit = async (values: SurveyFormValues) => {
    setIsSubmitting(true);
    try {
      const surveyor = MOCK_SURVEYORS.find((s) => s.id === values.surveyorId);

      await onSubmit({
        id: initialData?.id,
        surveyType: values.surveyType,
        surveyDate: format(values.surveyDate, "yyyy-MM-dd"),
        startTime: values.startTime || undefined,
        endTime: values.endTime || undefined,
        surveyor: surveyor
          ? { id: surveyor.id, name: surveyor.name }
          : { id: values.surveyorId, name: "Unknown" },
        weather: {
          temperature: values.temperature ? parseFloat(values.temperature) : undefined,
          windSpeed: values.windSpeed ? parseFloat(values.windSpeed) : undefined,
          windDirection: values.windDirection || undefined,
          cloudCover: values.cloudCover ? parseInt(values.cloudCover) : undefined,
          precipitation: values.precipitation || undefined,
          visibility: values.visibility || undefined,
        },
        notes: values.notes || undefined,
        status: initialData?.status || "planned",
      });

      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Error submitting survey:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData?.id ? "Edit Survey" : "Plan New Survey"}
          </DialogTitle>
          <DialogDescription>
            {initialData?.id
              ? "Update the survey details below."
              : "Enter the details for the new field survey."}
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
                    >
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
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
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

            {/* Time and Surveyor */}
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="surveyorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Surveyor</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select surveyor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MOCK_SURVEYORS.map((surveyor) => (
                          <SelectItem key={surveyor.id} value={surveyor.id}>
                            {surveyor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Weather Conditions */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Weather Conditions</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="temperature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temperature (°C)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="e.g., 15"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="windSpeed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wind Speed (km/h)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          placeholder="e.g., 10"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="windDirection"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wind Direction</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select direction" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {WIND_DIRECTIONS.map((dir) => (
                            <SelectItem key={dir} value={dir}>
                              {dir}
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
                  name="cloudCover"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cloud Cover (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="10"
                          placeholder="e.g., 50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="precipitation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precipitation</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PRECIPITATION_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
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
                  name="visibility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Visibility</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {VISIBILITY_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
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
                      className="min-h-[100px]"
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
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initialData?.id ? "Update Survey" : "Create Survey"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
