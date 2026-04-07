'use client'

import * as React from 'react'
import { X, Loader2, MapPin, Calendar, Tag, Trash2, Grid3x3, Map, ImageIcon } from 'lucide-react'
import dynamic from 'next/dynamic'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useProjectPhotos, useDeletePhoto, useUpdatePhoto } from '@/hooks/queries/use-photo-hooks'
import { getPhotoPublicUrl } from '@/lib/supabase/queries'
import { createClient } from '@/lib/supabase/client'
import type { Photo } from '@/types/database'

// Lazy load the map component to avoid SSR issues with Leaflet
const PhotoMapView = dynamic(() => import('./photo-map-view'), { ssr: false })

const COMMON_TAGS = [
  'habitat',
  'species',
  'damage',
  'access',
  'boundary',
  'watercourse',
  'invasive',
  'general',
] as const

interface PhotoGalleryProps {
  projectId: string
  /** When set, only photos linked to entities in this site are shown. */
  siteId?: string | null
  className?: string
}

export function PhotoGallery({ projectId, siteId, className }: PhotoGalleryProps) {
  const { toast } = useToast()
  const { data: photos = [], isLoading } = useProjectPhotos(projectId, siteId)
  const deletePhotoMutation = useDeletePhoto()
  const updatePhotoMutation = useUpdatePhoto()

  const [selectedPhoto, setSelectedPhoto] = React.useState<Photo | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<Photo | null>(null)
  const [activeFilters, setActiveFilters] = React.useState<string[]>([])
  const [viewMode, setViewMode] = React.useState<'grid' | 'map'>('grid')

  // Collect all unique tags from photos
  const allTags = React.useMemo(() => {
    const tagSet = new Set<string>()
    for (const photo of photos) {
      if (photo.tags) {
        for (const tag of photo.tags) tagSet.add(tag)
      }
    }
    return Array.from(tagSet).sort()
  }, [photos])

  // Filter photos by selected tags
  const filteredPhotos = React.useMemo(() => {
    if (activeFilters.length === 0) return photos
    return photos.filter((photo) => photo.tags?.some((tag) => activeFilters.includes(tag)))
  }, [photos, activeFilters])

  // Photos with GPS coordinates
  const geotaggedPhotos = React.useMemo(
    () => filteredPhotos.filter((p) => p.location != null),
    [filteredPhotos]
  )

  const toggleFilter = (tag: string) => {
    setActiveFilters((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const handleDelete = async (photo: Photo) => {
    try {
      // Delete from storage
      const supabase = createClient()
      await supabase.storage.from('project-photos').remove([photo.storage_path])

      // Delete DB record
      await deletePhotoMutation.mutateAsync(photo.id)

      setDeleteTarget(null)
      setSelectedPhoto(null)
      toast({ title: 'Photo deleted', description: 'Photo has been removed.' })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: 'Could not delete the photo.',
      })
    }
  }

  const handleTagToggle = async (photo: Photo, tag: string) => {
    const currentTags = photo.tags ?? []
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag]

    // Optimistic update — immediately reflect in lightbox
    const updated = { ...photo, tags: newTags }
    setSelectedPhoto(updated)

    try {
      await updatePhotoMutation.mutateAsync({
        photoId: photo.id,
        updates: { tags: newTags },
      })
    } catch {
      // Revert on failure
      setSelectedPhoto(photo)
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: 'Could not update tags.',
      })
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('en-IE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
        <ImageIcon className="text-muted-foreground mb-4 h-12 w-12" />
        <h3 className="text-lg font-medium">No Photos Yet</h3>
        <p className="text-muted-foreground mt-1 max-w-sm text-sm">
          Photos uploaded through habitat mapping, species observations, or target notes will appear
          here automatically with EXIF location data.
        </p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Tag Filters */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-muted-foreground flex items-center text-xs">
            <Tag className="mr-1 h-3 w-3" />
            Filter:
          </span>
          {allTags.map((tag) => (
            <Badge
              key={tag}
              variant={activeFilters.includes(tag) ? 'default' : 'outline'}
              className="cursor-pointer text-xs"
              onClick={() => toggleFilter(tag)}
            >
              {tag}
            </Badge>
          ))}
          {activeFilters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setActiveFilters([])}
            >
              Clear
            </Button>
          )}
        </div>
      )}

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'map')}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="grid">
              <Grid3x3 className="mr-1.5 h-4 w-4" />
              Grid ({filteredPhotos.length})
            </TabsTrigger>
            <TabsTrigger value="map" disabled={geotaggedPhotos.length === 0}>
              <Map className="mr-1.5 h-4 w-4" />
              Map ({geotaggedPhotos.length})
            </TabsTrigger>
          </TabsList>
          <span className="text-muted-foreground text-xs">
            {filteredPhotos.length} of {photos.length} photos
          </span>
        </div>

        {/* Grid View */}
        <TabsContent value="grid" className="mt-4">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {filteredPhotos.map((photo) => (
              <div
                key={photo.id}
                role="button"
                tabIndex={0}
                className="group bg-muted relative aspect-square cursor-pointer overflow-hidden rounded-lg border"
                onClick={() => setSelectedPhoto(photo)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setSelectedPhoto(photo)
                }}
              >
                <img
                  src={getPhotoPublicUrl(photo.storage_path)}
                  alt={photo.caption ?? 'Photo'}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
                {/* GPS indicator */}
                {photo.location != null && (
                  <div className="absolute bottom-1 left-1 rounded-full bg-black/60 p-1">
                    <MapPin className="h-3 w-3 text-white" />
                  </div>
                )}
                {/* Tag count */}
                {photo.tags && photo.tags.length > 0 && (
                  <div className="absolute right-1 bottom-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                    {photo.tags.length}
                  </div>
                )}
                {/* Delete button on hover */}
                <button
                  type="button"
                  className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteTarget(photo)
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Map View */}
        <TabsContent value="map" className="mt-4">
          <div className="h-[500px] overflow-hidden rounded-lg border">
            <PhotoMapView photos={geotaggedPhotos} onPhotoClick={setSelectedPhoto} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Lightbox Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedPhoto?.caption ?? 'Photo'}</DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-lg">
                <img
                  src={getPhotoPublicUrl(selectedPhoto.storage_path)}
                  alt={selectedPhoto.caption ?? 'Photo'}
                  className="max-h-[60vh] w-full object-contain"
                />
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap gap-4 text-sm">
                {selectedPhoto.taken_at && (
                  <div className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(selectedPhoto.taken_at)}
                  </div>
                )}
                {selectedPhoto.location != null && (
                  <div className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Geotagged
                  </div>
                )}
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <span className="text-sm font-medium">Tags</span>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_TAGS.map((tag) => (
                    <Badge
                      key={tag}
                      variant={selectedPhoto.tags?.includes(tag) ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                      onClick={() => handleTagToggle(selectedPhoto, tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteTarget(selectedPhoto)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Photo</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the photo from storage. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
