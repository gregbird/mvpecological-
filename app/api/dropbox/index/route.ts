import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { refreshAccessToken } from '@/lib/dropbox/client'
import { indexDocument } from '@/lib/dropbox/indexer'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { filePaths } = (await request.json()) as { filePaths: string[] }

    if (!filePaths || filePaths.length === 0) {
      return NextResponse.json({ error: 'filePaths required' }, { status: 400 })
    }

    // Get connection with tokens
    const adminSupabase = createAdminClient()
    const { data: connection } = await adminSupabase
      .from('dropbox_connections')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .eq('status', 'connected')
      .single()

    if (!connection) {
      return NextResponse.json({ error: 'No Dropbox connection' }, { status: 404 })
    }

    // Ensure fresh token
    let accessToken = connection.access_token
    if (connection.refresh_token) {
      try {
        const newAccessToken = await refreshAccessToken(connection.refresh_token)
        accessToken = newAccessToken
        await adminSupabase
          .from('dropbox_connections')
          .update({ access_token: newAccessToken })
          .eq('id', connection.id)
      } catch {
        // Use existing token if refresh fails
      }
    }

    // Get file metadata for all requested paths
    const results: Array<{ path: string; status: string; chunks?: number; error?: string }> = []

    for (const filePath of filePaths) {
      try {
        // Get metadata from Dropbox via API directly
        const metaResponse = await fetch('https://api.dropboxapi.com/2/files/get_metadata', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ path: filePath }),
        })

        if (!metaResponse.ok) {
          const errText = await metaResponse.text()
          throw new Error(`Metadata fetch failed: ${errText}`)
        }

        const meta = (await metaResponse.json()) as {
          '.tag': string
          name: string
          size: number
          content_hash?: string
          server_modified?: string
        }

        if (meta['.tag'] !== 'file') {
          results.push({ path: filePath, status: 'skipped', error: 'Not a file' })
          continue
        }

        const result = await indexDocument({
          accessToken,
          connectionId: connection.id,
          organizationId: profile.organization_id,
          filePath,
          fileName: meta.name,
          fileSize: meta.size,
          contentHash: meta.content_hash ?? '',
          dropboxModifiedAt: meta.server_modified ?? '',
        })

        results.push({
          path: filePath,
          status: result.chunks === 0 ? 'unchanged' : 'indexed',
          chunks: result.chunks,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        results.push({ path: filePath, status: 'error', error: message })
      }
    }

    // Update last sync time
    await adminSupabase
      .from('dropbox_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', connection.id)

    const indexed = results.filter((r) => r.status === 'indexed').length
    const errors = results.filter((r) => r.status === 'error').length

    return NextResponse.json({
      total: filePaths.length,
      indexed,
      unchanged: results.filter((r) => r.status === 'unchanged').length,
      errors,
      results,
    })
  } catch (error) {
    console.error('Dropbox index error:', error)
    return NextResponse.json({ error: 'Failed to index documents' }, { status: 500 })
  }
}
