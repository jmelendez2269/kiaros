'use client'

import { useEffect, useState } from 'react'
import { journalMemoryCopy } from '@/lib/copy/journal-memory'
import {
  matchJournalMemoryPreset,
  type JournalMemoryMode,
  type JournalMemorySettings,
} from '@/lib/journal/memory-defaults'

export function JournalMemorySettingsPanel() {
  const settingsCopy = journalMemoryCopy.settings
  const pastCopy = journalMemoryCopy.pastEntries
  const [settings, setSettings] = useState<JournalMemorySettings | null>(null)
  const [hasOracleAccess, setHasOracleAccess] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [includePast, setIncludePast] = useState(false)
  const [showHowThisWorks, setShowHowThisWorks] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/settings/journal-memory', { cache: 'no-store' })
        const data = await res.json()
        if (!cancelled && data.enabled && data.settings) {
          setSettings(data.settings)
          setHasOracleAccess(Boolean(data.hasOracleAccess))
        }
      } catch {
        if (!cancelled) setError(journalMemoryCopy.errors.couldNotLoadSettings)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return null
  if (!settings) return null

  const preset = matchJournalMemoryPreset(settings, hasOracleAccess)

  async function savePatch(patch: Record<string, unknown>) {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch('/api/settings/journal-memory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || journalMemoryCopy.errors.couldNotSaveSettings)
      setSettings(data.settings)
      setSaved(true)
      setIncludePast(false)
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : journalMemoryCopy.errors.couldNotSaveSettings,
      )
    } finally {
      setSaving(false)
    }
  }

  function selectPreset(mode: JournalMemoryMode) {
    savePatch({ journal_memory_mode: mode })
  }

  return (
    <section className="channel-card space-y-4 p-5">
      <div>
        <h2 className="text-lg font-semibold text-bone">{settingsCopy.sectionHeading}</h2>
        <p className="mt-2 text-sm leading-6 text-bone-muted">{settingsCopy.intro}</p>
      </div>

      {preset === 'custom' ? (
        <p className="text-sm text-bone-muted">{settingsCopy.customPresetNote}</p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => selectPreset('use_entries')}
          className={`rounded-xl border p-4 text-left transition-colors disabled:opacity-50 ${
            preset === 'use_entries'
              ? 'border-moss-400/45 bg-moss-500/10'
              : 'border-border/70 bg-stone-950/55 hover:border-moss-400/35'
          }`}
        >
          <span className="block text-sm font-medium text-bone">
            {journalMemoryCopy.prompt.optionUseEntries.label}
          </span>
          <span className="mt-2 block text-xs leading-5 text-bone-muted">
            {journalMemoryCopy.prompt.optionUseEntries.helper(hasOracleAccess)}
          </span>
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => selectPreset('choose_each')}
          className={`rounded-xl border p-4 text-left transition-colors disabled:opacity-50 ${
            preset === 'choose_each'
              ? 'border-moss-400/45 bg-moss-500/10'
              : 'border-border/70 bg-stone-950/55 hover:border-moss-400/35'
          }`}
        >
          <span className="block text-sm font-medium text-bone">
            {journalMemoryCopy.prompt.optionChooseEach.label}
          </span>
          <span className="mt-2 block text-xs leading-5 text-bone-muted">
            {journalMemoryCopy.prompt.optionChooseEach.helper}
          </span>
        </button>
      </div>

      <div className="border-t border-border/55 pt-4">
        <h3 className="text-sm font-medium text-bone">{settingsCopy.fineTuneHeading}</h3>
        <div className="mt-3 space-y-3">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={settings.default_include_in_insights ?? false}
              onChange={(event) =>
                savePatch({ default_include_in_insights: event.target.checked })
              }
              disabled={saving || settings.journal_memory_mode !== 'use_entries'}
              className="mt-1 h-4 w-4 rounded border-border/80 bg-stone-950/80 text-moss-300 disabled:opacity-40"
            />
            <span>
              <span className="block text-sm font-medium text-bone">
                {settingsCopy.kairosDefault.label}
              </span>
              <span className="mt-1 block text-xs leading-5 text-bone-muted">
                {settingsCopy.kairosDefault.helper(hasOracleAccess)}
              </span>
            </span>
          </label>

          {hasOracleAccess ? (
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={settings.default_include_in_stelloquy ?? false}
                onChange={(event) =>
                  savePatch({ default_include_in_stelloquy: event.target.checked })
                }
                disabled={saving || settings.journal_memory_mode !== 'use_entries'}
                className="mt-1 h-4 w-4 rounded border-border/80 bg-stone-950/80 text-plum-300 disabled:opacity-40"
              />
              <span>
                <span className="block text-sm font-medium text-bone">
                  {settingsCopy.stelloquyDefault.label}
                </span>
                <span className="mt-1 block text-xs leading-5 text-bone-muted">
                  {settingsCopy.stelloquyDefault.helper}
                </span>
              </span>
            </label>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowHowThisWorks((open) => !open)}
        className="text-xs text-bone-muted underline-offset-2 hover:text-bone hover:underline"
      >
        How this works
      </button>
      {showHowThisWorks ? (
        <p className="text-xs leading-6 text-bone-muted">{settingsCopy.howThisWorks}</p>
      ) : null}

      {settings.journal_memory_mode === 'use_entries' && !settings.past_entries_included_at ? (
        <div className="rounded-xl border border-border/65 bg-stone-950/45 p-4">
          <label className="flex cursor-pointer items-start gap-3">
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
          <button
            type="button"
            disabled={saving || !includePast}
            onClick={() => savePatch({ include_past_entries: true })}
            className="mt-3 min-h-10 rounded-xl border border-moss-400/50 bg-moss-500/20 px-4 py-2 text-sm text-bone disabled:cursor-not-allowed disabled:opacity-50"
          >
            {journalMemoryCopy.ui.applyPastEntries}
          </button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {saved ? (
        <p className="text-sm text-moss-200">{journalMemoryCopy.ui.settingsSaved}</p>
      ) : null}
    </section>
  )
}
