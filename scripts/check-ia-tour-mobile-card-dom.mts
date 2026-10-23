/**
 * Headless DOM check: IA tour calendar step card at 390×844 must not clip body
 * text under the progress dots, and must keep ≥12px gap from the spotlight.
 */

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'
import { buildTourSteps } from '../lib/tour/build-tour-steps.ts'
import {
  pickVerticalCardPlacement,
  shouldConstrainTourCardContent,
} from '../lib/tour/tour-card-vertical-placement.ts'
import {
  enforceCardTopMinSpotGap,
  TOUR_CARD_SPOT_MIN_GAP_PX,
  TOUR_SPOTLIGHT_BORDER_PX,
  verticalGapBetweenSpotAndCard,
} from '../lib/tour/tour-spotlight-gap.ts'
import { IA_TOUR_VIEWPORT_MARGIN_PX } from '../lib/tour/tour-placement.ts'

const root = dirname(fileURLToPath(import.meta.url))
const calendarBody = buildTourSteps({
  calendarDay: true,
  journal: true,
  goals: true,
  overlays: true,
}).find((s) => s.id === 'calendar')!.body

const K = {
  bg2: '#11131e',
  copper: '#a98aef',
  copperHi: '#c7b3f5',
  line: 'rgba(227, 226, 237, 0.10)',
  ink: '#e3e2ed',
  inkDim: '#a4a3b1',
  inkSoft: '#6e6d7c',
  fMono: 'ui-monospace, monospace',
  fSerif: 'Georgia, "Iowan Old Style", serif',
  fBody: 'system-ui, sans-serif',
}

