'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Brain, Loader2, Plus, Search, Sparkles, X } from 'lucide-react'
import type { CurriculumIntensity, CurriculumPlanRow } from '@/types/curriculum'

interface CurriculumWorkspaceProps {
  initialPlans: CurriculumPlanRow[]
  studyFocus: string | null
  goalNames: string[]
}

type StatusFilter = 'all' | 'draft' | 'approved' | 'archived'

const INTENSITY_COPY: Record<CurriculumIntensity, string> = {
  light: 'Lighter lane. Steady progress with breathing room.',
  balanced: 'Sustainable middle path with weekly momentum.',
  dense: 'Deeper sprint. More hours, stronger project load.',
}

const DEFAULT_FORM = {
  topic: '',
  durationWeeks: 8,
  intensity: 'balanced' as CurriculumIntensity,
  skills: '',
  goals: '',
  constraints: '',
}

function normalizePlan(plan: any): CurriculumPlanRow {
  return {
    ...plan,
    objectives: Array.isArray(plan.objectives) ? plan.objectives : [],
    outcomes: Array.isArray(plan.outcomes) ? plan.outcomes : [],
    skills: Array.isArray(plan.skills) ? plan.skills : [],
  }
}

function statusTone(status: CurriculumPlanRow['status']) {
  if (status === 'approved') return 'border-moss-500/35 bg-moss-500/12 text-moss-200'
  if (status === 'archived') return 'border-border/60 bg-stone-950/60 text-bone-muted'
  return 'border-leather-400/35 bg-leather-500/12 text-leather-200'
}

