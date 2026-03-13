import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-guard'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types/database'

interface InviteRequest {
  email: string
  fullName: string
  role: UserRole
  organizationId: string
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

    // Check if current user can manage team (admin or project_manager)
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
        { error: 'Only admins and project managers can invite team members' },
        { status: 403 }
      )
    }

    const body: InviteRequest = await request.json()
    const { email, fullName, role, organizationId } = body

    if (!email || !fullName || !role || !organizationId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (organizationId !== currentProfile.organization_id) {
      return NextResponse.json({ error: 'Organization mismatch' }, { status: 403 })
    }

    // Check if user already exists in this organization
    const { data: existingProfile } = await serverClient
      .from('profiles')
      .select('id, organization_id')
      .eq('email', email)
      .maybeSingle()

    if (existingProfile) {
      if (existingProfile.organization_id === organizationId) {
        return NextResponse.json(
          { error: 'This user is already a member of your organization' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        {
          error:
            'This email is already registered. The user must be added to the project directly.',
        },
        { status: 400 }
      )
    }

    // Delete any existing pending invites for this email (re-invite = refresh token)
    await serverClient
      .from('invites')
      .delete()
      .eq('email', email)
      .eq('organization_id', organizationId)
      .is('accepted_at', null)

    // Create invite token
    const token = randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    const { data: invite, error: insertError } = await serverClient
      .from('invites')
      .insert({
        email,
        organization_id: organizationId,
        role,
        token,
        invited_by: currentUser.id,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating invite:', insertError)
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
    }

    // Build the invite link
    const baseUrl = request.headers.get('origin') || request.nextUrl.origin
    const inviteLink = `${baseUrl}/accept-invite?token=${token}`

    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        email,
        role,
        fullName,
        expiresAt: expiresAt.toISOString(),
        inviteLink,
      },
    })
  } catch (error) {
    console.error('Invite error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
