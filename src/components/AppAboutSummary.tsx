import { APP_FEATURES, APP_SUMMARY, APP_TAGLINE } from '../content/appSummary'

export function AppAboutSummary() {
  return (
    <section
      className="mb-6 rounded-2xl border border-border/80 bg-panel/40 px-4 py-4 text-left"
      aria-labelledby="about-rhythm-heading"
    >
      <h2 id="about-rhythm-heading" className="sr-only">
        About Rhythm
      </h2>
      <p className="text-center text-sm font-medium text-fg">{APP_TAGLINE}</p>
      <p className="mt-2 text-center text-xs leading-relaxed text-subtle">{APP_SUMMARY}</p>
      <ul className="mt-3 space-y-2 border-t border-border/60 pt-3">
        {APP_FEATURES.map(({ label, detail }) => (
          <li key={label} className="text-xs leading-relaxed text-muted">
            <span className="font-semibold text-fg">{label}</span>
            <span className="text-subtle"> — {detail}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-center text-[10px] leading-relaxed text-faint">
        Sign in to sync your schedule, mood, habits, and settings across your devices.
      </p>
    </section>
  )
}
