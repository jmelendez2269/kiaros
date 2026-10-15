'use client'

import { useEffect, useState } from 'react'
import type { Tables } from '@/types/database'
import { MetricInput } from './MetricInput'

type MetricWithCategory = Tables<'tracker_metrics'> & {
  goal_categories: {
    id: string
    name: string
    color_key: string | null
    icon_key: string | null
  } | null
}

interface Props {
  metrics: MetricWithCategory[]
  initialLog: Tables<'daily_logs'> | null
  isSaving: boolean
  error: string | null
  onSave: (values: {
    values: Record<string, boolean | number | string>
    energy_level: number | null
    mood_tag: string | null
    notes: string | null
  }) => Promise<void>
}

export function DailyLogForm({ metrics, initialLog, isSaving, error, onSave }: Props) {
  const [values, setValues] = useState<Record<string, boolean | number | string>>({})
  const [energyLevel, setEnergyLevel] = useState<number | null>(null)
  const [moodTag, setMoodTag] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  useEffect(() => {
    if (initialLog) {
      setValues((initialLog.values as Record<string, boolean | number | string>) ?? {})
      setEnergyLevel(initialLog.energy_level)
      setMoodTag(initialLog.mood_tag ?? '')
      setNotes(initialLog.notes ?? '')
    }
  }, [initialLog])

  const grouped = new Map<string | null, MetricWithCategory[]>()
  for (const metric of metrics) {
    const key = metric.category_id ?? null
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(metric)
  }

  function setValue(key: string, value: boolean | number | string) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cleaned: Record<string, boolean | number | string> = {}
    for (const [k, v] of Object.entries(values)) {
      if (v === '' || v === null || v === undefined) continue
      cleaned[k] = v
    }
    await onSave({
      values: cleaned,
      energy_level: energyLevel,
      mood_tag: moodTag || null,
      notes: notes || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="shell-panel px-5 py-5 space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-bone">Energy level</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setEnergyLevel(n === energyLevel ? null : n)}
                className={`h-9 w-9 rounded-xl border text-sm font-medium transition-colors ${
                  energyLevel === n
                    ? 'border-leather-400/50 bg-leather-500/25 text-bone'
                    : 'border-border/80 bg-stone-950/70 text-bone-muted hover:border-leather-400/35'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-bone">Mood</label>
          <input
            type="text"
            value={moodTag}
            onChange={(e) => setMoodTag(e.target.value)}
            placeholder="grounded, scattered, expansive..."
            className="w-full rounded-xl border border-border/80 bg-stone-950/70 px-3 py-2 text-sm text-bone placeholder:text-bone-muted/40 focus:outline-none focus:ring-1 focus:ring-leather-400"
          />
        </div>
      </div>

      {Array.from(grouped.entries()).map(([categoryId, catMetrics]) => {
        const category = catMetrics[0]?.goal_categories
        return (
          <div
            key={categoryId ?? 'uncategorized'}
            data-category-id={categoryId ?? undefined}
            className="shell-panel px-5 py-5 space-y-4"
          >
            {category && <h3 className="text-sm font-medium text-bone-muted">{category.name}</h3>}
            <div className="space-y-3">
              {catMetrics.map((metric) => (
                <MetricInput
                  key={metric.id}
                  metric={metric}
                  value={values[metric.key]}
                  onChange={(val) => setValue(metric.key, val)}
                />
              ))}
            </div>
          </div>
        )
      })}

      <div className="shell-panel px-5 py-5 space-y-1.5">
        <label className="text-sm font-medium text-bone">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything else worth noting today..."
          rows={3}
          className="w-full resize-none rounded-xl border border-border/80 bg-stone-950/70 px-3 py-2 text-sm text-bone placeholder:text-bone-muted/40 focus:outline-none focus:ring-1 focus:ring-leather-400"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={isSaving}
        className="rounded-2xl border border-leather-400/50 bg-leather-500/35 px-5 py-3 text-sm font-semibold text-bone shadow-glow transition-colors hover:bg-leather-500/45 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSaving ? 'Saving...' : 'Save log'}
      </button>
    </form>
  )
}
