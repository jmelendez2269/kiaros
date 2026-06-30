'use client'

import { useEffect, useRef, useState } from 'react'
import { Frame, K, Kicker, GLYPH } from '@/components/almanac'
import { AskOracleButton } from '@/components/oracle/AskOracleButton'
import { useStelloquy } from '@/components/oracle/StelloquyProvider'
import { buildLifeArcPrompt } from '@/lib/oracle/preseed'
import type { LifeArcData } from '@/lib/today/get-life-arc'
import type { Planet } from '@/types/blueprint'

interface Props {
  data: LifeArcData
}

const PLANET_GLYPH: Record<Planet, string> = {
  Sun: GLYPH.sun,
  Moon: GLYPH.moon,
  Mercury: GLYPH.mercury,
  Venus: GLYPH.venus,
  Mars: GLYPH.mars,
  Jupiter: GLYPH.jupiter,
  Saturn: GLYPH.saturn,
  Uranus: GLYPH.uranus,
  Neptune: GLYPH.neptune,
  Pluto: GLYPH.pluto,
}

const RARITY_TONE: Record<string, string> = {
  rare: K.copperHi,
  'once-in-lifetime': K.ember,
}

export function LifeArcRead({ data }: Props) {
  const { hasOracleAccess } = useStelloquy()
  const [read, setRead] = useState<string | null>(data.cachedRead)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>(
    data.cachedRead ? 'idle' : 'loading',
  )
  const fetchedFor = useRef<string | null>(null)

  useEffect(() => {
    if (data.cachedRead && data.cachedRead === read) {
      setRead(data.cachedRead)
      setStatus('idle')
      return
    }
    if (fetchedFor.current === data.signature) return
    fetchedFor.current = data.signature

    const controller = new AbortController()
    setStatus('loading')
    ;(async () => {
      try {
        const res = await fetch('/api/today/life-arc', {
          method: 'POST',
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(`status ${res.status}`)
        const payload = (await res.json()) as { read?: string | null }
        if (payload.read) {
          setRead(payload.read)
          setStatus('idle')
        } else {
          setStatus('error')
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setStatus('error')
      }
    })()

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.signature])

  const oraclePrompt = buildLifeArcPrompt({
    onceInLifetimeCount: data.onceInLifetimeCount,
    rareCount: data.rareCount,
    windows: data.heavy.map((h) => h.technical),
    hdType: data.hd?.type ?? null,
  })

  return (
    <Frame tone="deep" padding={24} stars>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <Kicker color={K.ember}>The era you&rsquo;re in</Kicker>
        <span
          style={{
            fontFamily: K.fMono,
            fontSize: 10.5,
            color: K.inkSoft,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          Years, not seasons
        </span>
      </div>

      <h2
        style={{
          margin: '12px 0 0',
          fontFamily: K.fSerif,
          fontStyle: 'italic',
          fontSize: 27,
          lineHeight: 1.16,
          color: K.ink,
          textWrap: 'balance',
        }}
      >
        {data.headline}.
      </h2>

      <div style={{ marginTop: 14, minHeight: 24 }}>
        {status === 'loading' && !read ? (
          <p
            style={{
              fontFamily: K.fSerif,
              fontStyle: 'italic',
              fontSize: 16,
              color: K.inkDim,
              lineHeight: 1.55,
            }}
          >
            Reading the arc&hellip;
          </p>
        ) : (
          <p
            style={{
              fontFamily: K.fBody,
              fontSize: 16,
              color: K.ink,
              lineHeight: 1.62,
              maxWidth: 720,
              whiteSpace: 'pre-wrap',
            }}
          >
            {read ?? data.fallback}
          </p>
        )}
      </div>

      <div
        style={{
          marginTop: 18,
          display: 'flex',
          flexDirection: 'column',
          borderTop: `1px solid ${K.line}`,
        }}
      >
        {data.heavy
          .filter((w) => w.rarity === 'once-in-lifetime')
          .map((w) => {
            const tone = RARITY_TONE[w.rarity] ?? K.inkSoft
            return (
              <div
                key={w.technical}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                  alignItems: 'center',
                  gap: 12,
                  padding: '9px 0',
                  borderBottom: `1px solid ${K.line}`,
                }}
              >
                <span
                  style={{
                    fontFamily: K.fSerif,
                    fontSize: 22,
                    color: tone,
                    width: 28,
                    textAlign: 'center',
                  }}
                  aria-hidden="true"
                >
                  {PLANET_GLYPH[w.planet]}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      fontFamily: K.fBody,
                      fontSize: 14.5,
                      color: K.ink,
                      lineHeight: 1.3,
                    }}
                  >
                    {w.technical}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      marginTop: 2,
                      fontFamily: K.fMono,
                      fontSize: 10.5,
                      color: tone,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {w.rarityLabel} · {w.periodLabel}
                  </span>
                </span>
                <span
                  style={{
                    fontFamily: K.fMono,
                    fontSize: 11,
                    color: K.inkDim,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {windowRemainingLabel(w.daysFromTodayToEnd)}
                </span>
              </div>
            )
          })}
      </div>

      {data.rareCount > 0 ? (
        <p
          style={{
            marginTop: 10,
            fontFamily: K.fSerif,
            fontStyle: 'italic',
            fontSize: 13.5,
            color: K.inkDim,
            lineHeight: 1.5,
          }}
        >
          Saturn is also making {data.rareCount}{' '}
          {data.rareCount === 1 ? 'contact' : 'contacts'} to your chart this
          year — a quieter, every-29-years cadence underneath the long currents
          above.
        </p>
      ) : null}

      <div style={{ marginTop: 14 }}>
        <AskOracleButton
          prompt={oraclePrompt}
          hasOracleAccess={hasOracleAccess}
          label="this era"
        />
      </div>
    </Frame>
  )
}

function windowRemainingLabel(daysToEnd: number): string {
  if (daysToEnd > 400) return '1+ yr left'
  if (daysToEnd > 60) return `~${Math.round(daysToEnd / 30)} mo left`
  if (daysToEnd > 0) return `${daysToEnd}d left`
  return 'closing'
}
