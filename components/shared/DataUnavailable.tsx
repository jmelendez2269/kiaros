'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

/**
 * Shown when a gate query failed rather than returned nothing.
 *
 * The distinction matters: before this existed, an unreachable data API read as
 * "this user has no profile" and bounced signed-in users into onboarding.
 * A retry state keeps them where they are until the dependency recovers.
 */
export function DataUnavailable({
  title = 'We couldn’t reach your chart just now.',
  body = 'This one is on our side, not yours — nothing you’ve written has been lost. Give it a moment and try again.',
}: {
  title?: string
  body?: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [retried, setRetried] = useState(false)

  function retry() {
    setRetried(true)
    startTransition(() => router.refresh())
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="shell-panel w-full max-w-md px-6 py-8 text-center md:px-8">
        <h1 className="font-serif text-2xl text-bone">{title}</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-bone-muted">{body}</p>
        <button
          type="button"
          onClick={retry}
          disabled={isPending}
          className="mt-6 inline-flex items-center rounded-full bg-leather-300 px-5 py-2.5 text-xs font-semibold text-stone-950 disabled:opacity-60"
        >
          {isPending ? 'Trying again…' : 'Try again'}
        </button>
        {retried && !isPending && (
          <p className="mt-4 text-xs text-bone-muted">
            Still quiet. It should clear on its own — your data is intact either way.
          </p>
        )}
      </div>
    </div>
  )
}
