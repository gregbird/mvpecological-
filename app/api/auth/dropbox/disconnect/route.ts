import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth-guard'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revokeAccessToken } from '@/lib/dropbox/client'

/**
 * Disconnect a Dropbox connection.
 *
 * Order of operations matters:
 *  1. Revoke the access token at Dropbox so the bearer token can no longer
 *     be used to read files (defense-in-depth — even though it's stored
 *     server-side, a leaked DB row should not stay valid).
 *  2. Delete every indexed_document for the connection (FK cascade clears
 *     document_chunks).
 *  3. Clear access_token + refresh_token from our DB and mark the row as
 *     `disconnected`. This is the row that the search page reads with
 *     `.eq('status', 'connected')`.
 *
 * Without revoking, an attacker who later obtains the old DB token could
 * still read the user's Dropbox files until the user manually re-authorises
 * the app. Without clearing the tokens, an "undelete" of the row would
 * silently re-grant access.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth()
    if (authError) return authError

    const { connectionId } = (await request.json()) as { connectionId?: string }
    if (!connectionId) {
      return NextResponse.json({ error: 'connectionId is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // Authorisation: only allow disconnecting a connection that belongs to
    // the requester's organisation. The admin client bypasses RLS so we
    // need this guard explicitly.
    const { data: connection, error: fetchError } = await adminSupabase
      .from('dropbox_connections')
      .select('id, organization_id, access_token')
      .eq('id', connectionId)
      .maybeSingle()

    if (fetchError || !connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    if (connection.organization_id !== profile.organization_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 1. Revoke at Dropbox (best-effort, non-fatal)
    if (connection.access_token) {
      await revokeAccessToken(connection.access_token)
    }

    // 2. Delete indexed_documents (FK cascade clears document_chunks)
    const { error: docsError } = await adminSupabase
      .from('indexed_documents')
      .delete()
      .eq('connection_id', connectionId)
    if (docsError) {
      return NextResponse.json(
        { error: `Failed to clear documents: ${docsError.message}` },
        { status: 500 }
      )
    }

    // 3. Clear tokens + mark disconnected — empty strings instead of null so
    //    NOT NULL columns (if any) don't reject the update.
    const { error: updateError } = await adminSupabase
      .from('dropbox_connections')
      .update({
        access_token: '',
        refresh_token: '',
        status: 'disconnected',
      })
      .eq('id', connectionId)

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to disconnect: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Dropbox disconnect error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
