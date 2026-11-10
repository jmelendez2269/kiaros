'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { K } from '@/components/almanac'
import { useStelloquy } from '@/components/oracle/StelloquyProvider'
import {
  emptyJournalBanner,
  continueWithStelloquyLabel,
  emptyJournalClosingLinkLabel,
  formatGeneratedTimestamp,
  formatPeriodDateRange,
  journalWritePrefillHref,
  periodReviewStorageFullDismissLabel,
  periodReviewStorageFullLine1,
  periodReviewStelloquyPrompt,
  periodReviewStorageFullLine2,
} from '@/lib/period-review/copy'
import {
  nextPeriod,
  periodLabel,
  periodShortLabel,
  previousPeriod,
  type PeriodReviewPeriod,
} from '@/lib/period-review/periods'
import type { PeriodReviewSections, PeriodReviewSourceChips } from '@/lib/period-review/report-schema'
import { LookBackPreview } from './LookBackPreview'
import { ReturningThreads } from './ReturningThreads'

type ReviewPayload = {
  sections: PeriodReviewSections
  sourceChips: PeriodReviewSourceChips
  generatedAt: string
}

function SourceChips({ chips }: { chips: string[] }) {
  if (!chips.length) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
      {chips.map((chip) => (
        <span
          key={chip}
          style={{
            fontFamily: K.fMono,
            fontSize: 10,
            letterSpacing: '0.06em',
            color: '#A4A3B1',
            border: '1px solid rgba(164,163,177,0.35)',
            borderRadius: 999,
            padding: '4px 10px',
          }}
        >
          {chip}
        </span>
      ))}
    </div>
  )
}

function ShimmerBlock({ height = 72 }: { height?: number }) {
  return <div className="period-review-shimmer" style={{ height, borderRadius: 8, marginTop: 12 }} aria-hidden />
}

function localTodayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const navButtonStyle = {
  background: 'none',
  border: '1px solid rgba(164,163,177,0.35)',
  borderRadius: 999,
  padding: '4px 10px',
  fontFamily: K.fMono,
  fontSize: 10,
  letterSpacing: '0.08em',
  color: '#A4A3B1',
  cursor: 'pointer',
} as const

/** Unknown counts stay null so a failed lookup never reads as an empty journal. */
function countOrNull(value: unknown): number | null {
  return typeof value === 'number' ? value : null
}

function chipsOrNull(value: unknown): PeriodReviewSourceChips | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Partial<PeriodReviewSourceChips>
  return {
    sky: Array.isArray(v.sky) ? v.sky : [],
    plans: Array.isArray(v.plans) ? v.plans : [],
    journal: Array.isArray(v.journal) ? v.journal : [],
    personal: Array.isArray(v.personal) ? v.personal : [],
  }
}

async function loadCachedOnly(period: PeriodReviewPeriod): Promise<{
  payload: ReviewPayload | null
  journalEntryCount: number | null
  vaultAvailable: boolean
  preview: PeriodReviewSourceChips | null
}> {
  const sp = new URLSearchParams({
    kind: period.kind,
    year: String(period.planYear),
    index: String(period.index),
  })
  const getRes = await fetch(`/api/period-review?${sp.toString()}`, { cache: 'no-store' })
  const getData = await getRes.json()
  if (!getRes.ok) throw new Error(getData.error ?? 'Could not load review')

  const vaultAvailable = getData.vaultAvailable !== false

  if (getData.cached) {
    return {
      payload: {
        sections: getData.cached.sections,
        sourceChips: getData.cached.sourceChips,
        generatedAt: getData.cached.generatedAt,
      },
      journalEntryCount: countOrNull(getData.journalEntryCount),
      vaultAvailable,
      preview: null,
    }
  }

  return {
    payload: null,
    journalEntryCount: countOrNull(getData.journalEntryCount),
    vaultAvailable,
    preview: chipsOrNull(getData.preview),
  }
}

type PostGenerateResult =
  | { ok: true; payload: ReviewPayload; journalEntryCount: number | null }
  | { ok: false; reason: 'storage_full' }

