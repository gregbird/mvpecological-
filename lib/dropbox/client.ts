import { Dropbox } from 'dropbox'

export interface DropboxTokens {
  access_token: string
  refresh_token: string
  account_id: string
}

const DROPBOX_AUTH_URL = 'https://www.dropbox.com/oauth2/authorize'
const DROPBOX_TOKEN_URL = 'https://api.dropboxapi.com/oauth2/token'

function getAppKey(): string {
  const key = process.env.DROPBOX_APP_KEY
  if (!key) throw new Error('Missing DROPBOX_APP_KEY environment variable')
  return key
}

function getAppSecret(): string {
  const secret = process.env.DROPBOX_APP_SECRET
  if (!secret) throw new Error('Missing DROPBOX_APP_SECRET environment variable')
  return secret
}

/** Generate a random PKCE code verifier */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 64)
}

/** Create PKCE code challenge from verifier */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/** Build the Dropbox OAuth2 authorization URL */
export async function getDropboxAuthUrl(
  redirectUri: string,
  codeChallenge: string,
  state: string
): Promise<string> {
  const params = new URLSearchParams({
    client_id: getAppKey(),
    redirect_uri: redirectUri,
    response_type: 'code',
    token_access_type: 'offline',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
  })
  return `${DROPBOX_AUTH_URL}?${params.toString()}`
}

/** Exchange authorization code for tokens */
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<DropboxTokens> {
  const response = await fetch(DROPBOX_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: getAppKey(),
      client_secret: getAppSecret(),
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Dropbox token exchange failed: ${errorText}`)
  }

  const data = await response.json()
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    account_id: data.account_id,
  }
}

/** Refresh an expired access token */
export async function refreshAccessToken(refreshToken: string): Promise<DropboxTokens> {
  const response = await fetch(DROPBOX_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: getAppKey(),
      client_secret: getAppSecret(),
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Dropbox token refresh failed: ${errorText}`)
  }

  const data = await response.json()
  return {
    access_token: data.access_token,
    refresh_token: refreshToken,
    account_id: data.account_id ?? '',
  }
}

/** Create an authenticated Dropbox SDK client */
export function createDropboxClient(accessToken: string): Dropbox {
  return new Dropbox({ accessToken })
}
