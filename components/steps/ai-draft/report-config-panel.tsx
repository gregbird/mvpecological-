'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { REPORT_TYPES } from '@/lib/supabase/queries/reports'

interface ReportConfigPanelProps {
  reportType: string
  onReportTypeChange: (value: string) => void
  ecologistOpinion: string
  onEcologistOpinionChange: (value: string) => void
  disabled: boolean
}

export function ReportConfigPanel({
  reportType,
  onReportTypeChange,
  ecologistOpinion,
  onEcologistOpinionChange,
  disabled,
}: ReportConfigPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Report Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Report Type</Label>
          <Select value={reportType} onValueChange={onReportTypeChange} disabled={disabled}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPORT_TYPES.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Ecologist&apos;s Opinion</Label>
          <Textarea
            placeholder="Enter your professional assessment and key points to include in the report..."
            value={ecologistOpinion}
            onChange={(e) => onEcologistOpinionChange(e.target.value)}
            rows={4}
          />
          <p className="text-muted-foreground text-xs">
            Your professional opinion will be incorporated into the Evaluation and Discussion
            sections.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
