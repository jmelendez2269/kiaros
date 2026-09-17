'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CaptureTopicKind, MapNode, MapResponse } from '@/app/api/insights/map/route'
import type { GraphInstance } from './GraphCanvas'

const GraphCanvas = dynamic(() => import('./GraphCanvas'), { ssr: false })

const KIND_COLOR: Record<CaptureTopicKind, string> = {
  theme: '#c9b486',
  natal_aspect: '#7fb3d5',
  transit_aspect: '#5a9bbd',
  hd_element: '#a98bd6',
  mood: '#d68b8b',
}

const KIND_LABEL: Record<CaptureTopicKind, string> = {
  theme: 'Theme',
  natal_aspect: 'Natal aspect',
  transit_aspect: 'Transit aspect',
  hd_element: 'Human Design',
  mood: 'Mood',
}

const KIND_ORDER: CaptureTopicKind[] = ['theme', 'natal_aspect', 'transit_aspect', 'hd_element', 'mood']

const NODE_REL_SIZE = 4
const LABEL_FONT = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif'
const LABEL_MAX_CHARS = 40
/** Screen px the label is drawn at, regardless of zoom. */
const LABEL_SCREEN_PX = 11.5
/** Strongest links kept per node — keeps the mind map readable instead of a hairball. */
const LINKS_PER_NODE = 3
/** Breathing room reserved around every node + label by the collision force. */
const LABEL_GUTTER = 10

interface GraphNode extends MapNode {
  x?: number
  y?: number
  vx?: number
  vy?: number
  /** Display label, truncated. */
  short: string
  /** Half-extents of the node plus its label, in graph units — used by the collision force. */
  halfW: number
  halfH: number
}

interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
  weight: number
}

interface Rect {
  x0: number
  y0: number
  x1: number
  y1: number
}

function nodeValue(count: number): number {
  return 2 + Math.sqrt(count) * 2
}

function nodeRadius(count: number): number {
  return Math.sqrt(nodeValue(count)) * NODE_REL_SIZE
}

function truncate(label: string): string {
  return label.length > LABEL_MAX_CHARS ? `${label.slice(0, LABEL_MAX_CHARS - 1).trimEnd()}…` : label
}

let measureCtx: CanvasRenderingContext2D | null = null

function measureLabel(text: string, fontPx: number): number {
  if (typeof document === 'undefined') return text.length * fontPx * 0.5
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d')
  if (!measureCtx) return text.length * fontPx * 0.5
  measureCtx.font = `${fontPx}px ${LABEL_FONT}`
  return measureCtx.measureText(text).width
}

function linkEndId(end: string | GraphNode): string {
  return typeof end === 'string' ? end : end.id
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0
}

function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

/**
 * Every capture links all of its topics to each other, so the raw graph is a union of
 * cliques — unreadable past a couple of captures. Keep each node's strongest few links
 * plus every link that actually repeated across captures.
 */
function pruneLinks(nodes: GraphNode[], links: GraphLink[]): GraphLink[] {
  if (links.length === 0) return links
  const countById = new Map(nodes.map((n) => [n.id, n.count]))
  const byNode = new Map<string, GraphLink[]>()

  for (const link of links) {
    for (const id of [linkEndId(link.source), linkEndId(link.target)]) {
      const list = byNode.get(id)
      if (list) list.push(link)
      else byNode.set(id, [link])
    }
  }

  const keep = new Set<GraphLink>()
  for (const [id, list] of byNode) {
    const otherCount = (link: GraphLink) => {
      const otherId = linkEndId(link.source) === id ? linkEndId(link.target) : linkEndId(link.source)
      return countById.get(otherId) ?? 0
    }
    list.sort((a, b) => b.weight - a.weight || otherCount(b) - otherCount(a))
    for (const link of list.slice(0, LINKS_PER_NODE)) keep.add(link)
  }
  // Repeat co-occurrences are the signal worth seeing, but they are a clique too once a
  // few captures share topics — take the heaviest until the graph is as busy as it can be
  // and still read.
  const maxLinks = Math.max(40, nodes.length * 3)
  const repeats = links.filter((link) => link.weight >= 2 && !keep.has(link)).sort((a, b) => b.weight - a.weight)
  for (const link of repeats) {
    if (keep.size >= maxLinks) break
    keep.add(link)
  }

  return links.filter((link) => keep.has(link))
}

