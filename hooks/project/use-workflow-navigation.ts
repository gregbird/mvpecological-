'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useDeleteProject } from '@/hooks/queries/use-project-hooks'
import type { Profile } from '@/types/database'

interface TeamMember {
  id: string
  user_id: string
  role: string
  profile: Profile
}

export function useWorkflowNavigation(
  projectId: string | undefined,
  organizationId: string | undefined
) {
  const router = useRouter()
  const { toast } = useToast()
  const deleteProject = useDeleteProject()

  // Delete confirmation dialog
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)

  // Team management dialog
  const [showTeamDialog, setShowTeamDialog] = React.useState(false)
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([])
  const [availableMembers, setAvailableMembers] = React.useState<Profile[]>([])
  const [isLoadingTeam, setIsLoadingTeam] = React.useState(false)
  const [isAddingMember, setIsAddingMember] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedRole, setSelectedRole] = React.useState<'lead' | 'member' | 'reviewer' | 'viewer'>(
    'member'
  )

  const handleDeleteProject = async () => {
    if (!projectId) return

    try {
      const success = await deleteProject.mutateAsync(projectId)
      if (success) {
        toast({
          title: 'Project deleted',
          description: 'The project has been permanently deleted.',
        })
        router.push('/projects')
      } else {
        throw new Error('Failed to delete project')
      }
    } catch (error) {
      console.error('Delete project error:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete project. Please try again.',
      })
    }
    setShowDeleteDialog(false)
  }

  // Fetch team members when dialog opens
  const fetchTeamData = React.useCallback(async () => {
    if (!projectId || !organizationId) return

    setIsLoadingTeam(true)
    try {
      const supabase = createClient()

      // Fetch current project members with their profiles
      const { data: members, error: membersError } = await supabase
        .from('project_members')
        .select('id, user_id, role')
        .eq('project_id', projectId)

      if (membersError) throw membersError

      // Fetch profiles for members
      const memberProfiles: TeamMember[] = []
      for (const member of members || []) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', member.user_id)
          .single()

        if (profile) {
          memberProfiles.push({
            ...member,
            profile,
          })
        }
      }

      setTeamMembers(memberProfiles)

      // Fetch available members (same organization, not already assigned)
      const { data: orgMembers, error: orgError } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', organizationId)
        .neq('role', 'client') // Clients cannot be assigned to project steps

      if (orgError) throw orgError

      const assignedUserIds = members?.map((m) => m.user_id) || []
      const available = (orgMembers || []).filter((m) => !assignedUserIds.includes(m.id))

      setAvailableMembers(available)
    } catch (err) {
      console.error('Error fetching team data:', err)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load team data',
      })
    } finally {
      setIsLoadingTeam(false)
    }
  }, [projectId, organizationId, toast])

  const handleAddMember = async (
    userId: string,
    role: 'lead' | 'member' | 'reviewer' | 'viewer' = 'member'
  ) => {
    if (!projectId) return

    setIsAddingMember(true)
    try {
      const supabase = createClient()

      const { error } = await supabase.from('project_members').insert({
        project_id: projectId,
        user_id: userId,
        role,
      })

      if (error) throw error

      toast({
        title: 'Member added',
        description: 'Team member has been added to the project',
      })

      // Refresh team data
      await fetchTeamData()
    } catch (err) {
      console.error('Error adding member:', err)
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

      // Refresh team data
      await fetchTeamData()
    } catch (err) {
      console.error('Error removing member:', err)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to remove team member',
      })
    }
  }

  // Fetch team data when dialog opens
  React.useEffect(() => {
    if (showTeamDialog) {
      fetchTeamData()
    }
  }, [showTeamDialog, fetchTeamData])

  return {
    // Delete
    showDeleteDialog,
    setShowDeleteDialog,
    handleDeleteProject,
    isDeleting: deleteProject.isPending,
    // Team
    showTeamDialog,
    setShowTeamDialog,
    teamMembers,
    availableMembers,
    isLoadingTeam,
    isAddingMember,
    searchQuery,
    setSearchQuery,
    selectedRole,
    setSelectedRole,
    handleAddMember,
    handleRemoveMember,
  }
}
