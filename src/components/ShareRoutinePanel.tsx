import { useState } from 'react'
import { buildSharePayload, decodeSharePayload, importSharePayload, shareRoutineWithFriends } from '../lib/shareRoutine'
import { formatDateKey } from '../lib/dates'
import type { AppState } from '../types'
import { Card, SectionTitle } from './ui/Card'

interface Props {
  state: AppState
  onImport: (plan: ReturnType<typeof importSharePayload>) => void
}

export function ShareRoutinePanel({ state, onImport }: Props) {
  const [status, setStatus] = useState<string | null>(null)
  const [importText, setImportText] = useState('')
  const todayKey = formatDateKey(new Date())

  const handleShare = async () => {
    setStatus(null)
    const payload = buildSharePayload(state, todayKey)
    const ok = await shareRoutineWithFriends(payload)
    setStatus(ok ? 'Link copied — send to a friend via WhatsApp, iMessage, or email.' : 'Could not share. Try again.')
  }

  const handleImport = () => {
    const payload = decodeSharePayload(importText)
    if (!payload) {
      setStatus('Paste a valid Rhythm share link or routine data.')
      return
    }
    onImport(importSharePayload(payload))
    setImportText('')
    setStatus(`Imported ${payload.samplePlan.length || 'friend\'s'} plan items for today.`)
  }

  return (
    <Card glow="#6ea8fe">
      <SectionTitle title="Share with friends" subtitle="Accountability partners & routine swaps" />
      <p className="mb-3 text-xs leading-relaxed text-subtle">
        Share your daily plan and schedule mode. Friends paste your link in Rhythm to copy your routine.
      </p>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => void handleShare()}
          className="w-full rounded-2xl bg-[#6ea8fe] py-3 text-sm font-semibold text-accent-text"
        >
          Share my routine
        </button>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="Paste a friend&apos;s Rhythm share link here…"
          rows={3}
          className="w-full rounded-xl bg-inset px-3 py-2 text-xs outline-none"
        />
        <button
          type="button"
          onClick={handleImport}
          disabled={!importText.trim()}
          className="w-full rounded-2xl border border-border py-3 text-sm text-muted disabled:opacity-40"
        >
          Import friend&apos;s routine
        </button>
      </div>
      {status && <p className="mt-3 text-xs text-accent">{status}</p>}
    </Card>
  )
}
