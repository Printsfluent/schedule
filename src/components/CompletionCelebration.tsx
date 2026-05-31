import { useEffect } from 'react'

interface Props {
  show: boolean
  label?: string
  onDone: () => void
}

export function CompletionCelebration({ show, label, onDone }: Props) {
  useEffect(() => {
    if (!show) return
    const t = window.setTimeout(onDone, 1400)
    return () => clearTimeout(t)
  }, [show, onDone])

  if (!show) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center animate-fade-in">
      <div className="rounded-3xl border border-accent/40 bg-base/95 px-8 py-6 text-center shadow-2xl backdrop-blur-md animate-slide-up">
        <div className="text-5xl animate-bounce">✨</div>
        <p className="mt-2 text-lg font-bold text-accent">Nice!</p>
        {label && <p className="mt-1 text-sm text-muted">{label} done</p>}
      </div>
    </div>
  )
}
