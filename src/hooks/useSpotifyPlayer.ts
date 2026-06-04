import { useCallback, useEffect, useRef, useState } from 'react'
import { startSpotifyPlayback, toggleSpotifyPlayback } from '../lib/spotifyApi'
import {
  clearSpotifyTokens,
  getValidSpotifyAccessToken,
  hasSpotifyConnection,
  isSpotifyPlaybackConfigured,
} from '../lib/spotifyAuth'

type SpotifyPlayerInstance = {
  connect: () => Promise<boolean>
  disconnect: () => void
  addListener: (event: string, cb: (state: { device_id?: string; message?: string }) => void) => void
  removeListener: (event: string) => void
  getCurrentState: () => Promise<{ paused: boolean } | null>
  togglePlay: () => Promise<void>
}

declare global {
  interface Window {
    Spotify?: {
      Player: new (options: {
        name: string
        getOAuthToken: (cb: (token: string) => void) => void
        volume: number
      }) => SpotifyPlayerInstance
    }
    onSpotifyWebPlaybackSDKReady?: () => void
  }
}

let sdkLoadPromise: Promise<void> | null = null

function loadSpotifySdk(): Promise<void> {
  if (window.Spotify) return Promise.resolve()
  if (sdkLoadPromise) return sdkLoadPromise

  sdkLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-rhythm-spotify-sdk]')
    if (existing) {
      window.onSpotifyWebPlaybackSDKReady = () => resolve()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://sdk.scdn.co/spotify-player.js'
    script.async = true
    script.dataset.rhythmSpotifySdk = '1'
    script.onerror = () => reject(new Error('Failed to load Spotify player'))
    window.onSpotifyWebPlaybackSDKReady = () => resolve()
    document.body.appendChild(script)
  })

  return sdkLoadPromise
}

export function useSpotifyPlayer() {
  const playerRef = useRef<SpotifyPlayerInstance | null>(null)
  const deviceIdRef = useRef<string | null>(null)
  const [connected, setConnected] = useState(hasSpotifyConnection)
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const configured = isSpotifyPlaybackConfigured()

  const disconnect = useCallback(() => {
    playerRef.current?.disconnect()
    playerRef.current = null
    deviceIdRef.current = null
    clearSpotifyTokens()
    setConnected(false)
    setReady(false)
    setPlaying(false)
    setStatus(null)
  }, [])

  useEffect(() => {
    if (!configured || !connected) return

    let cancelled = false

    const init = async () => {
      try {
        await loadSpotifySdk()
        if (cancelled || !window.Spotify) return

        const token = await getValidSpotifyAccessToken()
        if (!token) {
          setConnected(false)
          return
        }

        const player = new window.Spotify.Player({
          name: 'Rhythm Focus',
          getOAuthToken: (cb) => {
            void getValidSpotifyAccessToken().then((t) => {
              if (t) cb(t)
            })
          },
          volume: 0.8,
        })

        player.addListener('ready', ({ device_id }) => {
          if (!device_id) return
          deviceIdRef.current = device_id
          setReady(true)
          setStatus(null)
        })

        player.addListener('not_ready', () => {
          setReady(false)
        })

        player.addListener('initialization_error', ({ message }) => {
          setStatus(message ?? 'Spotify player failed to start')
          setReady(false)
        })

        player.addListener('authentication_error', () => {
          setStatus('Spotify session expired — connect again')
          disconnect()
        })

        player.addListener('account_error', () => {
          setStatus('Full playback requires Spotify Premium')
          setReady(false)
        })

        player.addListener('player_state_changed', (state) => {
          const s = state as { paused?: boolean } | null | undefined
          setPlaying(Boolean(s && !s.paused))
        })

        playerRef.current = player
        const ok = await player.connect()
        if (!ok && !cancelled) {
          setStatus('Could not connect Spotify player in this browser')
        }
      } catch (e) {
        if (!cancelled) {
          setStatus(e instanceof Error ? e.message : 'Spotify player error')
        }
      }
    }

    void init()

    return () => {
      cancelled = true
      playerRef.current?.disconnect()
      playerRef.current = null
      deviceIdRef.current = null
    }
  }, [configured, connected, disconnect])

  const playUri = useCallback(
    async (uri: string) => {
      const deviceId = deviceIdRef.current
      if (!deviceId) {
        setStatus('Spotify player is not ready yet')
        return
      }
      setStatus(null)
      try {
        await startSpotifyPlayback(deviceId, uri)
        setPlaying(true)
      } catch (e) {
        setStatus(e instanceof Error ? e.message : 'Playback failed')
      }
    },
    [],
  )

  const togglePlay = useCallback(async () => {
    const deviceId = deviceIdRef.current
    if (!deviceId) return
    try {
      await toggleSpotifyPlayback(deviceId)
      const state = await playerRef.current?.getCurrentState()
      setPlaying(state != null && !state.paused)
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Could not toggle playback')
    }
  }, [])

  const markConnected = useCallback(() => {
    setConnected(true)
  }, [])

  return {
    configured,
    connected,
    ready,
    playing,
    status,
    disconnect,
    playUri,
    togglePlay,
    markConnected,
  }
}
