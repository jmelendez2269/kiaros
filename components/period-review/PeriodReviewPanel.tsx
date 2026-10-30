'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { Frame, K, Kicker } from '@/components/almanac'
import { periodLabel, periodFor, type PeriodReviewKind } from '@/lib/period-review/periods'

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
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [loaded, setLoaded] = useState(false)

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
    setSummary(data.cached?.summary ?? null)
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
        setSummary(data.summary)
        setCached({
          summary: data.summary,
          generatedAt: data.generatedAt,
          model: data.model,
          regenerations: cached?.regenerations ?? 0,
        })
        await load()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Generation failed')
      }
    })
  }

  const period = periodFor(kind, year, index)
  const title = periodLabel(period)

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
      <p style={{ marginTop: 12, fontSize: 13, color: K.inkDim, lineHeight: 1.6 }}>
        TODO-STELLA: Placeholder framing for on-demand period reviews. Generated from your sky, plans, check-ins, goals,
        and journal entries when you have them.
      </p>

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
          {summary ? (pending ? 'REGENERATING…' : 'REGENERATE') : pending ? 'GENERATING…' : 'GENERATE REVIEW'}
        </button>
      </div>
    </Frame>
  )
}
