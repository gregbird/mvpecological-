import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createDropboxClient, refreshAccessToken } from '@/lib/dropbox/client'
import type { files } from 'dropbox'

interface FileEntry {
  name: string
  path: string
  isFolder: boolean
  size: number
  modified: string | null
  extension: string | null
}

const SUPPORTED_EXTENSIONS = ['pdf', 'docx', 'doc']

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    // Get connection
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

    // Get folder path from query
    const { searchParams } = new URL(request.url)
    const folderPath = searchParams.get('path') || ''

    // Try with current token, refresh if needed
    let accessToken = connection.access_token
    try {
      const dbx = createDropboxClient(accessToken)
      const result = await dbx.filesListFolder({
        path: folderPath,
        include_media_info: false,
        include_deleted: false,
        limit: 500,
      })

      const entries = processEntries(result.result.entries)
      return NextResponse.json({ entries, hasMore: result.result.has_more })
    } catch (err: unknown) {
      // Token expired — try refresh
      if (connection.refresh_token && isAuthError(err)) {
        const tokens = await refreshAccessToken(connection.refresh_token)
        accessToken = tokens.access_token

        // Update stored token
        await adminSupabase
          .from('dropbox_connections')
          .update({ access_token: tokens.access_token })
          .eq('id', connection.id)

        const dbx = createDropboxClient(accessToken)
        const result = await dbx.filesListFolder({
          path: folderPath,
          include_media_info: false,
          include_deleted: false,
          limit: 500,
        })

        const entries = processEntries(result.result.entries)
        return NextResponse.json({ entries, hasMore: result.result.has_more })
      }
      throw err
    }
  } catch (error) {
    console.error('Dropbox files error:', error)
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 })
  }
}

function isAuthError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.message.includes('expired_access_token') || err.message.includes('invalid_access_token'))
  )
}

function processEntries(
  entries: Array<
    files.FileMetadataReference | files.FolderMetadataReference | files.DeletedMetadataReference
  >
): FileEntry[] {
  return entries
    .filter(
      (entry): entry is files.FileMetadataReference | files.FolderMetadataReference =>
        entry['.tag'] === 'file' || entry['.tag'] === 'folder'
    )
    .map((entry) => {
      const isFolder = entry['.tag'] === 'folder'
      const ext = isFolder ? null : (entry.name.split('.').pop()?.toLowerCase() ?? null)
      return {
        name: entry.name,
        path: entry.path_lower ?? entry.path_display ?? '',
        isFolder,
        size: isFolder ? 0 : ((entry as files.FileMetadataReference).size ?? 0),
        modified: isFolder
          ? null
          : ((entry as files.FileMetadataReference).server_modified ?? null),
        extension: ext,
      }
    })
    .filter(
      (entry) =>
        entry.isFolder || (entry.extension && SUPPORTED_EXTENSIONS.includes(entry.extension))
    )
    .sort((a, b) => {
      // Folders first, then alphabetical
      if (a.isFolder && !b.isFolder) return -1
      if (!a.isFolder && b.isFolder) return 1
      return a.name.localeCompare(b.name)
    })
}
