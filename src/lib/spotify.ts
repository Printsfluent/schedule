export type SpotifyContentType = 'playlist' | 'album' | 'artist' | 'track' | 'episode' | 'show'

const CONTENT_TYPES: SpotifyContentType[] = [
  'playlist',
  'album',
  'artist',
  'track',
  'episode',
  'show',
]

export function parseSpotifyUri(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('spotify:')) return trimmed

  try {
    const url = new URL(trimmed)
    if (!url.hostname.includes('spotify.com')) return null

    const parts = url.pathname.split('/').filter(Boolean)
    // open.spotify.com/intl-en/playlist/...
    const typeIdx = parts.findIndex((p) => CONTENT_TYPES.includes(p as SpotifyContentType))
    if (typeIdx < 0 || typeIdx + 1 >= parts.length) return null
    const type = parts[typeIdx] as SpotifyContentType
    const id = parts[typeIdx + 1].split('?')[0]
    return `spotify:${type}:${id}`
  } catch {
    return null
  }
}

export function spotifyContentType(uri: string): SpotifyContentType | null {
  const match = uri.match(/^spotify:(\w+):/)
  const type = match?.[1]
  return CONTENT_TYPES.includes(type as SpotifyContentType) ? (type as SpotifyContentType) : null
}

export function spotifyEmbedSrc(uri: string) {
  const id = uri.replace('spotify:', '').replace(':', '/')
  return `https://open.spotify.com/embed/${id}?utm_source=generator&theme=0`
}

/** Taller embed for playlists/albums so the full track list is usable. */
export function spotifyEmbedHeight(uri: string): number {
  const type = spotifyContentType(uri)
  if (type === 'playlist' || type === 'album' || type === 'show') return 380
  if (type === 'artist') return 352
  if (type === 'track' || type === 'episode') return 152
  return 152
}

export function spotifyOpenUrl(uri: string) {
  const path = uri.replace('spotify:', '').replace(':', '/')
  return `https://open.spotify.com/${path}`
}

export function spotifyContentLabel(uri: string): string {
  const type = spotifyContentType(uri)
  switch (type) {
    case 'playlist':
      return 'playlist'
    case 'album':
      return 'album'
    case 'artist':
      return 'artist'
    case 'track':
      return 'track'
    case 'episode':
      return 'episode'
    case 'show':
      return 'podcast'
    default:
      return 'link'
  }
}
