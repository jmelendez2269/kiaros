'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Loader2, PenSquare, RefreshCw, Sparkles } from 'lucide-react'
import type {
  CurriculumDraftSession,
  CurriculumDraftWeek,
  CurriculumPlanRow,
  CurriculumSessionContentRow,
  CurriculumSessionExercise,
} from '@/types/curriculum'

interface Props {
  plan: CurriculumPlanRow
  week: CurriculumDraftWeek
  session: CurriculumDraftSession
  sessionOrder: number
  initialContent: CurriculumSessionContentRow | null
  initialCompletedAt: string | null
}

interface Neighbor {
  weekNumber: number
  sessionOrder: number
}

function findNeighbors(plan: CurriculumPlanRow, weekNumber: number, sessionOrder: number) {
  const weeks = plan.curriculum.weeks
  let prev: Neighbor | null = null
  let next: Neighbor | null = null
  let found = false
  outer: for (const w of weeks) {
    for (let i = 0; i < w.sessions.length; i++) {
      const order = i + 1
      if (found) {
        next = { weekNumber: w.weekNumber, sessionOrder: order }
        break outer
      }
      if (w.weekNumber === weekNumber && order === sessionOrder) {
        found = true
        continue
      }
      prev = { weekNumber: w.weekNumber, sessionOrder: order }
    }
  }
  return { prev, next }
}

function neighborHref(planId: string, n: Neighbor | null) {
  if (!n) return null
  return `/curriculum/${planId}/w/${n.weekNumber}/s/${n.sessionOrder}`
}

function neighborLabel(plan: CurriculumPlanRow, n: Neighbor | null): string | null {
  if (!n) return null
  const week = plan.curriculum.weeks.find((w) => w.weekNumber === n.weekNumber)
  const session = week?.sessions[n.sessionOrder - 1]
  if (!week || !session) return null
  return `W${week.weekNumber} S${n.sessionOrder} · ${session.title}`
}

