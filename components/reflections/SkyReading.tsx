import Link from 'next/link'
import type { SkyReading } from '@/lib/reflections/report-schema'

const chipClass = 'rounded-full border border-violet-300/40 px-3 py-1 font-mono text-[11px] tracking-wide text-violet-200'

function Prose({ text }: { text: string }) {
  return <>{text.split(/\n{2,}/).map((paragraph, i) => <p key={i} className="whitespace-pre-line leading-relaxed">{paragraph}</p>)}</>
}

/**
 * The sky part of a reflection. `quiet` is a period with nothing recorded,
 * where this is the whole look back; otherwise it sits inside a reflection
 * written from the member's own words.
 */
export function SkyReadingView({ reading, unit, quiet }: { reading: SkyReading; unit: string; quiet: boolean }) {
  const { sections, sourceChips } = reading
  const chips = [...(sourceChips.personal ?? []), ...sourceChips.sky]
  return <section id="reflection-sky" className="scroll-mt-6 space-y-4">
    <h3 className="font-display text-2xl">The sky you moved through</h3>
    {chips.length > 0 && <ul aria-label={`In the sky this ${unit}`} className="flex flex-wrap gap-2" style={{ listStyle: 'none', padding: 0 }}>
      {chips.map(chip => <li key={chip} className={chipClass}>{chip}</li>)}
    </ul>}
    {sections.sky && <div className="space-y-3"><Prose text={sections.sky} /></div>}
    {quiet && sections.thread && <div className="space-y-3"><h4 className="text-sm text-amber-100/80">What it was about</h4><Prose text={sections.thread} /></div>}
    {quiet && sections.plansAndGoals && <div className="space-y-3"><h4 className="text-sm text-amber-100/80">Your plans and goals</h4><Prose text={sections.plansAndGoals} /></div>}
    {sections.questionToCarry && <div className="space-y-2 border-l border-violet-300/40 pl-4">
      <h4 className="text-sm text-violet-200/90">A question to carry</h4>
      <p className="font-display text-xl italic leading-relaxed">{sections.questionToCarry}</p>
    </div>}
    {quiet && <p className="text-sm text-bone-muted">
      This {unit} is read from the sky and your chart alone. If something from these days comes back to you, your{' '}
      <Link href="/journal" className="text-bone underline underline-offset-4">journal</Link> has room for it, and this look back can be refreshed to hold it.
    </p>}
  </section>
}
