'use client'

import { useEffect, useRef, useState } from 'react'
import { K, Kicker } from '@/components/almanac'

interface QuarterReviewPanelProps {
  year: number
  quarter: number // 1–4
  initialWins?: string[]
  initialChallenges?: string[]
  initialPivots?: string | null
  initialNextQuarterIntentions?: string | null
  initialCompletedAt?: string | null
  initialAiSummary?: string | null
  initialStatsSnapshot?: Record<string, number> | null
}

type Status = 'idle' | 'saving' | 'synthesizing' | 'regenerating' | 'saved' | 'error'

interface ApiResult {
  quarter: number
  completedAt: string | null
  markedComplete?: boolean
  aiSummary: string | null
  statsSnapshot: Record<string, number> | null
}

const STATS_LABELS: Record<string, string> = {
  daily_logs_count: 'Daily logs',
  journal_entries_count: 'Journal entries',
  oracle_captures_count: 'Oracle captures',
  curriculum_sessions_completed: 'Sessions completed',
  curriculum_sessions_scheduled: 'Sessions scheduled',
}

const MAX_BULLET_LENGTH = 400
const MAX_TEXT_LENGTH = 2000

function bulletsToText(bullets: string[] | undefined): string {
  if (!bullets || bullets.length === 0) return ''
  return bullets.join('\n')
}

