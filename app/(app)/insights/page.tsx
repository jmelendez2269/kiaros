import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import type { ReactNode } from 'react'
import { K, Kicker } from '@/components/almanac'
import { getAppProfile } from '@/lib/app/get-app-profile'
import { requireOracleAccess } from '@/lib/commerce/access'
import { isPeriodReviewEnabled } from '@/lib/feature-flags'
import { timesWritten } from '@/lib/insights/home'
import { loadInsightsHome, type InsightsHome } from '@/lib/insights/load-home'
import { periodReviewPublicFlagEnabled } from '@/lib/period-review/flag'
import { todayISO } from '@/lib/today/get-today-context'
import { BRAND } from '@/lib/brand'
import { PageHints } from '@/components/tour/PageHints'

export const metadata = {
  title: `Insights — ${BRAND.product}`,
  description: 'Your latest look back, the sky you have written under before, and the themes that keep coming up.',
}

const card = { background: K.bg2, border: `1px solid ${K.line}`, color: K.ink } as const
const serif = { fontFamily: K.fSerif, fontStyle: 'italic', fontWeight: 500 } as const
const dim = { fontSize: 14, lineHeight: 1.65, color: K.inkDim } as const

function Card({ kicker, children, href, cta }: { kicker: string; children: ReactNode; href: string; cta: string }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl p-5 sm:p-6" style={card}>
      <Kicker color={K.violetDim}>{kicker}</Kicker>
      <div className="grid gap-3">{children}</div>
      <Link href={href} className="mt-auto self-start pt-2 text-sm underline underline-offset-4" style={{ color: K.copperHi }}>
        {cta} →
      </Link>
    </section>
  )
}

function LookBackRow({ title, row }: { title: string; row: NonNullable<InsightsHome['week']> }) {
  return (
    <div>
      <div style={{ fontFamily: K.fMono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: K.inkDim }}>
        {title} · {row.label}
      </div>
      <p style={{ ...serif, margin: '6px 0 0', fontSize: 20, lineHeight: 1.35 }}>
        {row.line ?? 'Ready to look back on: the sky you moved through, and whatever you shared.'}
      </p>
      <Link href={row.href} className="mt-2 inline-block text-sm underline underline-offset-4" style={{ color: K.copperHi }}>
        {row.line ? 'Read it' : 'Look back'} →
      </Link>
    </div>
  )
}

/** Insights home: where the look backs, Patterns and the Mind map meet. */
export default async function InsightsHomePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  const profileResult = await getAppProfile(userId)
  if (profileResult.status !== 'ok') redirect('/today')

  const reviewsOn = isPeriodReviewEnabled() && periodReviewPublicFlagEnabled()
  const hasStelloquy = (await requireOracleAccess(userId)) === null
  const home = await loadInsightsHome(profileResult.profile.id, todayISO(), { monthLookBacks: reviewsOn, mindMap: hasStelloquy })
  const reviewsHref = reviewsOn ? '/reviews' : '/reflections'

  return (
    <div className="mx-auto grid max-w-6xl gap-5 p-4 sm:p-6 md:p-8" style={{ color: K.ink }}>
      <header>
        <Kicker color={K.violetDim}>Insights</Kicker>
        <h1 style={{ ...serif, margin: '6px 0 0', fontSize: 32, lineHeight: 1.15 }}>What has been moving</h1>
        <p style={{ ...dim, marginTop: 8, fontSize: 15, maxWidth: 600 }}>
          Your latest look back, the sky overhead that you have written under before, and the themes that keep coming up.
          Each one opens onto the fuller picture.
        </p>
      </header>

      <PageHints page="insights" />

      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <Card kicker="Your latest look backs" href={reviewsHref} cta="See your whole year">
          {home.week ? <LookBackRow title="Last week" row={home.week} /> : null}
          {home.week && home.month ? <span aria-hidden className="h-px" style={{ background: K.line }} /> : null}
          {home.month ? <LookBackRow title="Last month" row={home.month} /> : null}
          {!home.week && !home.month ? <p style={dim}>Your first look back arrives when your first full week ends.</p> : null}
        </Card>

        <div className="grid gap-5">
          <Card kicker="Overhead today" href="/insights/map" cta={home.patternCount ? 'Open Patterns' : 'About Patterns'}>
            {home.overhead.length ? (
              <>
                <p style={dim}>Skies in the air today that you have written under before.</p>
                <ul className="grid gap-2" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {home.overhead.map((p) => (
                    <li key={p.label} className="flex items-baseline gap-3">
                      <span aria-hidden style={{ fontFamily: K.fSerif, fontSize: 18, width: 34, textAlign: 'center', color: K.violetDim, flex: 'none' }}>{p.glyph}</span>
                      <span style={{ ...serif, fontSize: 19 }}>{p.label}</span>
                      <span style={{ fontSize: 13, color: K.inkDim }}>{timesWritten(p.entries)}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : home.strongest ? (
              <p style={dim}>
                None of the skies you have written under is overhead today. The one you have returned to most is{' '}
                <span style={{ color: K.ink }}>{home.strongest.label}</span>, {timesWritten(home.strongest.entries)}.
              </p>
            ) : (
              <p style={dim}>
                Every journal entry is stamped with the sky above it. Once a few have landed under the same sky, it shows here whenever that sky comes round.
              </p>
            )}
          </Card>

          {hasStelloquy ? (
            <Card kicker="Brightest star" href="/insights/mind-map" cta="Open your Mind map">
              {home.star ? (
                <>
                  <p style={{ ...serif, margin: 0, fontSize: 26, lineHeight: 1.15 }}>{home.star.label}</p>
                  <p style={dim}>
                    In {home.star.count} of your {home.star.of} saved {BRAND.oracle} conversations, more than any other theme.
                  </p>
                </>
              ) : (
                <p style={dim}>Save a moment from a {BRAND.oracle} conversation and its themes begin to chart here as stars.</p>
              )}
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
