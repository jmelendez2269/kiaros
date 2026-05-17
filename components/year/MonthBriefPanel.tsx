'use client'

import { useEffect, useRef, useState } from 'react'
import { K, Kicker } from '@/components/almanac'

interface MonthBriefPanelProps {
  year: number
  month: number          // 1–12
  monthName: string
  initialBrief?: string
  initialGeneratedAt?: string
  initialPinned?: boolean
}

type Status = 'idle' | 'loading' | 'ready' | 'error'

interface ApiResult {
  briefText: string
  modelUsed: string
  generatedAt: string
  fromCache: boolean
  pinned: boolean
}

export function MonthBriefPanel({
  year,
  month,
  monthName,
  initialBrief,
  initialGeneratedAt,
  initialPinned = false,
}: MonthBriefPanelProps) {
  const [brief, setBrief] = useState<string | null>(initialBrief ?? null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(initialGeneratedAt ?? null)
  const [pinned, setPinned] = useState<boolean>(initialPinned)
  const [pinBusy, setPinBusy] = useState<boolean>(false)
  const [status, setStatus] = useState<Status>(initialBrief ? 'ready' : 'idle')
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)

  async function loadBrief(regen = false) {
    if (inFlight.current) return
    inFlight.current = true
    setStatus('loading')
    setError(null)
    try {
      const res = await fetch('/api/month-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month, regen }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string }
        if (res.status === 409 && body.code === 'pinned') {
          // Server blocked regen because the brief is pinned. The UI
          // already hides the regen button when pinned, so this is a
          // defensive no-op for API-level races. Sync local pin state.
          setPinned(true)
          setStatus('ready')
          return
        }
        throw new Error(body.error ?? `Request failed (${res.status})`)
      }
      const data = (await res.json()) as ApiResult
      setBrief(data.briefText)
      setGeneratedAt(data.generatedAt)
      setPinned(Boolean(data.pinned))
      setStatus('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load brief')
      setStatus('error')
    } finally {
      inFlight.current = false
    }
  }

  async function togglePin() {
    if (pinBusy || !brief) return
    const next = !pinned
    setPinBusy(true)
    // Optimistic flip — revert on error
    setPinned(next)
    try {
      const res = await fetch('/api/month-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month, pin: next }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `Pin failed (${res.status})`)
      }
    } catch (err) {
      setPinned(!next)
      setError(err instanceof Error ? err.message : 'Pin failed')
    } finally {
      setPinBusy(false)
    }
  }

  // Lazy first-fetch: on mount, if no initial brief was passed, kick off
  // generation. Subsequent month switches re-mount this component with
  // new props, so this fires fresh per month.
  useEffect(() => {
    if (!initialBrief && status === 'idle') {
      void loadBrief(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month])

  const generatedLabel = generatedAt
    ? new Date(generatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div
      style={{
        border: `1px solid ${K.line}`,
        borderRadius: 12,
        background: K.bg2,
        padding: '22px 24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <Kicker color={K.copperHi}>This month's brief · {monthName}</Kicker>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {generatedLabel && status === 'ready' ? (
            <span style={{ fontFamily: K.fMono, fontSize: 10, color: K.inkSoft, letterSpacing: '0.14em' }}>
              GENERATED {generatedLabel.toUpperCase()}
            </span>
          ) : null}
          {status === 'ready' && brief ? (
            <button
              type="button"
              onClick={togglePin}
              disabled={pinBusy}
              aria-pressed={pinned}
              aria-label={pinned ? 'Unpin this brief' : 'Pin this brief'}
              title={pinned ? 'Pinned — click to unpin' : 'Pin to lock this brief'}
              style={{
                fontFamily: K.fMono,
                fontSize: 12,
                lineHeight: 1,
                color: pinned ? K.copperHi : K.inkSoft,
                background: 'transparent',
                border: `1px solid ${pinned ? K.copperHi : K.line}`,
                borderRadius: 6,
                padding: '4px 8px',
                cursor: pinBusy ? 'wait' : 'pointer',
                opacity: pinBusy ? 0.6 : 1,
              }}
            >
              {pinned ? '★ PINNED' : '☆ PIN'}
            </button>
          ) : null}
          {status === 'ready' && !pinned ? (
            <button
              type="button"
              onClick={() => loadBrief(true)}
              style={{
                fontFamily: K.fMono,
                fontSize: 10,
                letterSpacing: '0.14em',
                color: K.copperHi,
                background: 'transparent',
                border: `1px solid ${K.copperHi}55`,
                borderRadius: 6,
                padding: '4px 10px',
                cursor: 'pointer',
              }}
            >
              REGENERATE
            </button>
          ) : null}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        {status === 'loading' ? <BriefSkeleton /> : null}

        {status === 'error' ? (
          <div style={{ fontFamily: K.fBody, fontSize: 14, color: K.brickHi, lineHeight: 1.6 }}>
            Couldn't generate the brief: {error}.{' '}
            <button
              type="button"
              onClick={() => loadBrief(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: K.copperHi,
                cursor: 'pointer',
                padding: 0,
                textDecoration: 'underline',
                fontFamily: K.fBody,
                fontSize: 14,
              }}
            >
              Try again
            </button>
            .
          </div>
        ) : null}

        {status === 'ready' && brief ? <BriefProse text={brief} /> : null}
      </div>
    </div>
  )
}

function BriefProse({ text }: { text: string }) {
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {paragraphs.map((p, i) => (
        <p
          key={i}
          style={{
            fontFamily: K.fSerif,
            fontSize: 16,
            color: K.ink,
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          {p}
        </p>
      ))}
    </div>
  )
}

function BriefSkeleton() {
  const widths = ['96%', '88%', '92%', '70%', '0', '94%', '86%', '60%']
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} aria-label="Generating brief…">
      {widths.map((w, i) => (
        <div
          key={i}
          style={{
            height: w === '0' ? 6 : 12,
            width: w === '0' ? '100%' : w,
            background: w === '0' ? 'transparent' : `${K.line}`,
            borderRadius: 4,
            opacity: 0.6,
          }}
        />
      ))}
      <div style={{ fontFamily: K.fMono, fontSize: 10, color: K.inkSoft, letterSpacing: '0.14em', marginTop: 6 }}>
        WRITING YOUR BRIEF…
      </div>
    </div>
  )
}
