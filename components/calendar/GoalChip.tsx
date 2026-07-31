'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Tables } from '@/types/database'
import { SHORT_DAY_NAMES } from '@/components/calendar/utils'

type AreaGoalRow = Tables<'area_goals'>

interface Props {
  goal: AreaGoalRow
  weekDates: string[]
  defaultDate: string
  alreadyAdded: boolean
}

export function GoalChip({ goal, weekDates, defaultDate, alreadyAdded }: Props) {
  const router = useRouter()
  const fallbackDate = weekDates.includes(defaultDate) ? defaultDate : weekDates[0]
  const [date, setDate] = useState(fallbackDate)
  const [added, setAdded] = useState(alreadyAdded)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function addToDay() {
    if (isSubmitting || added) return
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/plan-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_date: date, title: goal.title, area_goal_id: goal.id, source: 'goal' }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'Could not add this goal')
        return
      }
      setAdded(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add this goal')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex max-w-full flex-col gap-1">
      <div className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-leather-500/30 bg-leather-500/15 py-1 pl-3 pr-1 text-xs text-leather-200">
        <span className="min-w-0 truncate">{goal.title}</span>
        {added ? (
          <span className="shrink-0 px-2 py-2 text-moss-300">✓ Planned</span>
        ) : (
          <>
            <label className="sr-only" htmlFor={`goal-day-${goal.id}`}>
              Day for {goal.title}
            </label>
            <select
              id={`goal-day-${goal.id}`}
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="min-h-10 rounded-xl border border-leather-400/30 bg-stone-900 px-2 text-xs text-leather-100 focus:border-leather-300 focus:outline-none"
            >
              {weekDates.map((weekDate, index) => (
                <option key={weekDate} value={weekDate}>
                  {SHORT_DAY_NAMES[index]} {Number(weekDate.slice(8))}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addToDay}
              disabled={isSubmitting}
              title={`Add "${goal.title}" as a task on ${date}`}
              className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-xl px-2 text-xs font-semibold text-leather-100 transition-colors hover:bg-leather-400/30 disabled:opacity-50"
            >
              {isSubmitting ? '…' : 'Add'}
            </button>
          </>
        )}
      </div>
      {error ? <span className="px-2 text-xs text-red-400">{error}</span> : null}
    </div>
  )
}
