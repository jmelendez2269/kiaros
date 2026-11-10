'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { noticeHiddenOn, reflectionNoticeHref, reflectionNoticeText, REFLECTIONS_SEEN_EVENT, type ReflectionNotice } from '@/lib/reflections/notification'
import { lastWeekOnToday } from '@/lib/reviews/year-timeline'

/**
 * Tells the member a reflection has been prepared since they last looked:
 * which one, with a link straight to it. Opening it, dismissing it, or
 * visiting the Reflections page all clear it. It stays off pages that are
 * already showing the same thing.
 */
export function ReflectionNotification({ placement = 'inline' }: { placement?: 'inline' | 'notice' }) {
  const pathname = usePathname()
  const [notice, setNotice] = useState<ReflectionNotice | null>(null)
  const [today, setToday] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/reflections?notification=1', { cache: 'no-store', signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { notice?: ReflectionNotice | null; today?: string } | null) => {
        if (!data?.notice) return
        setNotice(data.notice)
        setToday(data.today ?? null)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  // The Reflections page marks everything seen when it opens.
  useEffect(() => {
    const clear = () => setNotice(null)
    window.addEventListener(REFLECTIONS_SEEN_EVENT, clear)
    return () => window.removeEventListener(REFLECTIONS_SEEN_EVENT, clear)
  }, [])

  // Clears at once on screen; the save follows. If it fails, the notice simply returns on a later visit.
  const markSeen = useCallback(() => {
    setNotice(null)
    void fetch('/api/reflections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'seen' }),
      keepalive: true,
    }).catch(() => {})
  }, [])

  if (!notice || noticeHiddenOn(pathname ?? '', notice, today ? lastWeekOnToday(today) : null)) return null

  const noticeClasses =
    placement === 'notice'
      ? 'flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-100/20 bg-amber-100/5 px-4 py-3 text-sm text-bone'
      : 'mx-5 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-100/20 bg-amber-100/5 px-5 py-3 text-sm text-bone'

  return (
    <aside className={noticeClasses} aria-label="A new reflection">
      <p className="m-0">{reflectionNoticeText(notice)}</p>
      <div className="flex items-center gap-2">
        <Link href={reflectionNoticeHref(notice)} onClick={markSeen} className="rounded-full bg-amber-100/90 px-3.5 py-1 font-medium text-stone-950">
          Read it
        </Link>
        <button type="button" onClick={markSeen} className="rounded-full border border-white/15 px-3 py-1 text-bone-muted">
          Not now
        </button>
      </div>
    </aside>
  )
}
