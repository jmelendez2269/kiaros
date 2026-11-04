'use client'

import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { K } from '@/components/almanac'
import { useStelloquy } from '@/components/oracle/StelloquyProvider'
import type { PeriodReviewSections, PeriodReviewSourceChips } from '@/lib/period-review/report-schema'
import { LookBackPreview } from '@/components/period-review/LookBackPreview'

type Cached = {
  sections: PeriodReviewSections
  sourceChips: PeriodReviewSourceChips
  generatedAt: string
}

const SECTION_TITLES: Array<{ key: keyof PeriodReviewSections; title: string }> = [
  { key: 'thread', title: 'What it was about' },
  { key: 'sky', title: 'The sky' },
  { key: 'plansAndGoals', title: 'Your plans and goals' },
  { key: 'inYourWords', title: 'In your words' },
  { key: 'questionToCarry', title: 'A question to carry' },
]

type ApiBody = { cached?: Cached | null; preview?: PeriodReviewSourceChips | null; error?: string }

async function readJson(res: Response): Promise<ApiBody> {
  return (await res.json().catch(() => ({}))) as ApiBody
}

export function SkyCycleReviewModal({
  cycleId,
  title,
  subtitle,
  stelloquyPrompt,
  onClose,
}: {
  cycleId: string
  title: string
  subtitle: string
  stelloquyPrompt: string
  onClose: () => void
}) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const { openWith, hasOracleAccess } = useStelloquy()
  const [cached, setCached] = useState<Cached | null>(null)
  const [preview, setPreview] = useState<PeriodReviewSourceChips | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    fetch(`/api/sky-cycles/review?cycleId=${encodeURIComponent(cycleId)}`, { cache: 'no-store' })
      .then(async (res) => {
        const data = await readJson(res)
        if (cancelled) return
        if (!res.ok) throw new Error(data.error ?? "We couldn't load this look back.")
        setCached(data.cached ?? null)
        setPreview(data.preview ?? null)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "We couldn't load this look back.")
      })
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [cycleId])

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>(`#${CSS.escape(titleId)}`)?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose, titleId])

  function generate(regenerate: boolean) {
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch('/api/sky-cycles/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cycleId, regenerate }),
        })
        const data = await readJson(res)
        if (!res.ok) throw new Error(data.error ?? "We couldn't write this look back just now.")
        setCached(data.cached ?? null)
      } catch (e) {
        setError(e instanceof Error ? e.message : "We couldn't write this look back just now.")
      }
    })
  }

  function continueWithStelloquy() {
    onClose()
    if (hasOracleAccess) openWith(stelloquyPrompt)
    else window.location.assign('/oracle')
  }

  const sections = cached
    ? SECTION_TITLES.filter(({ key }) => cached.sections[key]?.trim())
    : []

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', justifyContent: 'center' }}>
      <button
        type="button"
        aria-label="Close look back"
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(10,12,20,0.82)', border: 'none', cursor: 'default' }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="period-review-modal-panel"
        style={{
          position: 'relative',
          margin: 'auto',
          width: '100%',
          maxWidth: 680,
          maxHeight: '100dvh',
          overflow: 'auto',
          background: '#0A0C14',
          border: '1px solid rgba(164,163,177,0.35)',
          borderRadius: 16,
          padding: '20px 20px 24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontFamily: K.fMono, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: K.inkDim }}>
              Look back
            </div>
            <h2
              id={titleId}
              tabIndex={-1}
              style={{ margin: '6px 0 0', fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 26, color: K.ink, outline: 'none' }}
            >
              {title}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: K.inkDim }}>{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', color: K.inkDim, fontSize: 22, cursor: 'pointer', alignSelf: 'flex-start' }}
          >
            ×
          </button>
        </div>

        {error ? (
          <p role="alert" style={{ marginTop: 16, color: K.brickHi, fontSize: 13 }}>
            {error}
          </p>
        ) : null}

        {!loaded || (pending && !cached) ? (
          <div aria-busy="true" style={{ marginTop: 16 }}>
            <div className="period-review-shimmer" style={{ height: 88, borderRadius: 8 }} />
            <div className="period-review-shimmer" style={{ height: 64, borderRadius: 8, marginTop: 12 }} />
          </div>
        ) : !cached ? (
          <div style={{ marginTop: 16 }}>
            {preview ? (
              <LookBackPreview chips={preview} periodNoun="cycle" />
            ) : (
              <p style={{ fontSize: 14, lineHeight: 1.65, color: K.inkDim }}>
                We&apos;ll gather the sky, your plans and goals, and what you wrote during this cycle into one look back.
              </p>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={() => generate(false)}
              style={{
                marginTop: 12,
                fontFamily: K.fMono,
                fontSize: 11,
                letterSpacing: '0.08em',
                padding: '10px 16px',
                borderRadius: 999,
                border: 'none',
                background: '#A98AEF',
                color: '#0A0C14',
                cursor: pending ? 'wait' : 'pointer',
              }}
            >
              Write my look back
            </button>
          </div>
        ) : (
          sections.map(({ key, title: sectionTitle }) => (
            <section key={key} style={{ marginTop: 20 }}>
              <h3 style={{ margin: 0, fontFamily: K.fMono, fontSize: 11, letterSpacing: '0.14em', color: '#A98AEF', textTransform: 'uppercase' }}>
                {key === 'sky' && cached.sections.thread ? 'How the sky sat with it' : sectionTitle}
              </h3>
              <p style={{ marginTop: 10, fontSize: 15, lineHeight: 1.75, color: K.ink, whiteSpace: 'pre-wrap' }}>
                {cached.sections[key]}
              </p>
            </section>
          ))
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, marginTop: 24 }}>
          <button
            type="button"
            onClick={continueWithStelloquy}
            style={{
              fontFamily: K.fMono,
              fontSize: 11,
              letterSpacing: '0.08em',
              padding: '10px 16px',
              borderRadius: 999,
              border: '1px solid #A98AEF',
              background: 'transparent',
              color: '#A98AEF',
              cursor: 'pointer',
            }}
          >
            Continue with Stelloquy →
          </button>
          {cached ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => generate(true)}
              style={{ background: 'none', border: 'none', padding: 0, fontSize: 13, color: K.inkDim, textDecoration: 'underline', textUnderlineOffset: 3, cursor: pending ? 'wait' : 'pointer' }}
            >
              {pending ? 'Regenerating…' : 'Regenerate'}
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  )
}
