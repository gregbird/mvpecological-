'use client'

import { PhotoGallery } from '@/components/field-surveys/photo-gallery'

interface PhotographsTabProps {
  projectId: string
}

export function PhotographsTab({ projectId }: PhotographsTabProps) {
  return (
    <div className="p-4">
      <PhotoGallery projectId={projectId} />
    </div>
  )
}
