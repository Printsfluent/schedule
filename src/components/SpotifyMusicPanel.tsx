import { useMemo } from 'react'
import { Card, SectionTitle } from '../components/ui/Card'
import { parseSpotifyUri, spotifyEmbedSrc, spotifyOpenUrl } from '../lib/spotify'
import type { SpotifySettings } from '../types'

interface SpotifyMusicPanelProps {
  settings: SpotifySettings
  onChange: (patch: Partial<SpotifySettings>) => void
}

export function SpotifyMusicPanel({ settings, onChange }: SpotifyMusicPanelProps) {
  const playlistUri = useMemo(() => parseSpotifyUri(settings.playlistUrl), [settings.playlistUrl])

  return (
    <Card>
      <SectionTitle title="Spotify" subtitle="Paste a link — plays in the embed below" />

      <label className="block text-xs text-subtle">
        Playlist, album, or track URL
        <input
          type="url"
          placeholder="https://open.spotify.com/playlist/..."
          value={settings.playlistUrl}
          onChange={(e) => onChange({ playlistUrl: e.target.value })}
          className="mt-1 w-full rounded-xl bg-inset px-3 py-2 text-sm text-fg outline-none placeholder:text-faint"
        />
      </label>

      {playlistUri && (
        <>
          <a
            href={spotifyOpenUrl(playlistUri)}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block rounded-full bg-[#1db954]/20 px-4 py-2 text-sm font-medium text-[#1db954]"
          >
            Open in Spotify app
          </a>
          <iframe
            title="Spotify embed"
            src={spotifyEmbedSrc(playlistUri)}
            width="100%"
            height="152"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="mt-4 rounded-2xl border-0 bg-[#121212]"
          />
        </>
      )}
    </Card>
  )
}
