'use client'

import { useEffect, useRef, useState } from 'react'
import { Frame, K, Kicker, GLYPH } from '@/components/almanac'
import { AskOracleButton } from '@/components/oracle/AskOracleButton'
import { useStelloquy } from '@/components/oracle/StelloquyProvider'
import type { JupiterSeasonData } from '@/lib/today/get-jupiter-season'

interface Props {
  data: JupiterSeasonData
}

const ASPECT_GLYPH: Record<string, string> = {
  conjunction: GLYPH.conjunction,
  opposition: GLYPH.opposition,
  square: GLYPH.square,
  trine: GLYPH.trine,
  sextile: GLYPH.sextile,
}

export function JupiterSeason({ data }: Props) {
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
        const res = await fetch('/api/today/jupiter-season', {
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

  const oraclePrompt = `I'm in Jupiter in ${data.sign} season${data.isRetrograde ? ' (retrograde)' : ''}. ${data.activeAspects.length > 0 ? `Active aspects: ${data.activeAspects.slice(0, 2).map((a) => a.technical).join(', ')}.` : ''} What does this season want from me?`

  return (
    <Frame tone="umber" padding={24}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <Kicker color={K.copper}>The season you&rsquo;re in</Kicker>
        <span
          style={{
            fontFamily: K.fMono,
            fontSize: 10.5,
            color: K.inkSoft,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          Changes with Jupiter · ~once a year
        </span>
      </div>

      <div style={{ marginTop: 12, display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span
          style={{
            fontFamily: K.fSerif,
            fontSize: 32,
            color: K.copper,
            lineHeight: 1,
          }}
          aria-hidden="true"
        >
          {GLYPH.jupiter}
        </span>
        <h2
          style={{
            margin: 0,
            fontFamily: K.fSerif,
            fontStyle: 'italic',
            fontSize: 25,
            lineHeight: 1.18,
            color: K.ink,
          }}
        >
          Jupiter in {data.sign}
          {data.isRetrograde ? (
            <span
              style={{
                marginLeft: 8,
                fontFamily: K.fMono,
                fontSize: 10,
                fontStyle: 'normal',
                color: K.inkSoft,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                verticalAlign: 'middle',
              }}
            >
              Rx
            </span>
          ) : null}
        </h2>
      </div>

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
            Reading the season&hellip;
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
            {read ?? `Jupiter is moving through ${data.sign}, setting the broad theme of growth and opportunity for this chapter of your year.`}
          </p>
        )}
      </div>

      {data.activeAspects.length > 0 && (
        <div
          style={{
            marginTop: 14,
            display: 'flex',
            flexDirection: 'column',
            borderTop: `1px solid ${K.line}`,
            paddingTop: 10,
          }}
        >
          <span
            style={{
              fontFamily: K.fMono,
              fontSize: 10,
              color: K.inkSoft,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            Jupiter touching your chart
          </span>
          {data.activeAspects.slice(0, 3).map((a, i) => (
            <div
              key={`${a.aspect}-${a.natalPlanet}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '5px 0',
                borderTop: i === 0 ? 'none' : `1px solid ${K.line}`,
              }}
            >
              <span
                style={{
                  fontFamily: K.fSerif,
                  fontSize: 16,
                  color: K.copper,
                  width: 40,
                  letterSpacing: '0.1em',
                  whiteSpace: 'nowrap',
                }}
              >
                {GLYPH.jupiter} {ASPECT_GLYPH[a.aspect] ?? a.aspect}
              </span>
              <span
                style={{
                  fontFamily: K.fBody,
                  fontSize: 13.5,
                  color: K.ink,
                  flex: 1,
                }}
              >
                {a.technical}
              </span>
              <span
                style={{
                  fontFamily: K.fMono,
                  fontSize: 11,
                  color: K.inkDim,
                  whiteSpace: 'nowrap',
                }}
              >
                {a.orb.toFixed(1)}° {a.applying ? '↓' : '↑'}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <AskOracleButton
          prompt={oraclePrompt}
          hasOracleAccess={hasOracleAccess}
          label="this Jupiter season"
        />
      </div>
    </Frame>
  )
}
