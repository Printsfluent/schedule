interface Props {
  onYes: () => void
  onNo: () => void
}

export function EndOfDayPlanPrompt({ onYes, onNo }: Props) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-panel p-6 text-center shadow-2xl animate-slide-up">
        <div className="text-5xl">🌙</div>
        <h2 className="mt-4 text-xl font-bold tracking-tight">Great work today!</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Your last planned event is done. Want to plan for tomorrow?
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={onYes}
            className="w-full rounded-2xl bg-accent py-3.5 text-base font-bold text-accent-text active:scale-[0.98] transition-transform"
          >
            Yes, plan tomorrow
          </button>
          <button
            type="button"
            onClick={onNo}
            className="w-full rounded-2xl bg-inset py-3 text-sm font-medium text-muted"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
