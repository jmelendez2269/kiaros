'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { K, Seal, StarField } from '@/components/almanac'

/** "Not yet" hides the band on this device for a week; it comes back while the window is open. */
const SNOOZE_DAYS = 7
const snoozeKey = (year: number) => `kiaros-look-ahead-snoozed:${year}`

function snoozedUntil(year: number): number {
  try {
    return Number(window.localStorage.getItem(snoozeKey(year)) ?? 0) || 0
  } catch {
    return 0
  }
}

/** From November 1, on Insights and Today: leads into the look-ahead for next year. */
export function SeasonBand({ year, mockToday }: { year: number; mockToday?: string | null }) {
  // Hidden until mounted, so a snoozed band never flashes in.
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    setVisible(snoozedUntil(year) <= Date.now())
  }, [year])

  if (!visible) return null

  function notYet() {
    try {
      window.localStorage.setItem(snoozeKey(year), String(Date.now() + SNOOZE_DAYS * 86_400_000))
    } catch {
      /* private mode: it simply hides for this visit */
    }
    setVisible(false)
  }

  const href = mockToday ? `/look-ahead?mockToday=${mockToday}` : '/look-ahead'
  const short = String(year).slice(-2)
  return (
    <section aria-label={`${year} is open`} className="relative flex flex-wrap items-center gap-6 overflow-hidden rounded-2xl p-5 sm:px-7 sm:py-6"
      style={{ border: `1px solid ${K.ember}66`, background: `linear-gradient(to right, ${K.brick}33, ${K.ember}14 60%, transparent), ${K.bg2}`, color: K.ink }}>
      <StarField count={24} seed={9} opacity={0.3} />
      <div className="relative hidden sm:block">
        <Seal color={K.ember} size={56}>{short}</Seal>
      </div>
      <div className="relative flex min-w-0 flex-1 flex-col gap-1.5" style={{ flexBasis: 320 }}>
        <span style={{ fontFamily: K.fMono, fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: K.inkDim }}>
          Looking ahead · open until December 1
        </span>
        <span style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontWeight: 500, fontSize: 28, lineHeight: 1.15 }}>{year} is open to look into.</span>
        <span style={{ fontSize: 14.5, lineHeight: 1.5, color: K.inkDim }}>
          The sky of next year, already over your chart. Your {year - 1} stays exactly where it is.
        </span>
      </div>
      <div className="relative flex items-center gap-2.5">
        <Link href={href} className="inline-flex items-center rounded-full px-5 text-sm font-medium"
          style={{ minHeight: 44, background: K.copperHi, color: K.bg, textDecoration: 'none' }}>
          Look ahead →
        </Link>
        <button type="button" onClick={notYet} className="rounded-full px-4 text-sm"
          style={{ minHeight: 44, border: 0, background: 'transparent', color: K.inkDim }}>
          Not yet
        </button>
      </div>
    </section>
  )
}
