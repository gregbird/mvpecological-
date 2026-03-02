import { Dropbox, DropboxAuth } from 'dropbox'

export interface DropboxTokens {
  access_token: string
  refresh_token: string
  account_id: string
}

function getAppKey(): string {
  const key = process.env.DROPBOX_APP_KEY
  if (!key) throw new Error('Missing DROPBOX_APP_KEY environment variable')
  return key
}

const DROPBOX_TOKEN_URL = 'https://api.dropboxapi.com/oauth2/token'

/** Create a DropboxAuth instance to generate PKCE auth URL + code verifier */
export async function createAuthUrlWithPKCE(
  redirectUri: string,
  state: string
): Promise<{ authUrl: string; codeVerifier: string }> {
  const dbxAuth = new DropboxAuth({
    clientId: getAppKey(),
    fetch: globalThis.fetch,
  })

  const authUrl = (await dbxAuth.getAuthenticationUrl(
    redirectUri,
    state,
    'code',
    'offline',
    undefined,
    'none',
    true // usePKCE
  )) as unknown as string

  const codeVerifier = dbxAuth.getCodeVerifier()

  return { authUrl, codeVerifier }
}

/** Exchange authorization code for tokens using direct fetch (not SDK, avoids this.fetch bug) */
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
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Token exchange failed (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? '',
    account_id: data.account_id ?? '',
  }
}

/** Refresh an expired access token */
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch(DROPBOX_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: getAppKey(),
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Token refresh failed (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  return data.access_token
}

/** Create an authenticated Dropbox SDK client */
export function createDropboxClient(accessToken: string): Dropbox {
  return new Dropbox({ accessToken, fetch: globalThis.fetch })
}
