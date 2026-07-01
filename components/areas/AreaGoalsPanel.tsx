'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { BRAND } from '@/lib/brand'

export type AreaGoalStatus = 'active' | 'paused' | 'completed' | 'archived'

export interface AreaGoal {
  id: string
  title: string
  description: string | null
  status: AreaGoalStatus
  target_label: string | null
  linked_week_number: number | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface UpcomingWindowOption {
  weekNumber: number
  theme: string
  startDate: string
}

interface AreaGoalsPanelProps {
  slug: string
  areaName: string
  initialGoals: AreaGoal[]
  upcomingWindows: UpcomingWindowOption[]
}

const STATUS_META: Record<AreaGoalStatus, { label: string; tone: string }> = {
  active: { label: 'Active', tone: 'border-leather-400/50 bg-leather-500/15 text-leather-100' },
  paused: { label: 'Paused', tone: 'border-bone-muted/30 bg-stone-900/60 text-bone-muted' },
  completed: { label: 'Completed', tone: 'border-moss-500/40 bg-moss-500/12 text-moss-200' },
  archived: { label: 'Archived', tone: 'border-border/60 bg-stone-950/60 text-bone-muted/70' },
}

const STATUS_ORDER: AreaGoalStatus[] = ['active', 'paused', 'completed', 'archived']

interface FormState {
  title: string
  description: string
  target_label: string
  linked_week_number: string
}

const EMPTY_FORM: FormState = { title: '', description: '', target_label: '', linked_week_number: '' }

export function AreaGoalsPanel({ slug, areaName, initialGoals, upcomingWindows }: AreaGoalsPanelProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [goals, setGoals] = useState<AreaGoal[]>(initialGoals)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState<FormState>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM)
  const [showArchived, setShowArchived] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const visible = useMemo(() => {
    return goals.filter((g) => (showArchived ? true : g.status !== 'archived'))
  }, [goals, showArchived])

  const counts = useMemo(() => {
    const acc = { active: 0, paused: 0, completed: 0, archived: 0 }
    for (const g of goals) acc[g.status] += 1
    return acc
  }, [goals])

  function refreshServer() {
    startTransition(() => router.refresh())
  }

  function buildPayload(form: FormState) {
    const linked = form.linked_week_number.trim()
    return {
      title: form.title.trim(),
      description: form.description.trim() || null,
      target_label: form.target_label.trim() || null,
      linked_week_number: linked ? Number.parseInt(linked, 10) : null,
    }
  }

