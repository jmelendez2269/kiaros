'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { StoryFrame } from '@/lib/reflections/story'

const INK = '#e3e2ed', DIM = '#a4a3b1', VIOLET_HI = '#c7b3f5', EMBER = '#df9b3f'
const SERIF = 'var(--font-almanac-serif), "EB Garamond", Georgia, serif'
const MONO = 'var(--font-almanac-mono), "IBM Plex Mono", ui-monospace, monospace'
const STEP_MS = 6500

function Stars({ seed, count }: { seed: number; count: number }) {
  let h = seed
  const rand = () => ((h = (h * 16807) % 2147483647) / 2147483647)
  return (
    <svg aria-hidden viewBox="0 0 220 440" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full">
      {Array.from({ length: count }, (_, i) => <circle key={i} cx={rand() * 220} cy={rand() * 440} r={rand() * 0.9 + 0.25} fill={INK} opacity={rand() * 0.45 + 0.1} />)}
    </svg>
  )
}

function FrameCard({ frame, index, total, large, onShare, active }: { frame: StoryFrame; index: number; total: number; large?: boolean; onShare?: () => void; active?: number }) {
  const opening = frame.key === 'year'
  const background = opening ? 'linear-gradient(170deg,#2a1f5c 0%,#1a1640 45%,#11131e 100%)' : frame.key === 'carry' || frame.key === 'yours' ? 'linear-gradient(180deg,#11131e,#21243a)' : '#11131e'
  return (
    <article className="relative flex h-full flex-col justify-between overflow-hidden rounded-[18px] p-5 sm:p-6"
      style={{ background, border: '1px solid rgba(227,226,237,0.10)', minHeight: large ? 480 : 420 }}>
      <Stars seed={index * 31 + 7} count={opening ? 70 : 40} />
      {opening ? (
        <svg aria-hidden viewBox="0 0 340 440" preserveAspectRatio="xMidYMax slice" className="pointer-events-none absolute inset-0 h-full w-full">
          <circle cx={250} cy={110} r={40} fill={VIOLET_HI} opacity={0.12} />
          <circle cx={250} cy={110} r={22} fill={VIOLET_HI} opacity={0.85} />
          <path d="M0 440 L0 360 L60 320 L110 345 L170 300 L240 340 L300 315 L340 330 L340 440 Z" fill="#080a11" opacity={0.85} />
        </svg>
      ) : null}
      <div className="relative">
        {active !== undefined ? (
          <div className="mb-4 flex gap-1" aria-hidden>
            {Array.from({ length: total }, (_, i) => <i key={i} className="h-0.5 flex-1 rounded" style={{ background: i <= active ? INK : '#e3e2ed44' }} />)}
          </div>
        ) : null}
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#e3e2edcc' }}>{index + 1} / {total} · {frame.kicker}</div>
      </div>
      <div className="relative">
        {frame.meta ? <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: EMBER, marginBottom: 10 }}>{frame.meta}</div> : null}
        <div style={{
          fontFamily: SERIF, fontStyle: 'italic', fontWeight: 500, lineHeight: frame.numeric ? 1 : 1.12, color: frame.numeric ? VIOLET_HI : INK,
          fontSize: frame.numeric ? (large ? 112 : 84) : large ? 38 : frame.big.length > 90 ? 22 : frame.big.length > 50 ? 26 : 30,
        }}>{frame.big}</div>
        {frame.small ? <p style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.55, color: opening ? INK : DIM, maxWidth: 320 }}>{frame.small}</p> : null}
        {frame.key === 'carry' && onShare ? (
          <button type="button" onClick={onShare} className="mt-4 text-sm underline underline-offset-4" style={{ color: VIOLET_HI }}>Share a moment →</button>
        ) : null}
      </div>
    </article>
  )
}

/**
 * The opening of Yearly Unwrapped: up to five frames from the year report,
 * shown side by side, or played one at a time full screen.
 */
export function UnwrappedStory({ frames, title, lede, reportAnchor, reportLabel = 'the report', onShare }: {
  frames: StoryFrame[]
  title: string
  lede: string
  reportAnchor: string
  reportLabel?: string
  onShare: () => void
}) {
  const [playing, setPlaying] = useState<number | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const returnRef = useRef<HTMLButtonElement>(null)
  const total = frames.length

  const close = useCallback(() => { setPlaying(null); returnRef.current?.focus() }, [])
  const step = useCallback((delta: number) => setPlaying(p => (p === null ? p : p + delta >= total ? null : Math.max(0, p + delta))), [total])

  useEffect(() => {
    if (playing === null) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); step(1) }
      else if (e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = reduced ? null : window.setTimeout(() => step(1), STEP_MS)
    return () => { window.removeEventListener('keydown', onKey); if (timer) window.clearTimeout(timer) }
  }, [playing, step, close])

  if (!total) return null
  return (
    <section aria-label={`${title}: the story in ${total} frames`} className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[.24em] text-amber-200/70">Your lived year</p>
          <h2 className="mt-2 font-display text-4xl italic">{title}</h2>
          <p className="mt-2 leading-relaxed text-bone-muted">{lede}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a href={`#${reportAnchor}`} className="rounded-full border border-white/20 px-4 py-2 text-sm hover:bg-white/10">Skip to {reportLabel} ↓</a>
          <button ref={returnRef} type="button" onClick={() => setPlaying(0)} className="rounded-full px-4 py-2 text-sm" style={{ background: '#704bd2', color: INK }}>Play the story</button>
        </div>
      </div>
      <ol className="-mx-5 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-5 pb-2 sm:mx-0 sm:px-0 lg:grid lg:overflow-visible"
        style={{ listStyle: 'none', gridTemplateColumns: `1.35fr repeat(${Math.max(0, total - 1)}, minmax(0, 1fr))` }}>
        {frames.map((f, i) => (
          <li key={f.key} className="w-[78%] shrink-0 snap-start sm:w-[44%] lg:w-auto">
            <FrameCard frame={f} index={i} total={total} onShare={onShare} />
          </li>
        ))}
      </ol>

      {playing !== null ? (
        <div role="dialog" aria-modal="true" aria-label={`${title}, frame ${playing + 1} of ${total}`} className="fixed inset-0 z-[90] flex items-center justify-center p-4" style={{ background: 'rgba(8,10,17,0.94)' }}>
          <div className="grid w-full max-w-[440px] gap-3">
            <div style={{ aspectRatio: '9 / 15' }}>
              <FrameCard frame={frames[playing]} index={playing} total={total} large active={playing} onShare={() => { close(); onShare() }} />
            </div>
            <div className="flex justify-between gap-3">
              <button type="button" onClick={() => step(-1)} disabled={playing === 0} className="rounded-full border border-white/20 px-4 py-2 text-sm disabled:opacity-40" style={{ color: INK }}>← Back</button>
              <button type="button" onClick={() => step(1)} className="rounded-full px-5 py-2 text-sm" style={{ background: '#704bd2', color: INK }}>{playing === total - 1 ? 'Finish' : 'Next →'}</button>
            </div>
          </div>
          <button ref={closeRef} type="button" onClick={close} className="absolute right-4 top-4 rounded-full border border-white/20 px-4 py-2 text-sm" style={{ color: INK }}>Close</button>
        </div>
      ) : null}
    </section>
  )
}
