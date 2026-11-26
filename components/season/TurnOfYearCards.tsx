'use client'

import Link from 'next/link'
import { useState } from 'react'
import { K, Kicker } from '@/components/almanac'
import type { RenewalOffer, SwitchOffer } from '@/lib/season/turn-of-year'

export interface TurnOfYearCardsProps {
  year: number
  today: string
  /** True in November, when writing now is ahead of December 1. */
  ahead: boolean
  canWrite: boolean
  blueprint: { status: string } | null
  renewal: RenewalOffer | null
  switchOffer: SwitchOffer | null
  /** A preview's mock day, carried into the links so the flow can be followed. */
  mockToday: string | null
}

const serif = { fontFamily: K.fSerif, fontStyle: 'italic', fontWeight: 500 } as const
const body = { fontSize: 15, lineHeight: 1.6, color: K.inkDim, margin: 0 } as const
const pill = {
  minHeight: 44,
  border: 0,
  background: K.copperHi,
  color: K.bg,
  textDecoration: 'none',
} as const
const quiet = {
  minHeight: 44,
  border: 0,
  background: 'transparent',
  color: K.inkDim,
  textDecoration: 'none',
} as const
const mono = { fontFamily: K.fMono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' } as const

function usd(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100)
}

function longDay(day: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${day}T00:00:00.000Z`),
  )
}

function shortDay(day: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${day}T00:00:00.000Z`))
    .toUpperCase()
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

function planName(productTier: string): string {
  return productTier === 'planner_oracle' ? 'Planner + Stelloquy' : 'Planner'
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section
      aria-label={label}
      className="flex min-w-0 flex-col gap-4 rounded-2xl p-6"
      style={{
        border: `1px solid ${K.ember}66`,
        background: `linear-gradient(to right, ${K.ember}14, transparent 70%), ${K.bg2}`,
      }}
    >
      {children}
    </section>
  )
}

