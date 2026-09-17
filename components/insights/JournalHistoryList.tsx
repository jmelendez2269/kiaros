'use client'

import { useState } from 'react'
import { JournalConsentControls } from '@/components/journal/JournalConsentControls'
import type { JournalConsentState } from '@/lib/journal/consent'

export type RecentJournalEntry = {
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

function truncate(value: string, max = 220) {
  return value.length <= max ? value : `${value.slice(0, max - 1)}...`
}

function getSkyLabel(entry: RecentJournalEntry) {
  if (entry.lunar_phase && entry.lunar_sign) {
    return `${entry.lunar_phase} Moon in ${entry.lunar_sign}`
  }

  if (entry.lunar_phase) return `${entry.lunar_phase} Moon`
  if (entry.lunar_sign) return `Moon in ${entry.lunar_sign}`
  return null
}

function consentFromEntry(entry: RecentJournalEntry): JournalConsentState {
  return {
    include_in_insights: entry.include_in_insights,
    include_in_stelloquy: entry.include_in_stelloquy,
    memory_pinned: entry.memory_pinned,
    memory_importance: entry.memory_importance,
  }
}

function sameConsent(left: JournalConsentState, right: JournalConsentState) {
  return (
    left.include_in_insights === right.include_in_insights &&
    left.include_in_stelloquy === right.include_in_stelloquy &&
    left.memory_pinned === right.memory_pinned &&
    left.memory_importance === right.memory_importance
  )
}

function JournalHistoryCard({
  entry,
  consentV2Enabled,
}: {
  entry: RecentJournalEntry
  consentV2Enabled: boolean
}) {
  const initialConsent = consentFromEntry(entry)
  const [consent, setConsent] = useState<JournalConsentState>(initialConsent)
  const [savedConsent, setSavedConsent] = useState<JournalConsentState>(initialConsent)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const skyLabel = getSkyLabel(entry)
  const hasChanges = !sameConsent(consent, savedConsent)

  function cancelEditing() {
    setConsent(savedConsent)
    setError(null)
    setSavedMessage(null)
    setIsEditing(false)
  }

  async function saveConsent() {
    setIsSaving(true)
    setError(null)
    setSavedMessage(null)

    try {
      const response = await fetch(`/api/journal/${entry.id}/consent`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(consent),
      })
      const payload = (await response.json()) as {
        consent?: JournalConsentState
        error?: string
      }

      if (!response.ok || !payload.consent) {
        throw new Error(payload.error || 'Failed to update journal permissions')
      }

      setConsent(payload.consent)
      setSavedConsent(payload.consent)
      setSavedMessage('Permissions updated.')
      setIsEditing(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to update journal permissions')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <article className="channel-card px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-bone">{entry.title || 'Untitled entry'}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-bone-muted/55">{entry.entry_date}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {skyLabel ? <span className="channel-sky channel-pill">{skyLabel}</span> : null}
          {(consentV2Enabled ? savedConsent.include_in_insights : false) ? (
            <span className="channel-ai channel-pill">In Patterns</span>
          ) : null}
          {(consentV2Enabled ? savedConsent.include_in_stelloquy : entry.oracle_memory) ? (
            <span className="channel-memory channel-pill">Stelloquy recall</span>
          ) : null}
          {consentV2Enabled && savedConsent.memory_pinned ? (
            <span className="channel-memory channel-pill">Always remember</span>
          ) : null}
          {entry.is_ritual ? <span className="channel-pill">Ritual</span> : null}
        </div>
      </div>

      <p className="mt-3 text-sm leading-7 text-bone-muted">{truncate(entry.body, 180)}</p>

      {consentV2Enabled ? (
        <div className="mt-4 border-t border-border/55 pt-4">
          {isEditing ? (
            <div className="space-y-3">
              <JournalConsentControls
                value={consent}
                onChange={setConsent}
                disabled={isSaving}
                compact
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={saveConsent}
                  disabled={isSaving || !hasChanges}
                  className="min-h-11 rounded-xl border border-moss-400/50 bg-moss-500/25 px-4 py-2.5 text-sm font-medium text-bone transition-colors hover:bg-moss-500/35 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save permissions'}
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={isSaving}
                  className="min-h-11 rounded-xl border border-border/70 px-4 py-2.5 text-sm text-bone-muted transition-colors hover:text-bone disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSavedMessage(null)
                setIsEditing(true)
              }}
              className="min-h-11 rounded-xl border border-border/70 px-4 py-2.5 text-sm text-bone-muted transition-colors hover:border-moss-400/35 hover:text-bone"
            >
              Change permissions
            </button>
          )}

          {error ? (
            <p role="alert" className="mt-3 text-sm text-red-300">
              {error}
            </p>
          ) : null}
          {savedMessage ? (
            <p role="status" className="mt-3 text-sm text-moss-200">
              {savedMessage}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

export function JournalHistoryList({
  entries,
  consentV2Enabled,
}: {
  entries: RecentJournalEntry[]
  consentV2Enabled: boolean
}) {
  return (
    <div className="channel-mine mt-5 space-y-3">
      {entries.length > 0 ? (
        entries.map((entry) => (
          <JournalHistoryCard
            key={entry.id}
            entry={entry}
            consentV2Enabled={consentV2Enabled}
          />
        ))
      ) : (
        <div className="rounded-[1rem] border border-border/70 bg-stone-950/60 px-4 py-4 text-sm leading-7 text-bone-muted">
          No journal entries yet. The timing-window prompts from your area pages can open straight into the composer.
        </div>
      )}
    </div>
  )
}
