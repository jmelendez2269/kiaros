import { BRAND } from '@/lib/brand'
import { cycleMeaning, journalHrefFor, phaseLabel } from '@/lib/sky-cycles/copy'
import type { SkyCycleStatus } from '@/lib/sky-cycles/types'
import type { RetentionEmailContent } from './templates'

function sentence(value: string): string {
  const v = value.trim()
  const capped = v.charAt(0).toUpperCase() + v.slice(1)
  return /[.!?]$/.test(capped) ? capped : `${capped}.`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Subject from the most important item: personal first, then the nearest. */
export function skyCycleEmailSubject(headsUps: SkyCycleStatus[], lookBacks: SkyCycleStatus[]): string {
  const first = headsUps[0] ?? lookBacks[0]
  const more = headsUps.length + lookBacks.length - 1
  const tail = more > 0 ? `, plus ${more} more` : ''
  if (headsUps[0]) {
    const when = phaseLabel(first)
    return `Heads up: ${first.cycle.title}, ${when.charAt(0).toLowerCase()}${when.slice(1)}${tail}`
  }
  return `${first.cycle.title} has ended. Your look back is ready${tail}`
}

export function skyCycleEmail(input: {
  displayName: string | null
  headsUps: SkyCycleStatus[]
  lookBacks: SkyCycleStatus[]
  appUrl: string
  unsubscribeUrl: string
}): RetentionEmailContent {
  const { appUrl } = input
  const greeting = input.displayName ? `${input.displayName},` : 'Hello,'
  type Block = { kicker: string; heading: string; lines: string[]; links: Array<{ label: string; href: string }> }
  const blocks: Block[] = []

  for (const s of input.headsUps) {
    blocks.push({
      kicker: `${phaseLabel(s)}${s.cycle.scope === 'personal' ? ' · your chart' : ''}`,
      heading: s.cycle.title,
      lines: [sentence(s.cycle.subtitle), cycleMeaning(s.cycle)],
      links: [
        { label: 'See it on Today', href: `${appUrl}/today` },
        { label: 'Write about it', href: `${appUrl}${journalHrefFor(s)}` },
      ],
    })
  }
  for (const s of input.lookBacks) {
    blocks.push({
      kicker: `Look back${s.cycle.scope === 'personal' ? ' · your chart' : ''}`,
      heading: `${s.cycle.title} has ended`,
      lines: [
        sentence(s.cycle.subtitle),
        'Your look back is ready: the sky, your plans, and what you wrote while it was happening.',
      ],
      links: [{ label: 'Read the look back', href: `${appUrl}/reviews` }],
    })
  }

  const intro =
    input.headsUps.length > 0
      ? `A note from the sky, so you can move with it rather than be surprised by it.`
      : `A cycle just closed. A good moment to look back.`
  const outro = `No preparation is required. Rest counts too. You can turn these notes off any time from ${BRAND.product}.`

  const text = [
    greeting,
    intro,
    ...blocks.map((b) => [`${b.kicker.toUpperCase()}: ${b.heading}`, ...b.lines, ...b.links.map((l) => `${l.label}: ${l.href}`)].join('\n')),
    outro,
  ].join('\n\n') + `\n\n—\nTurn off sky cycle emails: ${input.unsubscribeUrl}`

  const blockHtml = blocks
    .map(
      (b) => `<div style="margin:0 0 26px;padding-left:14px;border-left:2px solid #bba3f3;">
        <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#8a8378;">${escapeHtml(b.kicker)}</p>
        <p style="margin:0 0 8px;font-size:19px;font-style:italic;">${escapeHtml(b.heading)}</p>
        ${b.lines.map((l) => `<p style="margin:0 0 8px;color:#cfc8bd;">${escapeHtml(l)}</p>`).join('')}
        <p style="margin:10px 0 0;font-family:Arial,sans-serif;font-size:13px;">${b.links
          .map((l) => `<a href="${escapeHtml(l.href)}" style="color:#c7b3f5;">${escapeHtml(l.label)}</a>`)
          .join(' &nbsp;·&nbsp; ')}</p>
      </div>`,
    )
    .join('\n')

  const html = `<!doctype html>
<html>
  <body style="background:#12100e;color:#e8e2d8;font-family:Georgia,'Times New Roman',serif;padding:32px 20px;">
    <div style="max-width:520px;margin:0 auto;">
      <p style="margin:0 0 18px;">${escapeHtml(greeting)}</p>
      <p style="margin:0 0 24px;">${escapeHtml(intro)}</p>
      ${blockHtml}
      <p style="margin:0 0 18px;color:#cfc8bd;">${escapeHtml(outro)}</p>
      <p style="margin:32px 0 0;padding-top:16px;border-top:1px solid #3a352e;font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#8a8378;">
        <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#8a8378;">Turn off sky cycle emails</a>
      </p>
    </div>
  </body>
</html>`

  return { subject: skyCycleEmailSubject(input.headsUps, input.lookBacks), text, html }
}