  async function createGoal() {
    setError(null)
    if (!addForm.title.trim()) {
      setError('Give the goal a title.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/areas/${slug}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(addForm)),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? 'Failed to create goal')
      }
      const { goal } = await res.json()
      setGoals((prev) => [...prev, goal])
      setAddForm(EMPTY_FORM)
      setShowAdd(false)
      refreshServer()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  async function patchGoal(id: string, body: Record<string, unknown>) {
    setError(null)
    setBusy(true)
    try {
      const res = await fetch(`/api/areas/goals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? 'Failed to update')
      }
      const { goal } = await res.json()
      setGoals((prev) => prev.map((g) => (g.id === id ? goal : g)))
      refreshServer()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  async function saveEdit() {
    if (!editingId) return
    if (!editForm.title.trim()) {
      setError('Give the goal a title.')
      return
    }
    await patchGoal(editingId, buildPayload(editForm))
    setEditingId(null)
  }

  async function deleteGoal(id: string) {
    if (!window.confirm('Delete this goal? This cannot be undone.')) return
    setError(null)
    setBusy(true)
    try {
      const res = await fetch(`/api/areas/goals/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? 'Failed to delete')
      }
      setGoals((prev) => prev.filter((g) => g.id !== id))
      refreshServer()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  function beginEdit(goal: AreaGoal) {
    setEditingId(goal.id)
    setEditForm({
      title: goal.title,
      description: goal.description ?? '',
      target_label: goal.target_label ?? '',
      linked_week_number: goal.linked_week_number ? String(goal.linked_week_number) : '',
    })
    setError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setError(null)
  }

  function weekLabel(weekNumber: number | null) {
    if (!weekNumber) return null
    const match = upcomingWindows.find((w) => w.weekNumber === weekNumber)
    if (match) return `Week ${weekNumber} · ${match.theme}`
    return `Week ${weekNumber}`
  }

  return (
    <section className="rounded-[1.5rem] border border-border/70 bg-stone-950/50 px-6 py-7 md:px-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="shell-kicker mb-2">Goals</p>
          <h2 className="shell-subsection-title">What you&rsquo;re working toward in {areaName}</h2>
          <p className="mt-2 max-w-xl text-sm leading-7 text-bone-muted">
            Small enough to track, specific enough to mean something. Link a goal to an upcoming timing window so it flows into your planner when the moment arrives.
          </p>
        </div>
        {!showAdd ? (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-leather-400/45 bg-leather-500/15 px-4 py-2.5 text-sm font-medium text-bone transition-colors hover:border-leather-300/65 hover:bg-leather-500/25"
          >
            <Plus size={14} />
            Add a goal
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="mt-5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {showAdd ? (
        <div className="mt-6 rounded-2xl border border-leather-400/40 bg-stone-950/70 px-5 py-5">
          <GoalForm
            form={addForm}
            setForm={setAddForm}
            upcomingWindows={upcomingWindows}
            submitLabel="Save goal"
            onSubmit={createGoal}
            onCancel={() => {
              setShowAdd(false)
              setAddForm(EMPTY_FORM)
              setError(null)
            }}
            busy={busy}
          />
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 px-5 py-6 text-sm leading-7 text-bone-muted">
            No goals yet for this area. Name one and {BRAND.product} will surface it alongside the timing windows above.
          </div>
        ) : (
          visible.map((goal) => {
            const isEditing = editingId === goal.id
            if (isEditing) {
              return (
                <div key={goal.id} className="rounded-2xl border border-leather-400/40 bg-stone-950/70 px-5 py-5">
                  <GoalForm
                    form={editForm}
                    setForm={setEditForm}
                    upcomingWindows={upcomingWindows}
                    submitLabel="Save changes"
                    onSubmit={saveEdit}
                    onCancel={cancelEdit}
                    busy={busy}
                  />
                </div>
              )
            }
            const meta = STATUS_META[goal.status]
            const wkLabel = weekLabel(goal.linked_week_number)
            return (
              <article
                key={goal.id}
                className="rounded-2xl border border-border/70 bg-stone-950/60 px-5 py-4 transition-colors hover:border-leather-400/30"
              >
                <div className="flex items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <p className="text-[0.98rem] font-medium text-bone">{goal.title}</p>
                      {goal.target_label ? (
                        <span className="text-xs text-bone-muted/85">{goal.target_label}</span>
                      ) : null}
                    </div>
                    {goal.description ? (
                      <p className="mt-2 text-sm leading-[1.65] text-bone-muted">{goal.description}</p>
                    ) : null}
                    {wkLabel ? (
                      <p className="mt-2 text-xs uppercase tracking-[0.14em] text-leather-200/80">{wkLabel}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <select
                      value={goal.status}
                      disabled={busy}
                      onChange={(e) => patchGoal(goal.id, { status: e.target.value })}
                      className={`cursor-pointer rounded-full border px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] outline-none transition-colors ${meta.tone}`}
                    >
                      {STATUS_ORDER.map((s) => (
                        <option key={s} value={s} className="bg-stone-950 text-bone">
                          {STATUS_META[s].label}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => beginEdit(goal)}
                        disabled={busy}
                        title="Edit goal"
                        className="rounded-md border border-border/60 bg-stone-950/70 p-1.5 text-bone-muted transition-colors hover:border-leather-400/40 hover:text-bone disabled:opacity-50"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteGoal(goal.id)}
                        disabled={busy}
                        title="Delete goal"
                        className="rounded-md border border-border/60 bg-stone-950/70 p-1.5 text-bone-muted transition-colors hover:border-rose-400/50 hover:text-rose-200 disabled:opacity-50"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            )
          })
        )}
      </div>

      {counts.archived > 0 || counts.completed > 0 ? (
        <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-bone-muted/80">
          <span>
            {counts.active} active · {counts.paused} paused · {counts.completed} completed · {counts.archived} archived
          </span>
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="rounded-full border border-border/60 bg-stone-950/60 px-3 py-1 text-[0.7rem] uppercase tracking-[0.14em] text-bone-muted transition-colors hover:border-leather-400/40 hover:text-bone"
          >
            {showArchived ? 'Hide archived' : 'Show archived'}
          </button>
        </div>
      ) : null}
    </section>
  )
}

interface GoalFormProps {
  form: FormState
  setForm: (next: FormState) => void
  upcomingWindows: UpcomingWindowOption[]
  submitLabel: string
  onSubmit: () => void
  onCancel: () => void
  busy: boolean
}

function GoalForm({ form, setForm, upcomingWindows, submitLabel, onSubmit, onCancel, busy }: GoalFormProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="shell-eyebrow mb-2 block">Goal</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Name what you&rsquo;re working toward"
          maxLength={200}
          className="w-full rounded-xl border border-border/70 bg-stone-950/70 px-4 py-2.5 text-sm text-bone outline-none transition-colors focus:border-leather-400/55"
        />
      </div>
      <div>
        <label className="shell-eyebrow mb-2 block">Why this, why now</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="A sentence or two on what matters about this goal."
          rows={2}
          maxLength={1000}
          className="w-full resize-none rounded-xl border border-border/70 bg-stone-950/70 px-4 py-2.5 text-sm leading-6 text-bone outline-none transition-colors focus:border-leather-400/55"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="shell-eyebrow mb-2 block">Time horizon</label>
          <input
            type="text"
            value={form.target_label}
            onChange={(e) => setForm({ ...form, target_label: e.target.value })}
            placeholder="by Q3, this year, 2026-09…"
            maxLength={60}
            className="w-full rounded-xl border border-border/70 bg-stone-950/70 px-4 py-2.5 text-sm text-bone outline-none transition-colors focus:border-leather-400/55"
          />
        </div>
        <div>
          <label className="shell-eyebrow mb-2 block">Link to a timing window</label>
          <select
            value={form.linked_week_number}
            onChange={(e) => setForm({ ...form, linked_week_number: e.target.value })}
            className="w-full rounded-xl border border-border/70 bg-stone-950/70 px-4 py-2.5 text-sm text-bone outline-none transition-colors focus:border-leather-400/55"
          >
            <option value="">No window</option>
            {upcomingWindows.map((w) => (
              <option key={w.weekNumber} value={w.weekNumber}>
                Week {w.weekNumber} · {w.theme}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="button"
          onClick={onSubmit}
          disabled={busy || !form.title.trim()}
          className="rounded-xl border border-leather-400/50 bg-leather-500/35 px-5 py-2.5 text-sm font-medium text-bone shadow-glow transition-colors hover:bg-leather-500/45 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Saving…' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-stone-950/60 px-4 py-2.5 text-sm text-bone-muted transition-colors hover:border-leather-400/40 hover:text-bone disabled:opacity-50"
        >
          <X size={14} />
          Cancel
        </button>
      </div>
    </div>
  )
}
