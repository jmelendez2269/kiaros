/**
 * Layout and wording for the Mind map star chart. Pure: no React, no server
 * imports, so it is unit-testable.
 */

export type TopicKind = 'theme' | 'natal_aspect' | 'transit_aspect' | 'hd_element' | 'mood'

export interface ChartNode { id: string; kind: TopicKind; label: string; count: number; sampleCaptureIds?: string[]; months?: Array<{ month: string; count: number }> }
export interface ChartEdge { source: string; target: string; weight: number }
export interface PlacedStar extends ChartNode { x: number; y: number; magnitude: 1 | 2 | 3 }

export const KIND_META: Record<TopicKind, { label: string; plural: string; color: string }> = {
  theme: { label: 'Theme', plural: 'Themes', color: '#a98aef' },
  natal_aspect: { label: 'Natal aspect', plural: 'Natal aspects', color: '#c1dcef' },
  transit_aspect: { label: 'Transit aspect', plural: 'Transit aspects', color: '#6798cb' },
  hd_element: { label: 'Human Design', plural: 'Human Design', color: '#b08cdc' },
  mood: { label: 'Mood', plural: 'Moods', color: '#df9b3f' },
}

/** The four outer kinds and the middle of their sector, in degrees (0 is east, clockwise). */
export const SECTORS: Array<[Exclude<TopicKind, 'theme'>, number]> = [
  ['natal_aspect', -135], ['transit_aspect', -45], ['hd_element', 45], ['mood', 135],
]

/** 1 is brightest: in 10 or more captures; 2: five to nine; 3: fewer. */
export function magnitude(count: number): 1 | 2 | 3 {
  return count >= 10 ? 1 : count >= 5 ? 2 : 3
}

const rad = (deg: number) => (deg * Math.PI) / 180

/**
 * Themes go in the inner disc, spread by the golden angle so they never line
 * up; each outer kind fans across its own sector, brighter stars nearer the
 * centre. Caps keep the chart readable.
 */
export function layoutStarChart(
  nodes: ChartNode[],
  opts: { cx: number; cy: number; radius: number; maxThemes?: number; maxPerKind?: number },
): PlacedStar[] {
  const { cx, cy, radius, maxThemes = 8, maxPerKind = 7 } = opts
  const byCount = [...nodes].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
  const out: PlacedStar[] = []
  byCount.filter(n => n.kind === 'theme').slice(0, maxThemes).forEach((n, i) => {
    const angle = -150 + i * 137.508
    const r = i === 0 ? radius * 0.18 : radius * (0.26 + ((i * 0.37) % 1) * 0.34)
    out.push({ ...n, x: cx + Math.cos(rad(angle)) * r, y: cy + Math.sin(rad(angle)) * r, magnitude: magnitude(n.count) })
  })
  for (const [kind, centre] of SECTORS) {
    const list = byCount.filter(n => n.kind === kind).slice(0, maxPerKind)
    list.forEach((n, i) => {
      const spread = list.length === 1 ? 0 : -30 + (60 / (list.length - 1)) * i
      const r = radius * (0.8 - Math.min(n.count, 12) * 0.012 + (i % 2) * 0.05)
      out.push({ ...n, x: cx + Math.cos(rad(centre + spread)) * r, y: cy + Math.sin(rad(centre + spread)) * r, magnitude: magnitude(n.count) })
    })
  }
  return out
}

/** A node's strongest connections, heaviest first. */
export function linesFrom(id: string, edges: ChartEdge[], visible: Set<string>, limit = 5): Array<{ other: string; weight: number }> {
  return edges
    .filter(e => (e.source === id || e.target === id) && visible.has(e.source === id ? e.target : e.source))
    .map(e => ({ other: e.source === id ? e.target : e.source, weight: e.weight }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit)
}

/**
 * A plain, factual line about the selected star: how often it comes up and
 * what it most often travels with. No interpretation; that belongs in
 * Stelloquy, where the member can push back.
 */
export function describeStar(star: ChartNode, rank: number, captureCount: number, companions: string[]): string {
  const how = star.kind === 'theme' && rank === 0
    ? `${star.label} is the theme you return to most, in ${star.count} of your ${captureCount} saved conversations.`
    : `${star.label} came up in ${star.count} of your ${captureCount} saved conversations.`
  if (!companions.length) return how
  const withWhat = companions.length === 1 ? companions[0] : `${companions.slice(0, -1).join(', ')} and ${companions.at(-1)}`
  return `${how} It most often comes up alongside ${withWhat}.`
}

/** The start date (YYYY-MM-DD) for a time range, or null for all time. */
export function rangeStart(range: '30d' | 'quarter' | 'year', today: string): string | null {
  const d = new Date(today + 'T12:00:00Z')
  if (range === '30d') { d.setUTCDate(d.getUTCDate() - 29); return d.toISOString().slice(0, 10) }
  if (range === 'quarter') return `${today.slice(0, 4)}-${String(Math.floor(d.getUTCMonth() / 3) * 3 + 1).padStart(2, '0')}-01`
  return `${today.slice(0, 4)}-01-01`
}

/** "Oct 2026" for a YYYY-MM month. */
export function monthLabel(month: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-15T12:00:00Z`))
}

/** That month on the Reviews timeline. */
export function monthReviewHref(month: string): string {
  return `/reviews?year=${month.slice(0, 4)}&month=${Number(month.slice(5, 7))}`
}
