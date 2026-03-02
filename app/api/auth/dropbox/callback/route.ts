import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { exchangeCodeForTokens } from '@/lib/dropbox/client'
import { Dropbox } from 'dropbox'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // user ID

    if (!code) {
      return NextResponse.redirect(new URL('/search?error=no_code', request.url))
    }

    // Retrieve code verifier from cookie
    const cookieStore = await cookies()
    const codeVerifier = cookieStore.get('dropbox_code_verifier')?.value

    if (!codeVerifier) {
      return NextResponse.redirect(new URL('/search?error=no_verifier', request.url))
    }

    // Clear the cookie
    cookieStore.delete('dropbox_code_verifier')

    // Verify user is authenticated
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/search?error=unauthorized', request.url))
    }

    // Get user profile for organization_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.redirect(new URL('/search?error=no_organization', request.url))
    }

    // Exchange code for tokens
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const redirectUri = `${baseUrl}/api/auth/dropbox/callback`
    const tokens = await exchangeCodeForTokens(code, codeVerifier, redirectUri)

    // Get account email from Dropbox
    const dbx = new Dropbox({ accessToken: tokens.access_token })
    const accountInfo = await dbx.usersGetCurrentAccount()
    const accountEmail = accountInfo.result.email

    // Store connection using admin client (bypasses RLS for token storage)
    const adminSupabase = createAdminClient()

    // Upsert: update existing connection or create new one
    const { data: existing } = await adminSupabase
      .from('dropbox_connections')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .eq('status', 'connected')
      .maybeSingle()

    if (existing) {
      await adminSupabase
        .from('dropbox_connections')
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          account_id: tokens.account_id,
          account_email: accountEmail,
          status: 'connected',
          connected_by: user.id,
        })
        .eq('id', existing.id)
    } else {
      await adminSupabase.from('dropbox_connections').insert({
        organization_id: profile.organization_id,
        connected_by: user.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? '',
        account_id: tokens.account_id,
        account_email: accountEmail,
        status: 'connected',
      })
    }

    return NextResponse.redirect(new URL('/search?connected=true', request.url))
  } catch (error) {
    console.error('Dropbox callback error:', error)
    return NextResponse.redirect(new URL('/search?error=callback_failed', request.url))
  }
}
