'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { BRAND } from '@/lib/brand'
import { useStelloquy } from '@/components/oracle/StelloquyProvider'

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
}: JournalComposerProps) {
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
  const [lastSavedEntry, setLastSavedEntry] = useState<{ title: string | null; body: string } | null>(null)
  const router = useRouter()
  const { openDrawer, openWith, hasOracleAccess } = useStelloquy()

  function handleOpenStelloquy() {
    if (hasOracleAccess) {
      openDrawer()
    } else {
      router.push('/oracle')
    }
  }

  function handleAskAfterSaving() {
    if (!lastSavedEntry) return
    if (!hasOracleAccess) {
      router.push('/oracle')
      return
    }
    const heading = lastSavedEntry.title ? `"${lastSavedEntry.title}"` : 'this journal entry'
    openWith(`I just saved ${heading} in my journal:\n\n${lastSavedEntry.body}\n\nWhat do you make of it?`)
  }

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

      setEntryCount((current) => current + 1)
      if (payload.oracle_memory) {
        setMemoryCount((current) => current + 1)
      }

      setSavedMessage(
        addToOracleMemory
          ? 'Saved. This entry is now part of Stelloquy memory.'
          : 'Saved. This entry can stay in your journal without being added to Stelloquy memory.'
      )
      setLastSavedEntry({ title: title.trim() || null, body })
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
    <div className="space-y-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-2xl">
          <p className="channel-mine channel-kicker mb-2.5">Journal</p>
          <h1 className="shell-hero-title">Capture the prompt while the window is open</h1>
          <p className="mt-4 shell-prose">
            Save a reflection from a timing window, ritual, or live question. This is also where you decide what
            Stelloquy should carry forward as memory.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="channel-mine channel-pill">
            {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
          </span>
          <span className="channel-memory channel-pill">{memoryCount} in memory</span>
          {blueprintYear ? (
            <Link href="/blueprint" className="channel-sky channel-pill transition-colors hover:text-bone">
              {blueprintYear} blueprint
            </Link>
          ) : null}
        </div>
      </header>

      <section className="channel-mine channel-panel px-6 py-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="channel-kicker">Compose</p>
            <h2 className="mt-1.5 font-display text-[1.4rem] text-bone">New entry</h2>
          </div>
          <button
            type="button"
            onClick={handleOpenStelloquy}
            className="inline-flex items-center rounded-xl border border-plum-400/30 bg-plum-400/10 px-4 py-2 text-sm text-plum-200 transition-colors hover:bg-plum-400/18"
          >
            Open Stelloquy
          </button>
        </div>

        {contextSummary.length > 0 ? (
          <div className="channel-sky mt-5 rounded-[1.1rem] border border-border/60 bg-stone-950/50 p-5">
            <p className="channel-kicker">Window context</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {contextSummary.map((item) => (
                <span key={item} className="channel-pill">
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
                className="w-full rounded-xl border border-border/80 bg-stone-950/80 px-4 py-3 text-sm text-bone placeholder:text-bone-muted/40 focus:outline-none focus:ring-1 focus:ring-moss-400"
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
                className="w-full rounded-xl border border-border/80 bg-stone-950/80 px-4 py-3 text-sm text-bone focus:outline-none focus:ring-1 focus:ring-moss-400"
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
              className="w-full resize-y rounded-[1.1rem] border border-border/80 bg-stone-950/80 px-4 py-4 text-sm leading-7 text-bone placeholder:text-bone-muted/40 focus:outline-none focus:ring-1 focus:ring-moss-400"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <label
              className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-[0.8rem] transition-colors ${
                isRitual
                  ? 'border-moss-400/45 bg-moss-500/12 text-moss-200'
                  : 'border-border/70 bg-stone-950/60 text-bone-muted hover:text-bone'
              }`}
              title="Ritual or intentional grounding entry"
            >
              <input
                type="checkbox"
                checked={isRitual}
                onChange={(event) => setIsRitual(event.target.checked)}
                className="h-3.5 w-3.5 rounded border-border/80 bg-stone-950/80 text-moss-300 focus:ring-moss-400"
              />
              Ritual entry
            </label>

            <label
              className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-[0.8rem] transition-colors ${
                addToOracleMemory
                  ? 'border-plum-400/50 bg-plum-400/14 text-plum-200'
                  : 'border-border/70 bg-stone-950/60 text-bone-muted hover:text-bone'
              }`}
              title="Future Stelloquy conversations can draw from this entry"
            >
              <input
                type="checkbox"
                checked={addToOracleMemory}
                onChange={(event) => setAddToOracleMemory(event.target.checked)}
                className="h-3.5 w-3.5 rounded border-border/80 bg-stone-950/80 text-plum-300 focus:ring-plum-400"
              />
              Add to Stelloquy memory
            </label>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          {savedMessage ? (
            <div className="rounded-xl border border-moss-500/35 bg-moss-500/10 px-4 py-3 text-sm text-moss-200">
              {savedMessage}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isSaving || body.trim().length === 0}
              className="rounded-xl border border-moss-400/50 bg-moss-500/30 px-5 py-3 text-sm font-medium text-bone transition-colors hover:bg-moss-500/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save entry'}
            </button>
            <button
              type="button"
              onClick={handleAskAfterSaving}
              disabled={!lastSavedEntry}
              title={lastSavedEntry ? undefined : 'Save an entry first'}
              className="text-sm text-bone-muted underline decoration-border underline-offset-4 transition-colors hover:text-bone disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
            >
              Ask Stelloquy after saving
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-2">
        <p className="shell-eyebrow px-1">Prompts to start from</p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/journal?prompt=What%20feels%20worth%20keeping%20in%20memory%20right%20now%3F"
            className="channel-memory channel-pill transition-colors hover:text-bone"
          >
            Worth keeping in memory
          </Link>
          <Link
            href="/journal?prompt=What%20part%20of%20the%20annual%20blueprint%20am%20I%20living%20right%20now%3F"
            className="channel-sky channel-pill transition-colors hover:text-bone"
          >
            Living the blueprint
          </Link>
        </div>
      </section>

      <Link
        href="/insights/map"
        className="channel-ai channel-card group flex items-center gap-4 px-5 py-4"
      >
        <span aria-hidden="true" className="channel-dot" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-bone">Patterns {BRAND.product} has noticed</p>
          <p className="mt-0.5 text-xs leading-6 text-bone-muted">
            Recurring moons and transits, saved conversations, and the living mind map.
          </p>
        </div>
        <span
          aria-hidden="true"
          className="text-base text-leather-200 transition-transform group-hover:translate-x-0.5"
        >
          →
        </span>
      </Link>
    </div>
  )
}
