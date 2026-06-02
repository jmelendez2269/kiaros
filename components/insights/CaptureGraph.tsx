'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CaptureTopicKind, MapNode, MapResponse } from '@/app/api/insights/map/route'

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false }) as unknown as React.ComponentType<Record<string, unknown>>

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

interface GraphNode extends MapNode {
  x?: number
  y?: number
}

interface GraphLink {
  source: string
  target: string
  weight: number
}

export function CaptureGraph() {
  const [data, setData] = useState<MapResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<MapNode | null>(null)
  const [enabledKinds, setEnabledKinds] = useState<Set<CaptureTopicKind>>(new Set(KIND_ORDER))
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 800, height: 600 })

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
    const nodes: GraphNode[] = data.nodes.filter((n) => enabledKinds.has(n.kind))
    const nodeIds = new Set(nodes.map((n) => n.id))
    const links: GraphLink[] = data.edges
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map((e) => ({ source: e.source, target: e.target, weight: e.weight }))
    return { nodes, links }
  }, [data, enabledKinds])

  function toggleKind(kind: CaptureTopicKind) {
    setEnabledKinds((prev) => {
      const next = new Set(prev)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      return next
    })
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
        className="relative h-[600px] w-full overflow-hidden rounded-2xl border border-border/70 bg-stone-950/60"
      >
        {filtered && filtered.nodes.length > 0 ? (
          <ForceGraph2D
            width={size.width}
            height={size.height}
            graphData={filtered}
            backgroundColor="rgba(0,0,0,0)"
            nodeLabel={(node: unknown) => {
              const n = node as GraphNode
              return `${KIND_LABEL[n.kind]}: ${n.label} (×${n.count})`
            }}
            nodeVal={(node: unknown) => {
              const n = node as GraphNode
              return 2 + Math.sqrt(n.count) * 2
            }}
            nodeColor={(node: unknown) => KIND_COLOR[(node as GraphNode).kind]}
            linkColor={() => 'rgba(180,170,150,0.18)'}
            linkWidth={(link: unknown) => Math.min(3, 0.4 + Math.log2((link as GraphLink).weight + 1))}
            cooldownTicks={120}
            onNodeClick={(node: unknown) => setSelected(node as GraphNode)}
            nodeCanvasObjectMode={() => 'after'}
            nodeCanvasObject={(node: unknown, ctx: CanvasRenderingContext2D, globalScale: number) => {
              const n = node as GraphNode
              if (globalScale < 0.9 && n.count < 3) return
              const fontSize = Math.max(9, 12 / globalScale)
              ctx.font = `${fontSize}px sans-serif`
              ctx.fillStyle = 'rgba(232,222,200,0.85)'
              ctx.textAlign = 'center'
              ctx.textBaseline = 'top'
              const r = 2 + Math.sqrt(n.count) * 2
              ctx.fillText(n.label, n.x ?? 0, (n.y ?? 0) + r + 2)
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-bone-muted">
            No nodes match the current filter.
          </div>
        )}
      </div>

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
