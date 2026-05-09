'use client'

import { Loader2, Check, AlertCircle, Info, CheckCircle2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'

interface SubmissionPanelProps {
  isApproved: boolean
  isComplete: boolean
  canSubmit: boolean
  isSubmitting: boolean
  canApproveReport: boolean
  onSubmit: () => void
}

export function SubmissionPanel({
  isApproved,
  isComplete,
  canSubmit,
  isSubmitting,
  canApproveReport,
  onSubmit,
}: SubmissionPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Final Submission</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Report approved</span>
            {isApproved ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="text-muted-foreground h-4 w-4" />
            )}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Export configured</span>
            <Check className="h-4 w-4 text-green-600" />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Project completed</span>
            {isComplete ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="text-muted-foreground h-4 w-4" />
            )}
          </div>
        </div>

        <Progress value={isComplete ? 100 : isApproved ? 80 : 50} />

        {canApproveReport ? (
          <Button
            onClick={onSubmit}
            disabled={!canSubmit || isSubmitting}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isComplete ? (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {isComplete ? 'Project Completed' : 'Finalize & Submit Project'}
          </Button>
        ) : (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Admin Required</AlertTitle>
            <AlertDescription>
              Only administrators can finalize and submit projects.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
