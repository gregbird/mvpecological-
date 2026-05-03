'use client'

import * as React from 'react'
import { Check, ImageIcon, Tag } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useProjectPhotos } from '@/hooks/queries/use-photo-hooks'
import { getPhotoDisplayUrl } from '@/lib/supabase/queries'
import type { Photo } from '@/types/database'

interface InsertedPhoto {
  url: string
  caption: string
}

interface PhotoPickerModalProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onInsert: (photos: InsertedPhoto[]) => void
}

export function PhotoPickerModal({
  projectId,
  open,
  onOpenChange,
  onInsert,
}: PhotoPickerModalProps) {
  const { data: photos = [], isLoading } = useProjectPhotos(projectId)
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [activeFilter, setActiveFilter] = React.useState<string | null>(null)

  // Reset selection when modal opens
  React.useEffect(() => {
    if (open) {
      setSelectedIds(new Set())
      setActiveFilter(null)
    }
  }, [open])

  const filteredPhotos = React.useMemo(() => {
    if (!activeFilter) return photos
    return photos.filter((p) => p.tags?.includes(activeFilter))
  }, [photos, activeFilter])

  const allTags = React.useMemo(() => {
    const tagSet = new Set<string>()
    for (const photo of photos) {
      if (photo.tags) {
        for (const tag of photo.tags) tagSet.add(tag)
      }
    }
    return Array.from(tagSet).sort()
  }, [photos])

  const toggleSelect = (photoId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(photoId)) {
        next.delete(photoId)
      } else {
        next.add(photoId)
      }
      return next
    })
  }

  const handleInsert = () => {
    const selected: InsertedPhoto[] = []
    for (const photo of photos) {
      if (selectedIds.has(photo.id)) {
        selected.push({
          url: getPhotoDisplayUrl(photo),
          caption: photo.caption ?? 'Site photo',
        })
      }
    }
    onInsert(selected)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Insert Photos</DialogTitle>
          <DialogDescription>
            Select photos from this project to insert into the report section.
          </DialogDescription>
        </DialogHeader>

        {/* Tag filter */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-muted-foreground flex items-center text-xs">
              <Tag className="mr-1 h-3 w-3" />
              Filter:
            </span>
            {allTags.map((tag) => (
              <Badge
                key={tag}
                variant={activeFilter === tag ? 'default' : 'outline'}
                className="cursor-pointer text-xs"
                onClick={() => setActiveFilter(activeFilter === tag ? null : tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Photo grid */}
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="text-muted-foreground flex items-center justify-center py-12 text-sm">
              Loading photos...
            </div>
          ) : filteredPhotos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <ImageIcon className="text-muted-foreground mb-3 h-10 w-10" />
              <p className="text-muted-foreground text-sm">
                {photos.length === 0
                  ? 'No photos uploaded for this project yet.'
                  : 'No photos match the selected filter.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {filteredPhotos.map((photo) => (
                <PhotoTile
                  key={photo.id}
                  photo={photo}
                  selected={selectedIds.has(photo.id)}
                  onToggle={() => toggleSelect(photo.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleInsert} disabled={selectedIds.size === 0}>
            Insert {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PhotoTile({
  photo,
  selected,
  onToggle,
}: {
  photo: Photo
  selected: boolean
  onToggle: () => void
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'group relative aspect-square cursor-pointer overflow-hidden rounded-lg border-2 transition-all',
        selected
          ? 'border-primary ring-primary/30 ring-2'
          : 'hover:border-border border-transparent'
      )}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggle()
        }
      }}
    >
      <img
        src={getPhotoDisplayUrl(photo)}
        alt={photo.caption ?? 'Photo'}
        className="h-full w-full object-cover"
        loading="lazy"
      />
      {/* Selection indicator */}
      {selected && (
        <div className="bg-primary absolute top-1.5 right-1.5 rounded-full p-0.5">
          <Check className="h-3.5 w-3.5 text-white" />
        </div>
      )}
      {/* Caption overlay */}
      {photo.caption && (
        <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1.5 py-1 text-[10px] leading-tight text-white">
          {photo.caption.length > 40 ? `${photo.caption.slice(0, 40)}...` : photo.caption}
        </div>
      )}
    </div>
  )
}
