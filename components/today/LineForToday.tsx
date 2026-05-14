'use client'

import Link from 'next/link'
import { K, Kicker } from '@/components/almanac'

interface Props {
  /** Optional streak count to show in the eyebrow. */
  streak?: number
}

/**
 * Quick-line composer placeholder. The "real" path is the full JournalComposer
 * on /journal — this is the daily prompt that nudges the user into that flow
 * from Today. Phase 1.B leaves it as a styled link; a later pass can inline
 * the composer here if we want save-without-leaving-Today.
 */
export function LineForToday({ streak }: Props) {
  return (
    <div
      style={{
        background: K.bg3,
        border: `1px solid ${K.brick}55`,
        borderRadius: 16,
        padding: 20,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Kicker color={K.brickHi}>A line for today</Kicker>
        {typeof streak === 'number' && streak > 0 ? (
          <span
            style={{
              fontFamily: K.fMono,
              fontSize: 9,
              color: K.inkSoft,
              letterSpacing: '0.14em',
            }}
          >
            {streak}-DAY STREAK
          </span>
        ) : null}
      </div>
      <div
        style={{
          fontFamily: K.fSerif,
          fontStyle: 'italic',
          fontSize: 19,
          color: K.ink,
          marginTop: 8,
          lineHeight: 1.25,
        }}
      >
        What did the day try to teach me?
      </div>
      <div
        style={{
          marginTop: 12,
          background: K.bg,
          border: `1px solid ${K.line}`,
          borderRadius: 10,
          padding: 14,
          fontFamily: K.fSerif,
          fontSize: 14,
          color: K.inkDim,
          fontStyle: 'italic',
          lineHeight: 1.6,
          minHeight: 100,
        }}
      >
        <span style={{ color: K.copperHi }}>|</span> Write a sentence. Tomorrow Stelloquy will fold
        it into the pattern.
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 6 }}>
          {['body', 'craft', 'love'].map((t) => (
            <span
              key={t}
              style={{
                fontFamily: K.fMono,
                fontSize: 9.5,
                color: K.copperHi,
                border: `1px solid ${K.copper}55`,
                borderRadius: 999,
                padding: '3px 9px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              {t}
            </span>
          ))}
        </div>
        <Link
          href="/journal"
          style={{
            fontFamily: K.fBody,
            fontSize: 12,
            color: K.bg,
            background: K.copperHi,
            border: 'none',
            borderRadius: 8,
            padding: '8px 16px',
            fontWeight: 500,
            letterSpacing: '0.02em',
            textDecoration: 'none',
          }}
        >
          Open the journal →
        </Link>
      </div>
    </div>
  )
}