function WriteCard({ year, ahead, blueprint, mockToday }: Pick<TurnOfYearCardsProps, 'year' | 'ahead' | 'blueprint' | 'mockToday'>) {
  const writeHref = `/renewing?year=${year}&ahead=1${mockToday ? `&mockToday=${mockToday}` : ''}`
  const status = blueprint?.status ?? null

  if (status === 'generating') {
    return (
      <Card label={`Your ${year} Blueprint`}>
        <Kicker color={K.ember}>Your {year} Blueprint</Kicker>
        <p style={{ ...serif, margin: 0, fontSize: 24, lineHeight: 1.25 }}>Being written now.</p>
        <p style={body}>It takes about five minutes. You can leave this page; it will be waiting in your Blueprint.</p>
        <Link href={writeHref} className="inline-flex items-center self-start rounded-full px-5 text-sm font-medium" style={pill}>
          Follow along →
        </Link>
      </Card>
    )
  }

  if (status === 'ready') {
    return (
      <Card label={`Your ${year} Blueprint`}>
        <Kicker color={K.ember}>Your {year} Blueprint</Kicker>
        <p style={{ ...serif, margin: 0, fontSize: 24, lineHeight: 1.25 }}>All 52 weeks are written.</p>
        <p style={body}>
          If your goals change, you can write it again before the year begins. The newest one is the one you will see.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/blueprint?year=${year}`} className="inline-flex items-center rounded-full px-5 text-sm font-medium" style={pill}>
            Open my {year} Blueprint →
          </Link>
          <Link href={writeHref} className="inline-flex items-center rounded-full px-4 text-sm" style={quiet}>
            Write it again
          </Link>
        </div>
      </Card>
    )
  }

  return (
    <Card label={`Your ${year} Blueprint`}>
      <Kicker color={K.ember}>Your {year} Blueprint</Kicker>
      <p style={{ ...serif, margin: 0, fontSize: 24, lineHeight: 1.25 }}>All 52 weeks, written from this sky and the goals you carry.</p>
      <p style={body}>
        Included with your yearly membership, and yours to read for as long as it runs. It takes about five minutes to
        write, and you can change your goals and write it again before the year begins.
      </p>
      <Link href={writeHref} className="inline-flex items-center self-start rounded-full px-5 text-sm font-medium" style={pill}>
        Write my {year} Blueprint →
      </Link>
      {ahead ? <span style={{ fontSize: 13.5, color: K.inkDim }}>Or leave it. It will be offered again on December 1.</span> : null}
    </Card>
  )
}

function RenewCard({ offer, today, onDismiss }: { offer: RenewalOffer; today: string; onDismiss: () => void }) {
  const [state, setState] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null })

  async function renew() {
    setState({ busy: true, error: null })
    try {
      const res = await fetch('/api/billing/renew', { method: 'POST' })
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        setState({ busy: false, error: data.error ?? 'Checkout couldn’t start right now. Please try again.' })
        return
      }
      window.location.assign(data.url)
    } catch {
      setState({ busy: false, error: 'Couldn’t reach the server. Check your connection and try again.' })
    }
  }

  return (
    <Card label={`Renew for ${offer.year}`}>
      <Kicker color={K.ember}>Renew whenever suits you</Kicker>
      <p style={{ ...serif, margin: 0, fontSize: 22, lineHeight: 1.3 }}>
        Renewing today costs you no days. Your new year begins the day this one ends.
      </p>

      <div className="grid gap-2" aria-hidden="true">
        <div className="flex overflow-hidden rounded-full" style={{ height: 10, background: K.bg3 }}>
          <div style={{ flex: `${Math.max(1, daysBetween(today, offer.currentEndsOn))} 1 0`, background: K.inkSoft }} />
          <div style={{ flex: '365 1 0', background: K.ember }} />
        </div>
        <div className="flex justify-between gap-3" style={{ ...mono, color: K.inkDim }}>
          <span>Today · {shortDay(today)}</span>
          <span>
            {shortDay(offer.newStartsOn)} to {shortDay(offer.newEndsOn)}
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1 rounded-xl p-3" style={{ background: K.bg3 }}>
          <span style={{ ...mono, color: K.ember }}>Opens today</span>
          <span style={{ fontSize: 14, lineHeight: 1.5 }}>All 52 weeks of your {offer.year} Blueprint, written when you choose.</span>
        </div>
        <div className="grid gap-1 rounded-xl p-3" style={{ background: K.bg3 }}>
          <span style={{ ...mono, color: K.inkDim }}>Stays as it is</span>
          <span style={{ fontSize: 14, lineHeight: 1.5 }}>
            Your {offer.year - 1}, your journal, your patterns and saved conversations.
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-baseline gap-3">
        <span style={{ ...serif, fontSize: 30 }}>{usd(offer.priceCents)}</span>
        <span style={{ fontSize: 14, color: K.inkDim }}>
          {planName(offer.productTier)}, one year, {longDay(offer.newStartsOn)} to {longDay(offer.newEndsOn)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={renew} disabled={state.busy} className="rounded-full px-5 text-sm font-medium" style={pill}>
          {state.busy ? 'Opening checkout' : `Renew for ${offer.year} →`}
        </button>
        <button type="button" onClick={onDismiss} className="rounded-full px-4 text-sm" style={quiet}>
          Decide later
        </button>
      </div>
      {state.error ? (
        <p role="alert" style={{ ...body, color: K.ember }}>
          {state.error}
        </p>
      ) : null}
      <p style={{ ...body, fontSize: 13.5 }}>If you decide not to renew, everything you wrote this year stays yours to read.</p>
    </Card>
  )
}

function SwitchCard({ offer, onDismiss }: { offer: SwitchOffer; onDismiss: () => void }) {
  const [step, setStep] = useState<'offer' | 'confirm' | 'busy' | 'done'>('offer')
  const [error, setError] = useState<string | null>(null)
  const months = Math.round(offer.yearlyPriceCents / offer.monthlyPriceCents)

  async function confirm() {
    setStep('busy')
    setError(null)
    try {
      const res = await fetch('/api/billing/switch-to-yearly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueTodayCents: offer.dueTodayCents }),
      })
      const data = (await res.json().catch(() => ({}))) as { switched?: boolean; error?: string }
      if (!res.ok && !data.switched) {
        setError(data.error ?? 'The switch didn’t go through, and you’re still on monthly.')
        setStep('confirm')
        return
      }
      if (data.error) setError(data.error)
      setStep('done')
    } catch {
      setError('Couldn’t reach the server. Nothing has changed yet.')
      setStep('confirm')
    }
  }

  if (step === 'done') {
    return (
      <Card label={`See all of ${offer.year}`}>
        <Kicker color={K.ember}>You’re on yearly</Kicker>
        <p style={{ ...serif, margin: 0, fontSize: 22, lineHeight: 1.3 }}>All 52 weeks of {offer.year} are open to you.</p>
        {error ? <p style={body}>{error}</p> : null}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center self-start rounded-full px-5 text-sm font-medium"
          style={pill}
        >
          Write my {offer.year} Blueprint →
        </button>
      </Card>
    )
  }

  return (
    <Card label={`See all of ${offer.year}`}>
      <Kicker color={K.ember}>If you want the whole year now</Kicker>
      <p style={{ ...serif, margin: 0, fontSize: 22, lineHeight: 1.3 }}>Yearly opens all 52 weeks of {offer.year} today.</p>
      <p style={body}>
        {usd(offer.yearlyPriceCents)} a year for {planName(offer.productTier)}, the price of {months} months at{' '}
        {usd(offer.monthlyPriceCents)}. Your journal, patterns and saved conversations stay as they are either way.
      </p>
      <p style={body}>What you have already paid for this month comes off the first yearly charge.</p>

      {step === 'offer' ? (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setStep('confirm')} className="rounded-full px-5 text-sm font-medium" style={pill}>
            Switch to yearly →
          </button>
          <button type="button" onClick={onDismiss} className="rounded-full px-4 text-sm" style={quiet}>
            Stay monthly
          </button>
        </div>
      ) : (
        <div className="grid gap-3 rounded-xl p-4" style={{ background: K.bg3 }}>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6 }}>
            You’ll be charged <strong>{usd(offer.dueTodayCents)}</strong> today on the card you pay monthly with:{' '}
            {usd(offer.yearlyPriceCents)} for the year, less {usd(offer.creditCents)} already paid this month. Your year
            runs {longDay(offer.startsOn)} to {longDay(offer.endsOn)}, and renews each year at the same price until you cancel.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={confirm} disabled={step === 'busy'} className="rounded-full px-5 text-sm font-medium" style={pill}>
              {step === 'busy' ? 'Switching' : `Pay ${usd(offer.dueTodayCents)} and switch`}
            </button>
            <button type="button" onClick={() => setStep('offer')} disabled={step === 'busy'} className="rounded-full px-4 text-sm" style={quiet}>
              Not now
            </button>
          </div>
        </div>
      )}
      {error && step !== 'busy' ? (
        <p role="alert" style={{ ...body, color: K.ember }}>
          {error}
        </p>
      ) : null}
    </Card>
  )
}

/**
 * The turn-of-year cards: write next year's Blueprint, renew early, or switch
 * monthly to yearly. Each shows only when it applies (lib/season/turn-of-year.ts).
 */
export function TurnOfYearCards(props: TurnOfYearCardsProps) {
  const [hidden, setHidden] = useState<{ renew: boolean; switch: boolean }>({ renew: false, switch: false })
  const showWrite = props.canWrite
  const showRenew = !!props.renewal && !hidden.renew
  const showSwitch = !!props.switchOffer && !hidden.switch
  if (!showWrite && !showRenew && !showSwitch) return null

  return (
    <div className="grid gap-4">
      {showWrite ? <WriteCard year={props.year} ahead={props.ahead} blueprint={props.blueprint} mockToday={props.mockToday} /> : null}
      {showRenew && props.renewal ? (
        <RenewCard offer={props.renewal} today={props.today} onDismiss={() => setHidden((h) => ({ ...h, renew: true }))} />
      ) : null}
      {showSwitch && props.switchOffer ? (
        <SwitchCard offer={props.switchOffer} onDismiss={() => setHidden((h) => ({ ...h, switch: true }))} />
      ) : null}
    </div>
  )
}

