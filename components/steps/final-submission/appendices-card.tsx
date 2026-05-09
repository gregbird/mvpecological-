'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { APPENDIX_OPTIONS } from './constants'

interface AppendicesCardProps {
  selected: string[]
  onToggle: (appendixId: string) => void
}

export function AppendicesCard({ selected, onToggle }: AppendicesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Include Appendices</CardTitle>
        <CardDescription>Select which appendices to include in the final report</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {APPENDIX_OPTIONS.map((appendix) => (
            <div key={appendix.id} className="flex items-center gap-3">
              <Checkbox
                id={appendix.id}
                checked={selected.includes(appendix.id)}
                onCheckedChange={() => onToggle(appendix.id)}
              />
              <Label htmlFor={appendix.id} className="cursor-pointer font-normal">
                {appendix.label}
              </Label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
