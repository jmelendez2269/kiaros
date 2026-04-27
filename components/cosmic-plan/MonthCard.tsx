import { Star } from 'lucide-react'
import type { MonthBlueprint } from '@/types/blueprint'

const MONTH_TONES = {
  leather: {
    frame: 'border-leather-400/22 bg-leather-500/8',
    accent: 'text-leather-200',
    marker: 'bg-leather-300/85',
  },
  plum: {
    frame: 'border-plum-400/22 bg-plum-400/8',
    accent: 'text-plum-300',
    marker: 'bg-plum-300/85',
  },
  moss: {
    frame: 'border-moss-500/22 bg-moss-500/8',
    accent: 'text-moss-200',
    marker: 'bg-moss-300/85',
  },
  ember: {
    frame: 'border-ember-400/22 bg-ember-400/8',
    accent: 'text-ember-300',
    marker: 'bg-ember-300/85',
  },
} as const

interface MonthCardProps {
  month: MonthBlueprint
  tone?: keyof typeof MONTH_TONES
}

export function MonthCard({ month, tone = 'leather' }: MonthCardProps) {
  const t = MONTH_TONES[tone]

  return (
    <article className={`rounded-[1rem] border px-4 py-4 ${t.frame}`}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-display text-[1.15rem] uppercase tracking-wide text-bone">
            {month.name}
          </h4>
          {month.theme && (
            <p className={`mt-1 italic text-[0.86rem] leading-snug ${t.accent}`}>{month.theme}</p>
          )}
        </div>
        <Star
          size={14}
          className="mt-1 shrink-0 text-bone-muted/45"
          aria-hidden="true"
        />
      </header>

      {month.keyTransits.length > 0 && (
        <div className="mt-4 border-t border-border/45 pt-3">
          <p className="shell-eyebrow mb-2 text-bone-muted/55">Key transits</p>
          <ul className="space-y-2">
            {month.keyTransits.map((transit, i) => (
              <li key={i} className="flex items-start gap-2 text-[0.85rem] leading-6 text-bone">
                <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${t.marker}`} />
                <span>{transit}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  )
}
