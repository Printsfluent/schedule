import type { SVGProps } from 'react'

export function RhythmLogo({ className = 'size-9 shrink-0 rounded-xl', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden
      {...props}
    >
      <rect width="48" height="48" rx="10" fill="#0a0e14" />
      <path
        d="M5 26H10L13 18L17 32L20 21L24 29L27 17L31 26H43"
        stroke="#3dd68c"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="21" r="2.2" fill="#3dd68c" />
    </svg>
  )
}
