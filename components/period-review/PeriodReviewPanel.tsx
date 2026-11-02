'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { Frame, K, Kicker } from '@/components/almanac'
import {
  emptyJournalBanner,
  emptyJournalClosingLinkLabel,
  journalWritePrefillHref,
  todayCardButtonLabel,
} from '@/lib/period-review/copy'
import { periodLabel, periodFor, type PeriodReviewKind } from '@/lib/period-review/periods'
import { sanitizePeriodReviewOutput } from '@/lib/period-review/sanitize-output'

interface Props {
  kind: PeriodReviewKind
  year: number
  index: number
}

type Cached = {
  summary: string
  generatedAt: string
  model: string
  regenerations: number
}

export function PeriodReviewPanel({ kind, year, index }: Props) {
  const [cached, setCached] = useState<Cached | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [journalEntryCount, setJournalEntryCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [loaded, setLoaded] = useState(false)

  const period = periodFor(kind, year, index)
  const title = periodLabel(period)

  const load = useCallback(async () => {
    setError(null)
    const sp = new URLSearchParams({
      kind,
      year: String(year),
      index: String(index),
    })
    const res = await fetch(`/api/period-review?${sp.toString()}`, { cache: 'no-store' })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Could not load review')
    setCached(data.cached)
    setSummary(data.cached?.summary ? sanitizePeriodReviewOutput(data.cached.summary) : null)
    setJournalEntryCount(typeof data.journalEntryCount === 'number' ? data.journalEntryCount : null)
    setLoaded(true)
  }, [kind, year, index])

  useEffect(() => {
    load().catch((e) => {
      setError(e instanceof Error ? e.message : 'Could not load review')
      setLoaded(true)
    })
  }, [load])

  function generate(regenerate: boolean) {
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch('/api/period-review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind, year, index, regenerate }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Generation failed')
        setSummary(sanitizePeriodReviewOutput(data.summary))
        if (typeof data.journalEntryCount === 'number') setJournalEntryCount(data.journalEntryCount)
        await load()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Generation failed')
      }
    })
  }

  const showEmptyJournalBanner = journalEntryCount === 0
  const writeHref = journalWritePrefillHref(period)

  return (
    <Frame tone="umber" padding={22}>
      <Kicker color={K.copper}>Period review</Kicker>
      <div
        style={{
          marginTop: 6,
          fontFamily: K.fSerif,
          fontStyle: 'italic',
          fontSize: 28,
          color: K.ink,
        }}
      >
        {title}
      </div>

      {showEmptyJournalBanner ? (
        <p style={{ marginTop: 16, fontSize: 14, color: K.ink, lineHeight: 1.65 }}>{emptyJournalBanner(period)}</p>
      ) : null}

      {error ? (
        <p style={{ marginTop: 12, color: K.brickHi, fontSize: 13 }} role="alert">
          {error}
        </p>
      ) : null}

      {summary ? (
        <div
          style={{
            marginTop: 18,
            fontFamily: K.fBody,
            fontSize: 15,
            lineHeight: 1.75,
            color: K.ink,
            whiteSpace: 'pre-wrap',
          }}
        >
          {summary}
        </div>
      ) : loaded && !pending ? (
        <p style={{ marginTop: 18, fontSize: 14, color: K.inkSoft, fontStyle: 'italic' }}>
          No review saved for this period yet.
        </p>
      ) : null}

      {showEmptyJournalBanner && kind === 'month' ? (
        <p style={{ marginTop: 18, fontSize: 14, color: K.inkDim, lineHeight: 1.65 }}>
          <Link href={writeHref} style={{ color: K.copperHi, textDecoration: 'underline', textUnderlineOffset: 3 }}>
            {emptyJournalClosingLinkLabel(period)}
          </Link>
        </p>
      ) : null}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 20 }}>
        <button
          type="button"
          disabled={pending}
          onClick={() => generate(Boolean(summary))}
          style={{
            fontFamily: K.fMono,
            fontSize: 11,
            letterSpacing: '0.14em',
            padding: '10px 16px',
            borderRadius: 999,
            border: `1px solid ${K.copper}88`,
            background: K.bg3,
            color: K.copperHi,
            cursor: pending ? 'wait' : 'pointer',
          }}
        >
          {summary
            ? pending
              ? 'REGENERATING…'
              : 'REGENERATE'
            : pending
              ? 'GENERATING…'
              : todayCardButtonLabel(period).toUpperCase()}
        </button>
      </div>
    </Frame>
  )
}
