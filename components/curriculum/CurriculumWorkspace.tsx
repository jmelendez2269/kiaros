'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Brain, Check, ChevronDown, Loader2, Plus, Search, Sparkles, X } from 'lucide-react'
import type { CurriculumPlanRow, CurriculumPlanProgress } from '@/types/curriculum'

type GenerateStep = 'analyzing' | 'generating' | 'saving'

const GENERATE_STEPS: { key: GenerateStep; label: string }[] = [
  { key: 'analyzing', label: 'Analyzing your prompt' },
  { key: 'generating', label: 'Building your curriculum' },
  { key: 'saving', label: 'Saving your plan' },
]

function gStepIndex(key: GenerateStep | null) {
  if (!key) return -1
  return GENERATE_STEPS.findIndex((s) => s.key === key)
}

interface CurriculumWorkspaceProps {
  initialPlans: CurriculumPlanRow[]
  progressByPlan: Record<string, CurriculumPlanProgress>
  studyFocus: string | null
  goalNames: string[]
}

type DrawerPhase = 'compose' | 'detecting' | 'split' | 'generating'

/** Past this many running courses the list stops being scannable, so search returns. */
const SEARCH_THRESHOLD = 8

const RUNNING_STATUSES: CurriculumPlanRow['status'][] = ['draft', 'approved']

interface SplitCourse {
  label: string
  prompt: string
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
  if (status === 'paused') return 'border-ember-400/35 bg-ember-400/12 text-ember-300'
  if (status === 'archived') return 'border-border/60 bg-stone-950/60 text-bone-muted'
  return 'border-leather-400/35 bg-leather-500/12 text-leather-200'
}

/**
 * The plan is Kiaros's synthesis, so the card frame is leather. Progress is
 * the user's own doing, so the meter reads moss. See the channel semantics
 * block in globals.css.
 */
function CourseCard({
  plan,
  progress,
}: {
  plan: CurriculumPlanRow
  progress: CurriculumPlanProgress | undefined
}) {
  const total = progress?.totalSessions ?? 0
  const done = progress?.completedSessions ?? 0
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const currentWeek = progress?.currentWeek ?? 1

  return (
    <Link
      href={`/curriculum/${plan.id}`}
      className="channel-ai channel-card group flex flex-col gap-4 px-5 py-5"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-[1.12rem] leading-snug text-bone">{plan.title}</h3>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.16em] ${statusTone(plan.status)}`}
        >
          {plan.status}
        </span>
      </div>

      {plan.summary ? (
        <p className="line-clamp-2 text-sm leading-6 text-bone-muted">{plan.summary}</p>
      ) : null}

      <div className="channel-mine mt-auto space-y-2">
        <div className="channel-meter" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="channel-meter-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-bone-muted">
          <span>
            {total > 0 ? (
              <>
                <span className="text-bone">{done}</span> of {total} sessions
              </>
            ) : (
              'Not scheduled yet'
            )}
          </span>
          <span className="text-bone-muted/70">
            week {currentWeek} of {plan.duration_weeks} · {plan.weekly_hours}h/wk
          </span>
        </div>
      </div>
    </Link>
  )
}

