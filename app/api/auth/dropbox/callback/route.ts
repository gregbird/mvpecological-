import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { exchangeCodeForTokens, createDropboxClient } from '@/lib/dropbox/client'

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    // Dropbox may redirect with an error
    if (error) {
      console.error('Dropbox auth denied:', error)
      return NextResponse.redirect(`${baseUrl}/search?error=${error}`)
    }

    if (!code) {
      console.error('Dropbox callback: no code parameter')
      return NextResponse.redirect(`${baseUrl}/search?error=no_code`)
    }

    // Retrieve code verifier from cookie
    const cookieStore = await cookies()
    const codeVerifier = cookieStore.get('dropbox_code_verifier')?.value

    if (!codeVerifier) {
      console.error('Dropbox callback: code_verifier cookie missing')
      return NextResponse.redirect(`${baseUrl}/search?error=no_verifier`)
    }

    // Clear the cookie
    cookieStore.delete('dropbox_code_verifier')

    // Verify user is authenticated
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.error('Dropbox callback: user not authenticated')
      return NextResponse.redirect(`${baseUrl}/search?error=unauthorized`)
    }

    // Get user profile for organization_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      console.error('Dropbox callback: no organization for user', user.id)
      return NextResponse.redirect(`${baseUrl}/search?error=no_organization`)
    }

    // Exchange code for tokens via SDK PKCE
    const redirectUri = `${baseUrl}/api/auth/dropbox/callback`
    const tokens = await exchangeCodeForTokens(code, codeVerifier, redirectUri)

    // Get account email from Dropbox
    const dbx = createDropboxClient(tokens.access_token)
    const accountInfo = await dbx.usersGetCurrentAccount()
    const accountEmail = accountInfo.result.email

    // Store connection using admin client (bypasses RLS)
    const adminSupabase = createAdminClient()

    // Check for existing connection
    const { data: existing } = await adminSupabase
      .from('dropbox_connections')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .maybeSingle()

    if (existing) {
      const { error: updateError } = await adminSupabase
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

      if (updateError) {
        console.error('Dropbox callback: DB update error:', updateError)
        return NextResponse.redirect(`${baseUrl}/search?error=db_error`)
      }
    } else {
      const { error: insertError } = await adminSupabase.from('dropbox_connections').insert({
        organization_id: profile.organization_id,
        connected_by: user.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        account_id: tokens.account_id,
        account_email: accountEmail,
        status: 'connected',
      })

      if (insertError) {
        console.error('Dropbox callback: DB insert error:', insertError)
        return NextResponse.redirect(`${baseUrl}/search?error=db_error`)
      }
    }

    return NextResponse.redirect(`${baseUrl}/search?connected=true`)
  } catch (error) {
    console.error('Dropbox callback error:', error)
    const msg = error instanceof Error ? error.message : 'unknown'
    return NextResponse.redirect(`${baseUrl}/search?error=${encodeURIComponent(msg.slice(0, 80))}`)
  }
}
