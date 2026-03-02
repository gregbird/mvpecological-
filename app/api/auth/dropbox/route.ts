import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import {
  generateCodeVerifier,
  generateCodeChallenge,
  getDropboxAuthUrl,
} from '@/lib/dropbox/client'

export async function GET() {
  try {
    // Check env vars first
    if (!process.env.DROPBOX_APP_KEY || !process.env.DROPBOX_APP_SECRET) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      return NextResponse.redirect(`${baseUrl}/search?error=dropbox_not_configured`)
    }

    // Verify user is authenticated
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate PKCE values
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = await generateCodeChallenge(codeVerifier)

    // Determine redirect URI
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const redirectUri = `${baseUrl}/api/auth/dropbox/callback`

    // Store code verifier in cookie (10 min expiry)
    const cookieStore = await cookies()
    cookieStore.set('dropbox_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    })

    // Build auth URL and redirect
    const authUrl = await getDropboxAuthUrl(redirectUri, codeChallenge, user.id)
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Dropbox auth initiation error:', error)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return NextResponse.redirect(`${baseUrl}/search?error=auth_initiation_failed`)
  }
}
