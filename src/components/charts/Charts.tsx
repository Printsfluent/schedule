interface BarChartProps {
  data: { label: string; value: number; color?: string }[]
  max?: number
  height?: number
}

export function BarChart({ data, max, height = 120 }: BarChartProps) {
  const peak = max ?? Math.max(...data.map((d) => d.value), 1)

  return (
    <div className="flex items-end justify-between gap-1.5" style={{ height }}>
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1.5">
          <div className="relative w-full flex-1">
            <div
              className="absolute bottom-0 w-full rounded-t-lg transition-all duration-700 ease-out"
              style={{
                height: `${(d.value / peak) * 100}%`,
                background: d.color ?? 'linear-gradient(to top, #3dd68c88, #3dd68c)',
                minHeight: d.value > 0 ? 4 : 0,
              }}
            />
          </div>
          <span className="text-[10px] text-faint">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

interface LineChartProps {
  data: { label: string; value: number | null; value2?: number | null }[]
  height?: number
  color?: string
  color2?: string
}

export function LineChart({ data, height = 100, color = '#3dd68c', color2 = '#6ea8fe' }: LineChartProps) {
  const values = data.map((d) => d.value ?? 0)
  const values2 = data.map((d) => d.value2 ?? 0)
  const max = Math.max(...values, ...values2, 5)
  const w = 100
  const h = height

  const toPoints = (vals: number[]) =>
    vals
      .map((v, i) => {
        const x = (i / Math.max(vals.length - 1, 1)) * w
        const y = h - (v / max) * (h - 8) - 4
        return `${x},${y}`
      })
      .join(' ')

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={toPoints(values)} opacity="0.9" />
      {data.some((d) => d.value2 != null) && (
        <polyline fill="none" stroke={color2} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={toPoints(values2)} opacity="0.7" />
      )}
    </svg>
  )
}

export function StatGrid({ stats }: { stats: { label: string; value: string; sub?: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {stats.map((s) => (
        <div key={s.label} className="rounded-2xl bg-inset p-3">
          <div className="text-[11px] uppercase tracking-wide text-faint">{s.label}</div>
          <div className="mt-1 text-xl font-semibold tabular-nums">{s.value}</div>
          {s.sub && <div className="text-[11px] text-faint">{s.sub}</div>}
        </div>
      ))}
    </div>
  )
}
