import 'server-only'

import { K } from '@/components/almanac'
import { cycleMeaning, journalHrefFor, phaseKicker, phaseLabel, stelloquyPromptFor } from '@/lib/sky-cycles/copy'
import { loadSkyCycleEmailSetting, loadTodaySkyCycles, type SkyCycleItem } from '@/lib/sky-cycles/load'
import { SkyCycleEmailToggle } from './SkyCycleEmailToggle'
import { SkyCycleActions } from './SkyCycleActions'
import { SkyCyclesPopup, type SkyCycleSummary } from './SkyCyclesPopup'

function echoLines(item: SkyCycleItem): string[] {
  const { echo, phase } = item
  const lines: string[] = []
  if (echo.patternSummary) {
    lines.push(`What your journal has shown before: ${echo.patternSummary}`)
  }
  if (echo.previous) {
    if (echo.previousEntryCount > 0) {
      const n = echo.previousEntryCount
      const latest = echo.previousEntryTitle ? `, most recently "${echo.previousEntryTitle}"` : ''
      lines.push(`Last time (${echo.previous.label}) you wrote ${n} ${n === 1 ? 'entry' : 'entries'}${latest}.`)
    } else {
      lines.push(`Last time was ${echo.previous.label}. Nothing in your journal from then yet.`)
    }
  }
  if (phase !== 'upcoming' && echo.entriesThisTime > 0) {
    const n = echo.entriesThisTime
    lines.push(
      phase === 'active'
        ? `You've written ${n} ${n === 1 ? 'entry' : 'entries'} during this one so far.`
        : `You wrote ${n} ${n === 1 ? 'entry' : 'entries'} during it.`,
    )
  }
  return lines
}

/**
 * Today: sky happenings with a heads-up before, a check-in during, and a look
 * back after. Renders as a compact strip; the full read opens in a popup.
 * Optional, so any failure renders nothing rather than breaking Today.
 */
export async function SkyCyclesTodayCard({ profileId, todayDate }: { profileId: string; todayDate: string }) {
  let items: SkyCycleItem[]
  let emailsOn: boolean | null = null
  try {
    ;[items, emailsOn] = await Promise.all([
      loadTodaySkyCycles(profileId, todayDate),
      loadSkyCycleEmailSetting(profileId),
    ])
  } catch (error) {
    console.error('[today] sky cycles unavailable:', error)
    return null
  }
  if (items.length === 0) return null

  const summaries: SkyCycleSummary[] = items.map((item) => ({
    id: item.cycle.id,
    title: item.cycle.title,
    kicker: phaseLabel(item),
    personal: item.cycle.scope === 'personal',
  }))

  return (
    <SkyCyclesPopup summaries={summaries}>
      <div style={{ display: 'grid', gap: 22 }}>
        {items.map((item) => (
          <section
            key={item.cycle.id}
            data-sky-cycle={item.cycle.id}
            style={{ borderLeft: `2px solid ${item.cycle.scope === 'personal' ? K.copper : K.stelloBlue}`, paddingLeft: 14 }}
          >
            <div style={{ fontFamily: K.fMono, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: K.inkDim }}>
              {phaseKicker(item)} · {phaseLabel(item)}
              {item.cycle.scope === 'personal' ? ' · your chart' : ''}
            </div>
            <h3 style={{ margin: '6px 0 0', fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 22, color: K.ink, lineHeight: 1.2 }}>
              {item.cycle.title}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: K.inkDim }}>{item.cycle.subtitle}</p>
            <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.6, color: K.ink }}>{cycleMeaning(item.cycle)}</p>
            {echoLines(item).map((line) => (
              <p key={line} style={{ margin: '8px 0 0', fontSize: 13.5, lineHeight: 1.6, color: K.inkDim }}>
                {line}
              </p>
            ))}
            <SkyCycleActions
              phase={item.phase}
              stelloquyPrompt={stelloquyPromptFor(item)}
              journalHref={journalHrefFor(item)}
              cycleId={item.cycle.id}
              title={item.cycle.title}
              subtitle={item.cycle.subtitle}
            />
          </section>
        ))}
      </div>
      {emailsOn === false ? <SkyCycleEmailToggle initialEnabled={false} /> : null}
    </SkyCyclesPopup>
  )
}
