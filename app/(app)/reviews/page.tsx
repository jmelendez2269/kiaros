import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Frame, K, Kicker } from '@/components/almanac'
import { PeriodReviewReviewsRow } from '@/components/period-review/PeriodReviewReviewsRow'
import { isPeriodReviewEnabled } from '@/lib/feature-flags'
import { periodReviewPublicFlagEnabled } from '@/lib/period-review/flag'
import { BRAND } from '@/lib/brand'

export const metadata = {
  title: `Reviews — ${BRAND.product}`,
  description: 'Look back on each month and quarter: the sky, your plans, and your own words.',
}

const OTHER_LINKS = [
  {
    href: '/year?view=review',
    label: 'Quarterly check-ins',
    hint: 'your own wins, challenges and pivots, quarter by quarter',
  },
  {
    href: '/year/unwrapped',
    label: 'Yearly Unwrapped',
    hint: 'the story of your whole year',
  },
  {
    href: '/reflections',
    label: 'Reflections',
    hint: 'your earlier written reflections',
  },
] as const

/**
 * Insights > Reviews: one place to open any month or quarter look back,
 * instead of waiting for the Today card in the week after a period ends.
 */
export default function ReviewsPage() {
  // The chips open the review modal, which only mounts with the public flag.
  if (!isPeriodReviewEnabled() || !periodReviewPublicFlagEnabled()) redirect('/reflections')

  const year = new Date().getFullYear()

  return (
    <div className="mx-auto grid max-w-3xl gap-5 p-4 sm:p-6 md:p-8" style={{ color: K.ink }}>
      <header>
        <Kicker color={K.violetDim}>Insights</Kicker>
        <h1
          style={{ margin: '6px 0 0', fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 32, lineHeight: 1.15 }}
        >
          Reviews
        </h1>
        <p style={{ marginTop: 8, fontSize: 15, lineHeight: 1.65, color: K.inkDim, maxWidth: 560 }}>
          Look back on any month or quarter once it ends: the sky you moved through, your plans and goals, and
          your own words. Filled chips are reviews you have already opened.
        </p>
      </header>

      <Frame tone="umber" padding={20}>
        <PeriodReviewReviewsRow planYear={year} label={String(year)} />
        <PeriodReviewReviewsRow planYear={year - 1} label={String(year - 1)} />
      </Frame>

      <Frame tone="umber" padding={20}>
        <Kicker color={K.copper}>More ways to look back</Kicker>
        <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0', display: 'grid', gap: 12 }}>
          {OTHER_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} style={{ color: K.copperHi, textDecoration: 'underline', textUnderlineOffset: 3, fontSize: 15 }}>
                {link.label}
              </Link>
              <div style={{ fontSize: 13, color: K.inkDim, marginTop: 2 }}>{link.hint}</div>
            </li>
          ))}
        </ul>
      </Frame>
    </div>
  )
}
