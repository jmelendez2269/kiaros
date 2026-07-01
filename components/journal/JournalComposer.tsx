'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { BRAND } from '@/lib/brand'

type RecentJournalEntry = {
  id: string
  title: string | null
  body: string
  entry_date: string
  is_ritual: boolean | null
  oracle_memory: boolean | null
  lunar_phase: string | null
  lunar_sign: string | null
  transit_context: unknown
  created_at: string | null
}

type OracleCapture = {
  id: string
  captured_text: string
  source_role: string
  include_in_insights: boolean
  include_in_planner: boolean
  created_at: string
}

interface JournalComposerProps {
  initialPrompt: string
  initialArea: string
  initialTheme: string
  initialWeek: string
  initialStart: string
  initialEnd: string
  initialContext: string
  journalEntriesCount: number
  oracleMemoryCount: number
  blueprintYear: number | null
  recentEntries: RecentJournalEntry[]
  oracleCaptures: OracleCapture[]
}

function todayISO() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
  }).format(new Date())
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
  journalEntriesCount,
  oracleMemoryCount,
  blueprintYear,
  recentEntries,
  oracleCaptures,
}: JournalComposerProps) {
  const [entries, setEntries] = useState(recentEntries)
  const [entryCount, setEntryCount] = useState(journalEntriesCount)
  const [memoryCount, setMemoryCount] = useState(oracleMemoryCount)
  const [title, setTitle] = useState(initialPrompt ? truncate(initialPrompt, 120) : '')
  const [entryDate, setEntryDate] = useState('')
  const [body, setBody] = useState(initialPrompt ? `${initialPrompt}\n\n` : '')
  const [isRitual, setIsRitual] = useState(Boolean(initialPrompt))
  const [addToOracleMemory, setAddToOracleMemory] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  useEffect(() => {
    setEntryDate(todayISO())
  }, [])

  const contextSummary = useMemo(() => {
    const parts: string[] = []

    if (initialArea) parts.push(initialArea)
    if (initialTheme) parts.push(initialTheme)
    if (initialWeek) parts.push(`Week ${initialWeek}`)
    if (initialStart && initialEnd) parts.push(`${initialStart} to ${initialEnd}`)

    return parts
  }, [initialArea, initialTheme, initialWeek, initialStart, initialEnd])

  function getSkyLabel(entry: RecentJournalEntry) {
    if (entry.lunar_phase && entry.lunar_sign) {
      return `${entry.lunar_phase} Moon in ${entry.lunar_sign}`
    }

    if (entry.lunar_phase) return `${entry.lunar_phase} Moon`
    if (entry.lunar_sign) return `Moon in ${entry.lunar_sign}`
    return null
  }

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
          oracle_memory: addToOracleMemory,
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

      const payload = (await response.json()) as (RecentJournalEntry & { error?: string })

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save journal entry')
      }

      setEntries((current) => [payload, ...current].slice(0, 12))
      setEntryCount((current) => current + 1)
      if (payload.oracle_memory) {
        setMemoryCount((current) => current + 1)
      }

      setSavedMessage(
        addToOracleMemory
          ? 'Saved. This entry is now part of Stelloquy memory.'
          : 'Saved. This entry can stay in your journal without being added to Stelloquy memory.'
      )
      setBody(initialPrompt ? `${initialPrompt}\n\n` : '')
      setTitle(initialPrompt ? truncate(initialPrompt, 120) : '')
      setIsRitual(Boolean(initialPrompt))
      setAddToOracleMemory(false)
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
              Save a reflection from a timing window, ritual, or live question. This is also where you decide what
              Stelloquy should carry forward as memory.
            </p>
          </div>
          <div className="shell-panel-soft px-4 py-3 text-sm text-bone-muted">
            {initialPrompt ? 'Prompt-loaded entry' : 'Open reflection'}
          </div>
        </div>
      </section>

      <section className="shell-panel px-6 py-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="shell-kicker">Compose</p>
            <h2 className="mt-2 text-[1.8rem] font-semibold text-bone">New entry</h2>
          </div>
          <Link
            href="/oracle"
            className="inline-flex items-center rounded-xl border border-border/80 bg-stone-950/80 px-4 py-2 text-sm text-bone-muted transition-colors hover:border-leather-400/45 hover:text-bone"
          >
            Open Stelloquy
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

          <label className="flex items-center gap-3 rounded-[1rem] border border-plum-400/25 bg-plum-400/8 px-4 py-3 text-sm text-bone-muted">
            <input
              type="checkbox"
              checked={addToOracleMemory}
              onChange={(event) => setAddToOracleMemory(event.target.checked)}
              className="h-4 w-4 rounded border-border/80 bg-stone-950/80 text-plum-300 focus:ring-plum-400"
            />
            Add this entry to Stelloquy memory so future conversations can draw from it
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
              Ask Stelloquy after saving
            </Link>
          </div>
        </form>
      </section>

      <section className="flex flex-col gap-5">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[1rem] border border-leather-400/30 bg-leather-500/10 px-4 py-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-leather-200/85">Journal</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-bone">Saved entries</p>
              <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-leather-300/25 bg-black/20 px-2 text-[0.68rem] font-semibold text-leather-100">
                {entryCount}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-bone-muted">Everything you've captured lives here, with your latest reflections below.</p>
          </div>

          <div className="rounded-[1rem] border border-plum-400/30 bg-plum-400/8 px-4 py-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-plum-300/85">Stelloquy</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-bone">Memory saved</p>
              <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-plum-300/20 bg-black/20 px-2 text-[0.68rem] font-semibold text-plum-200">
                {memoryCount}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/oracle"
                className="inline-flex items-center rounded-lg border border-border/80 bg-stone-950/75 px-3 py-1.5 text-[0.78rem] font-medium text-bone-muted transition-colors hover:text-bone"
              >
                Open Stelloquy
              </Link>
              <Link
                href="/journal?prompt=What%20feels%20worth%20keeping%20in%20memory%20right%20now%3F"
                className="inline-flex items-center rounded-lg border border-plum-400/40 bg-plum-400/18 px-3 py-1.5 text-[0.78rem] font-medium text-bone transition-colors hover:bg-plum-400/26"
              >
                Memory prompt
              </Link>
            </div>
          </div>

          <div className="rounded-[1rem] border border-border/80 bg-stone-900/80 px-4 py-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-bone-muted/75">Architecture</p>
            <p className="mt-2 text-sm font-medium text-bone-muted">
              {blueprintYear ? `${blueprintYear} blueprint ready` : 'Annual blueprint'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/blueprint"
                className="inline-flex items-center rounded-lg border border-border/80 bg-stone-950/75 px-3 py-1.5 text-[0.78rem] font-medium text-bone-muted transition-colors hover:text-bone"
              >
                Open blueprint
              </Link>
              <Link
                href="/journal?prompt=What%20part%20of%20the%20annual%20blueprint%20am%20I%20living%20right%20now%3F"
                className="inline-flex items-center rounded-lg border border-leather-400/35 bg-leather-500/16 px-3 py-1.5 text-[0.78rem] font-medium text-bone transition-colors hover:bg-leather-500/24"
              >
                Blueprint prompt
              </Link>
            </div>
          </div>
        </div>

        <article className="shell-panel px-6 py-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="shell-kicker">Journal history</p>
              <h2 className="mt-2 text-[1.8rem] font-semibold text-bone">Your saved reflections</h2>
              <p className="mt-3 text-sm leading-7 text-bone-muted">
                Revisit past entries, rituals, and timing-window notes in one place.
              </p>
            </div>
            <span className="shell-pill">{entries.length} loaded</span>
          </div>

          <Link
            href="/journal/insights"
            className="group mt-5 flex items-start gap-4 rounded-2xl border border-leather-400/40 bg-leather-500/10 px-5 py-4 transition-colors hover:border-leather-300/60 hover:bg-leather-500/20"
          >
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-leather-400/50 bg-leather-500/20 font-serif text-base text-leather-100"
            >
              ✦
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-bone">
                Patterns {BRAND.product} has noticed
              </p>
              <p className="mt-1 text-xs leading-6 text-bone-muted">
                Recurring moons, signs, and transits across your entries — synthesised in your chosen voice.
              </p>
            </div>
            <span
              aria-hidden="true"
              className="self-center text-base text-leather-200 transition-transform group-hover:translate-x-0.5"
            >
              →
            </span>
          </Link>

          <div className="mt-5 space-y-3">
            {entries.length > 0 ? (
              entries.map((entry) => (
                <div key={entry.id} className="rounded-[1rem] border border-border/70 bg-stone-950/60 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-bone">{entry.title || 'Untitled entry'}</p>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {getSkyLabel(entry) ? <span className="shell-pill">{getSkyLabel(entry)}</span> : null}
                      {entry.oracle_memory ? <span className="shell-pill">In Stelloquy memory</span> : null}
                      {entry.is_ritual ? <span className="shell-pill">Ritual</span> : null}
                    </div>
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

          <div className="mt-8 border-t border-border/70 pt-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="shell-kicker">Stelloquy captures</p>
                <h3 className="mt-2 text-[1.25rem] font-semibold text-bone">Conversation fragments</h3>
                <p className="mt-2 text-sm leading-7 text-bone-muted">
                  Highlighted Stelloquy moments stay separate from journal entries, and anything marked for insights is
                  included in future Stelloquy context.
                </p>
              </div>
              <span className="shell-pill">{oracleCaptures.length} loaded</span>
            </div>

            <div className="mt-5 space-y-3">
              {oracleCaptures.length > 0 ? (
                oracleCaptures.map((capture) => (
                  <div key={capture.id} className="rounded-[1rem] border border-plum-400/25 bg-plum-400/8 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs uppercase tracking-[0.16em] text-bone-muted/55">
                        {new Date(capture.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {capture.include_in_insights ? <span className="shell-pill">Insights</span> : null}
                        {capture.include_in_planner ? <span className="shell-pill">Planner</span> : null}
                        {!capture.include_in_insights && !capture.include_in_planner ? (
                          <span className="shell-pill">Saved</span>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-bone-muted">{truncate(capture.captured_text, 220)}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-[1rem] border border-border/70 bg-stone-950/60 px-4 py-4 text-sm leading-7 text-bone-muted">
                  No Stelloquy captures yet. In a conversation, highlight the text you want to keep and use Capture.
                </div>
              )}
            </div>
          </div>
        </article>
      </section>
    </div>
  )
}