function textToBullets(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

export function QuarterReviewPanel({
  year,
  quarter,
  initialWins,
  initialChallenges,
  initialPivots,
  initialNextQuarterIntentions,
  initialCompletedAt,
  initialAiSummary,
  initialStatsSnapshot,
}: QuarterReviewPanelProps) {
  const [wins, setWins] = useState<string>(bulletsToText(initialWins))
  const [challenges, setChallenges] = useState<string>(bulletsToText(initialChallenges))
  const [pivots, setPivots] = useState<string>(initialPivots ?? '')
  const [intentions, setIntentions] = useState<string>(initialNextQuarterIntentions ?? '')
  const [completedAt, setCompletedAt] = useState<string | null>(initialCompletedAt ?? null)
  const [aiSummary, setAiSummary] = useState<string | null>(initialAiSummary ?? null)
  const [statsSnapshot, setStatsSnapshot] = useState<Record<string, number> | null>(initialStatsSnapshot ?? null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  const busy = status === 'saving' || status === 'synthesizing' || status === 'regenerating'
  const isCompleted = Boolean(completedAt)

  // Snapshot of the form's "clean" baseline. The user's content is dirty
  // whenever any of the four textareas differs from this snapshot. We use it
  // to decide whether visibility-change refreshes are safe — refetching from
  // the server while the user is mid-edit would clobber unsaved work.
  const cleanFormRef = useRef({
    wins: bulletsToText(initialWins),
    challenges: bulletsToText(initialChallenges),
    pivots: initialPivots ?? '',
    intentions: initialNextQuarterIntentions ?? '',
  })

  const isDirty =
    wins !== cleanFormRef.current.wins ||
    challenges !== cleanFormRef.current.challenges ||
    pivots !== cleanFormRef.current.pivots ||
    intentions !== cleanFormRef.current.intentions

  // Refetch server state when the tab regains focus, but only when the form
  // is clean and no save is in flight. Another tab may have regenerated the
  // reflection or saved updated content; pull it in silently.
  useEffect(() => {
    let cancelled = false
    async function refreshFromServer() {
      try {
        const res = await fetch(`/api/quarterly-review?year=${year}&quarter=${quarter}`, {
          cache: 'no-store',
        })
        if (cancelled || !res.ok) return
        const data = (await res.json()) as {
          exists: boolean
          completedAt?: string | null
          wins?: string[]
          challenges?: string[]
          pivots?: string | null
          nextQuarterIntentions?: string | null
          aiSummary?: string | null
          statsSnapshot?: Record<string, number> | null
        }
        if (cancelled || !data.exists) return
        const nextWins = bulletsToText(data.wins)
        const nextChallenges = bulletsToText(data.challenges)
        const nextPivots = data.pivots ?? ''
        const nextIntentions = data.nextQuarterIntentions ?? ''
        cleanFormRef.current = {
          wins: nextWins,
          challenges: nextChallenges,
          pivots: nextPivots,
          intentions: nextIntentions,
        }
        setWins(nextWins)
        setChallenges(nextChallenges)
        setPivots(nextPivots)
        setIntentions(nextIntentions)
        setCompletedAt(data.completedAt ?? null)
        setAiSummary(data.aiSummary ?? null)
        setStatsSnapshot(data.statsSnapshot ?? null)
      } catch {
        // Silent — refresh is best-effort.
      }
    }
    function onVisibilityChange() {
      if (document.visibilityState !== 'visible') return
      if (busy || isDirty) return
      void refreshFromServer()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [year, quarter, busy, isDirty])

  async function submit(opts: { markComplete: boolean }) {
    if (busy) return
    setStatus(opts.markComplete ? 'synthesizing' : 'saving')
    setError(null)
    try {
      const res = await fetch('/api/quarterly-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year,
          quarter,
          wins: textToBullets(wins),
          challenges: textToBullets(challenges),
          pivots: pivots.trim() || null,
          nextQuarterIntentions: intentions.trim() || null,
          markComplete: opts.markComplete,
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `Request failed (${res.status})`)
      }
      const data = (await res.json()) as ApiResult
      setCompletedAt(data.completedAt)
      if (opts.markComplete) {
        setAiSummary(data.aiSummary)
        setStatsSnapshot(data.statsSnapshot)
      }
      // The freshly-saved values become the new "clean" baseline so a later
      // visibility-change refresh doesn't see this content as dirty.
      cleanFormRef.current = {
        wins,
        challenges,
        pivots,
        intentions,
      }
      setStatus('saved')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save review')
      setStatus('error')
    }
  }

  async function regenerate() {
    if (busy) return
    setStatus('regenerating')
    setError(null)
    try {
      const res = await fetch('/api/quarterly-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, quarter, regenSummary: true }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `Request failed (${res.status})`)
      }
      const data = (await res.json()) as ApiResult
      setAiSummary(data.aiSummary)
      setStatsSnapshot(data.statsSnapshot)
      setStatus('saved')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate reflection')
      setStatus('error')
    }
  }

  const completedLabel = completedAt
    ? new Date(completedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Kicker>Your review</Kicker>
        {completedLabel ? (
          <div style={{ fontFamily: K.fMono, fontSize: 9.5, color: K.sage, letterSpacing: '0.14em' }}>
            COMPLETED · {completedLabel.toUpperCase()}
          </div>
        ) : null}
      </div>

      <Section label="Wins" hint="One per line. What landed, what worked, what you're proud of.">
        <textarea
          value={wins}
          onChange={(e) => setWins(e.target.value)}
          rows={5}
          maxLength={MAX_BULLET_LENGTH * 10}
          placeholder={`Launched the new feature\nFinally took that trip\n…`}
          style={textareaStyle}
        />
      </Section>

      <Section label="Challenges" hint="One per line. What got hard, where you stalled, what you want to name.">
        <textarea
          value={challenges}
          onChange={(e) => setChallenges(e.target.value)}
          rows={5}
          maxLength={MAX_BULLET_LENGTH * 10}
          placeholder={`Burnout in week 6\nProcrastinated on the conversation with…\n…`}
          style={textareaStyle}
        />
      </Section>

      <Section label="Pivots" hint="What you changed mid-quarter, and why.">
        <textarea
          value={pivots}
          onChange={(e) => setPivots(e.target.value)}
          rows={3}
          maxLength={MAX_TEXT_LENGTH}
          placeholder="I shifted from… because…"
          style={textareaStyle}
        />
      </Section>

      <Section label="Next quarter intentions" hint="What you're carrying forward into the next 90 days.">
        <textarea
          value={intentions}
          onChange={(e) => setIntentions(e.target.value)}
          rows={3}
          maxLength={MAX_TEXT_LENGTH}
          placeholder="I want to…"
          style={textareaStyle}
        />
      </Section>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: K.fMono, fontSize: 10, letterSpacing: '0.14em', color: status === 'error' ? K.brick : K.inkSoft }}>
          {status === 'synthesizing'
            ? 'SAVING & SYNTHESIZING…'
            : status === 'regenerating'
              ? 'REGENERATING REFLECTION…'
              : status === 'saving'
                ? 'SAVING DRAFT…'
                : status === 'saved'
                  ? 'SAVED'
                  : status === 'error' && error
                    ? error.toUpperCase()
                    : isCompleted
                      ? 'EDIT TO RE-SAVE'
                      : 'NOT YET SAVED'}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => submit({ markComplete: false })}
            disabled={busy}
            style={secondaryButtonStyle(busy)}
          >
            {isCompleted ? 'SAVE CHANGES' : 'SAVE DRAFT'}
          </button>
          {isCompleted ? (
            <button
              type="button"
              onClick={regenerate}
              disabled={busy}
              style={secondaryButtonStyle(busy)}
            >
              REGENERATE
            </button>
          ) : (
            <button
              type="button"
              onClick={() => submit({ markComplete: true })}
              disabled={busy}
              style={primaryButtonStyle(busy)}
            >
              COMPLETE REVIEW
            </button>
          )}
        </div>
      </div>

      {/* AI synthesis */}
      {status === 'synthesizing' || status === 'regenerating' ? (
        <div
          style={{
            marginTop: 8,
            padding: '20px 16px',
            border: `1px dashed ${K.line}`,
            borderRadius: 10,
            fontFamily: K.fBody,
            fontSize: 13,
            color: K.inkDim,
            lineHeight: 1.6,
            textAlign: 'center',
          }}
        >
          Reflecting on Q{quarter}… this usually takes 10–15 seconds.
        </div>
      ) : aiSummary ? (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontFamily: K.fMono, fontSize: 10, letterSpacing: '0.16em', color: K.copperHi, marginBottom: 10 }}>
            REFLECTION
          </div>
          <div
            style={{
              fontFamily: K.fSerif,
              fontSize: 15,
              color: K.ink,
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
            }}
          >
            {aiSummary}
          </div>
        </div>
      ) : null}

      {/* Stats snapshot */}
      {statsSnapshot ? (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontFamily: K.fMono, fontSize: 10, letterSpacing: '0.16em', color: K.copperHi, marginBottom: 10 }}>
            ACTIVITY THIS QUARTER
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 10,
            }}
          >
            {Object.entries(STATS_LABELS).map(([key, label]) => {
              const value = statsSnapshot[key]
              if (typeof value !== 'number') return null
              return (
                <div
                  key={key}
                  style={{
                    padding: '10px 12px',
                    background: K.bg,
                    border: `1px solid ${K.line}`,
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontFamily: K.fMono, fontSize: 9, letterSpacing: '0.14em', color: K.inkSoft }}>
                    {label.toUpperCase()}
                  </div>
                  <div style={{ fontFamily: K.fSerif, fontSize: 22, color: K.ink, marginTop: 2 }}>
                    {value}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Section({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontFamily: K.fMono, fontSize: 10, letterSpacing: '0.16em', color: K.copperHi }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontFamily: K.fBody, fontSize: 12, color: K.inkSoft, lineHeight: 1.5, marginBottom: 2 }}>
        {hint}
      </div>
      {children}
    </div>
  )
}

const textareaStyle: React.CSSProperties = {
  fontFamily: K.fBody,
  fontSize: 14,
  lineHeight: 1.55,
  color: K.ink,
  background: K.bg,
  border: `1px solid ${K.line}`,
  borderRadius: 8,
  padding: '10px 12px',
  resize: 'vertical',
  outline: 'none',
  width: '100%',
}

function primaryButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    fontFamily: K.fMono,
    fontSize: 11,
    letterSpacing: '0.16em',
    padding: '10px 18px',
    background: disabled ? K.bg2 : `linear-gradient(180deg, ${K.copper}, ${K.brick})`,
    color: disabled ? K.inkDim : K.bg,
    border: 'none',
    borderRadius: 8,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 600,
  }
}

function secondaryButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    fontFamily: K.fMono,
    fontSize: 11,
    letterSpacing: '0.16em',
    padding: '10px 14px',
    background: 'transparent',
    color: disabled ? K.inkDim : K.inkSoft,
    border: `1px solid ${K.line}`,
    borderRadius: 8,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 500,
  }
}
