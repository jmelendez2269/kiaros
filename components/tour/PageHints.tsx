'use client'

import { useEffect, useState } from 'react'
import { K } from '@/components/almanac/tokens'
import { TOUR_RESTART_EVENT, getTourState } from '@/lib/tour/config'
import { markHintsSeen, nextHint, pageHintIds, readSeenHints, type HintPage } from '@/lib/tour/hints'

/**
 * A page's first-visit hints, one at a time. Remembered in this browser, like
 * the tour. It waits while the sidebar tour is running, so the two never
 * talk over each other, and renders nothing once every hint has been seen.
 */
export function PageHints({ page }: { page: HintPage }) {
  const [seen, setSeen] = useState<string[] | null>(null)

  useEffect(() => {
    const read = () => setSeen(getTourState().active ? null : readSeenHints())
    read()
    // Replaying the tour from Settings brings the hints back.
    window.addEventListener(TOUR_RESTART_EVENT, read)
    return () => window.removeEventListener(TOUR_RESTART_EVENT, read)
  }, [])

  if (!seen) return null
  const current = nextHint(page, seen)
  if (!current) return null
  const { hint, position, total } = current
  const last = position === total

  return (
    <aside
      aria-label="New on this page"
      style={{
        display: 'grid',
        gap: 8,
        padding: '14px 16px',
        borderRadius: 12,
        border: `1px solid ${K.copper}55`,
        borderLeft: `3px solid ${K.copper}`,
        background: K.bg2,
        color: K.ink,
        fontFamily: K.fBody,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <span style={{ fontFamily: K.fMono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: K.copper }}>
          New here{total > 1 ? ` · ${position} of ${total}` : ''}
        </span>
        {!last ? (
          <button
            type="button"
            onClick={() => setSeen(markHintsSeen(pageHintIds(page)))}
            style={{ background: 'none', border: 'none', padding: 0, fontSize: 12.5, color: K.inkDim, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer' }}
          >
            Skip these
          </button>
        ) : null}
      </div>
      <div role="status">
        <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 19, lineHeight: 1.25 }}>{hint.title}</div>
        <p style={{ margin: '6px 0 0', fontSize: 13.5, lineHeight: 1.6, color: K.inkDim, maxWidth: 640 }}>{hint.body}</p>
      </div>
      <button
        type="button"
        onClick={() => setSeen(markHintsSeen([hint.id]))}
        style={{ justifySelf: 'start', marginTop: 2, padding: '7px 14px', borderRadius: 999, border: `1px solid ${K.lineHi}`, background: 'transparent', color: K.ink, fontSize: 13, cursor: 'pointer' }}
      >
        {last ? 'Got it' : 'Next'}
      </button>
    </aside>
  )
}
