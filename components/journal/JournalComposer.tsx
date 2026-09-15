'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { BRAND } from '@/lib/brand'
import { useStelloquy } from '@/components/oracle/StelloquyProvider'
import { PATTERN_DISCOVERY_CHECK_EVENT } from '@/lib/journal/pattern-discoveries'
import { JournalConsentControls } from '@/components/journal/JournalConsentControls'
import type { JournalConsentState } from '@/lib/journal/consent'

type RecentJournalEntry = {
  id: string
  title: string | null
  body: string
  entry_date: string
  is_ritual: boolean | null
  oracle_memory: boolean | null
  include_in_insights: boolean
  include_in_stelloquy: boolean
  memory_pinned: boolean
  memory_importance: number | null
  lunar_phase: string | null
  lunar_sign: string | null
  transit_context: unknown
  created_at: string | null
}

interface JournalComposerProps {
  initialEntry: Pick<
    RecentJournalEntry,
    | 'id'
    | 'title'
    | 'body'
    | 'entry_date'
    | 'is_ritual'
    | 'oracle_memory'
    | 'include_in_insights'
    | 'include_in_stelloquy'
    | 'memory_pinned'
    | 'memory_importance'
  > | null
  entryLoadError: string | null
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
  consentV2Enabled: boolean
}

