import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
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

    const { query, limit = 20 } = (await request.json()) as { query: string; limit?: number }

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 })
    }

    const { data, error } = await supabase.rpc('search_document_chunks', {
      p_organization_id: profile.organization_id,
      p_query: query.trim(),
      p_limit: Math.min(limit, 50),
    })

    if (error) {
      console.error('Document search error:', error)
      return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }

    return NextResponse.json({ results: data ?? [] })
  } catch (error) {
    console.error('Search route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