/**
 * Axis-aligned box separation. Each node is a box as wide as its label, so labels get
 * room to sit beside each other instead of stacking on top of one another. Overlaps are
 * resolved on the axis of least *relative* overlap, which keeps the cloud landscape —
 * resolving on the raw least overlap stacks wide labels into a very tall column.
 */
function boxCollideForce(strength = 0.6, iterations = 2) {
  let nodes: GraphNode[] = []

  const force = () => {
    for (let iteration = 0; iteration < iterations; iteration++) {
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]
          const dx = (b.x ?? 0) - (a.x ?? 0)
          const dy = (b.y ?? 0) - (a.y ?? 0)
          const spanX = a.halfW + b.halfW
          const spanY = a.halfH + b.halfH
          const overlapX = spanX - Math.abs(dx)
          const overlapY = spanY - Math.abs(dy)
          if (overlapX <= 0 || overlapY <= 0) continue

          if (overlapX / spanX < overlapY / spanY) {
            const push = (dx === 0 ? Math.random() - 0.5 : Math.sign(dx)) * overlapX * strength * 0.5
            a.vx = (a.vx ?? 0) - push
            b.vx = (b.vx ?? 0) + push
          } else {
            const push = (dy === 0 ? Math.random() - 0.5 : Math.sign(dy)) * overlapY * strength * 0.5
            a.vy = (a.vy ?? 0) - push
            b.vy = (b.vy ?? 0) + push
          }
        }
      }
    }
  }

  force.initialize = (ns: unknown[]) => {
    nodes = ns as GraphNode[]
  }

  return force
}

