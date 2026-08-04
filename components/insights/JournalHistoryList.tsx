export type RecentJournalEntry = {
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

export function JournalHistoryList({ entries }: { entries: RecentJournalEntry[] }) {
  return (
    <div className="channel-mine mt-5 space-y-3">
      {entries.length > 0 ? (
        entries.map((entry) => (
          <div key={entry.id} className="channel-card px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-bone">{entry.title || 'Untitled entry'}</p>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {getSkyLabel(entry) ? (
                  <span className="channel-sky channel-pill">{getSkyLabel(entry)}</span>
                ) : null}
                {entry.oracle_memory ? (
                  <span className="channel-memory channel-pill">In Stelloquy memory</span>
                ) : null}
                {entry.is_ritual ? <span className="channel-pill">Ritual</span> : null}
              </div>
            </div>
            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-bone-muted/55">{entry.entry_date}</p>
            <p className="mt-3 text-sm leading-7 text-bone-muted">{truncate(entry.body, 180)}</p>
          </div>
        ))
      ) : (
        <div className="rounded-[1rem] border border-border/70 bg-stone-950/60 px-4 py-4 text-sm leading-7 text-bone-muted">
          No journal entries yet. The timing-window prompts from your area pages can open straight into the composer.
        </div>
      )}
    </div>
  )
}
