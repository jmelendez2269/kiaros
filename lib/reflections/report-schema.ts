import { z } from 'zod'
import type { ReflectionPeriod } from './periods'
export const evidenceSchema = z.object({
  id: z.string(), kind: z.enum(['journal', 'log', 'capture', 'review', 'session', 'task', 'goal_event', 'intention']),
  date: z.string(), recordedAt: z.string(), title: z.string(), text: z.string(),
  goalId: z.string().nullable(), authored: z.boolean(),
})
export type Evidence = z.infer<typeof evidenceSchema>
const passage = z.object({ text: z.string().min(1).max(3000), sources: z.array(z.string()).min(1).max(90) })
export const reportSchema = z.object({
  opening: passage,
  moments: z.array(passage).max(3),
  observations: z.array(passage.extend({
    key: z.string().min(1).max(80),
    kind: z.enum(['observation', 'recurrence', 'possible_connection', 'change']),
    contradictingSources: z.array(z.string()).max(90),
  })).max(3),
  rhythms: passage.nullable(),
  turningPoints: passage.nullable(),
  discoveries: passage.nullable(),
  goalThread: passage.extend({ goalIds: z.array(z.string()).min(1).max(2) }).nullable(),
  lookingAhead: z.object({ focus: passage, experiments: z.array(passage).max(3) }),
  letter: passage.nullable(),
})
export type ReflectionContent = z.infer<typeof reportSchema>
export interface Analysis {
  evidence: Evidence[]
  observedDays: number
  totalDays: number
  counts: Record<string, number>
  patterns: { key: string; label: string; sources: string[]; distinctDays: number; recurring: boolean }[]
  months: { month: string; days: number }[]
}
export interface SavedReport {
  id: string; kind: ReflectionPeriod['kind']; period_start: string; period_end: string; timezone: string
  status: 'generating' | 'ready' | 'empty' | 'stale' | 'failed'
  content: ReflectionContent | null; analysis: Omit<Analysis, 'evidence'> | null
  generated_at: string | null; sources: Evidence[]; revision: number
}
export const preferencesSchema = z.object({
  timezone: z.string().nullable(), automatic: z.boolean(), include_goals: z.boolean(),
  evidence_revision: z.number(), seen_at: z.string().nullable(),
})
export type Preferences = z.infer<typeof preferencesSchema>
export const feedbackSchema = z.object({
  report_id: z.string().uuid(), claim_key: z.string().min(1).max(80),
  verdict: z.enum(['confirmed', 'corrected', 'dismissed']), note: z.string().max(1000),
})
export type Feedback = z.infer<typeof feedbackSchema>
export interface Intention { id: string; report_id: string; text: string; outcome: string | null; created_at: string; updated_at: string }
export const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length
export function validateReport(content: ReflectionContent, evidence: Evidence[], period: ReflectionPeriod, goalIds: string[], blockedKeys: string[]): ReflectionContent {
  if (period.kind !== 'year') { content.letter = null; content.rhythms = null; content.turningPoints = null; content.discoveries = null }
  const allowed = new Set(evidence.map(e => e.id))
  const passages = [content.opening, ...content.moments, ...content.observations, content.rhythms,
    content.turningPoints, content.discoveries, content.goalThread, content.lookingAhead.focus,
    ...content.lookingAhead.experiments, content.letter].filter((p): p is NonNullable<typeof p> => p !== null)
  for (const p of passages) if (p.sources.some(id => !allowed.has(id))) throw new Error('Report referenced unavailable evidence')
  if (content.observations.some(o => o.contradictingSources.some(id => !allowed.has(id)))) throw new Error('Invalid contradictory evidence')
  content.observations = content.observations.filter(o => !blockedKeys.includes(o.key))
  for (const o of content.observations) {
    const entries = evidence.filter(e => o.sources.includes(e.id) && e.authored)
    const days = [...new Set(entries.map(e => e.date))].sort()
    if (o.kind === 'recurrence' && (days.length < 3 || Date.parse(days[days.length - 1]) - Date.parse(days[0]) < 7 * 86400000)) {
      o.kind = 'observation'
    }
  }
  if (content.goalThread) {
    const goal = content.goalThread
    const relevant = goal.goalIds.every(id => goalIds.includes(id) && evidence.some(e => e.goalId === id && goal.sources.includes(e.id)))
    const nonGoalWords = passages.filter(p => p !== goal).reduce((sum, p) => sum + words(p.text), 0)
    if (!relevant || words(goal.text) > 60 || words(goal.text) / Math.max(1, nonGoalWords + words(goal.text)) > 0.15) content.goalThread = null
  }
  if (period.kind !== 'year') { content.letter = null; content.rhythms = null; content.turningPoints = null; content.discoveries = null }
  content.lookingAhead.experiments = content.lookingAhead.experiments.slice(0, period.kind === 'month' ? 2 : 3)
  return content
}
