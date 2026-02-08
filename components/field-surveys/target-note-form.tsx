'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, MapPin, Navigation, ImageIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { PhotoUpload } from '@/components/ui/photo-upload'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { TARGET_NOTE_CATEGORIES, type TargetNoteCategory } from './target-note-card'

const targetNoteSchema = z.object({
  category: z.enum([
    'access_point',
    'check_feature',
    'habitat',
    'fauna',
    'flora',
    'management',
    'damage',
    'ownership',
  ]),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  priority: z.enum(['high', 'normal', 'low']),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
})

type TargetNoteFormValues = z.infer<typeof targetNoteSchema>

export interface TargetNoteFormData {
  category: TargetNoteCategory
  title: string
  description?: string
  priority: 'high' | 'normal' | 'low'
  location?: { lat: number; lng: number }
  photos?: string[]
}

interface TargetNoteFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: TargetNoteFormData) => Promise<void>
  initialData?: Partial<TargetNoteFormData>
  isLoading?: boolean
  projectId: string
  noteId?: string
}

export function TargetNoteForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading,
  projectId,
  noteId,
}: TargetNoteFormProps) {
  const { toast } = useToast()
  const [gettingLocation, setGettingLocation] = React.useState(false)
  const [photos, setPhotos] = React.useState<string[]>(initialData?.photos || [])

  const form = useForm<TargetNoteFormValues>({
    resolver: zodResolver(targetNoteSchema),
    defaultValues: {
      category: initialData?.category || 'check_feature',
      title: initialData?.title || '',
      description: initialData?.description || '',
      priority: initialData?.priority || 'normal',
      latitude: initialData?.location?.lat,
      longitude: initialData?.location?.lng,
    },
  })

  // Reset form when dialog opens with new data
  React.useEffect(() => {
    if (open) {
      form.reset({
        category: initialData?.category || 'check_feature',
        title: initialData?.title || '',
        description: initialData?.description || '',
        priority: initialData?.priority || 'normal',
        latitude: initialData?.location?.lat,
        longitude: initialData?.location?.lng,
      })
      setPhotos(initialData?.photos || [])
    }
  }, [open, initialData, form])

  const handleGetLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        variant: 'destructive',
        title: 'Geolocation not supported',
        description: 'Your browser does not support geolocation.',
      })
      return
    }

    setGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        form.setValue('latitude', position.coords.latitude)
        form.setValue('longitude', position.coords.longitude)
        setGettingLocation(false)
        toast({
          title: 'Location captured',
          description: `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`,
        })
      },
      (error) => {
        setGettingLocation(false)
        toast({
          variant: 'destructive',
          title: 'Location error',
          description: error.message,
        })
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleSubmit = async (values: TargetNoteFormValues) => {
    const data: TargetNoteFormData = {
      category: values.category as TargetNoteCategory,
      title: values.title,
      description: values.description,
      priority: values.priority,
      location:
        values.latitude && values.longitude
          ? { lat: values.latitude, lng: values.longitude }
          : undefined,
      photos: photos.length > 0 ? photos : undefined,
    }

    await onSubmit(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialData?.title ? 'Edit Target Note' : 'Add Target Note'}</DialogTitle>
          <DialogDescription>
            Record a point of interest to check during field surveys
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(TARGET_NOTE_CATEGORIES).map(([key, config]) => {
                        const Icon = config.icon
                        return (
                          <SelectItem key={key} value={key}>
                            <span className="flex items-center gap-2">
                              <Icon className={`h-4 w-4 ${config.color}`} />
                              {config.label}
                            </span>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Badger sett entrance" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add more details about this target note..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Priority */}
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="high">High - Must check</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="low">Low - If time permits</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location */}
            <div className="space-y-2">
              <FormLabel>Location (Optional)</FormLabel>
              <div className="flex gap-2">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="Latitude"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                          }
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
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="Longitude"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleGetLocation}
                  disabled={gettingLocation}
                >
                  {gettingLocation ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Navigation className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <FormDescription>Click the button to get your current GPS location</FormDescription>
            </div>

            {/* Photos */}
            <div className="space-y-2">
              <FormLabel className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Photos (Optional)
              </FormLabel>
              <PhotoUpload
                projectId={projectId}
                entityType="target-note"
                entityId={noteId}
                photos={photos}
                onPhotosChange={setPhotos}
                maxPhotos={5}
                disabled={isLoading}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initialData?.title ? 'Update' : 'Add'} Target Note
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