function ShelfRow({ plan }: { plan: CurriculumPlanRow }) {
  return (
    <Link
      href={`/curriculum/${plan.id}`}
      className="flex items-center gap-3 rounded-[0.85rem] px-3 py-2.5 transition-colors hover:bg-stone-950/60"
    >
      <span className="channel-sky channel-dot" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-sm text-bone-muted">{plan.title}</span>
      <span className="shrink-0 text-xs uppercase tracking-[0.14em] text-bone-muted/55">{plan.status}</span>
      <span className="shrink-0 text-xs text-bone-muted/55">{relativeTime(plan.created_at)}</span>
    </Link>
  )
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

export function CurriculumWorkspace({
  initialPlans,
  progressByPlan,
  studyFocus,
  goalNames,
}: CurriculumWorkspaceProps) {
  const router = useRouter()
  const [plans, setPlans] = useState(() => initialPlans.map(normalizePlan))
  const [search, setSearch] = useState('')
  const [shelfOpen, setShelfOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [phase, setPhase] = useState<DrawerPhase>('compose')
  const [splitCourses, setSplitCourses] = useState<SplitCourse[]>([])
  const [generatingStatus, setGeneratingStatus] = useState('')
  const [generatingStep, setGeneratingStep] = useState<GenerateStep | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (phase !== 'generating') { setElapsed(0); return }
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(interval)
  }, [phase])

  const running = useMemo(
    () => plans.filter((plan) => RUNNING_STATUSES.includes(plan.status)),
    [plans]
  )
  const shelved = useMemo(
    () => plans.filter((plan) => !RUNNING_STATUSES.includes(plan.status)),
    [plans]
  )

  const showSearch = running.length > SEARCH_THRESHOLD

  const visibleRunning = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!showSearch || !query) return running
    return running.filter((plan) =>
      [plan.title, plan.topic, plan.summary ?? '', ...plan.skills].join(' ').toLowerCase().includes(query)
    )
  }, [running, search, showSearch])

  useEffect(() => {
    if (!createOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [createOpen])

  function handleClose() {
    setCreateOpen(false)
    setPhase('compose')
    setSplitCourses([])
    setError(null)
  }

  async function generateOne(p: string): Promise<CurriculumPlanRow | null> {
    setGeneratingStep(null)
    const response = await fetch('/api/curriculum/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: p }),
    })

    if (!response.ok || !response.body) {
      const payload = await response.json().catch(() => ({}))
      setError((payload as { error?: string }).error || 'Unable to generate curriculum right now.')
      return null
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let plan: CurriculumPlanRow | null = null

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const event = JSON.parse(line.slice(6)) as { step: string; error?: string; plan?: unknown }
          if (event.step === 'error') {
            setError(event.error ?? 'Something went wrong.')
            return null
          }
          if (event.step === 'done' && event.plan) {
            plan = normalizePlan(event.plan)
          }
          if (event.step === 'analyzing' || event.step === 'generating' || event.step === 'saving') {
            setGeneratingStep(event.step)
          }
        } catch {
          // ignore malformed lines
        }
      }
    }

    if (!plan) setError('Generation completed but no plan was returned. Try again.')
    return plan
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPhase('detecting')

    let detected: { split: boolean; courses?: SplitCourse[] }
    try {
      const res = await fetch('/api/curriculum/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      detected = res.ok ? await res.json() : { split: false }
    } catch {
      detected = { split: false }
    }

    if (detected.split && detected.courses && detected.courses.length >= 2) {
      setSplitCourses(detected.courses)
      setPhase('split')
      return
    }

    await runGenerate([prompt])
  }

  async function handleGenerateSingle() {
    await runGenerate([prompt])
  }

  async function handleGenerateBoth() {
    await runGenerate(splitCourses.map((c) => c.prompt))
  }

  async function runGenerate(prompts: string[]) {
    setPhase('generating')
    setError(null)
    const generated: CurriculumPlanRow[] = []

    for (let i = 0; i < prompts.length; i++) {
      setGeneratingStatus(
        prompts.length > 1
          ? `Building course ${i + 1} of ${prompts.length}…`
          : 'Building your plan…'
      )
      const plan = await generateOne(prompts[i])
      if (!plan) {
        setPhase(prompts.length > 1 ? 'split' : 'compose')
        return
      }
      generated.push(plan)
    }

    setPlans((current) => {
      const ids = new Set(generated.map((p) => p.id))
      return [...generated, ...current.filter((p) => !ids.has(p.id))]
    })
    setPrompt('')
    handleClose()

    if (generated.length === 1) {
      router.push(`/curriculum/${generated[0].id}`)
    }
    router.refresh()
  }

  const isBusy = phase === 'detecting' || phase === 'generating'

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

      {showSearch ? (
        <div className="relative w-full md:max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-bone-muted/70" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses, topics, skills..."
            className="w-full rounded-full border border-border/70 bg-stone-950/70 py-2 pl-9 pr-3 text-sm text-bone placeholder:text-bone-muted/50 outline-none focus:border-leather-400/50"
          />
        </div>
      ) : null}

      {plans.length === 0 ? (
        <div className="shell-panel flex flex-col items-center px-6 py-12 text-center">
          <Brain className="mb-3 text-bone-muted" size={22} />
          <p className="text-bone-muted">No courses yet. Start one to build your study layer.</p>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-leather-400/45 bg-leather-500/30 px-4 py-2 text-sm font-semibold text-bone"
          >
            <Sparkles size={14} />
            Generate first course
          </button>
        </div>
      ) : (
        <>
          {running.length > 0 ? (
            <section className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="shell-eyebrow">Running</p>
                <span className="text-xs text-bone-muted/60">
                  {running.length} {running.length === 1 ? 'course' : 'courses'}
                </span>
              </div>
              {visibleRunning.length === 0 ? (
                <p className="px-1 text-sm text-bone-muted">No courses match that search.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {visibleRunning.map((plan) => (
                    <CourseCard key={plan.id} plan={plan} progress={progressByPlan[plan.id]} />
                  ))}
                </div>
              )}
            </section>
          ) : (
            <div className="shell-panel px-6 py-10 text-center">
              <p className="text-bone-muted">
                Nothing running right now. Everything you&apos;ve built is on the shelf below.
              </p>
            </div>
          )}

          {shelved.length > 0 ? (
            <section className="space-y-2">
              <button
                type="button"
                onClick={() => setShelfOpen((open) => !open)}
                aria-expanded={shelfOpen}
                className="flex w-full items-center gap-2 rounded-[0.85rem] px-1 py-1.5 text-left transition-colors hover:text-bone"
              >
                <ChevronDown
                  size={14}
                  className={`text-bone-muted/60 transition-transform ${shelfOpen ? 'rotate-0' : '-rotate-90'}`}
                />
                <span className="shell-eyebrow">Shelf</span>
                <span className="text-xs text-bone-muted/60">
                  {shelved.filter((p) => p.status === 'paused').length} paused ·{' '}
                  {shelved.filter((p) => p.status === 'archived').length} archived
                </span>
              </button>
              {shelfOpen ? (
                <div className="shell-panel-inline divide-y divide-border/40 px-2 py-1">
                  {shelved.map((plan) => (
                    <ShelfRow key={plan.id} plan={plan} />
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}
        </>
      )}

      {createOpen ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="New course">
          <button
            type="button"
            aria-label="Close"
            onClick={handleClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-border/70 bg-stone-950 shadow-2xl">

            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-border/60 px-6 py-5">
              <div>
                <p className="shell-kicker mb-1">New course</p>
                {phase === 'split' ? (
                  <>
                    <h2 className="text-xl font-semibold text-bone">I see two courses in here</h2>
                    <p className="mt-1.5 text-sm text-bone-muted">Generate them separately for cleaner pacing, or keep everything as one.</p>
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-semibold text-bone">What do you want to learn?</h2>
                    <p className="mt-1.5 text-sm text-bone-muted">Describe it in your own words — your goal, your deadline, your tools, where you&apos;re starting from.</p>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={isBusy}
                className="rounded-full border border-border/70 bg-stone-950/80 p-2 text-bone-muted hover:text-bone disabled:opacity-40"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Compose phase */}
            {(phase === 'compose' || phase === 'detecting') ? (
              <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
                <div className="flex-1 px-6 py-5 space-y-4">
                  <label className="block space-y-2">
                    <textarea
                      required
                      autoFocus
                      rows={10}
                      value={prompt}
                      disabled={phase === 'detecting'}
                      onChange={(e) => setPrompt(e.target.value.slice(0, 2000))}
                      className="w-full resize-none rounded-2xl border border-border/80 bg-stone-950/80 px-4 py-3 text-bone outline-none placeholder:text-bone-muted/40 focus:border-leather-400/50 leading-relaxed disabled:opacity-50"
                      placeholder={`e.g. I want to learn to DJ for my sister's wedding next May. I have a Launchpad MK2 and Resolume. I've been freestyling melodic bass and afro house for about a year. I need to learn transitions, effects, and how to put on a real performance.`}
                    />
                    <span className="block text-right text-xs text-bone-muted/50">{prompt.length}/2000</span>
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
                    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
                  ) : null}
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-border/60 bg-stone-950/80 px-6 py-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={phase === 'detecting'}
                    className="rounded-full border border-border/70 bg-stone-950/60 px-4 py-2 text-sm text-bone-muted hover:text-bone disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={phase === 'detecting'}
                    className="inline-flex items-center gap-2 rounded-full border border-leather-400/45 bg-leather-500/30 px-4 py-2 text-sm font-semibold text-bone shadow-glow disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {phase === 'detecting' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {phase === 'detecting' ? 'Reading your prompt…' : 'Build my plan'}
                  </button>
                </div>
              </form>
            ) : null}

            {/* Split confirmation phase */}
            {phase === 'split' ? (
              <div className="flex flex-1 flex-col">
                <div className="flex-1 space-y-3 px-6 py-5">
                  {splitCourses.map((course, i) => (
                    <div key={i} className="rounded-2xl border border-border/70 bg-stone-950/50 px-5 py-4">
                      <p className="shell-kicker mb-1.5">Course {i + 1}</p>
                      <p className="mb-2 text-[0.95rem] font-semibold text-bone">{course.label}</p>
                      <p className="line-clamp-3 text-sm leading-6 text-bone-muted">{course.prompt}</p>
                    </div>
                  ))}

                  {error ? (
                    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2 border-t border-border/60 bg-stone-950/80 px-6 py-4">
                  <button
                    type="button"
                    onClick={handleGenerateBoth}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-leather-400/45 bg-leather-500/30 px-4 py-2.5 text-sm font-semibold text-bone shadow-glow"
                  >
                    <Sparkles size={14} />
                    Generate both separately
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateSingle}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-border/70 bg-stone-950/60 px-4 py-2.5 text-sm text-bone-muted hover:text-bone"
                  >
                    Keep as one course
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPhase('compose'); setError(null) }}
                    className="inline-flex items-center justify-center gap-1.5 text-xs text-bone-muted/60 hover:text-bone-muted pt-1"
                  >
                    <ArrowLeft size={12} />
                    Edit my prompt
                  </button>
                </div>
              </div>
            ) : null}

            {/* Generating phase */}
            {phase === 'generating' ? (
              <div className="flex flex-1 flex-col items-center justify-center px-8 py-12">
                <div className="w-full max-w-xs space-y-6">
                  {generatingStatus ? (
                    <p className="shell-kicker text-center">{generatingStatus}</p>
                  ) : null}

                  <div className="space-y-4">
                    {GENERATE_STEPS.map((step, i) => {
                      const activeIdx = gStepIndex(generatingStep)
                      const isDone = i < activeIdx
                      const isActive = i === activeIdx
                      const isPending = i > activeIdx

                      return (
                        <div key={step.key} className="flex items-start gap-3">
                          <div className="mt-0.5 flex-shrink-0">
                            {isDone ? (
                              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-leather-400/80">
                                <Check size={9} className="text-stone-950" strokeWidth={3} />
                              </div>
                            ) : isActive ? (
                              <div className="h-4 w-4 rounded-full border-2 border-leather-400 bg-leather-500/30 animate-pulse" />
                            ) : (
                              <div className="h-4 w-4 rounded-full border border-border/60 opacity-35" />
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className={`text-sm ${isDone ? 'text-bone-muted' : isActive ? 'font-medium text-bone' : 'text-bone-muted/40'}`}>
                              {step.label}
                            </p>
                            {isActive && step.key === 'generating' && elapsed >= 10 ? (
                              <p className="text-xs text-bone-muted/60 leading-relaxed">
                                {elapsed < 45
                                  ? 'This usually takes 1–2 minutes…'
                                  : `Still working — ${Math.floor(elapsed / 60)}m ${String(elapsed % 60).padStart(2, '0')}s`}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : null}

          </aside>
        </div>
      ) : null}
    </div>
  )
}
