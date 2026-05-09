'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  UserPlus,
  Mail,
  Loader2,
  MoreVertical,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Copy,
  Link as LinkIcon,
  Crown,
  ArrowRightLeft,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useRole } from '@/contexts/role-context'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Invite, UserRole } from '@/types/database'

const TEAM_ROLES = [
  { value: 'admin', label: 'Admin', description: 'Full system access' },
  {
    value: 'project_manager',
    label: 'Project Manager',
    description: 'Create/manage projects, assign team',
  },
  { value: 'ecologist', label: 'Ecologist', description: 'End-to-end project management' },
  { value: 'junior', label: 'Junior', description: 'Data gathering + field research' },
  { value: 'third_party', label: '3rd Party', description: 'Field research only' },
] as const

const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  role: z.enum(['admin', 'project_manager', 'ecologist', 'junior', 'third_party'] as const),
})

type InviteFormData = z.infer<typeof inviteSchema>

type TeamMember = Profile

export default function TeamPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, permissions, isLoading: isRoleLoading } = useRole()

  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([])
  const [pendingInvites, setPendingInvites] = React.useState<Invite[]>([])
  const [ownerId, setOwnerId] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isInviting, setIsInviting] = React.useState(false)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [inviteLink, setInviteLink] = React.useState<string | null>(null)
  const [transferringId, setTransferringId] = React.useState<string | null>(null)

  const isCurrentUserOwner = !!user?.id && ownerId === user.id

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      role: 'ecologist',
    },
  })

  const selectedRole = watch('role')

  // Check permissions
  React.useEffect(() => {
    if (!isRoleLoading && !permissions.canManageTeam) {
      router.push('/projects')
    }
  }, [isRoleLoading, permissions.canManageTeam, router])

  // Fetch team members and invites
  React.useEffect(() => {
    async function fetchTeamData() {
      if (!user?.organization_id) return

      try {
        const supabase = createClient()

        // Fetch team members
        const { data: members, error: membersError } = await supabase
          .from('profiles')
          .select('*')
          .eq('organization_id', user.organization_id)
          .order('created_at', { ascending: true })

        if (membersError) throw membersError

        // Fetch pending invites
        const { data: invites, error: invitesError } = await supabase
          .from('invites')
          .select('*')
          .eq('organization_id', user.organization_id)
          .is('accepted_at', null)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })

        if (invitesError) throw invitesError

        // Fetch organization owner — drives the Owner badge and transfer
        // ownership controls. Failure here is non-fatal: we just lose the
        // visual marker.
        const { data: org } = await supabase
          .from('organizations')
          .select('owner_id')
          .eq('id', user.organization_id)
          .maybeSingle()

        setTeamMembers(members || [])
        setPendingInvites(invites || [])
        setOwnerId(org?.owner_id ?? null)
      } catch (err) {
        console.error('Error fetching team data:', err)
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load team data',
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (!isRoleLoading && user) {
      fetchTeamData()
    }
  }, [user, isRoleLoading, toast])

  const onInviteSubmit = async (data: InviteFormData) => {
    if (!user?.organization_id) return

    setIsInviting(true)
    try {
      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          fullName: data.fullName,
          role: data.role,
          organizationId: user.organization_id,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to send invitation',
        })
        return
      }

      setInviteLink(result.invite.inviteLink)

      // Refresh pending invites
      const supabase = createClient()
      const { data: invites } = await supabase
        .from('invites')
        .select('*')
        .eq('organization_id', user.organization_id)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      setPendingInvites(invites || [])
    } catch (err) {
      console.error('Error sending invitation:', err)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send invitation',
      })
    } finally {
      setIsInviting(false)
    }
  }

  const handleCopyLink = async () => {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    toast({ title: 'Copied!', description: 'Invite link copied to clipboard' })
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setInviteLink(null)
    reset()
  }

  const handleCancelInvite = async (inviteId: string) => {
    try {
      const supabase = createClient()

      const { error } = await supabase.from('invites').delete().eq('id', inviteId)

      if (error) throw error

      setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId))

      toast({
        title: 'Invite cancelled',
        description: 'The invitation has been cancelled',
      })
    } catch (err) {
      console.error('Error cancelling invite:', err)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to cancel invitation',
      })
    }
  }

  const handleTransferOwnership = async (newOwnerId: string, newOwnerName: string) => {
    if (
      !confirm(
        `Transfer ownership of this organization to ${newOwnerName}?\n\nYou will remain an admin but lose owner-only privileges (e.g. you will become removable by other admins).`
      )
    )
      return

    setTransferringId(newOwnerId)
    try {
      const response = await fetch('/api/team/transfer-ownership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newOwnerId }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to transfer ownership',
        })
        return
      }

      setOwnerId(newOwnerId)
      toast({
        title: 'Ownership transferred',
        description: `${newOwnerName} is now the organization owner.`,
      })
    } catch (err) {
      console.error('Error transferring ownership:', err)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to transfer ownership',
      })
    } finally {
      setTransferringId(null)
    }
  }

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from the organization?`)) return

    try {
      const response = await fetch('/api/team/remove-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to remove member',
        })
        return
      }

      setTeamMembers((prev) => prev.filter((m) => m.id !== memberId))
      toast({
        title: 'Member removed',
        description: `${memberName} has been removed from the organization`,
      })
    } catch (err) {
      console.error('Error removing member:', err)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to remove member',
      })
    }
  }

  const getRoleLabel = (role: UserRole) => {
    const found = TEAM_ROLES.find((r) => r.value === role)
    if (found) return found.label
    if (role === 'client') return 'Client'
    return role
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  }

  const getRoleBadgeColor = (role: UserRole) => {
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
      case 'client':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  // Loading state
  if (isLoading || isRoleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="h-full bg-gray-50 p-4 sm:p-6 lg:p-8 dark:bg-gray-900">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold">Team Members</h1>
          <p className="mt-1 text-gray-600">
            Manage your organization&apos;s team members and invitations
          </p>
        </div>
        <Button
          className="shrink-0 bg-emerald-600 hover:bg-emerald-700"
          onClick={() => setIsDialogOpen(true)}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </div>

      {/* Invite Modal — rendered via portal to avoid layout issues */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={handleCloseDialog} />
          <div className="bg-background relative z-10 mx-4 w-full max-w-md rounded-lg border p-6 shadow-xl">
            <button
              onClick={handleCloseDialog}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-5 w-5" />
            </button>

            {inviteLink ? (
              <div>
                <h2 className="text-foreground text-lg font-semibold">Invitation Created</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Share this link with the team member. It expires in 7 days.
                </p>
                <div className="mt-4 overflow-hidden rounded-md border bg-gray-50 px-3 py-2 dark:bg-gray-800">
                  <p className="truncate font-mono text-xs text-gray-700 dark:text-gray-300">
                    {inviteLink}
                  </p>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleCopyLink}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Invite Link
                  </Button>
                  <p className="text-center text-xs text-gray-500">
                    The invited person will set their own password when they accept.
                  </p>
                  <Button variant="outline" className="w-full" onClick={handleCloseDialog}>
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-foreground text-lg font-semibold">Invite Team Member</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Create an invitation link to share with a new team member.
                </p>
                <form onSubmit={handleSubmit(onInviteSubmit)} className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input id="fullName" placeholder="John Doe" {...register('fullName')} />
                    {errors.fullName && (
                      <p className="text-sm text-red-600">{errors.fullName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="colleague@example.com"
                      {...register('email')}
                    />
                    {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <select
                      id="role"
                      value={selectedRole}
                      onChange={(e) => setValue('role', e.target.value as InviteFormData['role'])}
                      className="border-border bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      {TEAM_ROLES.filter((r) => user?.role === 'admin' || r.value !== 'admin').map(
                        (r) => (
                          <option key={r.value} value={r.value}>
                            {r.label} — {r.description}
                          </option>
                        )
                      )}
                    </select>
                    {errors.role && <p className="text-sm text-red-600">{errors.role.message}</p>}
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={handleCloseDialog}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isInviting}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Invite
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Team Members */}
        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Active Members
            </CardTitle>
            <CardDescription>
              {teamMembers.length} team member{teamMembers.length !== 1 ? 's' : ''} in your
              organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {teamMembers.map((member) => {
                const isMemberOwner = !!ownerId && member.id === ownerId
                const isSelf = member.id === user?.id
                // Owner is immutable for everyone but themselves (and even
                // the owner can only "transfer", not remove). Project
                // managers also cannot touch admins.
                const canRemove =
                  !isSelf &&
                  !isMemberOwner &&
                  !(user?.role === 'project_manager' && member.role === 'admin')
                // The current owner can hand ownership to another admin
                // (and only an admin — see API guard).
                const canTransferTo =
                  isCurrentUserOwner && !isSelf && !isMemberOwner && member.role === 'admin'
                const showMenu = canRemove || canTransferTo

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-emerald-100 text-emerald-700">
                          {getInitials(member.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-foreground truncate font-medium">{member.full_name}</p>
                        <p className="truncate text-sm text-gray-500">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {isMemberOwner && (
                        <Badge className="border-amber-300 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                          <Crown className="mr-1 h-3 w-3" />
                          Owner
                        </Badge>
                      )}
                      <Badge className={getRoleBadgeColor(member.role)}>
                        {getRoleLabel(member.role)}
                      </Badge>
                      {showMenu && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              {transferringId === member.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreVertical className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canTransferTo && (
                              <DropdownMenuItem
                                onClick={() => handleTransferOwnership(member.id, member.full_name)}
                              >
                                <ArrowRightLeft className="mr-2 h-4 w-4" />
                                Transfer ownership
                              </DropdownMenuItem>
                            )}
                            {canRemove && (
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleRemoveMember(member.id, member.full_name)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                )
              })}

              {teamMembers.length === 0 && (
                <div className="py-8 text-center text-gray-500">
                  <Users className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                  <p>No team members yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Invites */}
        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              {pendingInvites.length} pending invite
              {pendingInvites.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between rounded-lg border border-dashed p-3"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                      <Clock className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-foreground truncate font-medium">{invite.email}</p>
                      <p className="text-sm text-gray-500">
                        Expires {new Date(invite.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge className={getRoleBadgeColor(invite.role)}>
                      {getRoleLabel(invite.role)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => handleCancelInvite(invite.id)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {pendingInvites.length === 0 && (
                <div className="py-8 text-center text-gray-500">
                  <CheckCircle className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                  <p>No pending invitations</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
