'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { K, Kicker, Frame } from '@/components/almanac'
import type { AspectType, Planet, ZodiacSign } from '@/types/blueprint'
import type { PlanetKey, SkyNowAspect, SkyNowData } from '@/lib/today/get-sky-now'

const TRANSIT_PLANET_KEYS: PlanetKey[] = [
  'sun', 'moon', 'mercury', 'venus', 'mars',
  'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
]

const KEY_TO_DISPLAY: Record<PlanetKey, Planet> = {
  sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars',
  jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto',
}
const DISPLAY_TO_KEY = Object.fromEntries(
  Object.entries(KEY_TO_DISPLAY).map(([k, v]) => [v, k as PlanetKey]),
) as Record<Planet, PlanetKey>

const PLANET_GLYPH: Record<Planet, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
}

const ZODIAC_GLYPHS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓']
const ZODIAC_NAMES: ZodiacSign[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]
const SIGN_ELEMENT = ['fire', 'earth', 'air', 'water', 'fire', 'earth', 'air', 'water', 'fire', 'earth', 'air', 'water'] as const

const ELEMENT_TINT: Record<typeof SIGN_ELEMENT[number], { fill: string; line: string }> = {
  fire:  { fill: 'rgba(223, 155, 63, 0.10)',  line: 'rgba(223, 155, 63, 0.26)' },
  earth: { fill: 'rgba(176, 140, 220, 0.08)', line: 'rgba(176, 140, 220, 0.22)' },
  air:   { fill: 'rgba(103, 152, 203, 0.08)', line: 'rgba(103, 152, 203, 0.22)' },
  water: { fill: 'rgba(169, 138, 239, 0.10)', line: 'rgba(169, 138, 239, 0.26)' },
}

const PLANET_COLOR: Record<Planet, string> = {
  Sun: '#df9b3f', Moon: '#c1dcef', Mercury: '#a8d8dc', Venus: '#c7b3f5', Mars: '#d86a66',
  Jupiter: '#df9b3f', Saturn: '#6798cb', Uranus: '#7fb8dc', Neptune: '#7fbcaa', Pluto: '#b08cdc',
}

const ASPECT_STYLE: Record<AspectType, { color: string; dash: number[]; glow: number; label: string }> = {
  conjunction: { color: '#e3e2ed', dash: [],      glow: 12, label: 'Conjunction' },
  opposition:  { color: '#d86a66', dash: [12, 6], glow: 10, label: 'Opposition' },
  square:      { color: '#df9b3f', dash: [4, 5],  glow: 8,  label: 'Square' },
  trine:       { color: '#7fbcaa', dash: [18, 5], glow: 10, label: 'Trine' },
  sextile:     { color: '#7fb8dc', dash: [7, 5],  glow: 8,  label: 'Sextile' },
}

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
}

interface Star { x: number; y: number; size: number; base: number; speed: number; off: number }

interface Props {
  data: SkyNowData
}

/**
 * Animated canvas wheel showing today's transits over the user's natal chart.
 * Hover a planet to isolate its aspect lines; a follow tooltip names the
 * position and the active aspects from that point. Port of the older
 * SkyPortrait, retokenized to Kiaros' Obsidian palette and slimmed for the
 * /today right-column slot.
 */
