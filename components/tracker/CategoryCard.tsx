import type { Tables } from '@/types/database'

interface Props {
  category: { id: string; name: string; color_key: string | null; icon_key: string | null }
  metrics: Tables<'tracker_metrics'>[]
  recentLogs: Tables<'daily_logs'>[]
  today: string
}

export function CategoryCard({ category, metrics, recentLogs, today }: Props) {
  const monthStart = today.slice(0, 7) + '-01'
  const logsThisMonth = recentLogs.filter((l) => l.log_date >= monthStart).length
  const daysInMonth = new Date(
    Number.parseInt(today.slice(0, 4), 10),
    Number.parseInt(today.slice(5, 7), 10),
    0
  ).getDate()

  const last14: boolean[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const log = recentLogs.find((l) => l.log_date === dateStr)
    if (!log) {
      last14.push(false)
      continue
    }
    const vals = log.values as Record<string, unknown>
    const hasData = metrics.some(
      (m) => m.key in vals && vals[m.key] !== null && vals[m.key] !== '' && vals[m.key] !== false
    )
    last14.push(hasData)
  }

  return (
    <div className="shell-grid-card space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-base">{category.icon_key ?? '•'}</span>
        <h3 className="text-sm font-medium text-bone">{category.name}</h3>
      </div>

      <div className="flex h-5 items-end gap-0.5">
        {last14.map((logged, i) => (
          <div
            key={i}
            className={`flex-1 rounded-sm ${logged ? 'h-full bg-leather-400' : 'h-2 bg-stone-800/80'}`}
          />
        ))}
      </div>

      <p className="text-xs text-bone-muted">
        {logsThisMonth} / {daysInMonth} days logged this month
      </p>
    </div>
  )
}
