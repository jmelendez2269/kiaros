'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { PlanItemRow } from '@/lib/planner/get-day-plan'

interface Props {
  items: PlanItemRow[]
  isPlacing: boolean
  placeError: string | null
  onSchedule: (id: string) => void
  onAdd: (title: string) => void
  onSuggest: () => void
}

export function UnscheduledTray({ items, isPlacing, placeError, onSchedule, onAdd, onSuggest }: Props) {
  const [newTitle, setNewTitle] = useState('')

  function submitAdd() {
    const title = newTitle.trim()
    if (!title) return
    onAdd(title)
    setNewTitle('')
  }

  const hasPlaceable = items.some((i) => i.completed_at === null)

  return (
    <div className="shell-panel h-fit space-y-3 px-5 py-5">
      <div className="flex items-center justify-between gap-2">
        <p className="shell-kicker">Unscheduled</p>
        {hasPlaceable && (
          <button
            type="button"
            onClick={onSuggest}
            disabled={isPlacing}
            className="rounded-full border border-leather-400/50 bg-leather-500/15 px-2.5 py-1 text-[10px] uppercase tracking-wider text-leather-100 transition-colors hover:bg-leather-500/25 disabled:opacity-50"
          >
            {isPlacing ? 'Reading the day…' : '✦ Suggest times'}
          </button>
        )}
      </div>
      {placeError && <p className="text-xs text-red-400">{placeError}</p>}
      {items.length === 0 ? (
        <p className="text-sm text-bone-muted/50">Nothing waiting to be placed.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                'flex items-center justify-between gap-2 rounded-md border border-border/50 px-3 py-2 text-sm',
                item.completed_at ? 'text-bone-muted/50 line-through' : 'text-bone'
              )}
            >
              <span className="truncate">{item.title}</span>
              <button
                type="button"
                onClick={() => onSchedule(item.id)}
                className="shrink-0 text-xs text-leather-200 hover:text-leather-100"
              >
                Place at 9:00
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2 border-t border-border/50 pt-3">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitAdd()
          }}
          placeholder="Add an unscheduled task..."
          className="flex-1 rounded-md border border-bone-muted/20 bg-transparent px-3 py-1.5 text-sm text-bone placeholder:text-bone-muted/40 focus:border-leather-300 focus:outline-none"
        />
        <button
          type="button"
          onClick={submitAdd}
          disabled={!newTitle.trim()}
          className="rounded-md border border-bone-muted/20 px-3 py-1.5 text-sm text-bone-muted hover:text-bone disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  )
}
