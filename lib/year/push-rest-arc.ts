import type { BlueprintOutput, PeriodRange } from '@/types/blueprint'
import type { ArcKind, ArcPeriod } from '@/components/year/PushRestRibbon'

/**
 * Convert push/rest period date ranges into normalized arc segments
 * with 0..100 percent-of-year bounds. Used as the fallback shown in the
 * Month tab "Year's pulse" ribbon when blueprints.push_rest_arc is NULL.
 *
 * Authored arcs (when present) take precedence and may include 'edit'
 * segments; derived arcs are always push|rest.
 */

function daysInYear(year: number): number {
  return ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 366 : 365
}

function dayOfYear(iso: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return null
  const y = Number(match[1])
  const m = Number(match[2]) - 1
  const d = Number(match[3])
  const date = new Date(Date.UTC(y, m, d))
  const start = new Date(Date.UTC(y, 0, 1))
  const diff = Math.floor((date.getTime() - start.getTime()) / 86_400_000)
  return diff + 1
}

function clampPct(value: number): number {
  if (value < 0) return 0
  if (value > 100) return 100
  return value
}

function shortLabel(kind: ArcKind, reason: string): string {
  const prefix = kind === 'push' ? 'PUSH' : kind === 'rest' ? 'REST' : 'EDIT'
  const trimmed = reason.replace(/\s+/g, ' ').trim()
  if (!trimmed) return prefix
  const truncated = trimmed.length > 36 ? `${trimmed.slice(0, 35)}…` : trimmed
  return `${prefix} · ${truncated}`
}

function periodToArc(kind: ArcKind, period: PeriodRange, planYear: number, total: number): ArcPeriod | null {
  const startDay = dayOfYear(period.startDate)
  const endDay = dayOfYear(period.endDate)
  if (startDay === null || endDay === null) return null
  if (endDay < startDay) return null
  const startPct = clampPct(((startDay - 1) / total) * 100)
  const endPct = clampPct((endDay / total) * 100)
  if (endPct <= startPct) return null
  void planYear
  return { kind, startPct, endPct, label: shortLabel(kind, period.reason) }
}

export function derivePushRestArc(blueprint: BlueprintOutput, planYear: number): ArcPeriod[] {
  const total = daysInYear(planYear)
  const segments: ArcPeriod[] = []
  for (const p of blueprint.pushPeriods) {
    const seg = periodToArc('push', p, planYear, total)
    if (seg) segments.push(seg)
  }
  for (const p of blueprint.restPeriods) {
    const seg = periodToArc('rest', p, planYear, total)
    if (seg) segments.push(seg)
  }
  segments.sort((a, b) => a.startPct - b.startPct)
  return segments
}

export function sanitizePushRestArc(value: unknown): ArcPeriod[] | null {
  if (!Array.isArray(value)) return null
  const out: ArcPeriod[] = []
  for (const item of value) {
    if (typeof item !== 'object' || item === null) continue
    const obj = item as Record<string, unknown>
    const kind = obj.kind === 'push' || obj.kind === 'rest' || obj.kind === 'edit' ? obj.kind : null
    const startPct = typeof obj.startPct === 'number' ? obj.startPct : null
    const endPct = typeof obj.endPct === 'number' ? obj.endPct : null
    const label = typeof obj.label === 'string' ? obj.label : ''
    if (!kind || startPct === null || endPct === null) continue
    if (endPct <= startPct) continue
    out.push({
      kind: kind as ArcKind,
      startPct: clampPct(startPct),
      endPct: clampPct(endPct),
      label,
    })
  }
  out.sort((a, b) => a.startPct - b.startPct)
  return out.length > 0 ? out : null
}
