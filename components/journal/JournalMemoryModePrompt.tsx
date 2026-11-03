'use client'

import { useState } from 'react'
import { journalMemoryCopy } from '@/lib/copy/journal-memory'

type JournalMemoryMode = 'use_entries' | 'choose_each'

type Props = {
  hasOracleAccess: boolean
  /** Only offer to include past entries when there are some. */
  hasPastEntries?: boolean
  onComplete: (mode: JournalMemoryMode | null) => void
}

/**
 * One-time notice for members who never chose a journal memory mode. New
 * entries now start included by default; this tells them so, offers to include
 * past entries (opt-in, never automatic), and offers the strict per-entry mode.
 */
export function JournalMemoryModePrompt({ hasOracleAccess, hasPastEntries = true, onComplete }: Props) {
  const copy = journalMemoryCopy.intro
  const [includePast, setIncludePast] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function post(body: Record<string, unknown>, mode: JournalMemoryMode | null) {
    setIsSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/journal/memory-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error || journalMemoryCopy.errors.couldNotSaveChoice)
      }
      onComplete(mode)
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : journalMemoryCopy.errors.couldNotSaveChoice,
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="rounded-[1.15rem] border border-moss-400/25 bg-stone-950/80 p-5 shadow-glow"
      role="dialog"
      aria-labelledby="journal-memory-prompt-heading"
    >
      <h2 id="journal-memory-prompt-heading" className="text-lg font-semibold text-bone">
        {copy.heading}
      </h2>
      <p className="mt-2 text-sm leading-6 text-bone-muted">{copy.body(hasOracleAccess)}</p>

      {hasPastEntries ? (
        <label className="mt-4 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={includePast}
            disabled={isSaving}
            onChange={(event) => setIncludePast(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border/80 bg-stone-950/80 text-moss-300"
          />
          <span>
            <span className="block text-sm font-medium text-bone">{copy.pastCheckbox}</span>
            <span className="mt-1 block text-xs leading-5 text-bone-muted">{copy.pastHelper}</span>
          </span>
        </label>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-300" role="alert">{error}</p> : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={isSaving}
          onClick={() =>
            post(
              {
                action: 'choose',
                journal_memory_mode: 'use_entries',
                include_past_entries: hasPastEntries && includePast,
              },
              'use_entries',
            )
          }
          className="min-h-11 rounded-xl border border-moss-400/50 bg-moss-500/25 px-4 py-2.5 text-sm font-medium text-bone disabled:opacity-50"
        >
          {isSaving ? journalMemoryCopy.ui.settingsSaving : copy.done}
        </button>
        <button
          type="button"
          disabled={isSaving}
          title={copy.chooseEachHelper}
          onClick={() =>
            post({ action: 'choose', journal_memory_mode: 'choose_each', include_past_entries: false }, 'choose_each')
          }
          className="text-xs text-bone-muted underline-offset-2 hover:text-bone hover:underline disabled:opacity-50"
        >
          {copy.chooseEach}
        </button>
      </div>
      <p className="mt-3 text-xs leading-5 text-bone-muted">{journalMemoryCopy.prompt.footer}</p>
    </div>
  )
}
