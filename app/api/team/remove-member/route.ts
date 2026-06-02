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

    // The organization owner cannot be removed by anyone — including other
    // admins. Ownership must first be transferred via /api/team/transfer-
    // ownership before the previous owner can be removed.
    const { data: org } = await serverClient
      .from('organizations')
      .select('owner_id')
      .eq('id', currentProfile.organization_id)
      .single()

    if (org?.owner_id && org.owner_id === memberProfile.id) {
      return NextResponse.json(
        {
          error: 'Cannot remove the organization owner. Transfer ownership to another admin first.',
        },
        { status: 403 }
      )
    }

    const adminClient = createAdminClient()

    // Soft-delete rather than hard-delete. A hard delete would cascade from
    // auth.users into profiles, but profiles(id) is referenced by NO ACTION
    // foreign keys from every table that records authorship
    // (projects.created_by, desk_research_findings.created_by,
    // surveys.surveyor_id, photos.created_by, target_notes.created_by,
    // survey_assignments.assigned_by …). Any member who has created data
    // therefore can't be deleted — the cascade is blocked and the call fails.
    // Deactivating instead hides the member and blocks sign-in while
    // preserving their data attribution for report provenance.
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ is_active: false, deactivated_at: new Date().toISOString() })
      .eq('id', memberId)

    if (profileError) {
      console.error('Error deactivating profile:', profileError)
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
    }

    // Block sign-in and token refresh. ban_duration is reversible
    // (set to 'none' to restore access) should the member ever be reactivated.
    const { error: banError } = await adminClient.auth.admin.updateUserById(memberId, {
      ban_duration: '876000h', // ~100 years
    })

    if (banError) {
      // Profile is already hidden from the team; the member just retains a
      // login until their current access token expires. Log for follow-up.
      console.error('Error banning auth user (profile already deactivated):', banError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove member error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
