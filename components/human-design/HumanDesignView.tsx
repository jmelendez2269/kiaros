import { AlertCircle } from 'lucide-react'
import type { HumanDesignChart } from '@/lib/human-design'
import { centerLabel, describeEdgeCase } from '@/lib/human-design'
import { BRAND } from '@/lib/brand'

interface HumanDesignViewProps {
  chart: HumanDesignChart
  displayName: string | null
  birthCity: string | null
}

export function HumanDesignView({ chart, displayName, birthCity }: HumanDesignViewProps) {
  const { bodyGraph, activationSequence, edgeCases } = chart

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-20 animate-fade-in">
      <header className="space-y-1.5">
        <p className="shell-kicker">Human Design · Gene Keys</p>
        <h1 className="text-[1.85rem] font-semibold leading-tight text-bone md:text-[2.1rem]">
          {displayName ? `${displayName}'s chart` : 'Your chart'}
        </h1>
        <p className="max-w-3xl text-sm leading-7 text-bone-muted">
          Your chart suggests how you&apos;re wired to make decisions, recover energy, and meet
          the world. Read it as one input among many — your goals, your transits, your lived
          experience all sit alongside it. Not a verdict.
          {birthCity ? <span className="text-bone-muted/70"> Drawn from your birth in {birthCity}.</span> : null}
        </p>
      </header>

      {edgeCases.length > 0 ? <EdgeCaseBanner edgeCases={edgeCases} /> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Type" value={bodyGraph.type} accent="leather" />
        <SummaryCard label="Strategy" value={bodyGraph.strategy} accent="moss" />
        <SummaryCard label="Authority" value={bodyGraph.authority} accent="plum" />
        <SummaryCard
          label="Profile"
          value={bodyGraph.profile}
          subValue={bodyGraph.profileName}
          accent="leather"
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <SignaturePanel label="Signature" body={bodyGraph.signature} accent="moss" hint="What it feels like when this design is honoured." />
        <SignaturePanel label="Not-self" body={bodyGraph.notSelf} accent="plum" hint="What it feels like when you're forcing against it." />
      </section>

      <CentersPanel
        defined={bodyGraph.definedCenters}
        undefined={bodyGraph.undefinedCenters}
      />

      <ChannelsPanel channels={bodyGraph.activatedChannels} />

      <PrimeGiftsPanel sequence={activationSequence} />

      <ChartMeta chart={chart} />
    </div>
  )
}

// ─── Subcomponents ──────────────────────────────────────────────────────

type AccentTone = 'leather' | 'moss' | 'plum'

const ACCENT_BORDER: Record<AccentTone, string> = {
  leather: 'border-leather-400/35 bg-leather-500/10',
  moss: 'border-moss-400/35 bg-moss-500/10',
  plum: 'border-plum-400/35 bg-plum-500/10',
}

const ACCENT_KICKER: Record<AccentTone, string> = {
  leather: 'text-leather-200',
  moss: 'text-moss-200',
  plum: 'text-plum-300',
}

function SummaryCard({
  label,
  value,
  subValue,
  accent,
}: {
  label: string
  value: string
  subValue?: string
  accent: AccentTone
}) {
  return (
    <div className={`rounded-2xl border ${ACCENT_BORDER[accent]} px-5 py-4`}>
      <p className={`shell-kicker mb-1.5 ${ACCENT_KICKER[accent]}`}>{label}</p>
      <p className="font-serif text-[1.35rem] leading-tight text-bone">{value}</p>
      {subValue ? <p className="mt-1 text-xs text-bone-muted">{subValue}</p> : null}
    </div>
  )
}

function SignaturePanel({
  label,
  body,
  accent,
  hint,
}: {
  label: string
  body: string
  accent: AccentTone
  hint: string
}) {
  return (
    <div className="shell-panel-soft px-5 py-4">
      <p className={`shell-kicker mb-1.5 ${ACCENT_KICKER[accent]}`}>{label}</p>
      <p className="font-serif text-[1.5rem] leading-tight text-bone">{body}</p>
      <p className="mt-2 text-xs leading-5 text-bone-muted">{hint}</p>
    </div>
  )
}

function CentersPanel({
  defined,
  undefined: undef,
}: {
  defined: string[]
  undefined: string[]
}) {
  return (
    <section className="shell-panel px-6 py-5 md:px-7">
      <header className="mb-4 flex items-end justify-between">
        <div>
          <p className="shell-kicker mb-1.5">Centers</p>
          <h2 className="text-lg font-semibold text-bone">Where you generate vs. where you absorb</h2>
        </div>
        <p className="hidden text-xs text-bone-muted md:block">
          Defined centers are reliably available. Undefined centers take in the room.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <CenterList label="Defined" centers={defined} tone="leather" />
        <CenterList label="Undefined" centers={undef} tone="muted" />
      </div>
    </section>
  )
}