export function CaptureGraph() {
  const [data, setData] = useState<MapResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<MapNode | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [enabledKinds, setEnabledKinds] = useState<Set<CaptureTopicKind>>(new Set(KIND_ORDER))
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<GraphInstance | null>(null)
  const [size, setSize] = useState({ width: 800, height: 620 })

  /** Rects claimed by node circles and already-drawn labels, reset every frame. */
  const claimedRef = useRef<Rect[]>([])
  /** Label placements reserved before the frame draws (hovered node and its neighbours). */
  const reservedRef = useRef<Map<string, Rect>>(new Map())
  const nodesRef = useRef<GraphNode[]>([])

  useEffect(() => {
    let cancelled = false
    fetch('/api/insights/map')
      .then((res) => res.json().then((body) => ({ ok: res.ok, body })))
      .then(({ ok, body }) => {
        if (cancelled) return
        if (!ok) {
          setError(body?.error || 'Failed to load mind map.')
          return
        }
        setData(body as MapResponse)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load mind map.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setSize({
          width: Math.max(320, entry.contentRect.width),
          height: Math.max(420, entry.contentRect.height),
        })
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const filtered = useMemo(() => {
    if (!data) return null
    const nodes: GraphNode[] = data.nodes
      .filter((n) => enabledKinds.has(n.kind))
      .map((n) => {
        const short = truncate(n.label)
        const r = nodeRadius(n.count)
        const textWidth = measureLabel(short, LABEL_SCREEN_PX)
        return {
          ...n,
          short,
          halfW: Math.max(r, textWidth / 2) + LABEL_GUTTER,
          halfH: r + LABEL_SCREEN_PX + LABEL_GUTTER,
        }
      })
    const nodeIds = new Set(nodes.map((n) => n.id))
    const allLinks: GraphLink[] = data.edges
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map((e) => ({ source: e.source, target: e.target, weight: e.weight }))
    const links = pruneLinks(nodes, allLinks)
    return { nodes, links, totalLinks: allLinks.length }
  }, [data, enabledKinds])

  useEffect(() => {
    nodesRef.current = filtered?.nodes ?? []
  }, [filtered])

  const neighbours = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const link of filtered?.links ?? []) {
      const a = linkEndId(link.source)
      const b = linkEndId(link.target)
      if (!map.has(a)) map.set(a, new Set())
      if (!map.has(b)) map.set(b, new Set())
      map.get(a)?.add(b)
      map.get(b)?.add(a)
    }
    return map
  }, [filtered])

  const configureForces = useCallback((instance: GraphInstance) => {
    graphRef.current = instance
    const charge = instance.d3Force('charge') as
      | { strength: (v: number) => unknown; distanceMax: (v: number) => unknown }
      | undefined
    charge?.strength(-140)
    charge?.distanceMax(700)
    const link = instance.d3Force('link') as
      | { distance: (fn: (l: GraphLink) => number) => unknown; strength: (v: number) => unknown }
      | undefined
    link?.distance((l: GraphLink) => 60 + 30 / (l.weight || 1))
    link?.strength(0.12)
    instance.d3Force('collide', boxCollideForce())
  }, [])

  const fit = useCallback(() => {
    graphRef.current?.zoomToFit(500, 40)
  }, [])

  function toggleKind(kind: CaptureTopicKind) {
    setEnabledKinds((prev) => {
      const next = new Set(prev)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      return next
    })
  }

  /** Try a few placements around the node; return the first one that is clear. */
  function placeLabel(
    node: GraphNode,
    fontSize: number,
    ctx: CanvasRenderingContext2D,
    force: boolean,
  ): Rect | null {
    const r = nodeRadius(node.count)
    const width = ctx.measureText(node.short).width
    const padX = fontSize * 0.35
    const padY = fontSize * 0.25
    const x = node.x ?? 0
    const y = node.y ?? 0
    const boxW = width + padX * 2
    const boxH = fontSize + padY * 2

    const candidates: Array<[number, number]> = [
      [x - boxW / 2, y + r + 3],
      [x - boxW / 2, y - r - 3 - boxH],
      [x + r + 4, y - boxH / 2],
      [x - r - 4 - boxW, y - boxH / 2],
    ]

    for (const [x0, y0] of candidates) {
      const rect = { x0, y0, x1: x0 + boxW, y1: y0 + boxH }
      if (!claimedRef.current.some((claimed) => overlaps(rect, claimed))) return rect
    }

    if (!force) return null
    const [x0, y0] = candidates[0]
    return { x0, y0, x1: x0 + boxW, y1: y0 + boxH }
  }

  if (error) {
    return <div className="rounded-md border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>
  }

  if (!data) {
    return <div className="p-8 text-center text-sm text-bone-muted">Loading your map...</div>
  }

  if (data.nodes.length === 0) {
    return (
      <div className="rounded-2xl border border-border/70 bg-stone-950/60 p-10 text-center text-sm text-bone-muted">
        Nothing to plot yet. As you save Stelloquy exchanges, topics, aspects, and HD elements get extracted from each capture and appear here as a living mind map.
      </div>
    )
  }

  const hoveredNeighbours = hovered ? neighbours.get(hovered) ?? new Set<string>() : null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {KIND_ORDER.map((kind) => {
          const enabled = enabledKinds.has(kind)
          return (
            <button
              key={kind}
              type="button"
              onClick={() => toggleKind(kind)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors ${
                enabled
                  ? 'border-border bg-stone-900/80 text-bone'
                  : 'border-border/40 bg-stone-950/40 text-bone-muted/60'
              }`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: enabled ? KIND_COLOR[kind] : 'transparent', border: `1px solid ${KIND_COLOR[kind]}` }}
              />
              {KIND_LABEL[kind]}
            </button>
          )
        })}
        <span className="ml-auto text-bone-muted">
          {data.captureCount} {data.captureCount === 1 ? 'capture' : 'captures'} tagged
        </span>
      </div>

      <div
        ref={containerRef}
        className="relative h-[68vh] min-h-[560px] w-full overflow-hidden rounded-2xl border border-border/70 bg-stone-950/60"
      >
        {filtered && filtered.nodes.length > 0 ? (
          <>
            <GraphCanvas
              onReady={configureForces}
              width={size.width}
              height={size.height}
              graphData={filtered}
              backgroundColor="rgba(0,0,0,0)"
              nodeRelSize={NODE_REL_SIZE}
              minZoom={0.2}
              maxZoom={8}
              nodeLabel={(node: unknown) => {
                const n = node as GraphNode
                return `${KIND_LABEL[n.kind]}: ${n.label} (×${n.count})`
              }}
              nodeVal={(node: unknown) => nodeValue((node as GraphNode).count)}
              nodeColor={(node: unknown) => {
                const n = node as GraphNode
                const base = KIND_COLOR[n.kind]
                if (!hovered) return base
                const near = n.id === hovered || hoveredNeighbours?.has(n.id)
                return near ? base : withAlpha(base, 0.22)
              }}
              linkColor={(link: unknown) => {
                const l = link as GraphLink
                if (!hovered) return 'rgba(180,170,150,0.14)'
                const near = linkEndId(l.source) === hovered || linkEndId(l.target) === hovered
                return near ? 'rgba(210,200,180,0.55)' : 'rgba(180,170,150,0.05)'
              }}
              linkWidth={(link: unknown) => Math.min(3, 0.4 + Math.log2((link as GraphLink).weight + 1))}
              warmupTicks={80}
              cooldownTicks={220}
              d3AlphaDecay={0.018}
              d3VelocityDecay={0.32}
              onEngineStop={fit}
              onNodeClick={(node: unknown) => setSelected(node as GraphNode)}
              onNodeHover={(node: unknown) => setHovered(node ? (node as GraphNode).id : null)}
              onRenderFramePre={(ctx: CanvasRenderingContext2D, globalScale: number) => {
                const claimed: Rect[] = []
                const nodes = nodesRef.current
                // Circles are obstacles for every label, so reserve them before any text lands.
                for (const n of nodes) {
                  const r = nodeRadius(n.count)
                  const x = n.x ?? 0
                  const y = n.y ?? 0
                  claimed.push({ x0: x - r, y0: y - r, x1: x + r, y1: y + r })
                }
                claimedRef.current = claimed
                reservedRef.current = new Map()

                if (!hovered) return
                // The hovered node and its neighbours get first claim on label space.
                const fontSize = LABEL_SCREEN_PX / globalScale
                ctx.font = `${fontSize}px ${LABEL_FONT}`
                for (const n of nodes) {
                  if (n.id !== hovered && !hoveredNeighbours?.has(n.id)) continue
                  const rect = placeLabel(n, fontSize, ctx, n.id === hovered)
                  if (rect) {
                    reservedRef.current.set(n.id, rect)
                    claimed.push(rect)
                  }
                }
              }}
              nodeCanvasObjectMode={() => 'after'}
              nodeCanvasObject={(node: unknown, ctx: CanvasRenderingContext2D, globalScale: number) => {
                const n = node as GraphNode
                const dimmed = Boolean(hovered) && n.id !== hovered && !hoveredNeighbours?.has(n.id)
                if (dimmed) return

                const fontSize = LABEL_SCREEN_PX / globalScale
                ctx.font = `${fontSize}px ${LABEL_FONT}`

                const reserved = reservedRef.current.get(n.id)
                const rect = reserved ?? placeLabel(n, fontSize, ctx, false)
                if (!rect) return
                if (!reserved) claimedRef.current.push(rect)

                ctx.beginPath()
                ctx.roundRect(rect.x0, rect.y0, rect.x1 - rect.x0, rect.y1 - rect.y0, fontSize * 0.35)
                ctx.fillStyle = 'rgba(10,9,8,0.78)'
                ctx.fill()

                ctx.fillStyle = n.id === hovered ? 'rgba(245,238,222,0.98)' : 'rgba(232,222,200,0.9)'
                ctx.textAlign = 'center'
                ctx.textBaseline = 'middle'
                ctx.fillText(n.short, (rect.x0 + rect.x1) / 2, (rect.y0 + rect.y1) / 2)
              }}
            />
            <button
              type="button"
              onClick={fit}
              className="absolute right-3 top-3 rounded-full border border-border/70 bg-stone-950/80 px-3 py-1.5 text-[11px] text-bone-muted transition-colors hover:border-moss-400/40 hover:text-bone"
            >
              Fit to view
            </button>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-bone-muted">
            No nodes match the current filter.
          </div>
        )}
      </div>

      {filtered && filtered.nodes.length > 0 ? (
        <p className="text-[11px] leading-relaxed text-bone-muted/80">
          Showing the {filtered.links.length} strongest of {filtered.totalLinks} connections. Scroll to zoom — more
          labels surface as you go in. Hover a node to isolate what it sits with; drag to rearrange.
        </p>
      ) : null}

      {selected ? (
        <div className="rounded-2xl border border-border/70 bg-stone-950/80 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-bone-muted">
                {KIND_LABEL[selected.kind]}
              </p>
              <h3 className="mt-1 text-lg text-bone">{selected.label}</h3>
              <p className="mt-1 text-xs text-bone-muted">
                Appears in {selected.count} {selected.count === 1 ? 'capture' : 'captures'}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-xs text-bone-muted hover:text-bone"
            >
              Close
            </button>
          </div>
          {selected.sampleCaptureIds.length > 0 ? (
            <p className="mt-3 text-xs text-bone-muted">
              {selected.sampleCaptureIds.length} sample capture{selected.sampleCaptureIds.length === 1 ? '' : 's'} attached. (Click-through to capture detail is coming.)
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
