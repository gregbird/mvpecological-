import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type DropboxConnectionRow = Database['public']['Tables']['dropbox_connections']['Row']
type DropboxConnectionInsert = Database['public']['Tables']['dropbox_connections']['Insert']
type DropboxConnectionUpdate = Database['public']['Tables']['dropbox_connections']['Update']
type IndexedDocumentRow = Database['public']['Tables']['indexed_documents']['Row']

// ─── Dropbox Connections ────────────────────────────────────────────

export async function getDropboxConnection(
  organizationId: string
): Promise<DropboxConnectionRow | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('dropbox_connections')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('status', 'connected')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Error fetching dropbox connection:', error)
    return null
  }

  return data as DropboxConnectionRow | null
}

export async function createDropboxConnection(
  data: DropboxConnectionInsert
): Promise<DropboxConnectionRow> {
  const supabase = createClient()
  const { data: result, error } = await supabase
    .from('dropbox_connections')
    .insert(data)
    .select()
    .single()

  if (error) throw new Error(`Failed to create connection: ${error.message}`)
  if (!result) throw new Error('No data returned from insert')
  return result as DropboxConnectionRow
}

export async function updateDropboxConnection(
  id: string,
  updates: DropboxConnectionUpdate
): Promise<DropboxConnectionRow> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('dropbox_connections')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) throw new Error(`Failed to update connection: ${error.message}`)
  if (!data) throw new Error('No data returned from update')
  return data as DropboxConnectionRow
}

/** Disconnect a Dropbox connection.
 *
 * Calls the server route at `/api/auth/dropbox/disconnect` which:
 *   1. Revokes the access token at Dropbox (so the bearer token dies),
 *   2. Deletes indexed_documents (cascades to chunks),
 *   3. Clears stored tokens + marks the row `disconnected`.
 *
 * Doing this client-side via Supabase would skip the Dropbox revoke and
 * leave the token valid until the user manually un-authorises the app on
 * dropbox.com — which is exactly the bug that lets a "Disconnect" → "Connect"
 * cycle silently re-link the same account.
 */
export async function disconnectDropbox(connectionId: string): Promise<void> {
  const response = await fetch('/api/auth/dropbox/disconnect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ connectionId }),
  })

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error || 'Failed to disconnect')
  }
}

// ─── Indexed Documents ──────────────────────────────────────────────

export async function getIndexedDocuments(connectionId: string): Promise<IndexedDocumentRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('indexed_documents')
    .select('*')
    .eq('connection_id', connectionId)
    .order('file_name', { ascending: true })

  if (error) {
    console.error('Error fetching indexed documents:', error)
    return []
  }

  return (data ?? []) as IndexedDocumentRow[]
}

export async function getIndexedDocumentsByOrg(
  organizationId: string
): Promise<IndexedDocumentRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('indexed_documents')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('status', 'ready')
    .order('file_name', { ascending: true })

  if (error) {
    console.error('Error fetching org documents:', error)
    return []
  }

  return (data ?? []) as IndexedDocumentRow[]
}

export async function deleteIndexedDocument(documentId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('indexed_documents').delete().eq('id', documentId)
  if (error) throw new Error(`Failed to delete document: ${error.message}`)
}
