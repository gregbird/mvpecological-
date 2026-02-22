'use client'

import * as React from 'react'
import { MessageSquare } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface EcologistOpinionInlineProps {
  value: string
  onChange: (value: string) => void
}

export function EcologistOpinionInline({ value, onChange }: EcologistOpinionInlineProps) {
  const [open, setOpen] = React.useState(!!value)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs transition-colors"
        >
          <MessageSquare className="h-3 w-3" />
          {value ? 'Edit professional opinion' : 'Add professional opinion'}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <Textarea
          placeholder="Add your professional assessment for this section..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="resize-none text-sm"
        />
        <p className="text-muted-foreground mt-1 text-xs">
          Your opinion will be incorporated when AI generates this section.
        </p>
      </CollapsibleContent>
    </Collapsible>
  )
}
