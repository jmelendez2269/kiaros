'use client'

import { useState } from 'react'
import { journalMemoryCopy } from '@/lib/copy/journal-memory'

type Props = {
  hasOracleAccess: boolean
  onComplete: () => void
}

export function JournalMemoryModePrompt({ hasOracleAccess, onComplete }: Props) {
  const copy = journalMemoryCopy.prompt
  const pastCopy = journalMemoryCopy.pastEntries
  const [step, setStep] = useState<'choose' | 'past'>('choose')
  const [selectedMode, setSelectedMode] = useState<'use_entries' | 'choose_each' | null>(null)
  const [includePast, setIncludePast] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submitChoice(mode: 'use_entries' | 'choose_each') {
    if (mode === 'use_entries') {
      setSelectedMode(mode)
      setStep('past')
      return
    }
    await persist({ journal_memory_mode: mode, include_past_entries: false })
  }

  async function persist(body: {
    journal_memory_mode: 'use_entries' | 'choose_each'
    include_past_entries: boolean
  }) {
    setIsSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/journal/memory-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'choose', ...body }),
      })
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string }
        throw new Error(payload.error || journalMemoryCopy.errors.couldNotSaveChoice)
      }
      onComplete()
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : journalMemoryCopy.errors.couldNotSaveChoice,
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function dismiss() {
    setIsSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/journal/memory-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' }),
      })
      if (!response.ok) throw new Error(journalMemoryCopy.errors.couldNotSaveChoice)
      onComplete()
    } catch {
      setError(journalMemoryCopy.errors.couldNotSaveChoice)
    } finally {
      setIsSaving(false)
    }
  }

  if (step === 'past' && selectedMode === 'use_entries') {
    return (
      <div
        className="rounded-[1.15rem] border border-moss-400/25 bg-stone-950/80 p-5 shadow-glow"
        role="dialog"
        aria-labelledby="journal-memory-past-heading"
      >
        <h2 id="journal-memory-past-heading" className="text-lg font-semibold text-bone">
          {pastCopy.heading}
        </h2>
        <label className="mt-4 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={includePast}
            onChange={(event) => setIncludePast(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border/80 bg-stone-950/80 text-moss-300"
          />
          <span>
            <span className="block text-sm font-medium text-bone">{pastCopy.checkbox}</span>
            <span className="mt-1 block text-xs leading-5 text-bone-muted">{pastCopy.helper}</span>
          </span>
        </label>
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isSaving}
            onClick={() =>
              persist({ journal_memory_mode: 'use_entries', include_past_entries: includePast })
            }
            className="min-h-11 rounded-xl border border-moss-400/50 bg-moss-500/25 px-4 py-2.5 text-sm font-medium text-bone disabled:opacity-50"
          >
            {isSaving ? journalMemoryCopy.ui.settingsSaving : pastCopy.done}
          </button>
        </div>
      </div>
    )
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
      <p className="mt-2 text-sm leading-6 text-bone-muted">{copy.intro}</p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <button
          type="button"
          disabled={isSaving}
          onClick={() => submitChoice('use_entries')}
          className="rounded-xl border border-border/70 bg-stone-950/55 p-4 text-left transition-colors hover:border-moss-400/35 disabled:opacity-50"
        >
          <span className="block text-sm font-medium text-bone">{copy.optionUseEntries.label}</span>
          <span className="mt-2 block text-xs leading-5 text-bone-muted">
            {copy.optionUseEntries.helper(hasOracleAccess)}
          </span>
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={() => submitChoice('choose_each')}
          className="rounded-xl border border-border/70 bg-stone-950/55 p-4 text-left transition-colors hover:border-moss-400/35 disabled:opacity-50"
        >
          <span className="block text-sm font-medium text-bone">{copy.optionChooseEach.label}</span>
          <span className="mt-2 block text-xs leading-5 text-bone-muted">
            {copy.optionChooseEach.helper}
          </span>
        </button>
      </div>

      <p className="mt-4 text-xs leading-5 text-bone-muted">{copy.footer}</p>
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      <button
        type="button"
        disabled={isSaving}
        onClick={dismiss}
        className="mt-4 text-xs text-bone-muted underline-offset-2 hover:text-bone hover:underline disabled:opacity-50"
      >
        {journalMemoryCopy.ui.promptDismiss}
      </button>
    </div>
  )
}
