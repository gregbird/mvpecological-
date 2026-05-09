'use client'

import { Loader2, Check, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface ProgressPanelProps {
  reviewDecision: 'approved' | 'rejected' | null
  isComplete: boolean
  canComplete: boolean
  isCompleting: boolean
  onComplete: () => void
}

export function ProgressPanel({
  reviewDecision,
  isComplete,
  canComplete,
  isCompleting,
  onComplete,
}: ProgressPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Step Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Review decision</span>
            {reviewDecision === 'approved' ? (
              <Badge className="bg-green-600">Approved</Badge>
            ) : reviewDecision === 'rejected' ? (
              <Badge variant="destructive">Revisions Requested</Badge>
            ) : (
              <AlertCircle className="text-muted-foreground h-4 w-4" />
            )}
          </div>
        </div>

        <Progress value={isComplete ? 100 : reviewDecision === 'approved' ? 90 : 50} />

        <Button onClick={onComplete} disabled={!canComplete || isCompleting} className="w-full">
          {isCompleting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          {isComplete ? 'Completed' : 'Complete Step & Continue'}
        </Button>
      </CardContent>
    </Card>
  )
}
