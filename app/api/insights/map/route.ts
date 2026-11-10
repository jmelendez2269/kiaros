import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

import { requireOracleAccess } from '@/lib/commerce/access'
import { createServerSupabase } from '@/lib/supabase/server'

export type CaptureTopicKind = 'theme' | 'natal_aspect' | 'transit_aspect' | 'hd_element' | 'mood'

export interface MapNode {
  id: string
  kind: CaptureTopicKind
  label: string
  count: number
  sampleCaptureIds: string[]
  /** Up to three months (YYYY-MM) when it came up most, busiest first. */
  months: Array<{ month: string; count: number }>
}

/** A saved conversation behind a star, for the stars the chart can show. */
export interface MapExcerpt {
  date: string
  whose: 'member' | 'stelloquy'
  text: string
}

export interface MapEdge {
  source: string
  target: string
  weight: number
}

export interface MapResponse {
  nodes: MapNode[]
  edges: MapEdge[]
  captureCount: number
  /** By capture id. Only for the sample captures of the most frequent stars. */
  excerpts: Record<string, MapExcerpt>
}

interface CaptureTopicRow {
  capture_id: string
  kind: CaptureTopicKind
  label: string
}

/** Enough to cover every star the chart can draw (8 themes and 7 of each other kind), with room to spare. */
const EXCERPT_NODES = 60
const EXCERPTS_PER_NODE = 3

function nodeId(kind: CaptureTopicKind, label: string): string {
  return `${kind}:${label}`
}

/** Optional `?since=YYYY-MM-DD` limits the map to captures tagged on or after that day. */
export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const denied = await requireOracleAccess(userId)
  if (denied) return denied

  const supabase = await createServerSupabase()

  const since = new URL(request.url).searchParams.get('since')
  let query = supabase
    .from('capture_topics')
    .select('capture_id, kind, label')
    .order('created_at', { ascending: false })
    .limit(5000)
  if (since) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(since)) return NextResponse.json({ error: 'Invalid since date' }, { status: 400 })
    query = query.gte('created_at', `${since}T00:00:00Z`)
  }
  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (data ?? []) as unknown as CaptureTopicRow[]

  const byCapture = new Map<string, CaptureTopicRow[]>()
  for (const row of rows) {
    const list = byCapture.get(row.capture_id) ?? []
    list.push(row)
    byCapture.set(row.capture_id, list)
  }

  const nodeMap = new Map<string, MapNode>()
  const edgeMap = new Map<string, MapEdge>()

  for (const [captureId, topics] of byCapture.entries()) {
    for (const t of topics) {
      const id = nodeId(t.kind, t.label)
      const existing = nodeMap.get(id)
      if (existing) {
        existing.count += 1
        if (existing.sampleCaptureIds.length < 8 && !existing.sampleCaptureIds.includes(captureId)) {
          existing.sampleCaptureIds.push(captureId)
        }
      } else {
        nodeMap.set(id, {
          id,
          kind: t.kind,
          label: t.label,
          count: 1,
          sampleCaptureIds: [captureId],
          months: [],
        })
      }
    }

    for (let i = 0; i < topics.length; i++) {
      for (let j = i + 1; j < topics.length; j++) {
        const a = nodeId(topics[i].kind, topics[i].label)
        const b = nodeId(topics[j].kind, topics[j].label)
        if (a === b) continue
        const [source, target] = a < b ? [a, b] : [b, a]
        const key = `${source}|${target}`
        const existing = edgeMap.get(key)
        if (existing) {
          existing.weight += 1
        } else {
          edgeMap.set(key, { source, target, weight: 1 })
        }
      }
    }
  }

  const nodes = Array.from(nodeMap.values()).sort((a, b) => b.count - a.count)

  // When each conversation was saved, to say which months a star was brightest in.
  const { data: captureDates } = await supabase.from('oracle_captures').select('id, created_at').order('created_at', { ascending: false }).limit(5000)
  const monthByCapture = new Map((captureDates ?? []).map((c) => [String(c.id), String(c.created_at).slice(0, 7)]))
  const monthCounts = new Map<string, Map<string, number>>()
  for (const [captureId, topics] of byCapture.entries()) {
    const month = monthByCapture.get(captureId)
    if (!month) continue
    for (const id of new Set(topics.map((t) => nodeId(t.kind, t.label)))) {
      const counts = monthCounts.get(id) ?? new Map<string, number>()
      counts.set(month, (counts.get(month) ?? 0) + 1)
      monthCounts.set(id, counts)
    }
  }
  for (const node of nodes) {
    node.months = [...(monthCounts.get(node.id) ?? new Map<string, number>()).entries()]
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => b.count - a.count || b.month.localeCompare(a.month))
      .slice(0, 3)
  }

  // A few of the member's own saved conversations behind the stars the chart shows.
  const excerptIds = [...new Set(nodes.slice(0, EXCERPT_NODES).flatMap((n) => n.sampleCaptureIds.slice(0, EXCERPTS_PER_NODE)))]
  const excerpts: Record<string, MapExcerpt> = {}
  if (excerptIds.length) {
    const { data: captures } = await supabase.from('oracle_captures').select('id, captured_text, source_role, created_at').in('id', excerptIds)
    for (const c of captures ?? []) {
      const text = String(c.captured_text ?? '').replace(/\s+/g, ' ').trim()
      if (!text) continue
      excerpts[String(c.id)] = {
        date: String(c.created_at).slice(0, 10),
        whose: c.source_role === 'user' ? 'member' : 'stelloquy',
        text: text.length > 180 ? `${text.slice(0, 177)}…` : text,
      }
    }
  }

  const response: MapResponse = {
    nodes,
    edges: Array.from(edgeMap.values()).sort((a, b) => b.weight - a.weight),
    captureCount: byCapture.size,
    excerpts,
  }

  return NextResponse.json(response)
}
