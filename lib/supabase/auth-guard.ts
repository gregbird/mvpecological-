import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Verify that the request comes from an authenticated user.
 * Use at the top of API route handlers for explicit auth checks
 * (in addition to middleware + Supabase RLS).
 *
 * Returns the authenticated user or a 401 NextResponse.
 */
export async function requireAuth(): Promise<
  { user: { id: string; email?: string }; error: null } | { user: null; error: NextResponse }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  return { user, error: null }
}