function CenterList({ label, centers, tone }: { label: string; centers: string[]; tone: 'leather' | 'muted' }) {
  return (
    <div>
      <p className={`mb-2 text-xs font-medium uppercase tracking-[0.16em] ${tone === 'leather' ? 'text-leather-200' : 'text-bone-muted/80'}`}>
        {label} ({centers.length})
      </p>
      {centers.length === 0 ? (
        <p className="text-sm text-bone-muted">— none —</p>
      ) : (
        <ul className="space-y-1.5">
          {centers.map((c) => (
            <li
              key={c}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                tone === 'leather'
                  ? 'border-leather-400/30 bg-leather-500/8 text-bone'
                  : 'border-border/60 bg-stone-950/50 text-bone-muted'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${tone === 'leather' ? 'bg-leather-300' : 'bg-bone-muted/40'}`} />
              {centerLabel(c)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ChannelsPanel({ channels }: { channels: { gates: [number, number]; name: string }[] }) {
  return (
    <section className="shell-panel px-6 py-5 md:px-7">
      <header className="mb-4">
        <p className="shell-kicker mb-1.5">Channels</p>
        <h2 className="text-lg font-semibold text-bone">Reliable circuits in your design</h2>
        <p className="mt-1 text-sm text-bone-muted">
          Each activated channel is two gates that connect into a defined wire. Where your energy
          most consistently moves.
        </p>
      </header>
      {channels.length === 0 ? (
        <p className="text-sm text-bone-muted">No defined channels — a Reflector signature.</p>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {channels.map((ch) => (
            <li
              key={`${ch.gates[0]}-${ch.gates[1]}`}
              className="flex items-center justify-between rounded-2xl border border-border/60 bg-stone-950/55 px-4 py-3"
            >
              <span className="text-sm font-medium text-bone">{ch.name}</span>
              <span className="font-mono text-xs text-bone-muted">
                {ch.gates[0]}–{ch.gates[1]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function PrimeGiftsPanel({ sequence }: { sequence: HumanDesignChart['activationSequence'] }) {
  const gifts = [sequence.lifesWork, sequence.evolution, sequence.radiance, sequence.purpose] as const
  return (
    <section className="shell-panel px-6 py-5 md:px-7">
      <header className="mb-4">
        <p className="shell-kicker mb-1.5">Gene Keys · Prime Gifts</p>
        <h2 className="text-lg font-semibold text-bone">Four contemplations for the year</h2>
        <p className="mt-1 text-sm text-bone-muted">
          Each gift moves along a spectrum — the Shadow at low frequency, the Gift when engaged,
          the Siddhi at full transmission. Read these slowly; they&apos;re for contemplation, not
          assessment.
        </p>
      </header>
      <div className="grid gap-3 md:grid-cols-2">
        {gifts.map((g) => (
          <article
            key={g.sphere}
            className="rounded-2xl border border-border/60 bg-stone-950/55 px-5 py-4"
          >
            <div className="flex items-baseline justify-between">
              <p className="font-serif text-base text-bone">{g.label}</p>
              <span className="font-mono text-xs text-bone-muted">
                {g.geneKey}.{g.line}
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-5 text-bone-muted">{g.description}</p>
            <dl className="mt-3 space-y-1 text-xs">
              <SpectrumRow label="Shadow" value={g.shadow} tone="plum" />
              <SpectrumRow label="Gift" value={g.gift} tone="leather" />
              <SpectrumRow label="Siddhi" value={g.siddhi} tone="moss" />
            </dl>
          </article>
        ))}
      </div>
    </section>
  )
}

function SpectrumRow({ label, value, tone }: { label: string; value: string; tone: AccentTone }) {
  return (
    <div className="flex items-center gap-2">
      <dt className={`w-14 text-[10px] font-semibold uppercase tracking-[0.14em] ${ACCENT_KICKER[tone]}`}>{label}</dt>
      <dd className="text-bone">{value}</dd>
    </div>
  )
}

function EdgeCaseBanner({ edgeCases }: { edgeCases: HumanDesignChart['edgeCases'] }) {
  // Voice: this is the "tool, not authority" principle made visible. Phrase
  // as a soft cross-check, not a "we may have it wrong." Link to MyBodyGraph
  // because they're the canonical authority here, not a competitor.
  return (
    <section className="rounded-2xl border border-amber-400/30 bg-amber-500/[0.06] px-5 py-4">
      <div className="flex gap-3">
        <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-300/90" />
        <div className="space-y-2">
          <p className="text-sm font-medium text-bone">
            A few placements sit close to a gate boundary
          </p>
          <p className="text-sm leading-6 text-bone-muted">
            Different Human Design calculators can disagree by a fraction of a degree on
            slow-moving planets. The following sit within 0.2° of a gate boundary in your chart
            — if you&apos;ve used{' '}
            <a
              href="https://www.mybodygraph.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-leather-300/60 underline-offset-2 hover:text-bone"
            >
              MyBodyGraph
            </a>{' '}
            before, it&apos;s worth a cross-check.
          </p>
          <ul className="space-y-1 pt-1 font-mono text-xs text-bone-muted">
            {edgeCases.map((edge) => (
              <li key={`${edge.side}-${edge.key}`}>· {describeEdgeCase(edge)}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

function ChartMeta({ chart }: { chart: HumanDesignChart }) {
  const computed = new Date(chart.computedAt)
  const formatted = Number.isNaN(computed.getTime())
    ? chart.computedAt
    : computed.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
  return (
    <footer className="border-t border-border/50 pt-4 text-[11px] leading-5 text-bone-muted/70">
      Computed {formatted} · methodology v{chart.version} · {BRAND.product} uses an open-source ephemeris
      (astronomia / VSOP87B). Edge-case placements may differ from Swiss-Ephemeris-based tools
      by up to ~0.17° on slow planets.
    </footer>
  )
}
