import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface AcceptInviteRequest {
  token: string
  fullName: string
  password: string
}

export async function POST(request: NextRequest) {
  try {
    const body: AcceptInviteRequest = await request.json()
    const { token, fullName, password } = body

    if (!token || !fullName || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // 1. Validate the invite token
    const { data: invite, error: inviteError } = await adminClient
      .from('invites')
      .select('*')
      .eq('token', token)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: 'This invitation is invalid or has expired' },
        { status: 400 }
      )
    }

    // 2. Check if user already exists in auth
    const { data: existingUsers } = await adminClient.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find((u) => u.email === invite.email)

    let userId: string

    if (existingUser) {
      // User already exists (e.g. from a previous failed attempt)
      // Update their password and metadata
      const { error: updateError } = await adminClient.auth.admin.updateUserById(existingUser.id, {
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      })
      if (updateError) {
        console.error('Error updating existing user:', updateError)
        return NextResponse.json({ error: 'Failed to update user account' }, { status: 500 })
      }
      userId = existingUser.id
    } else {
      // 3. Create new auth user via admin API (no email confirmation needed)
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: invite.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      })

      if (createError || !newUser.user) {
        console.error('Error creating user:', createError)
        return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 })
      }
      userId = newUser.user.id
    }

    // 4. Wait for trigger to potentially create profile
    await new Promise((resolve) => setTimeout(resolve, 500))

    // 5. Ensure profile exists with correct org/role (fix if trigger created wrong data)
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id, organization_id, role')
      .eq('id', userId)
      .maybeSingle()

    if (existingProfile) {
      // Profile exists — update to correct org/role from invite
      if (
        existingProfile.organization_id !== invite.organization_id ||
        existingProfile.role !== invite.role
      ) {
        const { error: updateProfileError } = await adminClient
          .from('profiles')
          .update({
            organization_id: invite.organization_id,
            role: invite.role,
            full_name: fullName,
            email: invite.email,
          })
          .eq('id', userId)

        if (updateProfileError) {
          console.error('Error updating profile:', updateProfileError)
          return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 })
        }
      }
    } else {
      // No profile — create one directly
      const { error: insertProfileError } = await adminClient.from('profiles').insert({
        id: userId,
        organization_id: invite.organization_id,
        email: invite.email,
        full_name: fullName,
        role: invite.role,
      })

      if (insertProfileError) {
        console.error('Error creating profile:', insertProfileError)
        return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 })
      }
    }

    // 6. Delete any orphaned organization created by the trigger's ELSE branch
    // (trigger creates a new org when it doesn't find an invite)
    if (existingProfile && existingProfile.organization_id !== invite.organization_id) {
      await adminClient.from('organizations').delete().eq('id', existingProfile.organization_id)
    }

    // 7. Mark invite as accepted
    await adminClient
      .from('invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id)

    return NextResponse.json({
      success: true,
      email: invite.email,
    })
  } catch (error) {
    console.error('Accept invite error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
