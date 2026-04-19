import type { Tables } from '@/types/database'

interface Props {
  logs: Tables<'daily_logs'>[]
  metrics: Tables<'tracker_metrics'>[]
  today: string
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function formatDisplayDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function ConsistencyGrid({ logs, metrics, today }: Props) {
  const totalMetrics = metrics.length
  const days: string[] = []
  for (let i = 90; i >= 0; i--) days.push(addDays(today, -i))

  const logMap = new Map(logs.map((l) => [l.log_date, l]))
  const firstDay = new Date(days[0])
  const dayOfWeek = firstDay.getDay()
  const paddingBefore = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const paddedDays = Array<string | null>(paddingBefore).fill(null).concat(days)

  function cellColor(date: string | null): string {
    if (!date) return 'bg-transparent'
    const log = logMap.get(date)
    if (!log) return 'bg-stone-800/80'
    if (totalMetrics === 0) return 'bg-leather-500/60'
    const vals = log.values as Record<string, unknown>
    const logged = Object.keys(vals).filter(
      (k) => vals[k] !== null && vals[k] !== '' && vals[k] !== false
    ).length
    const ratio = logged / totalMetrics
    if (ratio === 0) return 'bg-stone-800/80'
    if (ratio < 0.5) return 'bg-leather-500/30'
    if (ratio < 1) return 'bg-leather-500/60'
    return 'bg-moss-400'
  }

  return (
    <div>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-widest text-bone-muted/50">
        Consistency · 90 days
      </h2>
      <div className="mb-1 grid max-w-md grid-cols-[repeat(7,minmax(0,1fr))] gap-1">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] text-bone-muted/40">
            {d}
          </div>
        ))}
      </div>
      <div className="grid max-w-md grid-cols-[repeat(7,minmax(0,1fr))] gap-1">
        {paddedDays.map((date, i) => (
          <div
            key={i}
            title={date ? `${formatDisplayDate(date)}${logMap.has(date) ? ' · logged' : ''}` : ''}
            className={`aspect-square rounded-sm ${cellColor(date)}`}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-bone-muted/40">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="h-3 w-3 rounded-sm bg-stone-800/80" />
          <div className="h-3 w-3 rounded-sm bg-leather-500/30" />
          <div className="h-3 w-3 rounded-sm bg-leather-500/60" />
          <div className="h-3 w-3 rounded-sm bg-moss-400" />
        </div>
        <span>More</span>
      </div>
    </div>
  )
}
