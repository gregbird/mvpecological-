import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-guard'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface TransferOwnershipRequest {
  newOwnerId: string
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

    const { data: currentProfile } = await serverClient
      .from('profiles')
      .select('role, organization_id')
      .eq('id', currentUser.id)
      .single()

    if (!currentProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const body: TransferOwnershipRequest = await request.json()
    const { newOwnerId } = body

    if (!newOwnerId) {
      return NextResponse.json({ error: 'Missing new owner ID' }, { status: 400 })
    }

    if (newOwnerId === currentUser.id) {
      return NextResponse.json({ error: 'You are already the owner' }, { status: 400 })
    }

    const { data: org } = await serverClient
      .from('organizations')
      .select('id, owner_id')
      .eq('id', currentProfile.organization_id)
      .single()

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    if (org.owner_id !== currentUser.id) {
      return NextResponse.json(
        { error: 'Only the current owner can transfer ownership' },
        { status: 403 }
      )
    }

    const { data: targetProfile } = await serverClient
      .from('profiles')
      .select('id, organization_id, role')
      .eq('id', newOwnerId)
      .single()

    if (!targetProfile || targetProfile.organization_id !== currentProfile.organization_id) {
      return NextResponse.json(
        { error: 'Target user is not a member of your organization' },
        { status: 404 }
      )
    }

    if (targetProfile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Ownership can only be transferred to an existing admin' },
        { status: 400 }
      )
    }

    // RLS on organizations only allows the row to be updated by privileged
    // contexts. Use the admin client to apply the swap atomically.
    const adminClient = createAdminClient()
    const { error: updateError } = await adminClient
      .from('organizations')
      .update({ owner_id: newOwnerId })
      .eq('id', org.id)

    if (updateError) {
      console.error('Error transferring ownership:', updateError)
      return NextResponse.json({ error: 'Failed to transfer ownership' }, { status: 500 })
    }

    return NextResponse.json({ success: true, ownerId: newOwnerId })
  } catch (error) {
    console.error('Transfer ownership error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
