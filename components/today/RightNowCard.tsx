'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { K, Kicker } from '@/components/almanac'
import type { EnergyWindow } from '@/lib/planetary/energy-windows'
import type { EnergyType } from '@/types/blueprint'

interface Props {
  windows: EnergyWindow[]
}

const ENERGY_TONE: Record<EnergyType, string> = {
  push: K.copper,
  initiate: K.ember,
  reflect: K.plum,
  rest: K.sage,
}

const ENERGY_WORD: Record<EnergyType, string> = {
  push: 'active',
  initiate: 'opening',
  reflect: 'reflective',
  rest: 'resting',
}

function nowMinutes(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

function formatClock(): string {
  return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function RightNowCard({ windows }: Props) {
  // Computed client-side only, after mount — reading Date.now() during SSR
  // would produce a different value at hydration and trigger a mismatch.
  const [minute, setMinute] = useState<number | null>(null)
  const [clock, setClock] = useState<string | null>(null)

  useEffect(() => {
    const update = () => {
      setMinute(nowMinutes())
      setClock(formatClock())
    }
    update()
    const id = setInterval(update, 30_000)
    return () => clearInterval(id)
  }, [])

  const current = minute !== null ? windows.find((w) => minute >= w.startMinute && minute < w.endMinute) : null
  const tone = current ? ENERGY_TONE[current.energyType] : K.inkSoft

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <Kicker>Right now</Kicker>
        <Link
          href="/planner"
          style={{
            fontFamily: K.fMono,
            fontSize: 10.5,
            color: K.inkSoft,
            letterSpacing: '0.14em',
            textDecoration: 'none',
          }}
        >
          OPEN PLANNER →
        </Link>
      </div>

      {minute === null ? (
        <div style={{ height: 62 }} />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: tone,
              boxShadow: `0 0 12px ${tone}88`,
              flexShrink: 0,
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 27, color: K.ink, lineHeight: 1 }}>
                {clock}
              </span>
              {current && (
                <span
                  style={{
                    fontFamily: K.fBody,
                    fontSize: 14,
                    color: tone,
                    fontStyle: 'italic',
                  }}
                >
                  {current.label.toLowerCase()} · {ENERGY_WORD[current.energyType]}
                </span>
              )}
            </div>
            {current?.reason && (
              <div
                style={{
                  marginTop: 4,
                  fontFamily: K.fBody,
                  fontSize: 12.5,
                  color: K.inkSoft,
                  fontStyle: 'italic',
                }}
              >
                {current.reason}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
