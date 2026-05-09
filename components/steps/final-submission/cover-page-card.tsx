'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CoverPageCardProps {
  coverPageTitle: string
  preparedFor: string
  projectReference: string
  onTitleChange: (value: string) => void
  onPreparedForChange: (value: string) => void
}

export function CoverPageCard({
  coverPageTitle,
  preparedFor,
  projectReference,
  onTitleChange,
  onPreparedForChange,
}: CoverPageCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cover Page Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Report Title</Label>
          <Input
            value={coverPageTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Enter report title"
          />
        </div>
        <div className="space-y-2">
          <Label>Prepared For</Label>
          <Input
            value={preparedFor}
            onChange={(e) => onPreparedForChange(e.target.value)}
            placeholder="Client name or organization"
          />
        </div>
        <div className="space-y-2">
          <Label>Project Reference</Label>
          <Input value={projectReference} disabled />
        </div>
      </CardContent>
    </Card>
  )
}
