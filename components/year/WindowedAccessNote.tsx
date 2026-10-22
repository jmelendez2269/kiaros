import Link from 'next/link'

export function WindowedAccessNote({ windowEnd }: { windowEnd: string | null }) {
  return (
    <div className="shell-panel flex flex-col gap-3 border-leather-400/40 bg-leather-500/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-bone">
          You&apos;re seeing the plan your monthly access covers right now.
        </p>
        <p className="text-xs leading-relaxed text-bone-muted">
          {windowEnd
            ? `Open through ${new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(`${windowEnd}T12:00:00`))}. Dates outside this window are part of the annual Blueprint.`
            : 'Dates outside your current window are part of the annual Blueprint.'}
        </p>
      </div>
      <Link
        href="/pricing"
        className="shrink-0 rounded-xl border border-leather-400/50 bg-leather-500/30 px-4 py-2 text-center text-sm font-medium text-bone shadow-glow hover:bg-leather-500/45"
      >
        See annual access
      </Link>
    </div>
  )
}
