import { safeStorage } from './browserCompat'

const TOKEN_KEY = 'rhythm.spotify.tokens'
const VERIFIER_KEY = 'rhythm.spotify.pkce'
const RETURN_KEY = 'rhythm.spotify.return'

const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-modify-playback-state',
  'user-read-playback-state',
]

export type SpotifyTokens = {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export function getSpotifyClientId(): string {
  return import.meta.env.VITE_SPOTIFY_CLIENT_ID?.trim() ?? ''
}

export function isSpotifyPlaybackConfigured(): boolean {
  return getSpotifyClientId().length > 0
}

export function getSpotifyRedirectUri(): string {
  return `${window.location.origin}/spotify/callback`
}

function loadTokens(): SpotifyTokens | null {
  try {
    const raw = safeStorage.getItem(TOKEN_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SpotifyTokens
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.expiresAt) return null
    return parsed
  } catch {
    return null
  }
}

function saveTokens(tokens: SpotifyTokens): void {
  safeStorage.setItem(TOKEN_KEY, JSON.stringify(tokens))
}

export function clearSpotifyTokens(): void {
  safeStorage.removeItem(TOKEN_KEY)
}

export function hasSpotifyConnection(): boolean {
  return loadTokens() !== null
}

function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const values = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(values, (v) => chars[v % chars.length]).join('')
}

async function sha256Base64Url(value: string): Promise<string> {
  const data = new TextEncoder().encode(value)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function tokensFromResponse(body: {
  access_token: string
  refresh_token?: string
  expires_in: number
}): SpotifyTokens | null {
  if (!body.access_token || !body.expires_in) return null
  const existing = loadTokens()
  const refreshToken = body.refresh_token ?? existing?.refreshToken
  if (!refreshToken) return null
  return {
    accessToken: body.access_token,
    refreshToken,
    expiresAt: Date.now() + body.expires_in * 1000,
  }
}

async function requestToken(params: Record<string, string>): Promise<SpotifyTokens> {
  const clientId = getSpotifyClientId()
  if (!clientId) throw new Error('Spotify is not configured')

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, ...params }),
  })

  const body = (await res.json()) as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
    error?: string
    error_description?: string
  }

  if (!res.ok) {
    throw new Error(body.error_description ?? body.error ?? 'Spotify sign-in failed')
  }

  const tokens = tokensFromResponse({
    access_token: body.access_token!,
    refresh_token: body.refresh_token,
    expires_in: body.expires_in!,
  })
  if (!tokens) throw new Error('Spotify returned an invalid token')
  saveTokens(tokens)
  return tokens
}

export async function beginSpotifyLogin(returnPath = '/focus'): Promise<void> {
  const clientId = getSpotifyClientId()
  if (!clientId) throw new Error('Add VITE_SPOTIFY_CLIENT_ID to enable full playback')

  const verifier = randomString(64)
  const challenge = await sha256Base64Url(verifier)
  sessionStorage.setItem(VERIFIER_KEY, verifier)
  sessionStorage.setItem(RETURN_KEY, returnPath)

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: getSpotifyRedirectUri(),
    scope: SCOPES.join(' '),
    code_challenge_method: 'S256',
    code_challenge: challenge,
    show_dialog: 'false',
  })

  window.location.href = `https://accounts.spotify.com/authorize?${params}`
}

export async function completeSpotifyLogin(code: string): Promise<void> {
  const verifier = sessionStorage.getItem(VERIFIER_KEY)
  sessionStorage.removeItem(VERIFIER_KEY)
  if (!verifier) throw new Error('Spotify sign-in expired — try again')

  await requestToken({
    grant_type: 'authorization_code',
    code,
    redirect_uri: getSpotifyRedirectUri(),
    code_verifier: verifier,
  })
}

export function getSpotifyReturnPath(): string {
  const path = sessionStorage.getItem(RETURN_KEY) ?? '/focus'
  sessionStorage.removeItem(RETURN_KEY)
  return path.startsWith('/') ? path : '/focus'
}

async function refreshAccessToken(refreshToken: string): Promise<SpotifyTokens> {
  return requestToken({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })
}

export async function getValidSpotifyAccessToken(): Promise<string | null> {
  const stored = loadTokens()
  if (!stored) return null
  if (Date.now() < stored.expiresAt - 60_000) return stored.accessToken
  try {
    const next = await refreshAccessToken(stored.refreshToken)
    return next.accessToken
  } catch {
    clearSpotifyTokens()
    return null
  }
}
