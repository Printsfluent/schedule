export function parseSpotifyUri(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('spotify:')) return trimmed

  try {
    const url = new URL(trimmed)
    if (!url.hostname.includes('spotify.com')) return null
    const parts = url.pathname.split('/').filter(Boolean)
    if (parts.length < 2) return null
    const [type, id] = parts
    if (!['playlist', 'album', 'artist', 'track'].includes(type)) return null
    return `spotify:${type}:${id.split('?')[0]}`
  } catch {
    return null
  }
}

export function spotifyEmbedSrc(uri: string) {
  const id = uri.replace('spotify:', '').replace(':', '/')
  return `https://open.spotify.com/embed/${id}?utm_source=generator&theme=0`
}

export function spotifyOpenUrl(uri: string) {
  const path = uri.replace('spotify:', '').replace(':', '/')
  return `https://open.spotify.com/${path}`
}
