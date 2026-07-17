'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { EnergyWindow } from '@/lib/planetary/energy-windows'
import type { PlanItemRow } from '@/lib/planner/get-day-plan'
import { PlanBlock } from './PlanBlock'
import { EnergyWindowRail } from './EnergyWindowRail'
import { GhostBlock } from './GhostBlock'
import type { PlacementSuggestion } from './DayPlanner'

const SLOT_MINUTES = 30
const ROW_HEIGHT = 32 // px per 30-minute slot
const PX_PER_MINUTE = ROW_HEIGHT / SLOT_MINUTES
const TOTAL_MINUTES = 24 * 60

// Prominent zone fills — these are the drag targets, so each energy has to
// read clearly at a glance. Blocks sit on top with solid backgrounds.
const ENERGY_BG: Record<string, string> = {
  push: 'bg-leather-500/30',
  initiate: 'bg-ember-400/30',
  reflect: 'bg-plum-400/25',
  rest: 'bg-moss-500/15',
}

function minutesToLabel(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const displayH = h % 12 === 0 ? 12 : h % 12
  const suffix = h < 12 ? 'AM' : 'PM'
  return `${displayH} ${suffix}`
}

function nowMinutes(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

interface Props {
  date: string
  isToday: boolean
  items: PlanItemRow[]
  windows: EnergyWindow[]
  suggestions: PlacementSuggestion[]
  onMove: (id: string, startMinute: number) => void
  onResize: (id: string, durationMinutes: number) => void
  onAdd: (title: string, startMinute: number) => void
  onAcceptSuggestion: (id: string) => void
  onDismissSuggestion: (id: string) => void
}

// Default landing scroll position for days that aren't today — most plans
// start in the morning, so open there instead of forcing a scroll from
// midnight every time.
const DEFAULT_ANCHOR_MINUTE = 7 * 60

export function DayGrid({
  date,
  isToday,
  items,
  windows,
  suggestions,
  onMove,
  onResize,
  onAdd,
  onAcceptSuggestion,
  onDismissSuggestion,
}: Props) {
  const [pendingSlot, setPendingSlot] = useState<number | null>(null)
  const [pendingTitle, setPendingTitle] = useState('')
  // Computed client-side only, after mount — reading Date.now() during SSR
  // would produce a different value at hydration and trigger a mismatch.
  const [nowMinute, setNowMinute] = useState<number | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isToday) return
    const update = () => setNowMinute(nowMinutes())
    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [isToday])

  // Land on the relevant part of the day instead of always opening at
  // midnight — a full day is 1536px tall, so without this every visit
  // starts with a long, disorienting scroll before anything useful is
  // visible. Runs once per date (keyed by `date` + `isToday` so navigating
  // between days re-anchors), after the browser has laid out the grid.
  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const targetMinute = isToday ? Math.max(0, nowMinutes() - 60) : DEFAULT_ANCHOR_MINUTE
    const raf = requestAnimationFrame(() => {
      const gridTop = grid.getBoundingClientRect().top + window.scrollY
      window.scrollTo({ top: gridTop + targetMinute * PX_PER_MINUTE, behavior: 'auto' })
    })
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, isToday])

  const containerHeight = TOTAL_MINUTES * PX_PER_MINUTE
  const hourMarks = useMemo(() => Array.from({ length: 24 }, (_, i) => i * 60), [])

  function handleGridClick(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('[data-plan-block]')) return
    const rect = e.currentTarget.getBoundingClientRect()
    const offsetY = e.clientY - rect.top
    const rawMinute = offsetY / PX_PER_MINUTE
    const snapped = Math.max(0, Math.min(TOTAL_MINUTES - 30, Math.round(rawMinute / 30) * 30))
    setPendingSlot(snapped)
    setPendingTitle('')
  }

  function submitPending() {
    if (pendingSlot === null) return
    const title = pendingTitle.trim()
    if (!title) return
    onAdd(title, pendingSlot)
    setPendingSlot(null)
    setPendingTitle('')
  }

  return (
    <div className="flex gap-2">
      <div className="flex flex-col text-right">
        {hourMarks.map((m) => (
          <div key={m} className="pr-1 text-[10px] text-bone-muted/50" style={{ height: ROW_HEIGHT * 2 }}>
            {minutesToLabel(m)}
          </div>
        ))}
      </div>

      <EnergyWindowRail windows={windows} pxPerMinute={PX_PER_MINUTE} totalMinutes={TOTAL_MINUTES} />

      <div
        ref={gridRef}
        className="relative flex-1 cursor-crosshair rounded-lg border border-border/60 bg-stone-950/40"
        style={{ height: containerHeight }}
        onClick={handleGridClick}
      >
        {windows.map((w, i) => (
          <div
            key={i}
            className={cn('pointer-events-none absolute inset-x-0', ENERGY_BG[w.energyType])}
            style={{ top: w.startMinute * PX_PER_MINUTE, height: (w.endMinute - w.startMinute) * PX_PER_MINUTE }}
          />
        ))}

        {hourMarks.map((m) => (
          <div
            key={m}
            className="pointer-events-none absolute inset-x-0 border-t border-border/40"
            style={{ top: m * PX_PER_MINUTE }}
          />
        ))}

        {nowMinute !== null && (
          <div
            className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-ember-300"
            style={{ top: nowMinute * PX_PER_MINUTE }}
          >
            <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-ember-300" />
          </div>
        )}

        {items.map((item) => (
          <PlanBlock
            key={item.id}
            item={item}
            pxPerMinute={PX_PER_MINUTE}
            totalMinutes={TOTAL_MINUTES}
            onMove={onMove}
            onResize={onResize}
          />
        ))}

        {suggestions.map((s) => (
          <GhostBlock
            key={s.id}
            suggestion={s}
            pxPerMinute={PX_PER_MINUTE}
            onAccept={onAcceptSuggestion}
            onDismiss={onDismissSuggestion}
          />
        ))}

        {pendingSlot !== null && (
          <div
            data-plan-block
            className="absolute inset-x-2 z-30 rounded-md border border-leather-400/50 bg-stone-900 p-2 shadow-lg"
            style={{ top: pendingSlot * PX_PER_MINUTE }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              type="text"
              value={pendingTitle}
              onChange={(e) => setPendingTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitPending()
                if (e.key === 'Escape') setPendingSlot(null)
              }}
              onBlur={() => {
                if (!pendingTitle.trim()) setPendingSlot(null)
              }}
              placeholder={`Add task at ${minutesToLabel(pendingSlot)}...`}
              className="w-full bg-transparent text-sm text-bone placeholder:text-bone-muted/40 focus:outline-none"
            />
          </div>
        )}
      </div>
    </div>
  )
}
