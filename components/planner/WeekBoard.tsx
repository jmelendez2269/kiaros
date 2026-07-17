'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { DaySummary } from '@/lib/planner/get-week-plan'
import type { PlanItemRow } from '@/lib/planner/get-day-plan'
import type { AreaGoalRow } from '@/lib/planner/get-week-goals'

const ENERGY_DOT: Record<string, string> = {
  push: 'bg-leather-400',
  initiate: 'bg-ember-400',
  reflect: 'bg-plum-400',
  rest: 'bg-moss-400',
}

const SHORT_DAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function formatTime(minute: number): string {
  const h = Math.floor(minute / 60)
  const m = minute % 60
  const displayH = h % 12 === 0 ? 12 : h % 12
  const suffix = h < 12 ? 'a' : 'p'
  return m === 0 ? `${displayH}${suffix}` : `${displayH}:${String(m).padStart(2, '0')}${suffix}`
}

interface Props {
  days: DaySummary[]
  weekGoals: AreaGoalRow[]
  today: string
}

export function WeekBoard({ days: initialDays, weekGoals, today }: Props) {
  const [days, setDays] = useState(initialDays)
  const [addingFor, setAddingFor] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [addedGoalIds, setAddedGoalIds] = useState<Set<string>>(new Set())
  const [goalDayChoice, setGoalDayChoice] = useState<Record<string, string>>({})

  function upsertItem(date: string, item: PlanItemRow) {
    setDays((prev) =>
      prev.map((d) =>
        d.date === date
          ? {
              ...d,
              planItems: d.planItems.some((i) => i.id === item.id)
                ? d.planItems.map((i) => (i.id === item.id ? item : i))
                : [...d.planItems, item],
            }
          : d
      )
    )
  }

  function patchLocal(date: string, id: string, completedAt: string | null) {
    setDays((prev) =>
      prev.map((d) =>
        d.date === date ? { ...d, planItems: d.planItems.map((i) => (i.id === id ? { ...i, completed_at: completedAt } : i)) } : d
      )
    )
  }

  async function toggleItem(date: string, item: PlanItemRow) {
    const nextCompleted = !item.completed_at
    const nextCompletedAt = nextCompleted ? new Date().toISOString() : null
    patchLocal(date, item.id, nextCompletedAt)
    const res = await fetch(`/api/plan-items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: nextCompleted }),
    })
    if (res.ok) {
      const { item: updated } = await res.json()
      upsertItem(date, updated)
    } else {
      patchLocal(date, item.id, item.completed_at) // revert
    }
  }

  async function addGoalToDay(goal: AreaGoalRow) {
    const date = goalDayChoice[goal.id] ?? today
    const res = await fetch('/api/plan-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_date: date, title: goal.title, area_goal_id: goal.id, source: 'goal' }),
    })
    if (res.ok) {
      const { item } = await res.json()
      upsertItem(date, item)
      setAddedGoalIds((prev) => new Set(prev).add(goal.id))
    }
  }

  async function submitAdd(date: string) {
    const title = draftTitle.trim()
    if (!title || isSubmitting) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/plan-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_date: date, title }),
      })
      if (res.ok) {
        const { item } = await res.json()
        upsertItem(date, item)
        setDraftTitle('')
        setAddingFor(null)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {weekGoals.length > 0 && (
        <div className="shell-panel space-y-2.5 px-4 py-3.5">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-bone-muted/60">This week&rsquo;s goals</p>
          <div className="flex flex-wrap gap-2">
            {weekGoals.map((goal) => {
              const added = addedGoalIds.has(goal.id)
              return (
                <div
                  key={goal.id}
                  className="flex items-center gap-1.5 rounded-full border border-leather-500/30 bg-leather-500/15 py-1 pl-3 pr-1.5 text-xs text-leather-200"
                >
                  <span>{goal.title}</span>
                  {!added && (
                    <>
                      <select
                        value={goalDayChoice[goal.id] ?? today}
                        onChange={(e) => setGoalDayChoice((prev) => ({ ...prev, [goal.id]: e.target.value }))}
                        className="rounded-full border border-leather-400/30 bg-transparent px-1.5 py-0.5 text-[11px] text-leather-100 focus:outline-none"
                      >
                        {days.map((d, i) => (
                          <option key={d.date} value={d.date} className="bg-stone-900 text-bone">
                            {SHORT_DAY[i]}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => addGoalToDay(goal)}
                        title={`Add "${goal.title}" as a task`}
                        className="rounded-full px-1.5 py-0.5 text-[11px] text-leather-100 transition-colors hover:bg-leather-400/30"
                      >
                        +
                      </button>
                    </>
                  )}
                  {added && <span className="pr-1 text-moss-300">✓</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
      {days.map((day, i) => {
        const isToday = day.date === today
        const dayNum = Number.parseInt(day.date.slice(8), 10)
        const character = day.windows.find((w) => w.label === 'Peak' || w.label === 'Steady')
        const scheduled = [...day.planItems]
          .filter((it) => it.start_minute !== null)
          .sort((a, b) => (a.start_minute as number) - (b.start_minute as number))
        const unscheduled = day.planItems.filter((it) => it.start_minute === null)

        return (
          <div
            key={day.date}
            className={cn('shell-panel flex min-h-[220px] flex-col gap-2 px-3 py-3', isToday && 'border-leather-400/60')}
          >
            <Link href={`/planner?date=${day.date}`} className="flex items-baseline justify-between gap-2 hover:opacity-80">
              <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-bone-muted/60">{SHORT_DAY[i]}</span>
              <span className={cn('text-lg font-semibold', isToday ? 'text-leather-200' : 'text-bone')}>{dayNum}</span>
            </Link>

            {character && (
              <div
                className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-bone-muted/70"
                title={character.reason}
              >
                <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', ENERGY_DOT[character.energyType])} />
                <span className="truncate">{character.label}</span>
              </div>
            )}

            <div className="flex-1 space-y-1">
              {scheduled.map((item) => (
                <label key={item.id} className="flex cursor-pointer items-start gap-1.5 text-[11px] leading-tight">
                  <input
                    type="checkbox"
                    checked={!!item.completed_at}
                    onChange={() => toggleItem(day.date, item)}
                    className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-sm border-bone-muted/40 bg-transparent accent-leather-300"
                  />
                  <span className={cn('flex-1', item.completed_at && 'text-bone-muted/40 line-through')}>
                    <span className="text-bone-muted/50">{formatTime(item.start_minute as number)}</span> {item.title}
                  </span>
                </label>
              ))}
              {unscheduled.map((item) => (
                <label key={item.id} className="flex cursor-pointer items-start gap-1.5 text-[11px] leading-tight">
                  <input
                    type="checkbox"
                    checked={!!item.completed_at}
                    onChange={() => toggleItem(day.date, item)}
                    className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-sm border-bone-muted/40 bg-transparent accent-leather-300"
                  />
                  <span className={cn('flex-1', item.completed_at && 'text-bone-muted/40 line-through')}>{item.title}</span>
                </label>
              ))}
              {day.planItems.length === 0 && <p className="text-[11px] text-bone-muted/35">Nothing yet</p>}
            </div>

            {addingFor === day.date ? (
              <input
                autoFocus
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitAdd(day.date)
                  if (e.key === 'Escape') {
                    setAddingFor(null)
                    setDraftTitle('')
                  }
                }}
                onBlur={() => {
                  if (!draftTitle.trim()) setAddingFor(null)
                }}
                placeholder="Add a task..."
                className="w-full rounded border border-bone-muted/20 bg-transparent px-1.5 py-1 text-[11px] text-bone placeholder:text-bone-muted/40 focus:border-leather-300 focus:outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAddingFor(day.date)
                  setDraftTitle('')
                }}
                className="text-left text-[10px] text-bone-muted/50 hover:text-bone-muted"
              >
                + Add
              </button>
            )}
          </div>
        )
      })}
      </div>
    </div>
  )
}
