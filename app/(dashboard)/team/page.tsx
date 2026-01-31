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
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['assessor', 'client'] as const),
})

type InviteFormData = z.infer<typeof inviteSchema>

interface TeamMember extends Profile {
  // Add any additional fields if needed
}

export default function TeamPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, permissions, isLoading: isRoleLoading } = useRole()

  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([])
  const [pendingInvites, setPendingInvites] = React.useState<Invite[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isInviting, setIsInviting] = React.useState(false)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      role: 'assessor',
    },
  })

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

        setTeamMembers(members || [])
        setPendingInvites(invites || [])
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
      const supabase = createClient()

      // Check if email is already in use
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', data.email)
        .eq('organization_id', user.organization_id)
        .single()

      if (existingProfile) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'This email is already a team member',
        })
        return
      }

      // Create invite
      const { error: inviteError } = await supabase.from('invites').insert({
        organization_id: user.organization_id,
        email: data.email,
        role: data.role,
        invited_by: user.id,
      })

      if (inviteError) {
        if (inviteError.code === '23505') {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'An invite has already been sent to this email',
          })
          return
        }
        throw inviteError
      }

      toast({
        title: 'Invite sent!',
        description: `An invitation has been sent to ${data.email}`,
      })

      // Refresh invites list
      const { data: invites } = await supabase
        .from('invites')
        .select('*')
        .eq('organization_id', user.organization_id)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      setPendingInvites(invites || [])
      reset()
      setIsDialogOpen(false)
    } catch (err) {
      console.error('Error sending invite:', err)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send invitation',
      })
    } finally {
      setIsInviting(false)
    }
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
        return 'bg-emerald-100 text-emerald-700'
      case 'assessor':
        return 'bg-blue-100 text-blue-700'
      case 'client':
        return 'bg-gray-100 text-gray-700'
      default:
        return 'bg-gray-100 text-gray-700'
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
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
          <p className="mt-1 text-gray-600">
            Manage your organization&apos;s team members and invitations
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>Send an invitation to join your organization</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onInviteSubmit)}>
              <div className="space-y-4 py-4">
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
                  <Select
                    defaultValue="assessor"
                    onValueChange={(value) => setValue('role', value as 'assessor' | 'client')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assessor">Assessor</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.role && <p className="text-sm text-red-600">{errors.role.message}</p>}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isInviting}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Invite
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Team Members */}
        <Card>
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
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-emerald-100 text-emerald-700">
                        {getInitials(member.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-gray-900">{member.full_name}</p>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getRoleBadgeColor(member.role)}>{member.role}</Badge>
                    {member.id !== user?.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}

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
        <Card>
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
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                      <Clock className="h-5 w-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{invite.email}</p>
                      <p className="text-sm text-gray-500">
                        Expires {new Date(invite.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getRoleBadgeColor(invite.role)}>{invite.role}</Badge>
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