function tourCardHtml(body: string, showBack: boolean): string {
  const backButton = showBack
    ? `<button type="button" style="min-width:5.5rem;padding:8px 12px;border:1px solid ${K.line};background:transparent;color:${K.inkDim};font-family:${K.fBody};font-size:13.5px;border-radius:10px;">Back</button>`
    : ''
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><style>*{box-sizing:border-box;}body{margin:0;background:#0a0c14;}</style></head>
<body>
  <div id="spotlight" style="position:fixed;left:12px;top:108px;width:366px;height:64px;border:${TOUR_SPOTLIGHT_BORDER_PX}px solid ${K.copper};border-radius:12px;box-sizing:border-box;pointer-events:none;"></div>
  <div id="card" style="position:fixed;left:16px;top:200px;display:flex;flex-direction:column;overflow:visible;background:${K.bg2};border:1px solid ${K.copper}55;border-radius:18px;width:358px;height:auto;">
    <div id="scroll" style="flex-shrink:0;padding:22px 22px 12px;">
      <div style="font-family:${K.fMono};font-size:10.5px;letter-spacing:0.22em;text-transform:uppercase;color:${K.copper};margin-bottom:10px;">2 / 6</div>
      <div style="font-family:${K.fSerif};font-style:italic;font-size:23px;color:${K.ink};line-height:1.15;margin-bottom:10px;">Calendar</div>
      <p id="body-text" style="font-family:${K.fBody};font-size:13.5px;color:${K.inkDim};line-height:1.65;margin:0;">${body}</p>
    </div>
    <div id="footer" style="flex-shrink:0;padding:0 22px 16px;">
      <div id="dots" style="display:flex;gap:5px;margin-bottom:14px;padding-top:4px;">
        <div style="height:5px;width:6px;border-radius:3px;background:${K.copper};"></div>
        <div style="height:5px;width:22px;border-radius:3px;background:${K.copperHi};"></div>
      </div>
      <button type="button" style="margin-bottom:12px;font-family:${K.fBody};font-size:13.5px;color:${K.copperHi};text-decoration:underline;background:transparent;border:0;padding:0;text-align:left;">Open Calendar →</button>
      <div style="display:flex;gap:8px;">
        ${backButton}
        <button type="button" style="flex:1;padding:8px 14px;border:1px solid ${K.copper}88;background:${K.copper}1e;color:${K.ink};font-family:${K.fBody};font-size:13.5px;border-radius:10px;">Next →</button>
      </div>
      <button type="button" style="margin-top:12px;width:100%;border:0;background:transparent;font-family:${K.fMono};font-size:10.5px;letter-spacing:0.14em;text-transform:uppercase;color:${K.inkSoft};padding:4px 0;">Skip tour</button>
    </div>
  </div>
</body></html>`
}

const chromeCandidates = [
  process.env.CHROME_PATH,
  process.env.PUPPETEER_EXECUTABLE_PATH,
  '/usr/local/bin/google-chrome',
  '/usr/bin/google-chrome',
].filter((p): p is string => Boolean(p))

const chromePath = chromeCandidates.find((p) => existsSync(p))

console.log('IA tour mobile card DOM (390×844, calendar step)')

if (!chromePath) {
  console.log('⊘ Skipping IA tour mobile card DOM check (no Chrome/Chromium found)')
  process.exit(0)
}

const spot = { left: 12, top: 108, width: 366, height: 64 }
const viewportHeight = 844

const browser = await puppeteer.launch({
  headless: true,
  executablePath: chromePath,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
})

for (const showBack of [false, true]) {
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: viewportHeight, deviceScaleFactor: 1 })
  await page.setContent(tourCardHtml(calendarBody, showBack), { waitUntil: 'networkidle0' })
  await page.evaluate(() => document.fonts.ready)

  const natural = await page.evaluate(() => {
    const card = document.getElementById('card') as HTMLElement
    const footer = document.getElementById('footer') as HTMLElement
    return { total: card.offsetHeight, footer: footer.offsetHeight }
  })

  const placement = pickVerticalCardPlacement(spot, viewportHeight, natural.total)
  let top = enforceCardTopMinSpotGap({
    spot,
    cardTop: placement.top,
    cardHeight: natural.total,
    viewportHeight,
  })
  const belowBudget = viewportHeight - IA_TOUR_VIEWPORT_MARGIN_PX - top
  const maxHeight = Math.max(56, belowBudget)
  const constrained = shouldConstrainTourCardContent(natural.total, maxHeight)

  await page.evaluate(
    ({ top, maxHeight, footerH, constrained, naturalTotal }) => {
      const card = document.getElementById('card') as HTMLElement
      const scroll = document.getElementById('scroll') as HTMLElement
      card.style.top = `${top}px`
      card.style.maxHeight = ''
      scroll.style.maxHeight = ''
      scroll.style.overflowY = 'visible'
      if (constrained) {
        card.style.maxHeight = `${maxHeight}px`
        scroll.style.maxHeight = `${Math.max(56, maxHeight - footerH)}px`
        scroll.style.overflowY = 'auto'
      }
      void naturalTotal
    },
    {
      top,
      maxHeight,
      footerH: natural.footer,
      constrained,
      naturalTotal: natural.total,
    },
  )

  if (constrained) {
    const cardHeight = await page.evaluate(() => (document.getElementById('card') as HTMLElement).offsetHeight)
    top = enforceCardTopMinSpotGap({
      spot,
      cardTop: top,
      cardHeight,
      viewportHeight,
    })
    await page.evaluate((nextTop) => {
      const card = document.getElementById('card') as HTMLElement
      card.style.top = `${nextTop}px`
    }, top)
  }

  const metrics = await page.evaluate(() => {
    const card = document.getElementById('card') as HTMLElement
    const bodyText = document.getElementById('body-text') as HTMLElement
    const dots = document.getElementById('dots') as HTMLElement
    const bodyRect = bodyText.getBoundingClientRect()
    const dotsRect = dots.getBoundingClientRect()
    return {
      cardHeight: card.offsetHeight,
      cardTop: card.getBoundingClientRect().top,
      bodyScrollHeight: bodyText.scrollHeight,
      bodyClientHeight: bodyText.clientHeight,
      gap: dotsRect.top - bodyRect.bottom,
      textNotUnderDots: dotsRect.top >= bodyRect.bottom - 1,
      bodyFits: bodyText.scrollHeight <= bodyText.clientHeight + 2,
    }
  })

  const spotGap = verticalGapBetweenSpotAndCard(spot, top, metrics.cardHeight)

  assert.ok(
    metrics.textNotUnderDots,
    `dots overlap body (gap=${metrics.gap}px, back=${showBack})`,
  )
  assert.ok(
    metrics.bodyFits,
    `body clipped (scroll=${metrics.bodyScrollHeight} client=${metrics.bodyClientHeight}, back=${showBack})`,
  )
  assert.ok(
    spotGap >= TOUR_CARD_SPOT_MIN_GAP_PX - 0.5,
    `spot-card gap ${spotGap}px < ${TOUR_CARD_SPOT_MIN_GAP_PX} (back=${showBack}, top=${top})`,
  )
  assert.ok(metrics.cardHeight >= 260, `card too short (${metrics.cardHeight}px)`)

  await page.close()
}

await browser.close()

const iaTourSource = readFileSync(join(root, '../components/tour/TourOverlayIa.tsx'), 'utf8')
assert.ok(iaTourSource.includes('applyMeasuredMobileTourCardLayout'))
assert.ok(iaTourSource.includes('TOUR_CARD_SPOT_MIN_GAP_PX'))
assert.ok(iaTourSource.includes('scrollTourTargetClearanceBelow'))

console.log('✓ Mobile calendar card DOM layout OK (with and without Back)')