function relativeTime(iso: string | null) {
  if (!iso) return '—'
  const created = new Date(iso).getTime()
  const diffMs = Date.now() - created
  const day = 1000 * 60 * 60 * 24
  if (diffMs < day) return 'today'
  if (diffMs < 2 * day) return 'yesterday'
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)}d ago`
  if (diffMs < 30 * day) return `${Math.floor(diffMs / (7 * day))}w ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function CurriculumWorkspace({ initialPlans, studyFocus, goalNames }: CurriculumWorkspaceProps) {
  const router = useRouter()
  const [isGenerating, startGenerating] = useTransition()
  const [plans, setPlans] = useState(() => initialPlans.map(normalizePlan))
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(DEFAULT_FORM)

  const counts = useMemo(() => {
    return plans.reduce(
      (acc, plan) => {
        acc.all += 1
        acc[plan.status] += 1
        return acc
      },
      { all: 0, draft: 0, approved: 0, archived: 0 }
    )
  }, [plans])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return plans.filter((plan) => {
      if (statusFilter !== 'all' && plan.status !== statusFilter) return false
      if (!query) return true
      const haystack = [plan.title, plan.topic, plan.summary ?? '', ...plan.skills].join(' ').toLowerCase()
      return haystack.includes(query)
    })
  }, [plans, search, statusFilter])

  useEffect(() => {
    if (!createOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setCreateOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [createOpen])

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function handleGenerate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    startGenerating(async () => {
      const skills = form.skills
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)

      const response = await fetch('/api/curriculum/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: form.topic,
          durationWeeks: Number(form.durationWeeks),
          intensity: form.intensity,
          skills,
          goals: form.goals || undefined,
          constraints: form.constraints || undefined,
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        setError(payload.error || 'Unable to generate curriculum right now.')
        return
      }

      const plan = normalizePlan(payload.plan)
      setPlans((current) => [plan, ...current.filter((item) => item.id !== plan.id)])
      setForm(DEFAULT_FORM)
      setCreateOpen(false)
      router.push(`/curriculum/${plan.id}`)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="shell-kicker mb-1.5">AI Curriculum</p>
          <h1 className="text-[1.85rem] font-semibold leading-tight text-bone md:text-[2.1rem]">Courses</h1>
          <p className="mt-1.5 text-sm text-bone-muted">
            {studyFocus ? <>Current focus: <span className="text-bone">{studyFocus}</span></> : 'Build a study path. Approve it to drop sessions into your planner.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 self-start rounded-full border border-leather-400/45 bg-leather-500/30 px-4 py-2 text-sm font-semibold text-bone shadow-glow"
        >
          <Plus size={15} />
          New course
        </button>
      </header>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-bone-muted/70" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses, topics, skills..."
            className="w-full rounded-full border border-border/70 bg-stone-950/70 py-2 pl-9 pr-3 text-sm text-bone placeholder:text-bone-muted/50 outline-none focus:border-leather-400/50"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {(['all', 'draft', 'approved', 'archived'] as StatusFilter[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setStatusFilter(option)}
              className={`rounded-full border px-3 py-1.5 font-medium uppercase tracking-[0.14em] transition-colors ${
                statusFilter === option
                  ? 'border-leather-400/45 bg-leather-500/20 text-bone'
                  : 'border-border/70 bg-stone-950/60 text-bone-muted hover:text-bone'
              }`}
            >
              {option}
              <span className="ml-1.5 text-bone-muted/70">{counts[option]}</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="shell-panel flex flex-col items-center px-6 py-12 text-center">
          <Brain className="mb-3 text-bone-muted" size={22} />
          <p className="text-bone-muted">
            {plans.length === 0
              ? 'No courses yet. Start one to build your study layer.'
              : 'No courses match this filter.'}
          </p>
          {plans.length === 0 ? (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-leather-400/45 bg-leather-500/30 px-4 py-2 text-sm font-semibold text-bone"
            >
              <Sparkles size={14} />
              Generate first course
            </button>
          ) : null}
        </div>
      ) : (
        <ul className="shell-panel divide-y divide-border/60 overflow-hidden p-0">
          {filtered.map((plan) => (
            <li key={plan.id}>
              <Link
                href={`/curriculum/${plan.id}`}
                className="group flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-stone-950/60 sm:flex-row sm:items-center sm:gap-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.16em] ${statusTone(plan.status)}`}>
                      {plan.status}
                    </span>
                    <h3 className="truncate text-[0.98rem] font-semibold text-bone group-hover:text-bone">{plan.title}</h3>
                  </div>
                  {plan.summary ? (
                    <p className="mt-1 line-clamp-1 text-sm text-bone-muted">{plan.summary}</p>
                  ) : null}
                </div>
                <div className="flex flex-shrink-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-bone-muted">
                  <span>{plan.duration_weeks}w</span>
                  <span>{plan.weekly_hours}h/wk</span>
                  <span className="capitalize">{plan.intensity}</span>
                  <span className="text-bone-muted/70">{relativeTime(plan.created_at)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {createOpen ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="New course">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setCreateOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-border/70 bg-stone-950 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-border/60 px-6 py-5">
              <div>
                <p className="shell-kicker mb-1">New course</p>
                <h2 className="text-xl font-semibold text-bone">Generate a curriculum draft</h2>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-full border border-border/70 bg-stone-950/80 p-2 text-bone-muted hover:text-bone"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleGenerate} className="flex flex-1 flex-col">
              <div className="flex-1 space-y-4 px-6 py-5">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-bone">Topic</span>
                <input
                  required
                  autoFocus
                  value={form.topic}
                  onChange={(e) => updateField('topic', e.target.value)}
                  className="w-full rounded-2xl border border-border/80 bg-stone-950/80 px-4 py-3 text-bone outline-none placeholder:text-bone-muted/45 focus:border-leather-400/50"
                  placeholder="Ex. Music theory for songwriting"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-bone">Duration</span>
                  <select
                    value={form.durationWeeks}
                    onChange={(e) => updateField('durationWeeks', Number(e.target.value))}
                    className="w-full rounded-2xl border border-border/80 bg-stone-950/80 px-4 py-3 text-bone outline-none focus:border-leather-400/50"
                  >
                    {[4, 6, 8, 12, 16, 24].map((weeks) => (
                      <option key={weeks} value={weeks}>{weeks} weeks</option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-bone">Density</span>
                  <select
                    value={form.intensity}
                    onChange={(e) => updateField('intensity', e.target.value as CurriculumIntensity)}
                    className="w-full rounded-2xl border border-border/80 bg-stone-950/80 px-4 py-3 text-bone outline-none focus:border-leather-400/50"
                  >
                    <option value="light">Light</option>
                    <option value="balanced">Balanced</option>
                    <option value="dense">Dense</option>
                  </select>
                </label>
              </div>
              <p className="-mt-1 text-xs leading-6 text-bone-muted/85">{INTENSITY_COPY[form.intensity]}</p>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-bone">Skills or outcomes</span>
                <input
                  value={form.skills}
                  onChange={(e) => updateField('skills', e.target.value)}
                  className="w-full rounded-2xl border border-border/80 bg-stone-950/80 px-4 py-3 text-bone outline-none placeholder:text-bone-muted/45 focus:border-leather-400/50"
                  placeholder="harmony, ear training, chord progressions"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-bone">Goals</span>
                <textarea
                  rows={3}
                  value={form.goals}
                  onChange={(e) => updateField('goals', e.target.value)}
                  className="w-full rounded-2xl border border-border/80 bg-stone-950/80 px-4 py-3 text-bone outline-none placeholder:text-bone-muted/45 focus:border-leather-400/50"
                  placeholder="What you want this to unlock for you."
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-bone">Constraints or preferences</span>
                <textarea
                  rows={2}
                  value={form.constraints}
                  onChange={(e) => updateField('constraints', e.target.value)}
                  className="w-full rounded-2xl border border-border/80 bg-stone-950/80 px-4 py-3 text-bone outline-none placeholder:text-bone-muted/45 focus:border-leather-400/50"
                  placeholder="Pace, level, time-of-day, learning style..."
                />
              </label>

              {goalNames.length > 0 ? (
                <div className="rounded-2xl border border-border/70 bg-stone-950/40 px-4 py-3">
                  <p className="shell-kicker mb-2">Active focus areas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {goalNames.slice(0, 8).map((goal) => (
                      <span key={goal} className="shell-pill">{goal}</span>
                    ))}
                  </div>
                </div>
              ) : null}

              {error ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-border/60 bg-stone-950/80 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-full border border-border/70 bg-stone-950/60 px-4 py-2 text-sm text-bone-muted hover:text-bone"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="inline-flex items-center gap-2 rounded-full border border-leather-400/45 bg-leather-500/30 px-4 py-2 text-sm font-semibold text-bone shadow-glow disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {isGenerating ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </div>
  )
}
