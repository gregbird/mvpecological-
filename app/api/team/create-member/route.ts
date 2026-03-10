import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types/database'

interface CreateMemberRequest {
  email: string
  fullName: string
  role: UserRole
  organizationId: string
}

export async function POST(request: NextRequest) {
  try {
    const { user: _authUser, error: authError } = await requireAuth()
    if (authError) return authError

    // Verify the requesting user is admin
    const serverClient = await createClient()
    const {
      data: { user: currentUser },
    } = await serverClient.auth.getUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if current user is admin
    const { data: currentProfile } = await serverClient
      .from('profiles')
      .select('role, organization_id')
      .eq('id', currentUser.id)
      .single()

    if (!currentProfile || currentProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can create team members' }, { status: 403 })
    }

    const body: CreateMemberRequest = await request.json()
    const { email, fullName, role, organizationId } = body

    // Validate input
    if (!email || !fullName || !role || !organizationId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify organization matches
    if (organizationId !== currentProfile.organization_id) {
      return NextResponse.json({ error: 'Organization mismatch' }, { status: 403 })
    }

    const adminClient = createAdminClient()

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find((u) => u.email === email)

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
    }

    // Create user with admin API (no email confirmation required)
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: '123456',
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
      },
    })

    if (createError) {
      console.error('Error creating user:', createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    if (!newUser.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    // Update the profile created by trigger (handle_new_user)
    // Wait a moment for trigger to complete
    await new Promise((resolve) => setTimeout(resolve, 500))

    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        full_name: fullName,
        role,
        organization_id: organizationId,
      })
      .eq('id', newUser.user.id)

    if (profileError) {
      // If profile update fails, delete the auth user
      await adminClient.auth.admin.deleteUser(newUser.user.id)
      console.error('Error updating profile:', profileError)
      return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.user.id,
        email,
        fullName,
        role,
      },
    })
  } catch (error) {
    console.error('Create member error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
