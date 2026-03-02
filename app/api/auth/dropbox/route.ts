import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAuthUrlWithPKCE } from '@/lib/dropbox/client'

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  try {
    if (!process.env.DROPBOX_APP_KEY) {
      return NextResponse.redirect(`${baseUrl}/search?error=dropbox_not_configured`)
    }

    // Verify user is authenticated
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(`${baseUrl}/search?error=unauthorized`)
    }

    // Generate PKCE auth URL using Dropbox SDK
    const redirectUri = `${baseUrl}/api/auth/dropbox/callback`
    const { authUrl, codeVerifier } = await createAuthUrlWithPKCE(redirectUri, user.id)

    // Store code verifier in HTTP-only cookie (10 min expiry)
    const cookieStore = await cookies()
    cookieStore.set('dropbox_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    })

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Dropbox auth initiation error:', error)
    return NextResponse.redirect(`${baseUrl}/search?error=auth_initiation_failed`)
  }
}
