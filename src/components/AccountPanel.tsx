import { useAuth } from '../context/AuthContext'
import { Card, SectionTitle } from './ui/Card'

export function AccountPanel() {
  const { user, signOut } = useAuth()

  if (!user) return null

  return (
    <Card glow="#3dd68c">
      <SectionTitle title="Account" subtitle="Signed in with Supabase" />
      <div className="mb-3 rounded-2xl bg-inset px-4 py-3">
        <div className="text-sm font-semibold">@{user.username}</div>
        <div className="text-xs text-subtle">{user.email}</div>
      </div>
      <button
        type="button"
        onClick={() => void signOut()}
        className="w-full rounded-2xl border border-border py-3 text-sm text-muted"
      >
        Sign out
      </button>
    </Card>
  )
}
