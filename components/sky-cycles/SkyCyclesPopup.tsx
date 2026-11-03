'use client'

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Frame, K, Kicker } from '@/components/almanac'

export type SkyCycleSummary = {
  id: string
  title: string
  kicker: string
  personal: boolean
}

/**
 * Compact "In the sky" strip for Today. Shows one chip per happening; the
 * full read (meaning, journal echoes, actions) opens in a popup so it doesn't
 * take over the page.
 */
export function SkyCyclesPopup({ summaries, children }: { summaries: SkyCycleSummary[]; children: ReactNode }) {
  const [openAt, setOpenAt] = useState<string | null>(null)
  const titleId = useId()
  const bodyRef = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpenAt(null), [])
  const open = openAt !== null

  useEffect(() => {
    if (!open) return
    const body = bodyRef.current
    const target = openAt ? body?.querySelector<HTMLElement>(`[data-sky-cycle="${CSS.escape(openAt)}"]`) : null
    if (target && body) body.scrollTop = target.offsetTop - 12
    body?.parentElement?.querySelector<HTMLElement>(`#${CSS.escape(titleId)}`)?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // A look-back modal opened from inside this popup handles its own Escape.
      if (document.querySelectorAll('[role="dialog"][aria-modal="true"]').length > 1) return
      close()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, openAt, close, titleId])

  return (
    <>
      <Frame tone="umber" padding={14}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Kicker color={K.stelloBlueSoft}>In the sky</Kicker>
          <button
            type="button"
            onClick={() => setOpenAt('')}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontFamily: K.fMono,
              fontSize: 11,
              letterSpacing: '0.08em',
              color: K.stelloBlueSoft,
            }}
          >
            Read all {summaries.length} →
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {summaries.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setOpenAt(s.id)}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
                padding: '7px 12px',
                borderRadius: 999,
                border: `1px solid ${s.personal ? `${K.copper}66` : `${K.stelloBlue}88`}`,
                background: s.personal ? `${K.brick}1f` : `${K.stelloBlue}1a`,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 15, color: K.ink }}>{s.title}</span>
              <span style={{ fontFamily: K.fMono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: K.inkDim }}>
                {s.kicker}
              </span>
            </button>
          ))}
        </div>
      </Frame>

      {open
        ? createPortal(
            <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', justifyContent: 'center', padding: 16 }}>
              <button
                type="button"
                aria-label="Close In the sky"
                onClick={close}
                style={{ position: 'absolute', inset: 0, background: 'rgba(10,12,20,0.82)', border: 'none', cursor: 'default' }}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                style={{
                  position: 'relative',
                  margin: 'auto',
                  width: '100%',
                  maxWidth: 720,
                  maxHeight: 'calc(100dvh - 32px)',
                  display: 'flex',
                  flexDirection: 'column',
                  background: K.bg2,
                  border: `1px solid ${K.stelloBlue}55`,
                  borderRadius: 16,
                  boxShadow: `0 20px 80px ${K.stelloBlueDeep}66`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 20px 12px',
                    borderBottom: `1px solid ${K.line}`,
                  }}
                >
                  <h2
                    id={titleId}
                    tabIndex={-1}
                    style={{
                      margin: 0,
                      fontFamily: K.fMono,
                      fontSize: 12,
                      letterSpacing: '0.22em',
                      textTransform: 'uppercase',
                      color: K.stelloBlueSoft,
                      outline: 'none',
                    }}
                  >
                    In the sky
                  </h2>
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Close"
                    style={{ background: 'none', border: 'none', color: K.inkDim, fontSize: 22, cursor: 'pointer', lineHeight: 1 }}
                  >
                    ×
                  </button>
                </div>
                <div
                  ref={bodyRef}
                  // Talking to Stelloquy or jumping to the journal should reveal
                  // what's behind the popup, so those actions close it.
                  onClickCapture={(e) => {
                    if ((e.target as HTMLElement).closest('[data-sky-close]')) close()
                  }}
                  style={{ position: 'relative', overflowY: 'auto', padding: '16px 20px 22px' }}
                >
                  {children}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
