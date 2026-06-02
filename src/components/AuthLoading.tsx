import { RhythmLogo } from './RhythmLogo'

export function AuthLoading() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-base px-6">
      <RhythmLogo className="size-12 rounded-2xl animate-pulse" />
      <p className="mt-4 text-sm text-subtle">Loading…</p>
    </div>
  )
}
