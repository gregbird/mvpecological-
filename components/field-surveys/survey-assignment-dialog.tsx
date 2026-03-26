'use client'

import * as React from 'react'
import { UserPlus, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  useSurveyAssignments,
  useAssignSurveyStaff,
  useRemoveSurveyAssignment,
} from '@/hooks/queries/use-survey-assignment-hooks'
import { createClient } from '@/lib/supabase/client'

interface TeamMember {
  id: string
  full_name: string | null
  role: string | null
}

interface SurveyAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  surveyId: string
  surveyLabel: string
  organizationId: string
  assignedBy: string
  /** The primary surveyor (from surveys.surveyor_id) — shown as lead, cannot be removed */
  leadSurveyorId?: string
}

export function SurveyAssignmentDialog({
  open,
  onOpenChange,
  surveyId,
  surveyLabel,
  organizationId,
  assignedBy,
  leadSurveyorId,
}: SurveyAssignmentDialogProps) {
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([])
  const [loadingMembers, setLoadingMembers] = React.useState(false)

  const { data: assignments } = useSurveyAssignments(surveyId)
  const assignStaff = useAssignSurveyStaff()
  const removeAssignment = useRemoveSurveyAssignment()

  const assignedUserIds = (assignments ?? []).map((a) => a.user_id)

  // Fetch team members when dialog opens
  React.useEffect(() => {
    if (!open || !organizationId) return

    const fetchMembers = async () => {
      setLoadingMembers(true)
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('organization_id', organizationId)
        .order('full_name')
      setTeamMembers((data ?? []) as TeamMember[])
      setLoadingMembers(false)
    }
    fetchMembers()
  }, [open, organizationId])

  const availableMembers = teamMembers.filter((m) => !assignedUserIds.includes(m.id))
  const assignedMembers = teamMembers.filter((m) => assignedUserIds.includes(m.id))

  const handleAssign = (userId: string) => {
    assignStaff.mutate({ surveyId, userId, assignedBy })
  }

  const handleRemove = (userId: string) => {
    removeAssignment.mutate({ surveyId, userId })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogTitle>Assign Staff</DialogTitle>
        <DialogDescription className="text-sm text-gray-500">
          Assign team members to <span className="font-medium">{surveyLabel}</span>
        </DialogDescription>

        {/* Currently Assigned */}
        {assignedMembers.length > 0 && (
          <div className="mt-2">
            <p className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">
              Assigned
            </p>
            <div className="space-y-1">
              {assignedMembers.map((member) => {
                const isLead = member.id === leadSurveyorId
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-md border px-3 py-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{member.full_name || 'Unknown'}</span>
                      {isLead ? (
                        <Badge className="bg-blue-100 text-[10px] text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          Lead
                        </Badge>
                      ) : member.role ? (
                        <Badge variant="outline" className="text-[10px]">
                          {member.role}
                        </Badge>
                      ) : null}
                    </div>
                    {!isLead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        onClick={() => handleRemove(member.id)}
                        disabled={removeAssignment.isPending}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Available Members */}
        <div className="mt-2">
          <p className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">
            Available Team Members
          </p>
          {loadingMembers ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : availableMembers.length === 0 ? (
            <p className="text-muted-foreground text-sm">All team members are assigned.</p>
          ) : (
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {availableMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleAssign(member.id)}
                  disabled={assignStaff.isPending}
                  className="flex w-full items-center gap-2 rounded-md border px-3 py-1.5 text-left text-sm hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-gray-800"
                >
                  <UserPlus className="h-3.5 w-3.5 text-gray-400" />
                  <span>{member.full_name || 'Unknown'}</span>
                  {member.role && (
                    <Badge variant="outline" className="ml-auto text-[10px]">
                      {member.role}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
