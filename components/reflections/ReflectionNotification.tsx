'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { iaJournalFlagEnabled, reflectionsHubHref } from '@/lib/journal/ia-journal-routes'

export function ReflectionNotification({ placement = 'inline' }: { placement?: 'inline' | 'notice' }) {
  const [visible, setVisible] = useState(false)
  const reflectionsHref = reflectionsHubHref(iaJournalFlagEnabled(process.env.NEXT_PUBLIC_IA_JOURNAL))

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/reflections?notification=1', { cache: 'no-store', signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        setVisible(data.available === true)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  if (!visible) return null

  const noticeClasses =
    placement === 'notice'
      ? 'flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-100/20 bg-amber-100/5 px-4 py-3 text-sm text-bone'
      : 'mx-5 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-100/20 bg-amber-100/5 px-5 py-3 text-sm text-bone'

  return (
    <aside className={noticeClasses} aria-label="New reflections">
      <Link href={reflectionsHref} className="underline underline-offset-4">
        A new reflection is ready. Take a little space to look back.
      </Link>
      <button
        type="button"
        onClick={async () => {
          const response = await fetch('/api/reflections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'seen' }),
          })
          if (response.ok) setVisible(false)
        }}
        className="rounded border border-white/15 px-3 py-1"
      >
        Dismiss
      </button>
    </aside>
  )
}
