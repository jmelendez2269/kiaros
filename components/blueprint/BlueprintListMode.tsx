import type { BlueprintOutput, EnergyType, PeriodRange } from '@/types/blueprint'
import { cn } from '@/lib/utils'

const QUARTER_WINDOWS = ['', 'Jan-Mar', 'Apr-Jun', 'Jul-Sep', 'Oct-Dec']

const ENERGY_LABEL: Record<EnergyType, string> = {
  push: 'Active',
  rest: 'Passive',
  reflect: 'Reflect',
  initiate: 'Initiate',
}

const ENERGY_TONE: Record<EnergyType, string> = {
  push: 'border-leather-400/30 bg-leather-500/16 text-leather-200',
  rest: 'border-moss-500/30 bg-moss-500/16 text-moss-200',
  reflect: 'border-plum-400/30 bg-plum-400/16 text-plum-300',
  initiate: 'border-ember-400/30 bg-ember-400/16 text-ember-300',
}

function shortDate(date: string) {
  const parsed = new Date(`${date}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(parsed)
}

function ListSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/60 bg-stone-950/70">
      <header className="flex items-center justify-between border-b border-border/60 bg-stone-900/60 px-4 py-2.5">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-bone">{title}</h3>
        <span className="text-xs text-bone-muted/70">{count}</span>
      </header>
      <div className="overflow-x-auto">{children}</div>
    </section>
  )
}

interface BlueprintListModeProps {
  blueprint: BlueprintOutput
  currentQuarter: number
}

export function BlueprintListMode({ blueprint, currentQuarter }: BlueprintListModeProps) {
  const invitations: Array<PeriodRange & { type: 'active' | 'passive' }> = [
    ...blueprint.pushPeriods.map((p) => ({ ...p, type: 'active' as const })),
    ...blueprint.restPeriods.map((p) => ({ ...p, type: 'passive' as const })),
  ].sort((a, b) => a.startDate.localeCompare(b.startDate))

  return (
    <div className="space-y-5">
      <ListSection title="Quarters" count={blueprint.quarters.length}>
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-stone-900/40 text-xs uppercase tracking-[0.16em] text-bone-muted/60">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Q</th>
              <th className="px-4 py-2.5 font-semibold">Window</th>
              <th className="px-4 py-2.5 font-semibold">Theme</th>
              <th className="px-4 py-2.5 font-semibold">Intention</th>
              <th className="px-4 py-2.5 font-semibold">Focus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {blueprint.quarters.map((q) => (
              <tr key={q.quarter} className={cn('align-top', q.quarter === currentQuarter && 'bg-leather-500/[0.04]')}>
                <td className="px-4 py-3 font-mono text-bone-muted">
                  Q{q.quarter}
                  {q.quarter === currentQuarter ? (
                    <span className="ml-2 rounded-full border border-leather-400/40 bg-leather-500/15 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.16em] text-leather-200">
                      now
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-bone-muted/70">{QUARTER_WINDOWS[q.quarter]}</td>
                <td className="px-4 py-3 font-medium text-bone">{q.theme}</td>
                <td className="px-4 py-3 text-bone-muted">{q.intention}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {q.focusAreas.slice(0, 4).map((area) => (
                      <span key={area} className="rounded-full border border-border/60 bg-stone-900/70 px-2 py-0.5 text-[0.62rem] uppercase tracking-[0.14em] text-bone-muted">
                        {area}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ListSection>

      <ListSection title="Months" count={blueprint.months.length}>
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-stone-900/40 text-xs uppercase tracking-[0.16em] text-bone-muted/60">
            <tr>
              <th className="px-4 py-2.5 font-semibold">#</th>
              <th className="px-4 py-2.5 font-semibold">Name</th>
              <th className="px-4 py-2.5 font-semibold">Theme</th>
              <th className="px-4 py-2.5 font-semibold">Energy arc</th>
              <th className="px-4 py-2.5 font-semibold">Key transit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {blueprint.months.map((m) => (
              <tr key={m.month} className="align-top">
                <td className="px-4 py-3 font-mono text-bone-muted/70">{String(m.month).padStart(2, '0')}</td>
                <td className="px-4 py-3 font-medium text-bone">{m.name}</td>
                <td className="px-4 py-3 text-bone-muted">{m.theme || '—'}</td>
                <td className="px-4 py-3 text-bone-muted">{m.energyArc || '—'}</td>
                <td className="px-4 py-3 text-bone-muted/70">
                  {m.keyTransits[0] ?? m.moonPhases[0]?.significance ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ListSection>

      <ListSection title="Weeks" count={blueprint.weeks.length}>
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-stone-900/40 text-xs uppercase tracking-[0.16em] text-bone-muted/60">
            <tr>
              <th className="px-4 py-2.5 font-semibold">#</th>
              <th className="px-4 py-2.5 font-semibold">Dates</th>
              <th className="px-4 py-2.5 font-semibold">Type</th>
              <th className="px-4 py-2.5 font-semibold">Theme</th>
              <th className="px-4 py-2.5 font-semibold">Cosmic context</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {blueprint.weeks.map((w) => (
              <tr key={w.weekNumber} className="align-top">
                <td className="px-4 py-3 font-mono text-bone-muted/70">W{String(w.weekNumber).padStart(2, '0')}</td>
                <td className="px-4 py-3 font-mono text-xs text-bone-muted/70">
                  {shortDate(w.startDate)}–{shortDate(w.endDate)}
                </td>
                <td className="px-4 py-3">
                  <span className={cn('rounded-full border px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em]', ENERGY_TONE[w.energyType])}>
                    {ENERGY_LABEL[w.energyType]}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-bone">{w.theme || '—'}</td>
                <td className="px-4 py-3 text-bone-muted/70">{w.cosmicContext || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ListSection>

      <ListSection title="Cosmic invitations" count={invitations.length}>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-stone-900/40 text-xs uppercase tracking-[0.16em] text-bone-muted/60">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Type</th>
              <th className="px-4 py-2.5 font-semibold">Window</th>
              <th className="px-4 py-2.5 font-semibold">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {invitations.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-bone-muted/60">
                  No invitations were named in this blueprint.
                </td>
              </tr>
            ) : (
              invitations.map((p, i) => (
                <tr key={`${p.startDate}-${i}`} className="align-top">
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em]',
                        p.type === 'active'
                          ? 'border-leather-400/30 bg-leather-500/16 text-leather-200'
                          : 'border-moss-500/30 bg-moss-500/16 text-moss-200'
                      )}
                    >
                      {p.type === 'active' ? 'Active' : 'Passive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-bone-muted/70">
                    {shortDate(p.startDate)}–{shortDate(p.endDate)}
                  </td>
                  <td className="px-4 py-3 text-bone-muted">{p.reason || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ListSection>
    </div>
  )
}
