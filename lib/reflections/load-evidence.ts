import 'server-only'
import { z } from 'zod'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { localBoundary, localDate, type ReflectionPeriod } from './periods'
import { evidenceSchema, type Evidence } from './report-schema'
const rowSchema = z.record(z.unknown())
const string = (row: Record<string, unknown>, key: string) => typeof row[key] === 'string' ? row[key] as string : ''
const textList = (value: unknown): string => Array.isArray(value) ? value.filter(v => typeof v === 'string').join('; ') : ''
const PAGE_SIZE = 200
// Exhaust every page. A source read failure must never become a zero-activity report.
async function readRows(userId: string, table: string, columns: string, dateColumn: string, start: string, end: string, permission?: string) {
  const rows: Record<string, unknown>[] = []
  for (let offset = 0; offset < 2000; offset += PAGE_SIZE) {
    let query = createAdminSupabase().from(table).select(columns).eq('user_id', userId)
      .gte(dateColumn, start).lt(dateColumn, end).order(dateColumn).order('id').range(offset, offset + PAGE_SIZE - 1)
    if (permission) query = query.eq(permission, true)
    const result = await query
    if (result.error) throw new Error('Reflection evidence is temporarily unavailable')
    const batch = z.array(rowSchema).parse(result.data)
    rows.push(...batch)
    if (batch.length < PAGE_SIZE) return rows
  }
  throw new Error('This period has too many records to process in one report')
}
export async function loadEvidence(userId: string, period: ReflectionPeriod): Promise<Evidence[]> {
  const start = localBoundary(period.start, period.timezone), end = localBoundary(period.end, period.timezone)
  const [journal, logs, captures, tasks, sessions, reviews, events, intentions] = await Promise.all([
    readRows(userId, 'journal_entries', 'id,title,body,entry_date,created_at', 'entry_date', period.start, period.end, 'include_in_insights'),
    readRows(userId, 'daily_logs', 'id,notes,mood_tag,energy_level,values,log_date,created_at', 'log_date', period.start, period.end),
    readRows(userId, 'oracle_captures', 'id,captured_text,source_role,created_at', 'created_at', start, end, 'include_in_insights'),
    readRows(userId, 'plan_items', 'id,title,area_goal_id,completed_at,created_at', 'completed_at', start, end),
    readRows(userId, 'curriculum_sessions', 'id,title,status,scheduled_for,created_at', 'scheduled_for', period.start, period.end),
    readRows(userId, 'quarterly_reviews', 'id,plan_year,quarter,wins,challenges,pivots,next_quarter_intentions,created_at', 'plan_year', period.start.slice(0,4), String(Number(period.end.slice(0,4)) + 1)),
    readRows(userId, 'reflection_goal_events', 'id,goal_id,title,old_status,new_status,occurred_at', 'occurred_at', start, end),
    readRows(userId, 'reflection_intentions', 'id,text,outcome,created_at,updated_at', 'updated_at', start, end),
  ])
  const evidence: Evidence[] = []
  function add(kind: Evidence['kind'], row: Record<string, unknown>, date: string, title: string, text: string, authored = true, goalId: string | null = null) {
    if (!text.trim() || date < period.start || date >= period.end) return
    evidence.push(evidenceSchema.parse({ id: kind + ':' + string(row, 'id'), kind, date,
      recordedAt: string(row, 'created_at') || string(row, 'occurred_at') || date,
      title: title.slice(0, 200), text: text.slice(0, 1200), authored, goalId }))
  }
  for (const r of journal) add('journal', r, string(r, 'entry_date'), string(r, 'title') || 'Journal entry', string(r, 'body'))
  for (const r of logs) add('log', r, string(r, 'log_date'), 'Daily check-in',
    [string(r, 'notes'), string(r, 'mood_tag') && 'Recorded mood: ' + string(r, 'mood_tag'),
      typeof r.energy_level === 'number' ? 'Recorded energy: ' + r.energy_level : '',
      r.values && typeof r.values === 'object' ? 'Other recorded metrics: ' + JSON.stringify(r.values) : ''].filter(Boolean).join('. '))
  for (const r of captures) add('capture', r, localDate(new Date(string(r, 'created_at')), period.timezone), 'Saved conversation', string(r, 'captured_text'), r.source_role === 'user')
  for (const r of tasks) add('task', r, localDate(new Date(string(r, 'completed_at')), period.timezone), 'Completed planner item', string(r, 'title'), true, string(r, 'area_goal_id') || null)
  for (const r of sessions) add('session', r, string(r, 'scheduled_for').slice(0, 10), 'Learning session', string(r, 'title') + '. Recorded status: ' + string(r, 'status'))
  for (const r of reviews) {
    const qEnd = new Date(Date.UTC(Number(r.plan_year), Number(r.quarter) * 3, 0)).toISOString().slice(0, 10)
    add('review', r, qEnd, 'Your quarterly reflection', [
      textList(r.wins) && 'Wins: ' + textList(r.wins), textList(r.challenges) && 'Challenges: ' + textList(r.challenges),
      string(r, 'pivots') && 'Pivots: ' + string(r, 'pivots'), string(r, 'next_quarter_intentions') && 'Intentions: ' + string(r, 'next_quarter_intentions'),
    ].filter(Boolean).join('\n'))
  }
  for (const r of events) add('goal_event', r, localDate(new Date(string(r, 'occurred_at')), period.timezone), 'Goal update',
    string(r, 'title') + ': ' + (string(r, 'old_status') || 'created') + ' → ' + string(r, 'new_status'), true, string(r, 'goal_id'))
  for (const r of intentions) add('intention', r, localDate(new Date(string(r, 'updated_at')), period.timezone), 'Intention follow-up',
    string(r, 'text') + (string(r, 'outcome') ? '\nRecorded outcome: ' + string(r, 'outcome') : '\nNo outcome recorded.'))
  if (evidence.length > 1200) throw new Error('This period has too many records to process in one report')
  return evidence
}
