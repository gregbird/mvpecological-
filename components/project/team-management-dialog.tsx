'use client'

import * as React from 'react'
import { Loader2, Users, UserPlus, X, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import type { Profile } from '@/types/database'

type ProjectRole = 'lead' | 'member' | 'reviewer' | 'viewer'

interface TeamMember {
  id: string
  user_id: string
  role: string
  profile: Profile
}

interface TeamManagementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  organizationId: string
  canManageTeam: boolean
  currentUserRole?: string
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

function getRoleBadgeColor(role: string): string {
  switch (role) {
    case 'lead':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
    case 'member':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
    case 'reviewer':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
    case 'viewer':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  }
}

function getUserRoleBadgeColor(role: string): string {
  switch (role) {
    case 'admin':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
    case 'project_manager':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
    case 'ecologist':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
    case 'junior':
      return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300'
    case 'third_party':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  }
}

function getUserRoleLabel(role: string): string {
  switch (role) {
    case 'admin':
      return 'Admin'
    case 'project_manager':
      return 'PM'
    case 'ecologist':
      return 'Ecologist'
    case 'junior':
      return 'Junior'
    case 'third_party':
      return '3rd Party'
    case 'client':
      return 'Client'
    default:
      return role
  }
}

export function TeamManagementDialog({
  open,
  onOpenChange,
  projectId,
  organizationId,
  canManageTeam,
  currentUserRole,
}: TeamManagementDialogProps) {
  const { toast } = useToast()
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([])
  const [availableMembers, setAvailableMembers] = React.useState<Profile[]>([])
  const [isLoadingTeam, setIsLoadingTeam] = React.useState(false)
  const [isAddingMember, setIsAddingMember] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedRole, setSelectedRole] = React.useState<ProjectRole>('member')

  const fetchTeamData = React.useCallback(async () => {
    setIsLoadingTeam(true)
    try {
      const supabase = createClient()

      const { data: members, error: membersError } = await supabase
        .from('project_members')
        .select('id, user_id, role')
        .eq('project_id', projectId)

      if (membersError) throw membersError

      const memberProfiles: TeamMember[] = []
      for (const member of members || []) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', member.user_id)
          .single()

        if (profile) {
          memberProfiles.push({ ...member, profile })
        }
      }

      setTeamMembers(memberProfiles)

      const { data: orgMembers, error: orgError } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', organizationId)
        .neq('role', 'client')

      if (orgError) throw orgError

      const assignedUserIds = members?.map((m) => m.user_id) || []
      setAvailableMembers((orgMembers || []).filter((m) => !assignedUserIds.includes(m.id)))
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load team data',
      })
    } finally {
      setIsLoadingTeam(false)
    }
  }, [projectId, organizationId, toast])

  const handleAddMember = async (userId: string, role: ProjectRole = 'member') => {
    setIsAddingMember(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('project_members').insert({
        project_id: projectId,
        user_id: userId,
        role,
      })

      if (error) throw error

      toast({ title: 'Member added', description: 'Team member has been added to the project' })
      await fetchTeamData()
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add team member',
      })
    } finally {
      setIsAddingMember(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.from('project_members').delete().eq('id', memberId)

      if (error) throw error

      toast({
        title: 'Member removed',
        description: 'Team member has been removed from the project',
      })
      await fetchTeamData()
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to remove team member',
      })
    }
  }

  React.useEffect(() => {
    if (open) {
      fetchTeamData()
    }
  }, [open, fetchTeamData])

  const filteredAvailable = availableMembers.filter((member) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      member.full_name.toLowerCase().includes(query) || member.email.toLowerCase().includes(query)
    )
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        if (!nextOpen) {
          setSearchQuery('')
          setSelectedRole('member')
        }
      }}
    >
      <DialogContent className="flex max-h-[80vh] w-[90vw] max-w-4xl flex-col overflow-hidden p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Project Team
          </DialogTitle>
          <DialogDescription>Manage team members assigned to this project</DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-1 pr-3">
          {/* Current Team Members */}
          <div>
            <h4 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              Assigned Members ({teamMembers.length})
            </h4>
            {isLoadingTeam ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="rounded-lg border border-dashed py-8 text-center">
                <Users className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                <p className="text-sm text-gray-500">No team members assigned yet</p>
              </div>
            ) : (
              <div className="grid gap-2">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="bg-card flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-emerald-100 text-sm text-emerald-700">
                          {getInitials(member.profile.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{member.profile.full_name}</p>
                          <Badge
                            className={`text-xs ${getUserRoleBadgeColor(member.profile.role)}`}
                          >
                            {getUserRoleLabel(member.profile.role)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">{member.profile.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getRoleBadgeColor(member.role)}>{member.role}</Badge>
                      {canManageTeam &&
                        !(
                          currentUserRole === 'project_manager' && member.profile.role === 'admin'
                        ) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Team Members Section */}
          <div>
            <h4 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              Add Members to Project
            </h4>

            <div className="mb-4 flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="w-40">
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as ProjectRole)}
                  className="border-input bg-background ring-offset-background focus:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none"
                >
                  <option value="lead">Lead</option>
                  <option value="member">Member</option>
                  <option value="reviewer">Reviewer</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            </div>

            {isLoadingTeam ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : availableMembers.length === 0 ? (
              <div className="rounded-lg border border-dashed py-8 text-center">
                <UserPlus className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                <p className="text-sm text-gray-500">
                  All members are already assigned to this project
                </p>
              </div>
            ) : (
              <div className="grid max-h-62.5 gap-2 overflow-y-auto">
                {filteredAvailable.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-lg border border-dashed p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-blue-100 text-sm text-blue-700">
                          {getInitials(member.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{member.full_name}</p>
                          <Badge className={`text-xs ${getUserRoleBadgeColor(member.role)}`}>
                            {getUserRoleLabel(member.role)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddMember(member.id, selectedRole)}
                      disabled={isAddingMember}
                      className="min-w-25"
                    >
                      {isAddingMember ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Add as {selectedRole}
                        </>
                      )}
                    </Button>
                  </div>
                ))}
                {filteredAvailable.length === 0 && (
                  <div className="py-4 text-center">
                    <p className="text-sm text-gray-500">No members found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
