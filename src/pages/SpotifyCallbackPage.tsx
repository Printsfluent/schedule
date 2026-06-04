import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { completeSpotifyLogin, getSpotifyReturnPath } from '../lib/spotifyAuth'

export function SpotifyCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const err = params.get('error')
    if (err) {
      setError(err === 'access_denied' ? 'Spotify access was denied' : err)
      return
    }

    const code = params.get('code')
    if (!code) {
      setError('Missing Spotify authorization code')
      return
    }

    void (async () => {
      try {
        await completeSpotifyLogin(code)
        navigate(getSpotifyReturnPath(), { replace: true })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Spotify sign-in failed')
      }
    })()
  }, [navigate])

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center px-6 text-center">
      {error ? (
        <>
          <p className="text-sm text-red-400">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/focus', { replace: true })}
            className="mt-4 rounded-2xl bg-inset px-4 py-2 text-sm"
          >
            Back to Focus
          </button>
        </>
      ) : (
        <p className="text-sm text-subtle">Connecting Spotify…</p>
      )}
    </div>
  )
}
