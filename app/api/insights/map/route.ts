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
}

interface CaptureTopicRow {
  capture_id: string
  kind: CaptureTopicKind
  label: string
}

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

  const response: MapResponse = {
    nodes: Array.from(nodeMap.values()).sort((a, b) => b.count - a.count),
    edges: Array.from(edgeMap.values()).sort((a, b) => b.weight - a.weight),
    captureCount: byCapture.size,
  }

  return NextResponse.json(response)
}