function formatCompletedAt(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function buildJournalHref(plan: CurriculumPlanRow, week: CurriculumDraftWeek, session: CurriculumDraftSession) {
  const context = [
    `Curriculum: ${plan.title}`,
    `Week ${week.weekNumber} · ${week.theme}`,
    `Session: ${session.title} (${session.type}, ${session.minutes} min)`,
    session.description,
  ]
    .filter(Boolean)
    .join('\n\n')

  const params = new URLSearchParams({
    area: 'Study',
    theme: session.title,
    prompt: `What stood out from "${session.title}"?`,
    context,
  })

  return `/journal?${params.toString()}`
}

// Lightweight markdown → React. We don't need a full parser here — the
// generator produces a constrained subset (headings, lists, paragraphs,
// inline code, blockquotes). A real markdown lib would balloon the bundle
// for what is essentially a styled article.
function renderMarkdown(body: string) {
  const lines = body.split(/\r?\n/)
  const nodes: React.ReactElement[] = []
  let listBuffer: string[] = []
  let listType: 'ul' | 'ol' | null = null
  let paraBuffer: string[] = []
  let quoteBuffer: string[] = []

  const flushPara = () => {
    if (paraBuffer.length === 0) return
    nodes.push(
      <p key={`p-${nodes.length}`} className="text-[15px] leading-7 text-bone-muted">
        {renderInline(paraBuffer.join(' '))}
      </p>
    )
    paraBuffer = []
  }
  const flushList = () => {
    if (listBuffer.length === 0 || !listType) return
    const Tag = listType
    nodes.push(
      <Tag
        key={`l-${nodes.length}`}
        className={`space-y-1.5 pl-5 text-[15px] leading-7 text-bone-muted ${
          listType === 'ul' ? 'list-disc' : 'list-decimal'
        }`}
      >
        {listBuffer.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </Tag>
    )
    listBuffer = []
    listType = null
  }
  const flushQuote = () => {
    if (quoteBuffer.length === 0) return
    nodes.push(
      <blockquote
        key={`q-${nodes.length}`}
        className="border-l-2 border-leather-400/45 pl-4 text-[15px] italic leading-7 text-bone-muted/90"
      >
        {renderInline(quoteBuffer.join(' '))}
      </blockquote>
    )
    quoteBuffer = []
  }
  const flushAll = () => {
    flushPara()
    flushList()
    flushQuote()
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    if (line.trim() === '') {
      flushAll()
      continue
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(line)
    if (h) {
      flushAll()
      const level = h[1].length
      const text = h[2]
      const sizeClass =
        level === 1 ? 'text-xl' : level === 2 ? 'text-lg' : level === 3 ? 'text-base' : 'text-sm uppercase tracking-[0.14em]'
      nodes.push(
        <div key={`h-${nodes.length}`} className={`font-semibold text-bone ${sizeClass}`}>
          {renderInline(text)}
        </div>
      )
      continue
    }
    const ul = /^[-*]\s+(.*)$/.exec(line)
    if (ul) {
      flushPara()
      flushQuote()
      if (listType && listType !== 'ul') flushList()
      listType = 'ul'
      listBuffer.push(ul[1])
      continue
    }
    const ol = /^\d+\.\s+(.*)$/.exec(line)
    if (ol) {
      flushPara()
      flushQuote()
      if (listType && listType !== 'ol') flushList()
      listType = 'ol'
      listBuffer.push(ol[1])
      continue
    }
    const q = /^>\s?(.*)$/.exec(line)
    if (q) {
      flushPara()
      flushList()
      quoteBuffer.push(q[1])
      continue
    }
    flushList()
    flushQuote()
    paraBuffer.push(line)
  }
  flushAll()
  return nodes
}

function renderInline(text: string): React.ReactNode {
  // Order matters: code first (so its contents aren't bold-parsed), then bold, then italic.
  const tokens: Array<{ kind: 'text' | 'code' | 'bold' | 'italic'; value: string }> = [{ kind: 'text', value: text }]

  const apply = (regex: RegExp, kind: 'code' | 'bold' | 'italic') => {
    const out: typeof tokens = []
    for (const t of tokens) {
      if (t.kind !== 'text') {
        out.push(t)
        continue
      }
      let lastIndex = 0
      let m: RegExpExecArray | null
      regex.lastIndex = 0
      while ((m = regex.exec(t.value)) !== null) {
        if (m.index > lastIndex) out.push({ kind: 'text', value: t.value.slice(lastIndex, m.index) })
        out.push({ kind, value: m[1] })
        lastIndex = m.index + m[0].length
      }
      if (lastIndex < t.value.length) out.push({ kind: 'text', value: t.value.slice(lastIndex) })
    }
    tokens.splice(0, tokens.length, ...out)
  }

  apply(/`([^`]+)`/g, 'code')
  apply(/\*\*([^*]+)\*\*/g, 'bold')
  apply(/(?<!\*)\*([^*]+)\*(?!\*)/g, 'italic')

  return tokens.map((t, i) => {
    if (t.kind === 'code') return <code key={i} className="rounded bg-stone-900/80 px-1.5 py-0.5 font-mono text-[0.85em] text-bone">{t.value}</code>
    if (t.kind === 'bold') return <strong key={i} className="font-semibold text-bone">{t.value}</strong>
    if (t.kind === 'italic') return <em key={i} className="italic">{t.value}</em>
    return <span key={i}>{t.value}</span>
  })
}

export function CurriculumSessionView({ plan, week, session, sessionOrder, initialContent, initialCompletedAt }: Props) {
  const [content, setContent] = useState<CurriculumSessionContentRow | null>(initialContent)
  const [completedAt, setCompletedAt] = useState<string | null>(initialCompletedAt)
  const [loading, setLoading] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isComplete = Boolean(completedAt)

  const { prev, next } = useMemo(
    () => findNeighbors(plan, week.weekNumber, sessionOrder),
    [plan, week.weekNumber, sessionOrder]
  )

  const generate = useCallback(
    async (force: boolean) => {
      setError(null)
      const setBusy = force ? setRegenerating : setLoading
      setBusy(true)
      try {
        const url = `/api/curriculum/${plan.id}/sessions/${week.weekNumber}/${sessionOrder}/generate${force ? '?force=1' : ''}`
        const response = await fetch(url, { method: 'POST' })
        const payload = await response.json()
        if (!response.ok) {
          setError(payload.error || 'Unable to generate session content.')
          return
        }
        const c = payload.content
        setContent({
          id: c.id,
          curriculum_plan_id: c.curriculum_plan_id,
          week_number: c.week_number,
          session_order: c.session_order,
          body: c.body,
          exercises: Array.isArray(c.exercises) ? (c.exercises as CurriculumSessionExercise[]) : [],
          reflectionPrompt: c.reflection_prompt ?? null,
          model: c.model,
          generated_at: c.generated_at,
          updated_at: c.updated_at,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to generate session content.')
      } finally {
        setBusy(false)
      }
    },
    [plan.id, week.weekNumber, sessionOrder]
  )

  // First visit: no content yet → kick off generation automatically. The
  // alternative is a "Generate" button, but the user already chose to open
  // the page, so the click is implicit.
  useEffect(() => {
    if (!content && !loading) {
      void generate(false)
    }
  }, [content, loading, generate])

  // Warm the cache for the next session once the user completes this one.
  // The generate endpoint short-circuits if a row already exists, so this is
  // idempotent — the ref just keeps us from re-firing on render churn.
  const prefetchedRef = useRef<string | null>(null)
  useEffect(() => {
    if (!isComplete || !next) return
    const key = `${next.weekNumber}:${next.sessionOrder}`
    if (prefetchedRef.current === key) return
    prefetchedRef.current = key
    void fetch(
      `/api/curriculum/${plan.id}/sessions/${next.weekNumber}/${next.sessionOrder}/generate`,
      { method: 'POST', keepalive: true }
    ).catch(() => {
      prefetchedRef.current = null
    })
  }, [isComplete, next, plan.id])

  async function toggleComplete() {
    if (completing) return
    const nextComplete = !isComplete
    setError(null)
    setCompleting(true)
    const previousCompletedAt = completedAt
    setCompletedAt(nextComplete ? new Date().toISOString() : null)
    try {
      const response = await fetch(
        `/api/curriculum/${plan.id}/sessions/${week.weekNumber}/${sessionOrder}/complete`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: nextComplete }),
        }
      )
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'Failed to update progress')
      }
      const payload = await response.json()
      setCompletedAt(payload.progress?.completed_at ?? null)
    } catch (err) {
      setCompletedAt(previousCompletedAt)
      setError(err instanceof Error ? err.message : 'Failed to update progress')
    } finally {
      setCompleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/curriculum/${plan.id}`}
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.16em] text-bone-muted hover:text-bone"
        >
          <ArrowLeft size={13} />
          {plan.title}
        </Link>
        <div className="flex items-center gap-1.5">
          {prev ? (
            <Link
              href={neighborHref(plan.id, prev)!}
              className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-stone-950/60 px-3 py-1.5 text-xs text-bone-muted hover:border-leather-400/45 hover:text-bone"
            >
              <ChevronLeft size={12} />
              Prev
            </Link>
          ) : null}
          {next ? (
            <Link
              href={neighborHref(plan.id, next)!}
              className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-stone-950/60 px-3 py-1.5 text-xs text-bone-muted hover:border-leather-400/45 hover:text-bone"
            >
              Next
              <ChevronRight size={12} />
            </Link>
          ) : null}
        </div>
      </div>

      <header className="shell-panel px-6 py-6 md:px-8">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-bone-muted">
          <span className="rounded-full border border-border/60 bg-stone-950/60 px-2.5 py-0.5">
            Week {week.weekNumber}
          </span>
          <span className="rounded-full border border-border/60 bg-stone-950/60 px-2.5 py-0.5">
            {week.theme}
          </span>
          <span className="rounded-full border border-border/60 bg-stone-950/60 px-2.5 py-0.5">
            {session.type}
          </span>
          <span className="rounded-full border border-border/60 bg-stone-950/60 px-2.5 py-0.5">
            {session.minutes} min
          </span>
          {isComplete && completedAt ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-moss-500/45 bg-moss-500/15 px-2.5 py-0.5 text-moss-200">
              <CheckCircle2 size={11} />
              Completed · {formatCompletedAt(completedAt)}
            </span>
          ) : null}
        </div>
        <h1 className="text-[1.7rem] font-semibold leading-tight text-bone md:text-[2rem]">{session.title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-bone-muted">{session.description}</p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => toggleComplete()}
            disabled={completing}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
              isComplete
                ? 'border-moss-500/45 bg-moss-500/15 text-moss-100 hover:bg-moss-500/25'
                : 'border-moss-500/40 bg-moss-500/20 text-bone hover:bg-moss-500/30'
            }`}
          >
            {completing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {isComplete ? 'Completed · undo' : 'Mark complete'}
          </button>
          <Link
            href={buildJournalHref(plan, week, session)}
            className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-stone-950/70 px-4 py-2 text-sm text-bone-muted hover:border-leather-400/45 hover:text-bone"
          >
            <PenSquare size={14} />
            Open in journal
          </Link>
          <button
            type="button"
            onClick={() => generate(true)}
            disabled={loading || regenerating}
            className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-stone-950/70 px-4 py-2 text-sm text-bone-muted hover:border-leather-400/45 hover:text-bone disabled:cursor-not-allowed disabled:opacity-60"
          >
            {regenerating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Regenerate
          </button>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <section className="shell-panel px-6 py-6 md:px-8">
        {loading && !content ? (
          <div className="flex flex-col items-center gap-3 py-12 text-bone-muted">
            <Sparkles size={20} className="text-leather-300" />
            <p className="text-sm">Drafting your lesson…</p>
          </div>
        ) : content ? (
          <div className="space-y-4">{renderMarkdown(content.body)}</div>
        ) : !error ? (
          <div className="py-8 text-center text-sm text-bone-muted">No content yet.</div>
        ) : null}
      </section>

      {content && content.exercises.length > 0 ? (
        <section className="shell-panel-soft px-6 py-6 md:px-8">
          <p className="shell-kicker mb-3">Try this</p>
          <ol className="space-y-3">
            {content.exercises.map((ex, i) => (
              <li key={i} className="rounded-xl border border-border/60 bg-black/15 px-4 py-3">
                <p className="text-sm font-semibold text-bone">{ex.prompt}</p>
                {ex.detail ? <p className="mt-1.5 text-sm leading-6 text-bone-muted">{ex.detail}</p> : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {content?.reflectionPrompt ? (
        <section className="shell-panel-soft px-6 py-6 md:px-8">
          <p className="shell-kicker mb-3">Reflect</p>
          <p className="text-[15px] leading-7 text-bone-muted">{content.reflectionPrompt}</p>
          <Link
            href={`/journal?${new URLSearchParams({
              area: 'Study',
              theme: session.title,
              prompt: content.reflectionPrompt,
              context: `Week ${week.weekNumber} · ${week.theme}\nSession: ${session.title}`,
            }).toString()}`}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-border/80 bg-stone-950/70 px-4 py-2 text-sm text-bone-muted hover:border-leather-400/45 hover:text-bone"
          >
            <PenSquare size={14} />
            Answer in journal
          </Link>
        </section>
      ) : null}

      {isComplete && next ? (
        <section className="rounded-2xl border border-moss-500/35 bg-moss-500/8 px-6 py-5 md:px-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-[0.7rem] uppercase tracking-[0.18em] text-moss-200">Next up</p>
              <p className="mt-1 text-base font-semibold text-bone">{neighborLabel(plan, next)}</p>
            </div>
            <Link
              href={neighborHref(plan.id, next)!}
              className="inline-flex items-center gap-2 self-start rounded-full border border-moss-500/45 bg-moss-500/20 px-4 py-2 text-sm font-semibold text-bone hover:bg-moss-500/30 md:self-auto"
            >
              Open next session
              <ChevronRight size={14} />
            </Link>
          </div>
        </section>
      ) : isComplete && !next ? (
        <section className="rounded-2xl border border-moss-500/35 bg-moss-500/8 px-6 py-5 text-center md:px-8">
          <p className="text-[0.7rem] uppercase tracking-[0.18em] text-moss-200">Plan complete</p>
          <p className="mt-1 text-base font-semibold text-bone">
            You finished the last session of {plan.title}.
          </p>
        </section>
      ) : null}

      {content ? (
        <p className="text-center text-[0.7rem] uppercase tracking-[0.16em] text-bone-muted/70">
          Generated by {content.model} · {new Date(content.generated_at).toLocaleString()}
        </p>
      ) : null}
    </div>
  )
}
