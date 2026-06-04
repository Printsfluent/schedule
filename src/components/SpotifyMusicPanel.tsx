import { useMemo, useState } from 'react'
import { Card, SectionTitle } from '../components/ui/Card'
import { useSpotifyPlayer } from '../hooks/useSpotifyPlayer'
import { beginSpotifyLogin } from '../lib/spotifyAuth'
import {
  parseSpotifyUri,
  spotifyContentLabel,
  spotifyEmbedHeight,
  spotifyEmbedSrc,
  spotifyOpenUrl,
} from '../lib/spotify'
import type { SpotifySettings } from '../types'

interface SpotifyMusicPanelProps {
  settings: SpotifySettings
  onChange: (patch: Partial<SpotifySettings>) => void
}

export function SpotifyMusicPanel({ settings, onChange }: SpotifyMusicPanelProps) {
  const playlistUri = useMemo(() => parseSpotifyUri(settings.playlistUrl), [settings.playlistUrl])
  const embedHeight = playlistUri ? spotifyEmbedHeight(playlistUri) : 152
  const [busy, setBusy] = useState(false)
  const player = useSpotifyPlayer()

  const handleConnect = async () => {
    setBusy(true)
    try {
      await beginSpotifyLogin('/focus')
    } catch (e) {
      setBusy(false)
      player.disconnect()
      alert(e instanceof Error ? e.message : 'Could not start Spotify sign-in')
    }
  }

  const handlePlayFull = async () => {
    if (!playlistUri) return
    setBusy(true)
    try {
      await player.playUri(playlistUri)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <SectionTitle
        title="Spotify"
        subtitle={
          player.configured
            ? 'Connect with Premium for full songs and playlists in Rhythm'
            : 'Paste a link — embed plays here; open in Spotify for full tracks'
        }
      />

      {player.configured && (
        <div className="mb-3 space-y-2">
          {!player.connected ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleConnect()}
              className="w-full rounded-2xl bg-[#1db954] py-2.5 text-sm font-semibold text-black disabled:opacity-60"
            >
              Connect Spotify (Premium)
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#1db954]/15 px-3 py-1 text-xs font-medium text-[#1db954]">
                {player.ready ? 'Ready for full playback' : 'Connecting player…'}
              </span>
              {playlistUri && player.ready && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handlePlayFull()}
                  className="rounded-full bg-[#1db954] px-4 py-1.5 text-xs font-semibold text-black disabled:opacity-60"
                >
                  Play full {spotifyContentLabel(playlistUri)}
                </button>
              )}
              {player.ready && (
                <button
                  type="button"
                  onClick={() => void player.togglePlay()}
                  className="rounded-full bg-inset px-3 py-1.5 text-xs text-muted"
                >
                  {player.playing ? 'Pause' : 'Resume'}
                </button>
              )}
              <button
                type="button"
                onClick={player.disconnect}
                className="rounded-full bg-inset px-3 py-1.5 text-xs text-subtle"
              >
                Disconnect
              </button>
            </div>
          )}
          {player.status && (
            <p className="text-xs text-amber-400/90">{player.status}</p>
          )}
        </div>
      )}

      <label className="block text-xs text-subtle">
        Playlist, album, track, artist, or podcast URL
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
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={spotifyOpenUrl(playlistUri)}
              className="rounded-full bg-[#1db954]/20 px-4 py-2 text-sm font-medium text-[#1db954]"
            >
              Open in Spotify app
            </a>
            <a
              href={spotifyOpenUrl(playlistUri)}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-inset px-4 py-2 text-sm text-muted"
            >
              Open in browser
            </a>
          </div>
          <iframe
            title="Spotify embed"
            src={spotifyEmbedSrc(playlistUri)}
            width="100%"
            height={embedHeight}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="mt-4 rounded-2xl border-0 bg-[#121212]"
          />
          <p className="mt-2 text-[10px] text-faint">
            {player.configured
              ? 'Embed may show 30s previews — use Play full after connecting Premium.'
              : 'For full playback in-app, add VITE_SPOTIFY_CLIENT_ID (see README). Logged-in Premium users may get full tracks in the embed on desktop.'}
          </p>
        </>
      )}
    </Card>
  )
}
