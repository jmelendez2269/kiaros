import Link from 'next/link'
import { ArrowRight, NotebookPen } from 'lucide-react'

interface Props {
  /** The day's intention line — seeds the entry's title and opening body. */
  intention: string
  theme?: string | null
  context?: string | null
  weekNumber?: number | null
}

export function ContinueWithJournal({ intention, theme, context, weekNumber }: Props) {
  const params = new URLSearchParams({ prompt: intention })
  if (theme && theme !== intention) params.set('theme', theme)
  if (context) params.set('context', context)
  if (weekNumber) params.set('week', String(weekNumber))

  return (
    <Link
      href={`/journal?${params.toString()}`}
      aria-label="Carry this intention into the journal"
      className="group inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-3 font-almanac-mono text-[0.65rem] uppercase tracking-[0.12em] text-almanac-copper-hi transition-colors hover:bg-almanac-kairos/10 hover:text-almanac-starlight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-almanac-copper/70"
    >
      <NotebookPen aria-hidden size={14} strokeWidth={1.7} />
      <span>Continue with Journal</span>
      <ArrowRight
        aria-hidden
        size={14}
        strokeWidth={1.7}
        className="transition-transform duration-200 group-hover:translate-x-0.5"
      />
    </Link>
  )
}
