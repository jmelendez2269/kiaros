'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Tracks which of the given anchor element ids is currently closest to the
 * vertical center of the viewport, via a single IntersectionObserver. Drives
 * both chapter-nav emphasis and the pinned wheel's highlighted point as the
 * user scrolls through the chapters.
 */
export function useActiveAnchor(ids: string[]): string | null {
  const key = ids.join('|')
  const [activeId, setActiveId] = useState<string | null>(null)
  const ratios = useRef(new Map<string, number>())

  useEffect(() => {
    ratios.current = new Map()
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)

    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.current.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0)
        }
        let bestId: string | null = null
        let bestRatio = 0
        for (const id of ids) {
          const ratio = ratios.current.get(id) ?? 0
          if (ratio > bestRatio) {
            bestRatio = ratio
            bestId = id
          }
        }
        if (bestId) setActiveId(bestId)
      },
      {
        // Center band of the viewport — a section "activates" once it
        // crosses the middle, not merely on first appearance at the edge.
        rootMargin: '-40% 0px -55% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    )

    for (const el of elements) observer.observe(el)
    return () => observer.disconnect()
    // `ids` is re-read fresh each run via `key`; the array reference itself
    // doesn't need to be a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return activeId
}
