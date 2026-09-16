import type { Evidence, Analysis } from './report-schema'
import type { ReflectionPeriod } from './periods'
const themes = [
  ['rest', 'Rest and space', /\b(rest|rested|sleep|slept|quiet|break|pause)\b/i],
  ['connection', 'Connection', /\b(friend|family|partner|together|conversation|connected)\b/i],
  ['creativity', 'Making and discovering', /\b(writ(e|ing)|creat(e|ive|ivity)|paint|music|learn(ed|ing)?)\b/i],
  ['boundaries', 'Boundaries and choices', /\b(boundar(y|ies)|said no|saying no|choice|decid(e|ed))\b/i],
  ['change', 'Change and transitions', /\b(change|changed|transition|new job|moved|started|ended)\b/i],
] as const
export function analyzePeriod(input: Evidence[], period: ReflectionPeriod): Analysis {
  const byId = new Map<string, Evidence>(), seenText = new Set<string>()
  for (const item of [...input].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))) {
    if (item.date < period.start || item.date >= period.end || byId.has(item.id)) continue
    const normalized = item.text.toLowerCase().replace(/\s+/g, ' ').trim()
    // Identical copies are one observation even when saved to several surfaces.
    if (normalized && seenText.has(normalized)) continue
    if (normalized) seenText.add(normalized)
    byId.set(item.id, item)
  }
  const evidence = [...byId.values()]
  const lived = evidence.filter(e => e.authored && !['task', 'goal_event', 'intention'].includes(e.kind))
  const days = [...new Set(lived.map(e => e.date))]
  const counts: Record<string, number> = {}
  for (const e of evidence) counts[e.kind] = (counts[e.kind] ?? 0) + 1
  const patterns = themes.map(([key, label, regex]) => {
    const matches = lived.filter(e => regex.test(e.text))
    const dates = [...new Set(matches.map(e => e.date))].sort()
    return { key, label, sources: matches.map(e => e.id), distinctDays: dates.length,
      recurring: dates.length >= 3 && Date.parse(dates[dates.length - 1]) - Date.parse(dates[0]) >= 7 * 86400000 }
  }).filter(p => p.sources.length > 0)
  const monthKeys = new Set<string>()
  for (let date = new Date(period.start + 'T00:00:00Z'); date.toISOString().slice(0, 10) < period.end; date.setUTCMonth(date.getUTCMonth() + 1)) monthKeys.add(date.toISOString().slice(0, 7))
  return { evidence, observedDays: days.length, totalDays: Math.round((Date.parse(period.end) - Date.parse(period.start)) / 86400000), counts, patterns,
    months: [...monthKeys].map(month => ({ month, days: days.filter(d => d.startsWith(month)).length })) }
}
// Evenly spaced selection preserves the whole period instead of favoring recent records.
export function sampleEvidence(evidence: Evidence[], limit = 90): Evidence[] {
  if (evidence.length <= limit) return evidence
  return Array.from({ length: limit }, (_, i) => evidence[Math.floor(i * (evidence.length - 1) / (limit - 1))])
}
