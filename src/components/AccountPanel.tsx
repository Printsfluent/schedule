import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Card, SectionTitle } from './ui/Card'

export function AccountPanel() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <Card glow="#6ea8fe">
      <SectionTitle title="Account" subtitle="Your Supabase sign-in" />
      {user ? (
        <div className="mb-3 rounded-2xl bg-inset px-4 py-3">
          <div className="text-sm font-semibold">@{user.username}</div>
          <div className="text-xs text-subtle">{user.email}</div>
        </div>
      ) : (
        <p className="mb-3 text-sm text-subtle">Signed in</p>
      )}
      <button
        type="button"
        onClick={() => void handleSignOut()}
        className="w-full rounded-2xl border border-border bg-inset py-3 text-sm font-semibold text-fg"
      >
        Sign out
      </button>
    </Card>
  )
}