export function SkyNow({ data }: Props) {
  const { transit, natal, retrogradePlanets, aspects } = data
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<{ kind: 'transit' | 'natal'; planet: Planet } | null>(null)

  const transitPlanetsWithAspects = useMemo(() => new Set(aspects.map((a) => a.planet)), [aspects])
  const natalPlanetsWithAspects = useMemo(() => new Set(aspects.map((a) => a.natalPlanet)), [aspects])

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    const tooltip = tooltipRef.current
    if (!canvas || !wrap || !tooltip) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let t0: number | null = null
    let stars: Star[] = []
    let S = 0, cx = 0, cy = 0, dpr = 1
    let Ro = 0, Ri = 0, Rt = 0, Rn = 0, Pt = 0, Pn = 0

    const resize = () => {
      const w = wrap.clientWidth
      const sz = Math.min(w, 520)
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      S = sz
      canvas.style.width = S + 'px'
      canvas.style.height = S + 'px'
      canvas.width = S * dpr
      canvas.height = S * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cx = cy = S / 2
      Ro = S * 0.455
      Ri = S * 0.375
      Rt = S * 0.295
      Rn = S * 0.19
      Pt = S * 0.0245
      Pn = S * 0.017
      initStars()
    }

    const initStars = () => {
      stars = []
      const n = 160
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2
        const zone = Math.random()
        let r: number
        if (zone < 0.4) r = Math.random() * Rn * 0.75
        else if (zone < 0.65) r = Ro * 1.02 + Math.random() * (S * 0.5 - Ro * 1.02)
        else r = Math.random() * S * 0.5
        stars.push({
          x: cx + r * Math.cos(a),
          y: cy + r * Math.sin(a),
          size: 0.25 + Math.random() * 1.0,
          base: 0.12 + Math.random() * 0.4,
          speed: 0.4 + Math.random() * 1.5,
          off: Math.random() * Math.PI * 2,
        })
      }
    }

    const lonXY = (lon: number, r: number) => {
      const a = (lon - 90) * Math.PI / 180
      return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
    }

    const getHighlight = (planet: Planet, isTransit: boolean): boolean => {
      if (!hover) return true
      if (isTransit) {
        if (hover.kind === 'transit' && hover.planet === planet) return true
        if (hover.kind === 'natal') return aspects.some((a) => a.planet === planet && a.natalPlanet === hover.planet)
        return false
      }
      if (hover.kind === 'natal' && hover.planet === planet) return true
      if (hover.kind === 'transit') return aspects.some((a) => a.natalPlanet === planet && a.planet === hover.planet)
      return false
    }

    const drawBg = () => {
      const bg = ctx.createRadialGradient(cx, cy * 0.6, 0, cx, cy * 0.6, S * 0.55)
      bg.addColorStop(0, '#181a2a')
      bg.addColorStop(1, '#0a0c14')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, S, S)
    }

    const drawStars = (t: number) => {
      for (const s of stars) {
        const op = s.base + Math.sin(t * s.speed + s.off) * 0.13
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(227, 226, 237, ${Math.max(0, op)})`
        ctx.fill()
      }
    }

    const drawZodiac = () => {
      ctx.beginPath(); ctx.arc(cx, cy, Ro, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(227, 226, 237, 0.10)'; ctx.lineWidth = 1; ctx.stroke()
      ctx.beginPath(); ctx.arc(cx, cy, Ri, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(227, 226, 237, 0.10)'; ctx.lineWidth = 1; ctx.stroke()

      for (let i = 0; i < 12; i++) {
        const sa = (i * 30 - 90) * Math.PI / 180
        const ea = ((i + 1) * 30 - 90) * Math.PI / 180
        const tint = ELEMENT_TINT[SIGN_ELEMENT[i]]

        ctx.beginPath()
        ctx.arc(cx, cy, Ro, sa, ea)
        ctx.arc(cx, cy, Ri, ea, sa, true)
        ctx.closePath()
        ctx.fillStyle = tint.fill
        ctx.fill()

        ctx.beginPath()
        ctx.moveTo(cx + Ri * Math.cos(sa), cy + Ri * Math.sin(sa))
        ctx.lineTo(cx + Ro * Math.cos(sa), cy + Ro * Math.sin(sa))
        ctx.strokeStyle = tint.line; ctx.lineWidth = 0.8; ctx.stroke()

        const ma = (i * 30 + 15 - 90) * Math.PI / 180
        const mr = (Ro + Ri) / 2
        ctx.font = `${Math.max(11, S * 0.022)}px serif`
        ctx.fillStyle = 'rgba(199, 179, 245, 0.7)'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(ZODIAC_GLYPHS[i], cx + mr * Math.cos(ma), cy + mr * Math.sin(ma))
      }

      for (let d = 0; d < 360; d += 5) {
        if (d % 30 === 0) continue
        const a = (d - 90) * Math.PI / 180
        const maj = d % 10 === 0
        const tl = maj ? S * 0.012 : S * 0.006
        ctx.beginPath()
        ctx.moveTo(cx + Ro * Math.cos(a), cy + Ro * Math.sin(a))
        ctx.lineTo(cx + (Ro - tl) * Math.cos(a), cy + (Ro - tl) * Math.sin(a))
        ctx.strokeStyle = maj ? 'rgba(227, 226, 237, 0.16)' : 'rgba(227, 226, 237, 0.07)'
        ctx.lineWidth = maj ? 0.7 : 0.35
        ctx.stroke()
      }
    }

    const drawGuides = () => {
      ctx.setLineDash([3, 6])
      ctx.beginPath(); ctx.arc(cx, cy, Rt, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(193, 220, 239, 0.16)'; ctx.lineWidth = 0.6; ctx.stroke()
      ctx.setLineDash([2, 5])
      ctx.beginPath(); ctx.arc(cx, cy, Rn, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(199, 179, 245, 0.22)'; ctx.lineWidth = 0.6; ctx.stroke()
      ctx.setLineDash([])
    }

    const drawAspects = (t: number) => {
      const dashOff = (t * 14) % 100
      const anyHover = hover !== null
      for (const a of aspects) {
        const tp = lonXY(transit[DISPLAY_TO_KEY[a.planet]], Rt)
        const np = lonXY(natal[DISPLAY_TO_KEY[a.natalPlanet]], Rn)
        const style = ASPECT_STYLE[a.aspect]
        const [r, g, b] = hexToRgb(style.color)

        const isLit = !anyHover
          || (hover?.kind === 'transit' && hover.planet === a.planet)
          || (hover?.kind === 'natal' && hover.planet === a.natalPlanet)

        const baseA = Math.max(0.1, 0.55 - a.orb * 0.07)
        const alpha = anyHover ? (isLit ? Math.min(0.95, baseA * 1.6) : 0.04) : baseA
        const lw = isLit ? 1.6 : 0.5

        ctx.save()
        ctx.beginPath()
        ctx.moveTo(tp.x, tp.y)
        ctx.lineTo(np.x, np.y)
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
        ctx.lineWidth = lw
        if (style.dash.length) {
          ctx.setLineDash(style.dash)
          ctx.lineDashOffset = -dashOff
        }
        if (isLit) {
          ctx.shadowBlur = style.glow * (anyHover ? 1.5 : 1)
          ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.55)`
        }
        ctx.stroke()
        ctx.shadowBlur = 0
        ctx.setLineDash([])
        ctx.lineDashOffset = 0
        ctx.restore()
      }
    }

    const drawNatalPlanet = (planet: Planet, lon: number, lit: boolean) => {
      const p = lonXY(lon, Rn)
      const r = Pn
      const [rc, gc, bc] = hexToRgb(PLANET_COLOR[planet])
      const hasA = natalPlanetsWithAspects.has(planet)
      const dim = hover !== null && !lit
      const alpha = dim ? 0.18 : (hasA ? 0.92 : 0.42)

      ctx.save()
      ctx.translate(p.x, p.y)

      // diamond
      ctx.beginPath()
      ctx.moveTo(0, -r * 1.35)
      ctx.lineTo(r * 0.95, 0)
      ctx.lineTo(0, r * 1.1)
      ctx.lineTo(-r * 0.95, 0)
      ctx.closePath()
      ctx.fillStyle = `rgba(${rc}, ${gc}, ${bc}, ${alpha * 0.18})`
      ctx.fill()

      if (lit && hasA) {
        ctx.shadowBlur = 10
        ctx.shadowColor = `rgba(199, 179, 245, 0.55)`
      }
      ctx.strokeStyle = `rgba(199, 179, 245, ${alpha * 0.9})`
      ctx.lineWidth = 1.3
      ctx.stroke()
      ctx.shadowBlur = 0

      ctx.font = `${Math.max(8, r * 0.88)}px serif`
      ctx.fillStyle = `rgba(199, 179, 245, ${alpha})`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(PLANET_GLYPH[planet], 0, 0)

      ctx.restore()
    }

    const drawTransitPlanet = (planet: Planet, lon: number, lit: boolean, isRx: boolean, t: number) => {
      const p = lonXY(lon, Rt)
      const r = Pt
      const [rc, gc, bc] = hexToRgb(PLANET_COLOR[planet])
      const hasA = transitPlanetsWithAspects.has(planet)
      const dim = hover !== null && !lit
      const alpha = dim ? 0.22 : (hasA ? 1 : 0.58)
      const pulse = (hasA && !dim) ? 1 + 0.08 * Math.sin(t * 1.6 + lon * 0.05) : 1

      ctx.save()
      ctx.translate(p.x, p.y)

      if (!dim && hasA) {
        const cr = r * 2.3 * pulse
        const cg = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, cr)
        cg.addColorStop(0, `rgba(${rc}, ${gc}, ${bc}, 0.32)`)
        cg.addColorStop(1, `rgba(${rc}, ${gc}, ${bc}, 0)`)
        ctx.beginPath()
        ctx.arc(0, 0, cr, 0, Math.PI * 2)
        ctx.fillStyle = cg
        ctx.fill()
      }

      const og = ctx.createRadialGradient(-r * 0.32, -r * 0.32, 0, 0, 0, r)
      og.addColorStop(0, `rgba(255, 245, 230, ${0.88 * alpha})`)
      og.addColorStop(0.45, `rgba(${rc}, ${gc}, ${bc}, ${alpha})`)
      og.addColorStop(1, `rgba(${Math.floor(rc * 0.38)}, ${Math.floor(gc * 0.38)}, ${Math.floor(bc * 0.38)}, ${alpha})`)
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      ctx.fillStyle = og
      if (lit && hasA) {
        ctx.shadowBlur = 18
        ctx.shadowColor = `rgba(${rc}, ${gc}, ${bc}, 0.75)`
      }
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.strokeStyle = `rgba(255, 245, 230, ${0.32 * alpha})`
      ctx.lineWidth = 0.5
      ctx.stroke()

      ctx.font = `${Math.max(10, r * 0.92)}px serif`
      ctx.fillStyle = `rgba(255, 245, 230, ${0.95 * alpha})`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(PLANET_GLYPH[planet], 0, 0)

      if (isRx) {
        ctx.font = `bold ${Math.max(6, r * 0.55)}px monospace`
        ctx.fillStyle = `rgba(176, 140, 220, ${0.9 * alpha})`
        ctx.fillText('℞', r * 0.8, -r * 0.8)
      }

      ctx.restore()
    }

    const drawCenter = () => {
      const cr = S * 0.038
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr * 1.6)
      cg.addColorStop(0, 'rgba(176, 140, 220, 0.18)')
      cg.addColorStop(1, 'rgba(176, 140, 220, 0)')
      ctx.beginPath()
      ctx.arc(cx, cy, cr * 1.6, 0, Math.PI * 2)
      ctx.fillStyle = cg
      ctx.fill()
      ctx.beginPath()
      ctx.arc(cx, cy, cr, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(176, 140, 220, 0.28)'
      ctx.lineWidth = 0.7
      ctx.stroke()
    }

    const draw = (ts: number) => {
      if (t0 === null) t0 = ts
      const t = (ts - t0) / 1000

      ctx.clearRect(0, 0, S, S)
      drawBg()
      drawStars(t)
      drawZodiac()
      drawGuides()
      drawAspects(t)

      for (const key of TRANSIT_PLANET_KEYS) {
        const planet = KEY_TO_DISPLAY[key]
        drawNatalPlanet(planet, natal[key], getHighlight(planet, false))
      }
      for (const key of TRANSIT_PLANET_KEYS) {
        const planet = KEY_TO_DISPLAY[key]
        drawTransitPlanet(planet, transit[key], getHighlight(planet, true), retrogradePlanets.includes(planet), t)
      }

      drawCenter()
      raf = requestAnimationFrame(draw)
    }

    const showTooltip = (target: typeof hover, clientX: number, clientY: number) => {
      if (!target || !tooltip) {
        if (tooltip) tooltip.style.display = 'none'
        return
      }
      const planet = target.planet
      const lon = target.kind === 'transit'
        ? transit[DISPLAY_TO_KEY[planet]]
        : natal[DISPLAY_TO_KEY[planet]]
      const signIdx = Math.floor(lon / 30) % 12
      const degInSign = lon - signIdx * 30
      const sign = ZODIAC_NAMES[signIdx]
      const isRx = target.kind === 'transit' && retrogradePlanets.includes(planet)
      const related: SkyNowAspect[] = aspects.filter((a) =>
        target.kind === 'transit' ? a.planet === planet : a.natalPlanet === planet,
      )

      const kindLabel = target.kind === 'natal' ? 'Natal ' : ''
      const sourceLabel = target.kind === 'transit' ? 'Current sky' : 'Birth chart'

      let html = `
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
          <span style="font-size:18px;line-height:1;color:${PLANET_COLOR[planet]}">${PLANET_GLYPH[planet]}</span>
          <span style="font-family:${K.fSerif};font-style:italic;font-size:13px;color:${K.ink}">${kindLabel}${planet}</span>
        </div>
        <div style="font-family:${K.fMono};font-size:10px;color:${K.inkDim};letter-spacing:0.06em;margin-bottom:6px;">
          ${degInSign.toFixed(1)}° ${sign}${isRx ? ' ℞' : ''} · ${sourceLabel}
        </div>
      `
      if (related.length > 0) {
        html += `<div style="display:flex;flex-direction:column;gap:3px;">`
        for (const a of related) {
          const style = ASPECT_STYLE[a.aspect]
          const other = target.kind === 'transit' ? a.natalPlanet : a.planet
          const otherLabel = target.kind === 'transit' ? `natal ${other}` : other
          html += `<div style="font-family:${K.fMono};font-size:10px;display:flex;align-items:center;gap:6px;color:${style.color}"><span>${style.label}</span><span style="opacity:0.6">→</span><span>${PLANET_GLYPH[other]} ${otherLabel}</span><span style="opacity:0.55">${a.orb.toFixed(1)}°</span></div>`
        }
        html += `</div>`
      }
      tooltip.innerHTML = html
      tooltip.style.display = 'block'

      const tw = 230
      const th = tooltip.offsetHeight
      const lx = clientX + 14 + tw > window.innerWidth ? clientX - tw - 14 : clientX + 14
      const ly = clientY - 8 + th > window.innerHeight ? clientY - th - 8 : clientY - 8
      tooltip.style.left = lx + 'px'
      tooltip.style.top = ly + 'px'
    }

    const handleMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      let found: { kind: 'transit' | 'natal'; planet: Planet } | null = null

      for (const key of TRANSIT_PLANET_KEYS) {
        const p = lonXY(transit[key], Rt)
        if (Math.hypot(mx - p.x, my - p.y) < Pt * 2.8) {
          found = { kind: 'transit', planet: KEY_TO_DISPLAY[key] }
          break
        }
      }
      if (!found) {
        for (const key of TRANSIT_PLANET_KEYS) {
          const p = lonXY(natal[key], Rn)
          if (Math.hypot(mx - p.x, my - p.y) < Pn * 2.8) {
            found = { kind: 'natal', planet: KEY_TO_DISPLAY[key] }
            break
          }
        }
      }

      setHover((prev) => {
        if (prev === found) return prev
        if (prev && found && prev.kind === found.kind && prev.planet === found.planet) return prev
        return found
      })
      showTooltip(found, e.clientX, e.clientY)
    }
    const handleLeave = () => {
      setHover(null)
      if (tooltip) tooltip.style.display = 'none'
    }

    resize()
    raf = requestAnimationFrame(draw)
    canvas.addEventListener('mousemove', handleMove)
    canvas.addEventListener('mouseleave', handleLeave)
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    return () => {
      cancelAnimationFrame(raf)
      canvas.removeEventListener('mousemove', handleMove)
      canvas.removeEventListener('mouseleave', handleLeave)
      ro.disconnect()
    }
  }, [aspects, transit, natal, retrogradePlanets, hover, transitPlanetsWithAspects, natalPlanetsWithAspects])

  return (
    <Frame tone="cocoa" padding={20} stars>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <Kicker color={K.copper}>Sky now</Kicker>
        <span
          style={{
            fontFamily: K.fMono,
            fontSize: 10.5,
            color: K.inkSoft,
            letterSpacing: '0.14em',
          }}
        >
          NATAL · TRANSIT
        </span>
      </div>

      <div ref={wrapRef} style={{ display: 'flex', justifyContent: 'center' }}>
        <canvas ref={canvasRef} style={{ display: 'block', cursor: 'crosshair', borderRadius: 12 }} />
      </div>

      <div
        style={{
          marginTop: 10,
          fontFamily: K.fBody,
          fontSize: 12.5,
          color: K.inkSoft,
          textAlign: 'center',
          lineHeight: 1.5,
        }}
      >
        Hover any planet to isolate its aspects.
      </div>

      <div
        ref={tooltipRef}
        style={{
          position: 'fixed',
          zIndex: 200,
          display: 'none',
          maxWidth: 230,
          borderRadius: 10,
          border: `1px solid ${K.copper}55`,
          background: 'rgba(17, 19, 30, 0.96)',
          backdropFilter: 'blur(6px)',
          padding: '10px 12px',
          color: K.ink,
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 6,
          marginTop: 12,
          paddingTop: 10,
          borderTop: `1px solid ${K.line}`,
        }}
      >
        {(['conjunction', 'opposition', 'square', 'trine', 'sextile'] as AspectType[]).map((k) => {
          const s = ASPECT_STYLE[k]
          return (
            <div
              key={k}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontFamily: K.fMono,
                fontSize: 10,
                color: K.inkDim,
                letterSpacing: '0.08em',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 16,
                  height: 0,
                  borderTop: `1.5px ${s.dash.length ? 'dashed' : 'solid'} ${s.color}`,
                  flexShrink: 0,
                }}
              />
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</span>
            </div>
          )
        })}
      </div>
    </Frame>
  )
}