const PRIVATE_CONSENT: JournalConsentState = {
  include_in_insights: false,
  include_in_stelloquy: false,
  memory_pinned: false,
  memory_importance: null,
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
  initialEntry,
  entryLoadError,
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
  consentV2Enabled,
}: JournalComposerProps) {
  const isEditing = Boolean(initialEntry)
  const [entryCount, setEntryCount] = useState(journalEntriesCount)
  const [memoryCount, setMemoryCount] = useState(oracleMemoryCount)
  const [title, setTitle] = useState(
    initialEntry?.title ?? (initialPrompt ? truncate(initialPrompt, 120) : ''),
  )
  const [entryDate, setEntryDate] = useState(initialEntry?.entry_date ?? '')
  const [body, setBody] = useState(
    initialEntry?.body ?? (initialPrompt ? `${initialPrompt}\n\n` : ''),
  )
  const [isRitual, setIsRitual] = useState(initialEntry?.is_ritual ?? Boolean(initialPrompt))
  const [legacyOracleMemory, setLegacyOracleMemory] = useState(
    initialEntry?.oracle_memory ?? false,
  )
  const [consent, setConsent] = useState<JournalConsentState>(
    initialEntry
      ? {
          include_in_insights: initialEntry.include_in_insights,
          include_in_stelloquy: initialEntry.include_in_stelloquy,
          memory_pinned: initialEntry.memory_pinned,
          memory_importance: initialEntry.memory_importance,
        }
      : { ...PRIVATE_CONSENT },
  )
  const [savedMemoryIncluded, setSavedMemoryIncluded] = useState(
    consentV2Enabled
      ? (initialEntry?.include_in_stelloquy ?? false)
      : (initialEntry?.oracle_memory ?? false),
  )
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
    if (!isEditing) setEntryDate(todayISO())
  }, [isEditing])

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
      const response = await fetch(initialEntry ? `/api/journal/${initialEntry.id}` : '/api/journal', {
        method: initialEntry ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || null,
          body,
          ...(!initialEntry ? { entry_date: entryDate } : {}),
          is_ritual: isRitual,
          ...(consentV2Enabled
            ? { ...consent, oracle_memory: consent.include_in_stelloquy }
            : { oracle_memory: legacyOracleMemory }),
          ...(!initialEntry
            ? {
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
              }
            : {}),
        }),
      })

      const payload = (await response.json()) as (RecentJournalEntry & { error?: string })

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save journal entry')
      }

      window.dispatchEvent(new Event(PATTERN_DISCOVERY_CHECK_EVENT))

      const isNowInMemory = consentV2Enabled
        ? payload.include_in_stelloquy
        : Boolean(payload.oracle_memory)
      if (initialEntry) {
        if (isNowInMemory !== savedMemoryIncluded) {
          setMemoryCount((current) => current + (isNowInMemory ? 1 : -1))
        }
        setSavedMemoryIncluded(isNowInMemory)
      } else {
        setEntryCount((current) => current + 1)
        if (isNowInMemory) setMemoryCount((current) => current + 1)
      }

      if (initialEntry) {
        setSavedMessage('Changes saved.')
      } else if (consentV2Enabled) {
        const enabledUses = [
          consent.include_in_insights ? 'Patterns' : null,
          consent.include_in_stelloquy ? 'Stelloquy recall' : null,
        ].filter(Boolean)
        setSavedMessage(
          enabledUses.length > 0
            ? `Saved with permission for ${enabledUses.join(' and ')}. You can change this from journal history.`
            : 'Saved privately. This entry is not available to Patterns or Stelloquy recall.',
        )
      } else {
        setSavedMessage(
          legacyOracleMemory
            ? 'Saved. This entry is now part of Stelloquy memory.'
            : 'Saved. This entry can stay in your journal without being added to Stelloquy memory.',
        )
      }
      setLastSavedEntry({ title: title.trim() || null, body })
      if (!initialEntry) {
        setBody(initialPrompt ? `${initialPrompt}\n\n` : '')
        setTitle(initialPrompt ? truncate(initialPrompt, 120) : '')
        setIsRitual(Boolean(initialPrompt))
        setLegacyOracleMemory(false)
        setConsent({ ...PRIVATE_CONSENT })
      }
      router.refresh()
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
            <p className="channel-kicker">{isEditing ? 'Journal entry' : 'Compose'}</p>
            <h2 className="mt-1.5 font-display text-[1.4rem] text-bone">
              {isEditing ? 'Edit entry' : 'New entry'}
            </h2>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {isEditing ? (
              <Link
                href="/journal"
                className="inline-flex items-center rounded-xl border border-border/70 px-4 py-2 text-sm text-bone-muted transition-colors hover:text-bone"
              >
                New entry
              </Link>
            ) : null}
            <button
              type="button"
              onClick={handleOpenStelloquy}
              className="inline-flex items-center rounded-xl border border-plum-400/30 bg-plum-400/10 px-4 py-2 text-sm text-plum-200 transition-colors hover:bg-plum-400/18"
            >
              Open Stelloquy
            </button>
          </div>
        </div>

        {entryLoadError ? (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {entryLoadError}
          </div>
        ) : null}

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
                disabled={isEditing}
                title={
                  isEditing
                    ? 'The original entry date and sky context are preserved when editing.'
                    : undefined
                }
                className="w-full rounded-xl border border-border/80 bg-stone-950/80 px-4 py-3 text-sm text-bone focus:outline-none focus:ring-1 focus:ring-moss-400 disabled:cursor-not-allowed disabled:opacity-65"
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

            {!consentV2Enabled ? (
              <label
                className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-[0.8rem] transition-colors ${
                  legacyOracleMemory
                    ? 'border-plum-400/50 bg-plum-400/14 text-plum-200'
                    : 'border-border/70 bg-stone-950/60 text-bone-muted hover:text-bone'
                }`}
                title="Future Stelloquy conversations can draw from this entry"
              >
                <input
                  type="checkbox"
                  checked={legacyOracleMemory}
                  onChange={(event) => setLegacyOracleMemory(event.target.checked)}
                  className="h-3.5 w-3.5 rounded border-border/80 bg-stone-950/80 text-plum-300 focus:ring-plum-400"
                />
                Add to Stelloquy memory
              </label>
            ) : null}
          </div>

          {consentV2Enabled ? (
            <JournalConsentControls
              value={consent}
              onChange={setConsent}
              disabled={isSaving}
            />
          ) : null}

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
              {isSaving ? 'Saving...' : isEditing ? 'Save changes' : 'Save entry'}
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
