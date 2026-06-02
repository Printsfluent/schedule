import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { formatDisplayDate } from '../../lib/dates'
import { RhythmLogo } from '../RhythmLogo'
import type { TabId } from '../../types'

const TABS: { id: TabId; to: string; icon: string; label: string }[] = [
  { id: 'home', to: '/', icon: '🏠', label: 'Home' },
  { id: 'schedule', to: '/schedule', icon: '📅', label: 'Plan' },
  { id: 'focus', to: '/focus', icon: '🎯', label: 'Focus' },
  { id: 'habits', to: '/habits', icon: '', label: 'Habits' },
  { id: 'insights', to: '/insights', icon: '📊', label: 'Insights' },
]

function HabitsLeafIcon() {
  return (
    <svg
      className="size-[17px] shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 3C9 7 5 9 5 14.5 5 18 7.8 20.5 12 21.5 16.2 20.5 19 18 19 14.5 19 9 15 7 12 3Z"
        fill="#5ecf8f"
      />
      <path
        d="M12 8.5V21"
        stroke="#3dd68c"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

function TabIcon({ tabId, emoji }: { tabId: TabId; emoji: string }) {
  if (tabId === 'habits') return <HabitsLeafIcon />
  return (
    <span className="leading-none" style={{ fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif' }}>
      {emoji}
    </span>
  )
}

export function TabBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-tabbar pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1">
        {TABS.map((tab) => (
          <NavLink
            key={tab.id}
            to={tab.to}
            end={tab.to === '/'}
            className="flex min-w-0 flex-1 flex-col items-center gap-1 py-2"
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex size-[37px] items-center justify-center rounded-xl text-[17px] leading-none transition-all ${isActive ? 'bg-accent-soft scale-105' : ''}`}
                  style={{ color: 'unset' }}
                  aria-hidden
                >
                  <TabIcon tabId={tab.id} emoji={tab.icon} />
                </span>
                <span
                  className={`text-[10px] font-medium leading-none transition-colors ${isActive ? 'text-accent' : 'text-subtle'}`}
                >
                  {tab.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export function AppHeader() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-header px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <RhythmLogo />
          <span className="text-lg font-bold tracking-tight text-fg">Rhythm</span>
        </div>
        <time dateTime={now.toISOString()} className="shrink-0 text-right text-sm font-medium leading-tight text-accent">
          {formatDisplayDate(now)}
        </time>
      </div>
    </header>
  )
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="border-b border-border px-4 py-4">
      <h1 className="text-[28px] font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-0.5 text-[14px] text-subtle">{subtitle}</p>}
    </header>
  )
}
