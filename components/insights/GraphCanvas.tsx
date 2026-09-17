'use client'

import { useEffect, useRef } from 'react'
import type { ComponentType, RefAttributes } from 'react'
import ForceGraph2D, { type ForceGraphMethods } from 'react-force-graph-2d'

export type GraphInstance = ForceGraphMethods

const FG = ForceGraph2D as unknown as ComponentType<
  Record<string, unknown> & RefAttributes<GraphInstance | undefined>
>

interface GraphCanvasProps extends Record<string, unknown> {
  onReady?: (instance: GraphInstance) => void
}

/**
 * Thin client-only wrapper around ForceGraph2D. Exists so the graph instance can be
 * reached (for d3Force config and zoomToFit) without forwarding a ref through next/dynamic.
 */
export default function GraphCanvas({ onReady, ...props }: GraphCanvasProps) {
  const ref = useRef<GraphInstance | undefined>(undefined)

  useEffect(() => {
    if (ref.current && onReady) onReady(ref.current)
  }, [onReady])

  return <FG ref={ref} {...props} />
}
