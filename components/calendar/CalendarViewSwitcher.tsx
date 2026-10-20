'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

type CalendarView = 'day' | 'week'

const VIEWS: { key: CalendarView; label: string }[] = [
  { key: 'day', label: 'TODO(stella): Day' },
  { key: 'week', label: 'TODO(stella): Week' },
]

export function CalendarViewSwitcher({ current }: { current: CalendarView }) {
  const pathname = usePathname()
  const params = useSearchParams()
  const date = params.get('date')

  const hrefFor = (view: CalendarView) => {
    const sp = new URLSearchParams(params.toString())
    sp.set('view', view)
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      sp.set('date', date)
    }
    const qs = sp.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  return (
    <div className="flex gap-2 text-xs uppercase tracking-wider">
      {VIEWS.map((v) => (
        <Link
          key={v.key}
          href={hrefFor(v.key)}
          className={cn(
            'rounded-full border px-3 py-1',
            current === v.key
              ? 'border-leather-400/50 bg-leather-500/20 text-bone'
              : 'border-border/40 text-bone-muted/50 hover:text-bone-muted'
          )}
        >
          {v.label}
        </Link>
      ))}
    </div>
  )
}
