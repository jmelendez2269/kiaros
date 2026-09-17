'use client'

import type { JournalConsentState } from '@/lib/journal/consent'

type JournalConsentControlsProps = {
  value: JournalConsentState
  onChange: (next: JournalConsentState) => void
  disabled?: boolean
  compact?: boolean
}

const IMPORTANCE_OPTIONS = [
  { value: '', label: 'No importance set' },
  { value: '1', label: '1 — Low' },
  { value: '2', label: '2 — Somewhat useful' },
  { value: '3', label: '3 — Useful' },
  { value: '4', label: '4 — Very useful' },
  { value: '5', label: '5 — Essential' },
] as const

export function JournalConsentControls({
  value,
  onChange,
  disabled = false,
  compact = false,
}: JournalConsentControlsProps) {
  function setRecallAllowed(includeInStelloquy: boolean) {
    onChange({
      ...value,
      include_in_stelloquy: includeInStelloquy,
      memory_pinned: includeInStelloquy ? value.memory_pinned : false,
      memory_importance: includeInStelloquy ? value.memory_importance : null,
    })
  }

  return (
    <fieldset
      disabled={disabled}
      className={`rounded-[1.1rem] border border-border/70 bg-stone-950/45 ${compact ? 'p-4' : 'p-5'}`}
    >
      <legend className="px-2 text-xs font-medium uppercase tracking-[0.18em] text-bone-muted/70">
        How this entry may be used
      </legend>
      <p className="text-sm leading-6 text-bone-muted">
        Saving keeps the entry in your private journal. Each permission below is separate and can be changed later.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/65 bg-stone-950/55 p-3.5 transition-colors hover:border-moss-400/35">
          <input
            type="checkbox"
            checked={value.include_in_insights}
            onChange={(event) =>
              onChange({ ...value, include_in_insights: event.target.checked })
            }
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border/80 bg-stone-950/80 text-moss-300 focus:ring-moss-400"
          />
          <span>
            <span className="block text-sm font-medium text-bone">Include in Patterns</span>
            <span className="mt-1 block text-xs leading-5 text-bone-muted">
              Allows this entry to shape your private pattern insights.
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/65 bg-stone-950/55 p-3.5 transition-colors hover:border-plum-400/35">
          <input
            type="checkbox"
            checked={value.include_in_stelloquy}
            onChange={(event) => setRecallAllowed(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border/80 bg-stone-950/80 text-plum-300 focus:ring-plum-400"
          />
          <span>
            <span className="block text-sm font-medium text-bone">Let Stelloquy recall it</span>
            <span className="mt-1 block text-xs leading-5 text-bone-muted">
              Allows future conversations to retrieve relevant excerpts from this entry.
            </span>
          </span>
        </label>
      </div>

      {value.include_in_stelloquy ? (
        <div className="mt-3 grid gap-3 border-t border-border/55 pt-3 md:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl px-2 py-2 text-sm text-bone-muted">
            <input
              type="checkbox"
              checked={value.memory_pinned}
              onChange={(event) => onChange({ ...value, memory_pinned: event.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-border/80 bg-stone-950/80 text-plum-300 focus:ring-plum-400"
            />
            <span>
              <span className="block font-medium text-bone">Always remember</span>
              <span className="mt-1 block text-xs leading-5">Prioritize this memory when it is relevant.</span>
            </span>
          </label>

          <label className="block px-2 py-2">
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-bone-muted/70">
              Recall importance
            </span>
            <select
              value={value.memory_importance ?? ''}
              onChange={(event) =>
                onChange({
                  ...value,
                  memory_importance: event.target.value ? Number(event.target.value) : null,
                })
              }
              className="w-full rounded-xl border border-border/80 bg-stone-950/80 px-3 py-2 text-sm text-bone focus:outline-none focus:ring-1 focus:ring-plum-400"
            >
              {IMPORTANCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
    </fieldset>
  )
}
