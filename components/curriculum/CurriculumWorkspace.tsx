'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Brain, CalendarDays, CheckCircle2, Loader2, PenSquare, Sparkles } from 'lucide-react'
import type { CurriculumIntensity, CurriculumPlanRow } from '@/types/curriculum'

interface CurriculumWorkspaceProps {
  initialPlans: CurriculumPlanRow[]
  studyFocus: string | null
  goalNames: string[]
}

const INTENSITY_COPY: Record<CurriculumIntensity, string> = {
  light: 'A lighter lane for steady progress with breathing room.',
  balanced: 'A sustainable middle path with weekly momentum.',
  dense: 'A deeper sprint with more hours and stronger project load.',
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

function planStatusTone(status: CurriculumPlanRow['status']) {
  if (status === 'approved') return 'border-moss-500/35 bg-moss-500/10 text-moss-200'
  if (status === 'archived') return 'border-border/60 bg-stone-950/60 text-bone-muted'
  return 'border-leather-400/35 bg-leather-500/12 text-leather-200'
}

function niceDate(date: string | null) {
  if (!date) return null
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function buildJournalHref(plan: CurriculumPlanRow) {
  const outcomes = plan.outcomes.slice(0, 3).join('; ')
  const objectives = plan.objectives.slice(0, 2).join('; ')
  const context = [
    plan.summary,
    outcomes ? `Suggested outcomes: ${outcomes}` : null,
    objectives ? `Key objectives: ${objectives}` : null,
  ]
    .filter(Boolean)
    .join('\n\n')

  const params = new URLSearchParams({
    area: 'Study',
    theme: plan.title,
    prompt: `What feels most worth noting after receiving this curriculum feedback on ${plan.topic}?`,
    context,
  })

  return `/journal?${params.toString()}`
}

export function CurriculumWorkspace({ initialPlans, studyFocus, goalNames }: CurriculumWorkspaceProps) {
  const router = useRouter()
  const [isGenerating, startGenerating] = useTransition()
  const [isApproving, startApproving] = useTransition()
  const [plans, setPlans] = useState(() => initialPlans.map(normalizePlan))
  const [latestDraftId, setLatestDraftId] = useState<string | null>(plans.find((plan) => plan.status === 'draft')?.id ?? null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(DEFAULT_FORM)

  const latestDraft = useMemo(
    () => plans.find((plan) => plan.id === latestDraftId) ?? null,
    [plans, latestDraftId]
  )

  const approvedPlans = plans.filter((plan) => plan.status === 'approved')
  const historyPlans = latestDraft ? plans.filter((plan) => plan.id !== latestDraft.id) : plans

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
      setLatestDraftId(plan.id)
      router.refresh()
    })
  }

  function handleApprove(planId: string) {
    setError(null)

    startApproving(async () => {
      const response = await fetch(`/api/curriculum/${planId}/approve`, {
        method: 'POST',
      })
      const payload = await response.json()

      if (!response.ok) {
        setError(payload.error || 'Unable to approve this curriculum right now.')
        return
      }

      const approvedPlan = normalizePlan(payload.plan)
      setPlans((current) =>
        current.map((plan) => (plan.id === approvedPlan.id ? approvedPlan : plan))
      )
      router.refresh()
    })
  }

  return (
    <div className="space-y-8">
      <section className="shell-panel overflow-hidden px-6 py-7 md:px-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="shell-kicker mb-3">AI Curriculum</p>
            <h1 className="shell-section-title text-[2.25rem] md:text-[2.8rem]">
              Build a study path, review it, then drop it straight into your planner.
            </h1>
            <p className="mt-4 text-base leading-7 text-bone-muted">
              Pick the topic, duration, and density. Kiaros will generate a week-by-week curriculum with sessions you can approve into the calendar.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[26rem]">
            <div className="shell-panel-soft px-4 py-4">
              <p className="shell-kicker mb-2">Current study focus</p>
              <p className="text-sm leading-7 text-bone-muted">
                {studyFocus || 'No saved study focus yet. This can still generate standalone curricula.'}
              </p>
            </div>
            <div className="shell-panel-soft px-4 py-4">
              <p className="shell-kicker mb-2">Planner behavior</p>
              <p className="text-sm leading-7 text-bone-muted">
                Approved curricula get scheduled week-by-week so the sessions appear inside your planner view.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <form onSubmit={handleGenerate} className="shell-panel space-y-5 px-6 py-6 md:px-8">
          <div>
            <p className="shell-kicker mb-2">Create a track</p>
            <h2 className="text-[1.9rem] font-semibold text-bone">Generate a curriculum draft</h2>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-bone">Topic</span>
            <input
              required
              value={form.topic}
              onChange={(event) => updateField('topic', event.target.value)}
              className="w-full rounded-2xl border border-border/80 bg-stone-950/80 px-4 py-3 text-bone outline-none ring-0 placeholder:text-bone-muted/45"
              placeholder="Ex. Music theory for songwriting"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-bone">Duration</span>
              <select
                value={form.durationWeeks}
                onChange={(event) => updateField('durationWeeks', Number(event.target.value))}
                className="w-full rounded-2xl border border-border/80 bg-stone-950/80 px-4 py-3 text-bone outline-none"
              >
                {[4, 6, 8, 12, 16, 24].map((weeks) => (
                  <option key={weeks} value={weeks}>
                    {weeks} weeks
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-bone">Density</span>
              <select
                value={form.intensity}
                onChange={(event) => updateField('intensity', event.target.value as CurriculumIntensity)}
                className="w-full rounded-2xl border border-border/80 bg-stone-950/80 px-4 py-3 text-bone outline-none"
              >
                <option value="light">Light</option>
                <option value="balanced">Balanced</option>
                <option value="dense">Dense</option>
              </select>
            </label>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-bone">Skills or outcomes</span>
            <input
              value={form.skills}
              onChange={(event) => updateField('skills', event.target.value)}
              className="w-full rounded-2xl border border-border/80 bg-stone-950/80 px-4 py-3 text-bone outline-none placeholder:text-bone-muted/45"
              placeholder="Ex. harmony, ear training, chord progressions"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-bone">Goals</span>
            <textarea
              rows={4}
              value={form.goals}
              onChange={(event) => updateField('goals', event.target.value)}
              className="w-full rounded-2xl border border-border/80 bg-stone-950/80 px-4 py-3 text-bone outline-none placeholder:text-bone-muted/45"
              placeholder="Ex. I want to write two original songs and understand enough theory to analyze what I hear."
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-bone">Constraints or preferences</span>
            <textarea
              rows={3}
              value={form.constraints}
              onChange={(event) => updateField('constraints', event.target.value)}
              className="w-full rounded-2xl border border-border/80 bg-stone-950/80 px-4 py-3 text-bone outline-none placeholder:text-bone-muted/45"
              placeholder="Ex. Keep weekends light, prefer project-based learning, assume beginner level."
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isGenerating}
            className="inline-flex items-center gap-2 rounded-2xl border border-leather-400/45 bg-leather-500/30 px-5 py-3 text-sm font-semibold text-bone shadow-glow disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {isGenerating ? 'Generating curriculum...' : 'Generate curriculum'}
          </button>
        </form>

        <div className="shell-panel space-y-4 px-6 py-6 md:px-8">
          <div>
            <p className="shell-kicker mb-2">Density guidance</p>
            <h2 className="text-[1.9rem] font-semibold text-bone">Choose the right load</h2>
          </div>

          <div className="space-y-3">
            {(['light', 'balanced', 'dense'] as CurriculumIntensity[]).map((intensity) => (
              <div key={intensity} className="rounded-[1.1rem] border border-border/70 bg-stone-950/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-base font-semibold capitalize text-bone">{intensity}</p>
                  <span className="shell-pill">{intensity}</span>
                </div>
                <p className="mt-2 text-sm leading-7 text-bone-muted">{INTENSITY_COPY[intensity]}</p>
              </div>
            ))}
          </div>

          {goalNames.length > 0 ? (
            <div className="rounded-[1.1rem] border border-border/70 bg-stone-950/60 p-4">
              <p className="shell-kicker mb-3">Active focus areas</p>
              <div className="flex flex-wrap gap-2">
                {goalNames.slice(0, 8).map((goal) => (
                  <span key={goal} className="shell-pill">
                    {goal}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {latestDraft ? (
        <section className="shell-panel px-6 py-8 md:px-8 md:py-9">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-4xl">
              <p className="shell-kicker mb-2">Draft review</p>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-[2rem] font-semibold text-bone">{latestDraft.title}</h2>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${planStatusTone(latestDraft.status)}`}>
                  {latestDraft.status}
                </span>
              </div>
              <p className="mt-4 max-w-3xl text-[1rem] leading-8 text-bone-muted">{latestDraft.summary}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={buildJournalHref(latestDraft)}
                className="inline-flex items-center gap-2 rounded-2xl border border-border/80 bg-stone-950/80 px-5 py-3 text-sm font-semibold text-bone-muted transition-colors hover:border-leather-400/45 hover:text-bone"
              >
                <PenSquare size={16} />
                Journal this feedback
              </Link>
              <button
                type="button"
                disabled={isApproving || latestDraft.status === 'approved'}
                onClick={() => handleApprove(latestDraft.id)}
                className="inline-flex items-center gap-2 rounded-2xl border border-moss-500/40 bg-moss-500/20 px-5 py-3 text-sm font-semibold text-bone disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isApproving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {latestDraft.status === 'approved' ? 'Already approved' : 'Approve and add to planner'}
              </button>
            </div>
          </div>

          <div className="mb-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.1rem] border border-border/70 bg-stone-950/60 p-4">
              <p className="shell-kicker mb-2">Length</p>
              <p className="text-lg font-semibold text-bone">{latestDraft.duration_weeks} weeks</p>
            </div>
            <div className="rounded-[1.1rem] border border-border/70 bg-stone-950/60 p-4">
              <p className="shell-kicker mb-2">Weekly load</p>
              <p className="text-lg font-semibold text-bone">{latestDraft.weekly_hours} hrs/week</p>
            </div>
            <div className="rounded-[1.1rem] border border-border/70 bg-stone-950/60 p-4">
              <p className="shell-kicker mb-2">Intensity</p>
              <p className="text-lg font-semibold capitalize text-bone">{latestDraft.intensity}</p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="rounded-[1.1rem] border border-border/70 bg-stone-950/60 p-4">
                <p className="shell-kicker mb-3">Objectives</p>
                <ul className="space-y-2 text-sm text-bone-muted">
                  {latestDraft.objectives.map((objective) => (
                    <li key={objective} className="flex gap-2">
                      <span className="text-bone">-</span>
                      <span>{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-[1.1rem] border border-border/70 bg-stone-950/60 p-4">
                <p className="shell-kicker mb-3">Outcomes</p>
                <ul className="space-y-2 text-sm text-bone-muted">
                  {latestDraft.outcomes.map((outcome) => (
                    <li key={outcome} className="flex gap-2">
                      <span className="text-bone">-</span>
                      <span>{outcome}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-[1.25rem] border border-border/70 bg-stone-950/40 p-5 md:p-6">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div className="max-w-3xl">
                <p className="shell-kicker mb-2">Week-by-week path</p>
                <h3 className="text-[1.45rem] font-semibold text-bone">The reading room version</h3>
                <p className="mt-2 text-sm leading-7 text-bone-muted">
                  Open each week when you want the fuller rationale, deliverable, and session structure without the page feeling compressed.
                </p>
              </div>
              <Link
                href={buildJournalHref(latestDraft)}
                className="inline-flex items-center gap-2 self-start rounded-full border border-border/70 bg-stone-950/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-bone-muted transition-colors hover:border-leather-400/45 hover:text-bone"
              >
                Reflect in journal
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="space-y-4">
              {latestDraft.curriculum.weeks.map((week) => (
                <details key={week.weekNumber} className="rounded-[1.1rem] border border-border/70 bg-stone-950/60 p-5" open={week.weekNumber <= 2}>
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="max-w-3xl">
                        <p className="shell-kicker mb-2">Week {week.weekNumber}</p>
                        <h3 className="text-lg font-semibold text-bone">{week.theme}</h3>
                        <p className="mt-3 text-sm leading-7 text-bone-muted">{week.goal}</p>
                      </div>
                      <span className="shell-pill">{week.sessions.length} sessions</span>
                    </div>
                  </summary>

                  <div className="mt-5 space-y-4 border-t border-border/70 pt-5">
                    <div className="rounded-2xl border border-border/60 bg-black/10 p-4 text-sm leading-7 text-bone-muted">
                      <span className="font-semibold text-bone">Deliverable:</span> {week.deliverable}
                    </div>

                    {week.sessions.map((session, index) => (
                      <div key={`${week.weekNumber}-${index}`} className="rounded-2xl border border-border/60 bg-black/10 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-bone">{session.title}</p>
                          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-bone-muted">
                            <span>{session.type}</span>
                            <span>{session.minutes} min</span>
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-bone-muted">{session.description}</p>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="shell-kicker mb-2">History</p>
            <h2 className="text-[1.9rem] font-semibold text-bone">Previous curriculum drafts and approvals</h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-border/80 bg-stone-900/70 px-4 py-2 text-sm text-bone-muted">
            <CalendarDays size={15} />
            Approved plans appear in the planner
          </div>
        </div>

        {historyPlans.length === 0 ? (
          <div className="shell-panel px-6 py-10 text-center">
            <Brain className="mx-auto mb-4 text-bone-muted" size={24} />
            <p className="text-bone-muted">No previous curricula yet. Generate one above to start building your study layer.</p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {historyPlans.map((plan) => (
              <article key={plan.id} className="shell-panel px-6 py-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${planStatusTone(plan.status)}`}>
                        {plan.status}
                      </span>
                      <span className="shell-pill capitalize">{plan.intensity}</span>
                    </div>
                    <h3 className="text-xl font-semibold text-bone">{plan.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-bone-muted">{plan.summary}</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border/70 bg-stone-950/60 p-3">
                    <p className="shell-kicker mb-2">Topic</p>
                    <p className="text-sm text-bone">{plan.topic}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-stone-950/60 p-3">
                    <p className="shell-kicker mb-2">Duration</p>
                    <p className="text-sm text-bone">{plan.duration_weeks} weeks</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-stone-950/60 p-3">
                    <p className="shell-kicker mb-2">Starts</p>
                    <p className="text-sm text-bone">{niceDate(plan.start_date) || 'Not scheduled yet'}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {plan.skills.slice(0, 6).map((skill) => (
                    <span key={skill} className="shell-pill">
                      {skill}
                    </span>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={buildJournalHref(plan)}
                    className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-stone-950/70 px-4 py-2 text-sm text-bone-muted transition-colors hover:border-leather-400/45 hover:text-bone"
                  >
                    <PenSquare size={14} />
                    Journal this feedback
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        {approvedPlans.length > 0 ? (
          <p className="text-sm text-bone-muted">
            {approvedPlans.length} curriculum{approvedPlans.length === 1 ? '' : 's'} already scheduled into your planner.
          </p>
        ) : null}
      </section>
    </div>
  )
}
