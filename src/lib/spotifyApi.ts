import { getValidSpotifyAccessToken } from './spotifyAuth'

export async function spotifyFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await getValidSpotifyAccessToken()
  if (!token) throw new Error('Connect Spotify to play full tracks')

  return fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    },
  })
}

/** Start full playback on the Web Playback SDK device (Premium). */
export async function startSpotifyPlayback(deviceId: string, uri: string): Promise<void> {
  const isTrack = uri.startsWith('spotify:track:')
  const body = isTrack ? { uris: [uri] } : { context_uri: uri }

  const res = await spotifyFetch(`/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })

  if (res.status === 204 || res.ok) return

  const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
  if (res.status === 403) {
    throw new Error('Full playback needs Spotify Premium on this account')
  }
  throw new Error(err.error?.message ?? `Playback failed (${res.status})`)
}

export async function toggleSpotifyPlayback(deviceId: string): Promise<void> {
  const stateRes = await spotifyFetch('/me/player')
  if (!stateRes.ok) throw new Error('Could not read playback state')
  const state = (await stateRes.json()) as { is_playing?: boolean }
  const action = state.is_playing ? 'pause' : 'play'
  const res = await spotifyFetch(
    `/me/player/${action}?device_id=${encodeURIComponent(deviceId)}`,
    { method: 'PUT' },
  )
  if (!res.ok && res.status !== 204) {
    throw new Error('Could not change playback')
  }
}
