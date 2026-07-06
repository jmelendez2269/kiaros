'use client'

import { useMemo, useState } from 'react'
import type { Tables } from '@/types/database'
import { DailyLogForm } from './DailyLogForm'
import { ConsistencyGrid } from './ConsistencyGrid'
import { CategoryCard } from './CategoryCard'
import { AddMetricForm } from './AddMetricForm'

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
  todayLog: Tables<'daily_logs'> | null
  recentLogs: Tables<'daily_logs'>[]
  today: string
  filterCategoryId?: string
  goalCategories: { id: string; name: string }[]
}

export function TrackerView({ metrics, todayLog, recentLogs, today, filterCategoryId, goalCategories }: Props) {
  const [savedLog, setSavedLog] = useState<Tables<'daily_logs'> | null>(todayLog)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddMetric, setShowAddMetric] = useState(false)

  const filteredMetrics = filterCategoryId
    ? metrics.filter((m) => m.category_id === filterCategoryId)
    : metrics

  const categories = useMemo(() => {
    const seen = new Map<
      string,
      { id: string; name: string; color_key: string | null; icon_key: string | null }
    >()
    for (const m of metrics) {
      if (m.goal_categories && !seen.has(m.goal_categories.id)) {
        seen.set(m.goal_categories.id, m.goal_categories)
      }
    }
    return Array.from(seen.values())
  }, [metrics])

  async function handleSave(payload: {
    values: Record<string, boolean | number | string>
    energy_level: number | null
    mood_tag: string | null
    notes: string | null
  }) {
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/tracker/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_date: today, ...payload }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'Save failed')
        return
      }
      const saved = await res.json()
      setSavedLog(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="shell-panel px-6 py-6">
        <p className="shell-kicker mb-3">Tracker</p>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="shell-section-title">Daily rhythm and consistency</h1>
            <p className="mt-3 text-sm leading-7 text-bone-muted">
              Keep the Life OS grounded in lived data. Log the body, mood, and metrics that tell the truth about this season.
            </p>
          </div>
          <div className="shell-panel-soft px-4 py-3 text-sm text-bone-muted">
            {today}
          </div>
        </div>
      </div>

      {metrics.length === 0 ? (
        <div className="shell-panel space-y-5 p-8 text-center text-bone-muted">
          <p>No metrics yet. Add one below to start tracking.</p>
          <div className="mx-auto max-w-xl text-left">
            <AddMetricForm categories={goalCategories} />
          </div>
        </div>
      ) : (
        <>
          <DailyLogForm
            metrics={filteredMetrics.length > 0 ? filteredMetrics : metrics}
            initialLog={savedLog}
            isSaving={isSaving}
            error={error}
            onSave={handleSave}
          />
          <div className="shell-panel px-6 py-5">
            {showAddMetric ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="shell-kicker">Add another metric</p>
                  <button
                    type="button"
                    onClick={() => setShowAddMetric(false)}
                    className="text-sm text-bone-muted transition-colors hover:text-bone"
                  >
                    Close
                  </button>
                </div>
                <AddMetricForm categories={goalCategories} onDone={() => setShowAddMetric(false)} />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddMetric(true)}
                className="text-sm font-medium text-bone-muted transition-colors hover:text-bone"
              >
                + Add another metric
              </button>
            )}
          </div>
        </>
      )}

      <div className="shell-panel px-6 py-6">
        <ConsistencyGrid logs={recentLogs} metrics={metrics} today={today} />
      </div>

      {categories.length > 0 && (
        <div>
          <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-bone-muted/55">
            By Category
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => {
              const catMetrics = metrics.filter((m) => m.category_id === cat.id)
              const catLogs = recentLogs.filter((log) => {
                const vals = log.values as Record<string, unknown>
                return catMetrics.some((m) => m.key in vals)
              })
              return (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  metrics={catMetrics}
                  recentLogs={catLogs}
                  today={today}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
