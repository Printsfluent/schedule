import { useState } from 'react'
import { resetAllAppData } from '../lib/resetAppData'
import { Card, SectionTitle } from './ui/Card'

export function ResetAppDataPanel() {
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleReset = async () => {
    setBusy(true)
    try {
      await resetAllAppData()
    } catch {
      setBusy(false)
      setConfirm(false)
    }
  }

  return (
    <Card className="border border-[#ff6b6b]/20">
      <SectionTitle
        title="Reset all data"
        subtitle="Clear every log, habit, setting, and reading on this device"
      />
      <p className="text-sm text-muted">
        This removes your schedule edits, focus history, mood logs, habit streaks, gentle streak,
        analytics, weekly plans, timer settings, and alarm state. Everything returns to day zero.
        This cannot be undone.
      </p>
      {!confirm ? (
        <button
          type="button"
          onClick={() => setConfirm(true)}
          className="mt-4 w-full rounded-2xl bg-[#ff6b6b]/15 px-4 py-3 text-sm font-semibold text-[#ff8a8a]"
        >
          Reset everything
        </button>
      ) : (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-[#ff8a8a]">Are you sure? All saved data on this device will be erased.</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirm(false)}
              className="flex-1 rounded-2xl bg-inset-2 px-4 py-3 text-sm text-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleReset()}
              className="flex-1 rounded-2xl bg-[#ff6b6b] px-4 py-3 text-sm font-bold text-accent-text"
            >
              {busy ? 'Resetting…' : 'Yes, reset'}
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}
