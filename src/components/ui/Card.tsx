import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  glow?: string
  onClick?: () => void
}

export function Card({ children, className = '', glow, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`animate-fade-in rounded-3xl border border-border bg-panel/90 p-4 card-shadow backdrop-blur-xl transition-all duration-300 active:scale-[0.99] ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={glow ? { boxShadow: `0 8px 40px ${glow}22, 0 0 0 1px ${glow}18` } : undefined}
    >
      {children}
    </div>
  )
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-[17px] font-semibold tracking-tight text-fg">{title}</h2>
      {subtitle && <p className="mt-0.5 text-[13px] text-subtle">{subtitle}</p>}
    </div>
  )
}
