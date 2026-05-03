'use client'

import { type UseFormReturn } from 'react-hook-form'
import { MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Section } from './section-shell'
import { NumField } from './num-field'
import type { ReleveFormValues } from './types'

interface GpsSectionProps {
  form: UseFormReturn<ReleveFormValues>
  readOnly: boolean
}

export function GpsSection({ form, readOnly }: GpsSectionProps) {
  const { toast } = useToast()

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: 'Geolocation not supported', variant: 'destructive' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        form.setValue('survey_x_coord', String(pos.coords.longitude))
        form.setValue('survey_y_coord', String(pos.coords.latitude))
        if (pos.coords.accuracy) {
          form.setValue('accuracy_m', String(Math.round(pos.coords.accuracy)))
        }
        toast({ title: 'GPS location captured' })
      },
      (err) => {
        toast({ title: 'Could not get location', description: err.message, variant: 'destructive' })
      },
      { enableHighAccuracy: true }
    )
  }

  return (
    <Section title="GPS Location" defaultOpen={false}>
      <div className="grid gap-3 sm:grid-cols-4">
        <NumField
          form={form}
          name="survey_x_coord"
          label="Longitude"
          step="any"
          min="-180"
          readOnly={readOnly}
        />
        <NumField
          form={form}
          name="survey_y_coord"
          label="Latitude"
          step="any"
          min="-90"
          readOnly={readOnly}
        />
        <NumField form={form} name="accuracy_m" label="Accuracy" unit="m" readOnly={readOnly} />
        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGetLocation}
            disabled={readOnly}
            className="h-8"
          >
            <MapPin className="mr-1.5 h-3.5 w-3.5" />
            Get GPS
          </Button>
        </div>
      </div>
    </Section>
  )
}
