'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Tables } from '@/types/database'
import type { CurriculumSessionRow } from '@/types/curriculum'
import type { PlanEntry } from '@/types/plan'

type PlanItemRow = Tables<'plan_items'>

function formatTime(minute: number): string {
  const hours = Math.floor(minute / 60)
  const minutes = minute % 60
  const hour = hours % 12 || 12
  const suffix = hours < 12 ? 'a' : 'p'
  return minutes === 0 ? `${hour}${suffix}` : `${hour}:${String(minutes).padStart(2, '0')}${suffix}`
}

interface Props {
  date: string
  manualItems: PlanItemRow[]
  curriculumSessions: CurriculumSessionRow[]
  variant: 'compact' | 'full'
  className?: string
}

function toEntries(manualItems: PlanItemRow[], curriculumSessions: CurriculumSessionRow[]): PlanEntry[] {
  const manual: PlanEntry[] = manualItems.map((item) => ({
    id: item.id,
    kind: 'manual',
    title: item.title,
    done: item.completed_at !== null,
    meta: item.start_minute === null ? undefined : formatTime(item.start_minute),
  }))
  const curriculum: PlanEntry[] = curriculumSessions.map((session) => ({
    id: session.id,
    kind: 'curriculum',
    title: session.title,
    done: session.status === 'done',
    meta: `${session.estimated_minutes}min · ${session.session_type}`,
    curriculumRef: {
      planId: session.curriculum_plan_id,
      weekNumber: session.week_number,
      sessionOrder: session.session_order,
    },
  }))
  return [...manual, ...curriculum]
}

export function PlanChecklist({ date, manualItems, curriculumSessions, variant, className }: Props) {
  const [entries, setEntries] = useState<PlanEntry[]>(() => toEntries(manualItems, curriculumSessions))
  const [newTitle, setNewTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function toggleEntry(entry: PlanEntry) {
    const nextDone = !entry.done
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, done: nextDone } : e)))
    setError(null)

    try {
      const res =
        entry.kind === 'manual'
          ? await fetch(`/api/plan-items/${entry.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ completed: nextDone }),
            })
          : await fetch(
              `/api/curriculum/${entry.curriculumRef!.planId}/sessions/${entry.curriculumRef!.weekNumber}/${entry.curriculumRef!.sessionOrder}/complete`,
              {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: nextDone }),
              }
            )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'Update failed')
        setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, done: !nextDone } : e)))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
      setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, done: !nextDone } : e)))
    }
  }

  async function addItem() {
    const title = newTitle.trim()
    if (!title || isSubmitting) return
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/plan-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_date: date, title }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'Could not add task')
        return
      }
      const { item } = (await res.json()) as { item: PlanItemRow }
      setEntries((prev) => [...prev, { id: item.id, kind: 'manual', title: item.title, done: false }])
      setNewTitle('')
      setAdding(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add task')
    } finally {
      setIsSubmitting(false)
    }
  }

  const visibleEntries = variant === 'compact' && !expanded ? entries.slice(0, 3) : entries
  const hiddenCount = entries.length - visibleEntries.length

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {visibleEntries.map((entry) => (
        <label
          key={entry.id}
          className={cn(
            'flex cursor-pointer items-start gap-2 text-left',
            variant === 'compact' ? 'text-[10px] leading-tight' : 'text-sm leading-snug'
          )}
        >
          <input
            type="checkbox"
            checked={entry.done}
            onChange={() => toggleEntry(entry)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border-bone-muted/40 bg-transparent accent-leather-300"
          />
          <span className={cn('flex-1', entry.done && 'text-bone-muted/50 line-through')}>
            {entry.title}
            {entry.meta ? (
              <span className={cn('text-bone-muted/60', variant === 'full' ? 'ml-2 text-xs' : 'ml-1 text-[9px]')}>
                {entry.meta}
              </span>
            ) : null}
          </span>
        </label>
      ))}

      {variant === 'compact' && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-left text-[9px] text-bone-muted/60 hover:text-bone-muted"
        >
          +{hiddenCount} more
        </button>
      )}

      {variant === 'compact' && !adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex min-h-9 items-center text-left text-[10px] text-bone-muted/60 hover:text-bone-muted"
        >
          + Add
        </button>
      )}

      {(variant === 'full' || adding) && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addItem()
            }}
            placeholder={variant === 'compact' ? 'Add a task...' : 'Add a task for today...'}
            aria-label={`Add a task for ${date}`}
            maxLength={200}
            className={cn(
              'min-w-0 flex-1 rounded-md border border-bone-muted/20 bg-transparent text-bone placeholder:text-bone-muted/40 focus:border-leather-300 focus:outline-none',
              variant === 'compact' ? 'px-1.5 py-1 text-[10px]' : 'px-3 py-1.5 text-sm'
            )}
          />
          <button
            type="button"
            onClick={addItem}
            disabled={isSubmitting || !newTitle.trim()}
            className={cn(
              'rounded-md border border-bone-muted/20 text-bone-muted transition-colors hover:text-bone disabled:opacity-40',
              variant === 'compact' ? 'px-1.5 py-1 text-[9px]' : 'px-3 py-1.5 text-sm'
            )}
          >
            Add
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {entries.length === 0 && variant === 'full' && (
        <p className="text-sm text-bone-muted/50">Nothing planned yet — add your first task above.</p>
      )}
    </div>
  )
}
