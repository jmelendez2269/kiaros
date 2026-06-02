'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, CheckCircle2, ChevronDown, Loader2, PenSquare } from 'lucide-react'
import type {
  CurriculumPlanRow,
  CurriculumSessionProgressRow,
} from '@/types/curriculum'

interface CurriculumDetailProps {
  initialPlan: CurriculumPlanRow
  initialProgress?: CurriculumSessionProgressRow[]
}

function progressKey(week: number, order: number) {
  return `${week}:${order}`
}

function statusTone(status: CurriculumPlanRow['status']) {
  if (status === 'approved') return 'border-moss-500/35 bg-moss-500/12 text-moss-200'
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

export function CurriculumDetail({ initialPlan, initialProgress = [] }: CurriculumDetailProps) {
  const router = useRouter()
  const [plan, setPlan] = useState(initialPlan)
  const [isApproving, startApproving] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [openWeek, setOpenWeek] = useState<number | null>(plan.curriculum.weeks[0]?.weekNumber ?? null)
  const [completedAt, setCompletedAt] = useState<Record<string, string | null>>(() => {
    const next: Record<string, string | null> = {}
    for (const row of initialProgress) {
      next[progressKey(row.week_number, row.session_order)] = row.completed_at
    }
    return next
  })
  const [togglingKey, setTogglingKey] = useState<string | null>(null)

  const completedCountByWeek = useMemo(() => {
    const counts: Record<number, number> = {}
    for (const [key, value] of Object.entries(completedAt)) {
      if (!value) continue
      const week = Number(key.split(':')[0])
      counts[week] = (counts[week] ?? 0) + 1
    }
    return counts
  }, [completedAt])

  const { totalSessions, completedSessions } = useMemo(() => {
    const total = plan.curriculum.weeks.reduce((acc, w) => acc + w.sessions.length, 0)
    const done = Object.values(completedAt).filter(Boolean).length
    return { totalSessions: total, completedSessions: done }
  }, [plan.curriculum.weeks, completedAt])

  const progressFraction = totalSessions === 0 ? 0 : completedSessions / totalSessions
  const progressPercent = Math.round(progressFraction * 100)

  async function toggleSessionComplete(weekNumber: number, sessionOrder: number) {
    const key = progressKey(weekNumber, sessionOrder)
    if (togglingKey) return
    const wasComplete = Boolean(completedAt[key])
    setTogglingKey(key)
    // Optimistic — flip immediately, roll back on failure.
    setCompletedAt((prev) => ({ ...prev, [key]: wasComplete ? null : new Date().toISOString() }))
    try {
      const response = await fetch(
        `/api/curriculum/${plan.id}/sessions/${weekNumber}/${sessionOrder}/complete`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: !wasComplete }),
        }
      )
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'Failed to update progress')
      }
      const payload = await response.json()
      setCompletedAt((prev) => ({ ...prev, [key]: payload.progress?.completed_at ?? null }))
    } catch (err) {
      setCompletedAt((prev) => ({ ...prev, [key]: wasComplete ? new Date().toISOString() : null }))
      setError(err instanceof Error ? err.message : 'Failed to update progress')
    } finally {
      setTogglingKey(null)
    }
  }

  function handleApprove() {
    setError(null)
    startApproving(async () => {
      const response = await fetch(`/api/curriculum/${plan.id}/approve`, { method: 'POST' })
      const payload = await response.json()
      if (!response.ok) {
        setError(payload.error || 'Unable to approve this curriculum right now.')
        return
      }
      setPlan({
        ...payload.plan,
        objectives: Array.isArray(payload.plan.objectives) ? payload.plan.objectives : [],
        outcomes: Array.isArray(payload.plan.outcomes) ? payload.plan.outcomes : [],
        skills: Array.isArray(payload.plan.skills) ? payload.plan.skills : [],
      })
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/curriculum" className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.16em] text-bone-muted hover:text-bone">
          <ArrowLeft size={13} />
          All courses
        </Link>
      </div>

      <header className="shell-panel px-6 py-6 md:px-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.18em] ${statusTone(plan.status)}`}>
                {plan.status}
              </span>
              <span className="shell-pill capitalize">{plan.intensity}</span>
              <span className="shell-pill">{plan.duration_weeks} weeks</span>
              <span className="shell-pill">{plan.weekly_hours} h/wk</span>
              {plan.start_date ? <span className="shell-pill">Starts {niceDate(plan.start_date)}</span> : null}
            </div>
            <h1 className="text-[1.85rem] font-semibold leading-tight text-bone md:text-[2.1rem]">{plan.title}</h1>
            {plan.summary ? <p className="mt-3 max-w-3xl text-sm leading-7 text-bone-muted">{plan.summary}</p> : null}
            {totalSessions > 0 ? (
              <div className="mt-5 max-w-md">
                <div className="mb-1.5 flex items-baseline justify-between text-xs uppercase tracking-[0.16em] text-bone-muted">
                  <span>Progress</span>
                  <span className={progressPercent === 100 ? 'text-moss-200' : 'text-bone'}>
                    {completedSessions}/{totalSessions} · {progressPercent}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-stone-950/70 ring-1 ring-inset ring-border/60">
                  <div
                    className={`h-full rounded-full transition-[width] duration-500 ${
                      progressPercent === 100 ? 'bg-moss-400/80' : 'bg-leather-400/70'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-start">
            <Link
              href={buildJournalHref(plan)}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border/80 bg-stone-950/70 px-4 py-2 text-sm text-bone-muted hover:border-leather-400/45 hover:text-bone"
            >
              <PenSquare size={14} />
              Journal
            </Link>
            <button
              type="button"
              disabled={isApproving || plan.status === 'approved'}
              onClick={handleApprove}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-moss-500/40 bg-moss-500/20 px-4 py-2 text-sm font-semibold text-bone disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isApproving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {plan.status === 'approved' ? 'Approved' : 'Approve & schedule'}
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}
      </header>

      {(plan.objectives.length > 0 || plan.outcomes.length > 0 || plan.skills.length > 0) ? (
        <section className="grid gap-4 md:grid-cols-2">
          {plan.objectives.length > 0 ? (
            <div className="shell-panel-soft px-5 py-5">
              <p className="shell-kicker mb-3">Objectives</p>
              <ul className="space-y-2 text-sm leading-6 text-bone-muted">
                {plan.objectives.map((objective) => (
                  <li key={objective} className="flex gap-2">
                    <span className="text-bone">·</span>
                    <span>{objective}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {plan.outcomes.length > 0 ? (
            <div className="shell-panel-soft px-5 py-5">
              <p className="shell-kicker mb-3">Outcomes</p>
              <ul className="space-y-2 text-sm leading-6 text-bone-muted">
                {plan.outcomes.map((outcome) => (
                  <li key={outcome} className="flex gap-2">
                    <span className="text-bone">·</span>
                    <span>{outcome}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {plan.skills.length > 0 ? (
            <div className="shell-panel-soft px-5 py-5 md:col-span-2">
              <p className="shell-kicker mb-3">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {plan.skills.map((skill) => (
                  <span key={skill} className="shell-pill">{skill}</span>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <p className="shell-kicker">Week-by-week</p>
          <p className="text-xs text-bone-muted">{plan.curriculum.weeks.length} weeks</p>
        </div>
        <ul className="space-y-2">
          {plan.curriculum.weeks.map((week) => {
            const isOpen = openWeek === week.weekNumber
            const completedInWeek = completedCountByWeek[week.weekNumber] ?? 0
            const allDone = completedInWeek === week.sessions.length && week.sessions.length > 0
            return (
              <li key={week.weekNumber} className="overflow-hidden rounded-2xl border border-border/70 bg-stone-950/60">
                <button
                  type="button"
                  onClick={() => setOpenWeek(isOpen ? null : week.weekNumber)}
                  className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-stone-950/80"
                >
                  <span className="w-8 flex-shrink-0 text-xs font-semibold uppercase tracking-[0.16em] text-bone-muted">
                    W{week.weekNumber}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-bone">{week.theme}</span>
                  <span
                    className={`hidden text-xs sm:inline ${
                      allDone ? 'text-moss-200' : 'text-bone-muted'
                    }`}
                  >
                    {completedInWeek}/{week.sessions.length} done
                  </span>
                  <ChevronDown
                    size={15}
                    className={`flex-shrink-0 text-bone-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {isOpen ? (
                  <div className="space-y-3 border-t border-border/60 px-5 py-4">
                    <p className="text-sm leading-6 text-bone-muted">{week.goal}</p>
                    <div className="rounded-xl border border-border/60 bg-black/15 px-4 py-3 text-sm leading-6 text-bone-muted">
                      <span className="font-semibold text-bone">Deliverable: </span>
                      {week.deliverable}
                    </div>

                    <div className="space-y-2">
                      {week.sessions.map((session, index) => {
                        const sessionOrder = index + 1
                        const key = progressKey(week.weekNumber, sessionOrder)
                        const isComplete = Boolean(completedAt[key])
                        const isToggling = togglingKey === key
                        return (
                          <div
                            key={`${week.weekNumber}-${index}`}
                            className={`group flex items-start gap-3 rounded-xl border bg-black/10 px-4 py-3 transition-colors ${
                              isComplete
                                ? 'border-moss-500/35 bg-moss-500/8'
                                : 'border-border/60 hover:border-leather-400/45 hover:bg-black/25'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                void toggleSessionComplete(week.weekNumber, sessionOrder)
                              }}
                              disabled={isToggling}
                              aria-label={isComplete ? 'Mark not done' : 'Mark done'}
                              aria-pressed={isComplete}
                              className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition-colors ${
                                isComplete
                                  ? 'border-moss-500/60 bg-moss-500/30 text-moss-100'
                                  : 'border-border/70 bg-stone-950/60 text-transparent hover:border-leather-400/60'
                              } disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                              {isToggling ? <Loader2 size={11} className="animate-spin text-bone-muted" /> : <Check size={12} />}
                            </button>
                            <Link
                              href={`/curriculum/${plan.id}/w/${week.weekNumber}/s/${sessionOrder}`}
                              className="block min-w-0 flex-1"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p
                                  className={`text-sm font-semibold ${
                                    isComplete ? 'text-bone-muted line-through decoration-bone-muted/40' : 'text-bone'
                                  }`}
                                >
                                  {session.title}
                                </p>
                                <div className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.16em] text-bone-muted">
                                  <span>{session.type}</span>
                                  <span>·</span>
                                  <span>{session.minutes} min</span>
                                </div>
                              </div>
                              <p className="mt-1.5 text-sm leading-6 text-bone-muted">{session.description}</p>
                            </Link>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
