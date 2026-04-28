'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, ChevronDown, Loader2, PenSquare } from 'lucide-react'
import type { CurriculumPlanRow } from '@/types/curriculum'

interface CurriculumDetailProps {
  initialPlan: CurriculumPlanRow
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

export function CurriculumDetail({ initialPlan }: CurriculumDetailProps) {
  const router = useRouter()
  const [plan, setPlan] = useState(initialPlan)
  const [isApproving, startApproving] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [openWeek, setOpenWeek] = useState<number | null>(plan.curriculum.weeks[0]?.weekNumber ?? null)

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
                  <span className="hidden text-xs text-bone-muted sm:inline">{week.sessions.length} sessions</span>
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
                      {week.sessions.map((session, index) => (
                        <div key={`${week.weekNumber}-${index}`} className="rounded-xl border border-border/60 bg-black/10 px-4 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-bone">{session.title}</p>
                            <div className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.16em] text-bone-muted">
                              <span>{session.type}</span>
                              <span>·</span>
                              <span>{session.minutes} min</span>
                            </div>
                          </div>
                          <p className="mt-1.5 text-sm leading-6 text-bone-muted">{session.description}</p>
                        </div>
                      ))}
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
