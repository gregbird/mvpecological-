import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-guard'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface RemoveMemberRequest {
  memberId: string
}

export async function POST(request: NextRequest) {
  try {
    const { user: _authUser, error: authError } = await requireAuth()
    if (authError) return authError

    const serverClient = await createClient()
    const {
      data: { user: currentUser },
    } = await serverClient.auth.getUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if current user is admin or project_manager
    const { data: currentProfile } = await serverClient
      .from('profiles')
      .select('role, organization_id')
      .eq('id', currentUser.id)
      .single()

    if (
      !currentProfile ||
      (currentProfile.role !== 'admin' && currentProfile.role !== 'project_manager')
    ) {
      return NextResponse.json(
        { error: 'Only admins and project managers can remove team members' },
        { status: 403 }
      )
    }

    const body: RemoveMemberRequest = await request.json()
    const { memberId } = body

    if (!memberId) {
      return NextResponse.json({ error: 'Missing member ID' }, { status: 400 })
    }

    // Prevent removing yourself
    if (memberId === currentUser.id) {
      return NextResponse.json({ error: 'You cannot remove yourself' }, { status: 400 })
    }

    // Verify the member belongs to the same organization
    const { data: memberProfile } = await serverClient
      .from('profiles')
      .select('id, organization_id, role')
      .eq('id', memberId)
      .single()

    if (!memberProfile || memberProfile.organization_id !== currentProfile.organization_id) {
      return NextResponse.json({ error: 'Member not found in your organization' }, { status: 404 })
    }

    // Project managers cannot remove admins
    if (currentProfile.role === 'project_manager' && memberProfile.role === 'admin') {
      return NextResponse.json({ error: 'Project managers cannot remove admins' }, { status: 403 })
    }

    const adminClient = createAdminClient()

    // Delete profile first (has FK constraints)
    const { error: profileError } = await adminClient.from('profiles').delete().eq('id', memberId)

    if (profileError) {
      console.error('Error deleting profile:', profileError)
      return NextResponse.json({ error: 'Failed to remove member profile' }, { status: 500 })
    }

    // Delete auth user
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(memberId)

    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError)
      // Profile is already deleted, log but don't fail
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove member error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
