'use client'

import { Loader2, Camera } from 'lucide-react'
import { useProjectPhotos } from '@/hooks/queries/use-photo-hooks'
import { getPhotoPublicUrl } from '@/lib/supabase/queries'

interface AssetPanelPhotosProps {
  projectId: string
}

export function AssetPanelPhotos({ projectId }: AssetPanelPhotosProps) {
  const { data: photos, isLoading } = useProjectPhotos(projectId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
      </div>
    )
  }

  if (!photos || photos.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center text-xs">
        <Camera className="h-8 w-8 opacity-40" />
        <p>No field photographs yet.</p>
        <p>Upload photos from the Field Survey step.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {photos.map((photo) => (
        <div
          key={photo.id}
          className="group relative cursor-pointer overflow-hidden rounded-md border"
          title={photo.caption || ''}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getPhotoPublicUrl(photo.storage_path)}
            alt={photo.caption || 'Field photo'}
            className="h-20 w-full object-cover transition-transform group-hover:scale-105"
          />
          {photo.caption && (
            <div className="bg-background/80 absolute inset-x-0 bottom-0 px-1.5 py-0.5">
              <p className="truncate text-[10px] font-medium">{photo.caption}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
