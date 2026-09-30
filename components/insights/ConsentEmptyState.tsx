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
    </div>
  )
}
