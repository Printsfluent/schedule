import { RhythmLogo } from './RhythmLogo'

export function AuthLoading({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-base px-6">
      <RhythmLogo className="size-12 rounded-2xl animate-pulse" />
      <p className="mt-4 max-w-xs text-center text-sm text-subtle">{message}</p>
    </div>
  )
}
