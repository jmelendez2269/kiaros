import Link from 'next/link'
import { CONSENT_EMPTY_STATE_COPY } from '@/lib/copy/consent-empty-state'

interface ConsentEmptyStateProps {
  variant: 'patterns' | 'reflections'
}

export function ConsentEmptyState({ variant }: ConsentEmptyStateProps) {
  const copy = CONSENT_EMPTY_STATE_COPY[variant]

  return (
    <div className="rounded-xl border border-dashed border-white/20 p-8">
      <h2 className="font-display text-2xl text-bone">{copy.heading}</h2>
      <p className="mt-3 text-bone-muted leading-relaxed">{copy.body}</p>
      <Link
        href="/journal"
        className="mt-5 inline-flex items-center gap-2 rounded-full border border-border/70 bg-stone-950/60 px-4 py-2 text-sm font-medium text-bone transition-colors hover:border-moss-400/40 hover:bg-moss-500/8"
      >
        Go to Journal
      </Link>
    </div>
  )
}