async function postGenerate(period: PeriodReviewPeriod, regenerate: boolean): Promise<PostGenerateResult> {
  const res = await fetch('/api/period-review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind: period.kind,
      year: period.planYear,
      index: period.index,
      regenerate,
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    if (res.status === 409 && data.error === 'storage_full') {
      return { ok: false, reason: 'storage_full' }
    }
    throw new Error(typeof data.error === 'string' ? data.error : regenerate ? 'Regeneration failed' : 'Generation failed')
  }
  return {
    ok: true,
    payload: {
      sections: data.sections,
      sourceChips: data.sourceChips,
      generatedAt: data.generatedAt,
    },
    journalEntryCount: countOrNull(data.journalEntryCount),
  }
}

export function PeriodReviewModal({
  period,
  autoGenerate: _autoGenerate,
  onClose,
  onNavigate,
}: {
  period: PeriodReviewPeriod
  autoGenerate: boolean
  onClose: () => void
  onNavigate?: (period: PeriodReviewPeriod) => void
}) {
  const { openWith, hasOracleAccess } = useStelloquy()
  const prev = previousPeriod(period)
  const next = nextPeriod(period)
  // Same rule as latestClosedMonth/Quarter: a period is reviewable from its last day on.
  const canGoNext = localTodayIso() >= next.periodEnd
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const [payload, setPayload] = useState<ReviewPayload | null>(null)
  const [journalEntryCount, setJournalEntryCount] = useState<number | null>(null)
  const [needsGenerate, setNeedsGenerate] = useState(false)
  const [loadingCache, setLoadingCache] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [storageFullOpen, setStorageFullOpen] = useState(false)
  const [vaultAvailable, setVaultAvailable] = useState(true)
  const [pending, startTransition] = useTransition()
  const [confirmRegen, setConfirmRegen] = useState(false)
  const [preview, setPreview] = useState<PeriodReviewSourceChips | null>(null)

  useEffect(() => {
    setPayload(null)
    setPreview(null)
    setJournalEntryCount(null)
    setConfirmRegen(false)
    setNeedsGenerate(false)
    setLoadingCache(true)
    setError(null)
    setStorageFullOpen(false)
    setVaultAvailable(true)
    startTransition(async () => {
      try {
        const result = await loadCachedOnly(period)
        setPayload(result.payload)
        setPreview(result.preview)
        setNeedsGenerate(!result.payload)
        setJournalEntryCount(result.journalEntryCount)
        setVaultAvailable(result.vaultAvailable)
        if (!result.payload && !result.vaultAvailable) {
          setStorageFullOpen(true)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong')
      } finally {
        setLoadingCache(false)
      }
    })
  }, [period])

  function generateFirst() {
    setError(null)
    setStorageFullOpen(false)
    startTransition(async () => {
      try {
        const result = await postGenerate(period, false)
        if (!result.ok) {
          setStorageFullOpen(true)
          setVaultAvailable(false)
          return
        }
        setPayload(result.payload)
        setNeedsGenerate(false)
        setJournalEntryCount(result.journalEntryCount)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Generation failed')
      }
    })
  }

  useEffect(() => {
    // Focus the title on mount so screen readers announce the modal, but don't show
    // a focus ring (title has tabindex=-1 so it's not in the tab order)
    const node = dialogRef.current
    if (!node) return
    const title = node.querySelector<HTMLElement>(`#${titleId}`)
    title?.focus()
  }, [titleId])

  useEffect(() => {
    const node = dialogRef.current
    if (!node) return
    
    const focusables = node.querySelectorAll<HTMLElement>(
      'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
    )
    const first = focusables[0]
    const last = focusables[focusables.length - 1]

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab' || focusables.length === 0) return
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, payload, pending])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  function regenerate() {
    setConfirmRegen(false)
    setPayload(null)
    setStorageFullOpen(false)
    startTransition(async () => {
      try {
        const result = await postGenerate(period, true)
        if (!result.ok) {
          setStorageFullOpen(true)
          setVaultAvailable(false)
          return
        }
        setPayload(result.payload)
        setNeedsGenerate(false)
        setJournalEntryCount(result.journalEntryCount)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Regeneration failed')
      }
    })
  }

  function continueWithStelloquy() {
    const prompt = periodReviewStelloquyPrompt(period, payload?.sections.questionToCarry)
    onClose()
    if (hasOracleAccess) {
      openWith(prompt)
      return
    }
    window.location.assign('/oracle')
  }

  const showEmptyJournal = journalEntryCount === 0
  const writeHref = journalWritePrefillHref(period)

  const sectionBlocks: { title: string; body?: string; chips: string[] }[] = []
  // A thread that drew on journal entries hides once no entries are included, like "In your words".
  const threadQuotesJournal = (payload?.sourceChips.journal.length ?? 0) > 0
  if (payload?.sections.thread && !(threadQuotesJournal && journalEntryCount === 0)) {
    sectionBlocks.push({
      title: 'What it was about',
      body: payload.sections.thread,
      chips: [...payload.sourceChips.journal, ...payload.sourceChips.plans],
    })
  }
  if (payload?.sections.sky) {
    sectionBlocks.push({
      title: payload.sections.thread ? 'How the sky sat with it' : 'The sky',
      body: payload.sections.sky,
      chips: [...(payload.sourceChips.personal ?? []), ...payload.sourceChips.sky],
    })
  }
  if (payload?.sections.plansAndGoals) {
    sectionBlocks.push({
      title: 'Your plans and goals',
      body: payload.sections.plansAndGoals,
      chips: payload.sections.thread ? [] : payload.sourceChips.plans,
    })
  }
  // null = count unavailable; trust the saved review rather than hiding the section.
  if (payload?.sections.inYourWords && journalEntryCount !== 0) {
    sectionBlocks.push({
      title: 'In your words',
      body: payload.sections.inYourWords,
      chips: payload.sourceChips.journal,
    })
  }
  if (payload?.sections.questionToCarry) {
    sectionBlocks.push({ title: 'A question to carry', body: payload.sections.questionToCarry, chips: [] })
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
      }}
    >
      <button
        type="button"
        aria-label="Close review"
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(10,12,20,0.82)',
          border: 'none',
          cursor: 'default',
        }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="period-review-modal-panel"
        style={{
          position: 'relative',
          zIndex: 1,
          margin: 'auto',
          width: '100%',
          maxWidth: 720,
          maxHeight: '100dvh',
          overflow: 'auto',
          background: '#0A0C14',
          border: '1px solid rgba(164,163,177,0.35)',
          borderRadius: 16,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <header style={{ padding: '20px 20px 12px', borderBottom: '1px solid rgba(164,163,177,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <h2
                id={titleId}
                tabIndex={-1}
                style={{
                  margin: 0,
                  fontFamily: K.fSerif,
                  fontStyle: 'italic',
                  fontSize: 28,
                  color: K.ink,
                  lineHeight: 1.2,
                  outline: 'none',
                }}
              >
                {periodLabel(period)}
              </h2>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#A4A3B1' }}>
                {formatPeriodDateRange(period.periodStart, period.periodEnd)}
              </p>
              {onNavigate ? (
                <nav aria-label="Other reviews" style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => onNavigate(prev)}
                    style={{ ...navButtonStyle, cursor: pending ? 'wait' : 'pointer' }}
                  >
                    ← {periodShortLabel(prev)}
                  </button>
                  {canGoNext ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => onNavigate(next)}
                      style={{ ...navButtonStyle, cursor: pending ? 'wait' : 'pointer' }}
                    >
                      {periodShortLabel(next)} →
                    </button>
                  ) : null}
                </nav>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="period-review-modal-close"
              style={{
                background: 'none',
                border: 'none',
                color: '#A4A3B1',
                fontSize: 22,
                lineHeight: 1,
                cursor: 'pointer',
              }}
            >
              ×
            </button>
          </div>
        </header>

        <div style={{ padding: '16px 20px 24px', flex: 1 }}>
          {showEmptyJournal ? (
            <p style={{ fontSize: 14, lineHeight: 1.65, color: K.ink, marginBottom: 16 }}>{emptyJournalBanner(period)}</p>
          ) : null}

          {error ? (
            <p style={{ color: K.brickHi, fontSize: 13 }} role="alert">
              {error}
            </p>
          ) : null}

          {storageFullOpen ? (
            <div
              role="status"
              style={{
                marginTop: 8,
                marginBottom: 16,
                padding: '16px 18px',
                borderRadius: 8,
                border: '1px solid rgba(164,163,177,0.35)',
                background: '#141824',
              }}
            >
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: K.ink }}>{periodReviewStorageFullLine1()}</p>
              <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.65, color: '#A4A3B1' }}>
                {periodReviewStorageFullLine2()}
              </p>
              <button
                type="button"
                onClick={() => setStorageFullOpen(false)}
                style={{
                  marginTop: 16,
                  fontFamily: K.fMono,
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  padding: '10px 16px',
                  borderRadius: 999,
                  border: '1px solid rgba(164,163,177,0.45)',
                  background: 'transparent',
                  color: '#A4A3B1',
                  cursor: 'pointer',
                }}
              >
                {periodReviewStorageFullDismissLabel()}
              </button>
            </div>
          ) : null}

          {loadingCache || (pending && !payload && !storageFullOpen) ? (
            <div aria-busy="true" aria-label={needsGenerate ? 'Loading review' : 'Generating review'}>
              <ShimmerBlock height={88} />
              <ShimmerBlock height={64} />
              <ShimmerBlock height={64} />
            </div>
          ) : needsGenerate && !payload && !storageFullOpen && vaultAvailable ? (
            <div style={{ marginTop: 8 }}>
              {preview ? (
                <LookBackPreview chips={preview} periodNoun={period.kind === 'quarter' ? 'quarter' : 'month'} />
              ) : (
                <p style={{ fontSize: 14, lineHeight: 1.65, color: '#A4A3B1', marginBottom: 16 }}>
                  No saved look back for this period yet.
                </p>
              )}
              <button
                type="button"
                disabled={pending}
                onClick={generateFirst}
                style={{
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
            sectionBlocks.map((block) => (
              <section key={block.title} style={{ marginTop: 20 }}>
                <h3
                  style={{
                    margin: 0,
                    fontFamily: K.fMono,
                    fontSize: 11,
                    letterSpacing: '0.14em',
                    color: '#A98AEF',
                    textTransform: 'uppercase',
                  }}
                >
                  {block.title}
                </h3>
                <p style={{ marginTop: 10, fontSize: 15, lineHeight: 1.75, color: K.ink, whiteSpace: 'pre-wrap' }}>
                  {block.body}
                </p>
                <SourceChips chips={block.chips} />
              </section>
            ))
          )}

          {payload && (payload.sourceChips.patterns?.length || payload.sourceChips.themes?.length) ? (
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(164,163,177,0.2)' }}>
              <ReturningThreads patterns={payload.sourceChips.patterns} themes={payload.sourceChips.themes} onNavigate={onClose} />
            </div>
          ) : null}

          {showEmptyJournal && period.kind === 'month' && payload ? (
            <p style={{ marginTop: 20, fontSize: 14, color: '#A4A3B1', lineHeight: 1.65 }}>
              <Link
                href={writeHref}
                onClick={onClose}
                style={{ color: '#A98AEF', textDecoration: 'underline', textUnderlineOffset: 3 }}
              >
                {emptyJournalClosingLinkLabel(period)}
              </Link>
            </p>
          ) : null}

          {payload ? (
            <div style={{ marginTop: 24 }}>
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
                {continueWithStelloquyLabel()} →
              </button>
            </div>
          ) : null}
        </div>

        {(payload && vaultAvailable) || payload?.generatedAt ? (
          <footer
            style={{
              padding: '14px 20px 20px',
              borderTop: '1px solid rgba(164,163,177,0.2)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ position: 'relative' }}>
              {payload && vaultAvailable ? (
              <button
                type="button"
                disabled={pending || !payload}
                onClick={() => setConfirmRegen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: 13,
                  color: '#A4A3B1',
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                  cursor: pending ? 'wait' : 'pointer',
                }}
              >
                Regenerate
              </button>
              ) : null}
              {confirmRegen ? (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: 0,
                    marginBottom: 8,
                    padding: 12,
                    background: '#141824',
                    border: '1px solid rgba(164,163,177,0.35)',
                    borderRadius: 8,
                    width: 240,
                    zIndex: 2,
                  }}
                >
                  <p style={{ margin: 0, fontSize: 13, color: K.ink, lineHeight: 1.5 }}>
                    Replace this review with a fresh one?
                  </p>
                  <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                    <button
                      type="button"
                      onClick={regenerate}
                      style={{
                        fontSize: 12,
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: 'none',
                        background: '#A98AEF',
                        color: '#0A0C14',
                        cursor: 'pointer',
                      }}
                    >
                      Regenerate
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRegen(false)}
                      style={{
                        fontSize: 12,
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid rgba(164,163,177,0.35)',
                        background: 'transparent',
                        color: '#A4A3B1',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            {payload?.generatedAt ? (
              <span style={{ fontSize: 12, color: '#A4A3B1' }}>
                Generated {formatGeneratedTimestamp(payload.generatedAt)}
              </span>
            ) : null}
          </footer>
        ) : null}
      </div>
    </div>
  )
}
