'use client'

import { useEffect, useRef, useState } from 'react'
import { K, Kicker } from '@/components/almanac'

interface MonthBriefPanelProps {
  year: number
  month: number          // 1–12
  monthName: string
  initialBrief?: string
  initialGeneratedAt?: string
  initialEditedAt?: string
  initialPinned?: boolean
}

type Status = 'idle' | 'loading' | 'ready' | 'error'

interface ApiResult {
  briefText: string
  modelUsed: string
  generatedAt: string
  editedAt?: string | null
  fromCache: boolean
  pinned: boolean
}

const MAX_BRIEF_TEXT_LENGTH = 4000

export function MonthBriefPanel({
  year,
  month,
  monthName,
  initialBrief,
  initialGeneratedAt,
  initialEditedAt,
  initialPinned = false,
}: MonthBriefPanelProps) {
  const [brief, setBrief] = useState<string | null>(initialBrief ?? null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(initialGeneratedAt ?? null)
  const [editedAt, setEditedAt] = useState<string | null>(initialEditedAt ?? null)
  const [pinned, setPinned] = useState<boolean>(initialPinned)
  const [pinBusy, setPinBusy] = useState<boolean>(false)
  const [status, setStatus] = useState<Status>(initialBrief ? 'ready' : 'idle')
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<boolean>(false)
  const [draft, setDraft] = useState<string>('')
  const [editBusy, setEditBusy] = useState<boolean>(false)
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
      setEditedAt(regen ? null : (data.editedAt ?? null))
      setPinned(Boolean(data.pinned))
      setStatus('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load brief')
      setStatus('error')
    } finally {
      inFlight.current = false
    }
  }

  function startEditing() {
    if (!brief) return
    setDraft(brief)
    setEditing(true)
    setError(null)
  }

  function cancelEditing() {
    setEditing(false)
    setDraft('')
  }

  async function saveEdit() {
    const trimmed = draft.trim()
    if (!trimmed) {
      setError('Brief text cannot be empty')
      return
    }
    if (trimmed.length > MAX_BRIEF_TEXT_LENGTH) {
      setError(`Brief text exceeds ${MAX_BRIEF_TEXT_LENGTH} characters`)
      return
    }
    setEditBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/month-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month, text: trimmed }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `Save failed (${res.status})`)
      }
      const data = (await res.json()) as ApiResult
      setBrief(data.briefText)
      setGeneratedAt(data.generatedAt)
      setEditedAt(data.editedAt ?? new Date().toISOString())
      setPinned(Boolean(data.pinned))
      setEditing(false)
      setDraft('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setEditBusy(false)
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

  const stampDate = editedAt ?? generatedAt
  const stampLabel = stampDate
    ? new Date(stampDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null
  const stampPrefix = editedAt ? 'EDITED' : 'GENERATED'
  const stampColor = editedAt ? K.copperHi : K.inkSoft

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
          {stampLabel && status === 'ready' && !editing ? (
            <span style={{ fontFamily: K.fMono, fontSize: 10, color: stampColor, letterSpacing: '0.14em' }}>
              {stampPrefix} {stampLabel.toUpperCase()}
            </span>
          ) : null}
          {status === 'ready' && brief && !editing ? (
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
          {status === 'ready' && brief && !editing ? (
            <button
              type="button"
              onClick={startEditing}
              aria-label="Edit this brief in your own words"
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
              EDIT
            </button>
          ) : null}
          {status === 'ready' && !pinned && !editing ? (
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

        {status === 'ready' && brief && !editing ? <BriefProse text={brief} /> : null}

        {status === 'ready' && editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={MAX_BRIEF_TEXT_LENGTH}
              disabled={editBusy}
              aria-label={`Edit ${monthName} brief`}
              autoFocus
              rows={12}
              style={{
                width: '100%',
                minHeight: 240,
                fontFamily: K.fSerif,
                fontSize: 16,
                color: K.ink,
                lineHeight: 1.7,
                background: K.bg,
                border: `1px solid ${K.line}`,
                borderRadius: 8,
                padding: '14px 16px',
                resize: 'vertical',
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontFamily: K.fMono, fontSize: 10, color: K.inkSoft, letterSpacing: '0.14em' }}>
                {draft.trim().length}/{MAX_BRIEF_TEXT_LENGTH}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={editBusy}
                  style={{
                    fontFamily: K.fMono,
                    fontSize: 10,
                    letterSpacing: '0.14em',
                    color: K.inkSoft,
                    background: 'transparent',
                    border: `1px solid ${K.line}`,
                    borderRadius: 6,
                    padding: '6px 12px',
                    cursor: editBusy ? 'wait' : 'pointer',
                    opacity: editBusy ? 0.6 : 1,
                  }}
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={editBusy || !draft.trim()}
                  style={{
                    fontFamily: K.fMono,
                    fontSize: 10,
                    letterSpacing: '0.14em',
                    color: K.ink,
                    background: `${K.copperHi}22`,
                    border: `1px solid ${K.copperHi}`,
                    borderRadius: 6,
                    padding: '6px 14px',
                    cursor: editBusy || !draft.trim() ? 'not-allowed' : 'pointer',
                    opacity: editBusy ? 0.6 : 1,
                  }}
                >
                  {editBusy ? 'SAVING…' : 'SAVE'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
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
