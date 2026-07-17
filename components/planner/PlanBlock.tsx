'use client'

import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { PlanItemRow } from '@/lib/planner/get-day-plan'

const MIN_DURATION = 15
const SNAP_MINUTES = 15

interface Props {
  item: PlanItemRow
  pxPerMinute: number
  totalMinutes: number
  onMove: (id: string, startMinute: number) => void
  onResize: (id: string, durationMinutes: number) => void
}

export function PlanBlock({ item, pxPerMinute, totalMinutes, onMove, onResize }: Props) {
  const [dragOffsetPx, setDragOffsetPx] = useState(0)
  const [resizeDeltaPx, setResizeDeltaPx] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const dragStartY = useRef(0)

  const startMinute = item.start_minute ?? 0
  const durationMinutes = item.duration_minutes

  function handleMovePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragStartY.current = e.clientY
    setIsDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handleMovePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return
    setDragOffsetPx(e.clientY - dragStartY.current)
  }

  function handleMovePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return
    setIsDragging(false)
    const deltaMinutes = Math.round(dragOffsetPx / pxPerMinute / SNAP_MINUTES) * SNAP_MINUTES
    const nextStart = Math.max(0, Math.min(totalMinutes - durationMinutes, startMinute + deltaMinutes))
    setDragOffsetPx(0)
    if (nextStart !== startMinute) onMove(item.id, nextStart)
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  function handleResizePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation()
    dragStartY.current = e.clientY
    setIsResizing(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handleResizePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isResizing) return
    e.stopPropagation()
    setResizeDeltaPx(e.clientY - dragStartY.current)
  }

  function handleResizePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!isResizing) return
    e.stopPropagation()
    setIsResizing(false)
    const deltaMinutes = Math.round(resizeDeltaPx / pxPerMinute / SNAP_MINUTES) * SNAP_MINUTES
    const nextDuration = Math.max(MIN_DURATION, Math.min(totalMinutes - startMinute, durationMinutes + deltaMinutes))
    setResizeDeltaPx(0)
    if (nextDuration !== durationMinutes) onResize(item.id, nextDuration)
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const top = startMinute * pxPerMinute + (isDragging ? dragOffsetPx : 0)
  const height = Math.max(18, durationMinutes * pxPerMinute + (isResizing ? resizeDeltaPx : 0))

  return (
    <div
      data-plan-block
      className={cn(
        'absolute inset-x-1.5 z-10 flex touch-none select-none flex-col overflow-hidden rounded-md border px-2 py-1 text-xs shadow-sm',
        item.completed_at
          ? 'border-bone-muted/20 bg-stone-800/90 text-bone-muted/60 line-through'
          : 'cursor-grab border-leather-400/60 bg-stone-850 text-bone hover:border-leather-300 hover:shadow-md',
        (isDragging || isResizing) && 'cursor-grabbing shadow-lg'
      )}
      style={{ top, height }}
      onPointerDown={handleMovePointerDown}
      onPointerMove={handleMovePointerMove}
      onPointerUp={handleMovePointerUp}
    >
      <span className="truncate font-medium">{item.title}</span>
      {height > 28 && (
        <span className="text-[10px] text-bone-muted/60">{durationMinutes}min</span>
      )}
      <div
        className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize touch-none"
        onPointerDown={handleResizePointerDown}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
      />
    </div>
  )
}
