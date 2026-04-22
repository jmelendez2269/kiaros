'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

type RecentJournalEntry = {
  id: string
  title: string | null
  body: string
  entry_date: string
  is_ritual: boolean | null
  created_at: string | null
}

interface JournalComposerProps {
  initialPrompt: string
  initialArea: string
  initialTheme: string
  initialWeek: string
  initialStart: string
  initialEnd: string
  initialContext: string
  recentEntries: RecentJournalEntry[]
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function truncate(value: string, max = 220) {
  return value.length <= max ? value : `${value.slice(0, max - 1)}...`
}

export function JournalComposer({
  initialPrompt,
  initialArea,
  initialTheme,
  initialWeek,
  initialStart,
  initialEnd,
  initialContext,
  recentEntries,
}: JournalComposerProps) {
  const [title, setTitle] = useState(initialPrompt ? truncate(initialPrompt, 120) : '')
  const [entryDate, setEntryDate] = useState(todayISO())
  const [body, setBody] = useState(initialPrompt ? `${initialPrompt}\n\n` : '')
  const [isRitual, setIsRitual] = useState(Boolean(initialPrompt))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  const contextSummary = useMemo(() => {
    const parts: string[] = []

    if (initialArea) parts.push(initialArea)
    if (initialTheme) parts.push(initialTheme)
    if (initialWeek) parts.push(`Week ${initialWeek}`)
    if (initialStart && initialEnd) parts.push(`${initialStart} to ${initialEnd}`)

    return parts
  }, [initialArea, initialTheme, initialWeek, initialStart, initialEnd])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    setSavedMessage(null)

    try {
      const response = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || null,
          body,
          entry_date: entryDate,
          is_ritual: isRitual,
          transit_context:
            initialPrompt || initialArea || initialTheme || initialContext
              ? {
                  prompt: initialPrompt || undefined,
                  area: initialArea || undefined,
                  theme: initialTheme || undefined,
                  week: initialWeek ? Number(initialWeek) : undefined,
                  start: initialStart || undefined,
                  end: initialEnd || undefined,
                  context: initialContext || undefined,
                }
              : null,
        }),
      })

      const payload = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save journal entry')
      }

      setSavedMessage('Saved. This entry can now inform Oracle grounding.')
      setBody(initialPrompt ? `${initialPrompt}\n\n` : '')
      setTitle(initialPrompt ? truncate(initialPrompt, 120) : '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save journal entry')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <section className="shell-panel px-6 py-7 md:px-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="shell-kicker mb-3">Journal</p>
            <h1 className="shell-section-title">Capture the prompt while the window is open</h1>
            <p className="mt-4 text-base leading-7 text-bone-muted">
              Save a reflection from a timing window, ritual, or live question. Oracle already uses recent journal
              entries as grounding, so this can become part of that context automatically.
            </p>
          </div>
          <div className="shell-panel-soft px-4 py-3 text-sm text-bone-muted">
            {initialPrompt ? 'Prompt-loaded entry' : 'Open reflection'}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="shell-panel px-6 py-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="shell-kicker">Compose</p>
              <h2 className="mt-2 text-[1.8rem] font-semibold text-bone">New entry</h2>
            </div>
            <Link
              href="/oracle"
              className="inline-flex items-center rounded-xl border border-border/80 bg-stone-950/80 px-4 py-2 text-sm text-bone-muted transition-colors hover:border-leather-400/45 hover:text-bone"
            >
              Open Oracle
            </Link>
          </div>

          {contextSummary.length > 0 ? (
            <div className="mt-5 rounded-[1.1rem] border border-leather-400/20 bg-leather-500/6 p-5">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-bone-muted/60">Window context</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {contextSummary.map((item) => (
                  <span key={item} className="shell-pill">
                    {item}
                  </span>
                ))}
              </div>
              {initialContext ? <p className="mt-4 text-sm leading-7 text-bone-muted">{initialContext}</p> : null}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-[1fr_180px]">
              <label className="block">
                <span className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-bone-muted/60">
                  Title
                </span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Optional title"
                  maxLength={160}
                  className="w-full rounded-xl border border-border/80 bg-stone-950/80 px-4 py-3 text-sm text-bone placeholder:text-bone-muted/40 focus:outline-none focus:ring-1 focus:ring-leather-400"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-bone-muted/60">
                  Entry date
                </span>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(event) => setEntryDate(event.target.value)}
                  className="w-full rounded-xl border border-border/80 bg-stone-950/80 px-4 py-3 text-sm text-bone focus:outline-none focus:ring-1 focus:ring-leather-400"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-bone-muted/60">
                Reflection
              </span>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Write what feels true, what the prompt stirs, or what this window is asking of you."
                rows={12}
                maxLength={12000}
                className="w-full resize-y rounded-[1.1rem] border border-border/80 bg-stone-950/80 px-4 py-4 text-sm leading-7 text-bone placeholder:text-bone-muted/40 focus:outline-none focus:ring-1 focus:ring-leather-400"
              />
            </label>

            <label className="flex items-center gap-3 rounded-[1rem] border border-border/70 bg-stone-950/60 px-4 py-3 text-sm text-bone-muted">
              <input
                type="checkbox"
                checked={isRitual}
                onChange={(event) => setIsRitual(event.target.checked)}
                className="h-4 w-4 rounded border-border/80 bg-stone-950/80 text-leather-300 focus:ring-leather-400"
              />
              Mark this as a ritual or intentional grounding entry
            </label>

            {error ? (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            ) : null}

            {savedMessage ? (
              <div className="rounded-xl border border-moss-500/35 bg-moss-500/10 px-4 py-3 text-sm text-moss-100">
                {savedMessage}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isSaving || body.trim().length === 0}
                className="rounded-xl border border-leather-400/50 bg-leather-500/35 px-5 py-3 text-sm font-medium text-bone shadow-glow transition-colors hover:bg-leather-500/45 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save entry'}
              </button>
              <Link
                href="/oracle"
                className="text-sm text-bone-muted underline decoration-border underline-offset-4 transition-colors hover:text-bone"
              >
                Ask Oracle after saving
              </Link>
            </div>
          </form>
        </article>

        <article className="shell-panel px-6 py-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="shell-kicker">Journal history</p>
              <h2 className="mt-2 text-[1.8rem] font-semibold text-bone">Your saved reflections</h2>
              <p className="mt-3 text-sm leading-7 text-bone-muted">
                Revisit past entries, rituals, and timing-window notes in one place.
              </p>
            </div>
            <span className="shell-pill">{recentEntries.length} loaded</span>
          </div>

          <div className="mt-5 space-y-3">
            {recentEntries.length > 0 ? (
              recentEntries.map((entry) => (
                <div key={entry.id} className="rounded-[1rem] border border-border/70 bg-stone-950/60 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-bone">{entry.title || 'Untitled entry'}</p>
                    {entry.is_ritual ? <span className="shell-pill">Ritual</span> : null}
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-bone-muted/55">{entry.entry_date}</p>
                  <p className="mt-3 text-sm leading-7 text-bone-muted">{truncate(entry.body, 180)}</p>
                </div>
              ))
            ) : (
              <div className="rounded-[1rem] border border-border/70 bg-stone-950/60 px-4 py-4 text-sm leading-7 text-bone-muted">
                No journal entries yet. The timing-window prompts from your area pages can now open straight into this
                composer.
              </div>
            )}
          </div>
        </article>
      </section>
    </div>
  )
}
