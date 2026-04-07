'use client'

import { PhotoGallery } from '@/components/field-surveys/photo-gallery'

interface PhotographsTabProps {
  projectId: string
  siteId?: string | null
}

export function PhotographsTab({ projectId, siteId }: PhotographsTabProps) {
  return (
    <div className="p-4">
      <PhotoGallery projectId={projectId} siteId={siteId} />
    </div>
  )
}
