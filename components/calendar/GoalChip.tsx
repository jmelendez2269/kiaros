'use client'

import { useState } from 'react'
import type { Tables } from '@/types/database'

type AreaGoalRow = Tables<'area_goals'>

interface Props {
  goal: AreaGoalRow
  date: string
}

export function GoalChip({ goal, date }: Props) {
  const [added, setAdded] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function addToDay() {
    if (isSubmitting || added) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/plan-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_date: date, title: goal.title, area_goal_id: goal.id, source: 'goal' }),
      })
      if (res.ok) setAdded(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-leather-500/30 bg-leather-500/15 py-1 pl-3 pr-1.5 text-xs text-leather-200">
      {goal.title}
      <button
        type="button"
        onClick={addToDay}
        disabled={isSubmitting || added}
        title={`Add "${goal.title}" as a task on ${date}`}
        className="rounded-full px-1.5 py-0.5 text-[11px] text-leather-100 transition-colors hover:bg-leather-400/30 disabled:opacity-50"
      >
        {added ? '✓' : '+'}
      </button>
    </span>
  )
}
