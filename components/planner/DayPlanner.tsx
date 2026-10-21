'use client'

import { useEffect, useMemo, useState } from 'react'
import type { EnergyWindow } from '@/lib/planetary/energy-windows'
import type { PlanetaryHourBand } from '@/lib/planetary/planetary-hours'
import type { PlanItemRow } from '@/lib/planner/get-day-plan'
import {
  readSkyTimingVisibleFromStorage,
  writeSkyTimingVisibleToStorage,
} from '@/lib/planner/sky-timing-preference'
import { DayGrid } from './DayGrid'
import { UnscheduledTray } from './UnscheduledTray'
import { EnergyLegend } from './EnergyLegend'
import { SkyTimingToggle } from './SkyTimingToggle'

const DEFAULT_SLOT_MINUTE = 9 * 60 // 9:00 AM

export interface PlacementSuggestion {
  id: string
  title: string
  startMinute: number
  durationMinutes: number
  rationale?: string
}

interface Props {
  date: string
  isToday: boolean
  initialPlanItems: PlanItemRow[]
  windows: EnergyWindow[]
  planetaryHourBands?: PlanetaryHourBand[]
  /** Calendar Day only — unset on /planner. */
  dayGridScrollMode?: 'calendar'
}

export function DayPlanner({
  date,
  isToday,
  initialPlanItems,
  windows,
  planetaryHourBands = [],
  dayGridScrollMode,
}: Props) {
  const [items, setItems] = useState<PlanItemRow[]>(initialPlanItems)
  const [suggestions, setSuggestions] = useState<PlacementSuggestion[]>([])
  const [isPlacing, setIsPlacing] = useState(false)
  const [placeError, setPlaceError] = useState<string | null>(null)
  const [skyTimingVisible, setSkyTimingVisible] = useState(true)

  useEffect(() => {
    if (dayGridScrollMode !== 'calendar') return
    setSkyTimingVisible(readSkyTimingVisibleFromStorage((key) => window.localStorage.getItem(key)))
  }, [dayGridScrollMode])

  function setSkyTimingPersisted(next: boolean) {
    writeSkyTimingVisibleToStorage((key, value) => window.localStorage.setItem(key, value), next)
    setSkyTimingVisible(next)
  }

  const scheduled = useMemo(() => items.filter((i) => i.start_minute !== null), [items])
  const unscheduled = useMemo(() => items.filter((i) => i.start_minute === null), [items])

  function upsertItem(item: PlanItemRow) {
    setItems((prev) => (prev.some((i) => i.id === item.id) ? prev.map((i) => (i.id === item.id ? item : i)) : [...prev, item]))
  }

  function patchLocal(id: string, patch: Partial<PlanItemRow>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }

  async function moveItem(id: string, startMinute: number) {
    patchLocal(id, { start_minute: startMinute })
    const res = await fetch(`/api/plan-items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_minute: startMinute }),
    })
    if (res.ok) {
      const { item } = await res.json()
      upsertItem(item)
    }
  }

  async function resizeItem(id: string, durationMinutes: number) {
    patchLocal(id, { duration_minutes: durationMinutes })
    const res = await fetch(`/api/plan-items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration_minutes: durationMinutes }),
    })
    if (res.ok) {
      const { item } = await res.json()
      upsertItem(item)
    }
  }

  async function addItem(title: string, startMinute: number | null) {
    const res = await fetch('/api/plan-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_date: date,
        title,
        duration_minutes: 30,
        ...(startMinute !== null ? { start_minute: startMinute } : {}),
      }),
    })
    if (res.ok) {
      const { item } = await res.json()
      upsertItem(item)
    }
  }

  async function requestSuggestions() {
    const toPlace = unscheduled.filter((i) => i.completed_at === null)
    if (toPlace.length === 0 || isPlacing) return
    setIsPlacing(true)
    setPlaceError(null)
    try {
      const res = await fetch('/api/plan-items/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, itemIds: toPlace.map((i) => i.id) }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setPlaceError(body.error ?? 'Could not suggest times')
        return
      }
      const titleById = new Map(toPlace.map((i) => [i.id, i.title]))
      const next: PlacementSuggestion[] = (body.placements ?? [])
        .filter((p: { id: string }) => titleById.has(p.id))
        .map((p: { id: string; startMinute: number; durationMinutes: number; rationale?: string }) => ({
          id: p.id,
          title: titleById.get(p.id) as string,
          startMinute: p.startMinute,
          durationMinutes: p.durationMinutes,
          rationale: p.rationale,
        }))
      setSuggestions(next)
      if (next.length === 0) setPlaceError('No workable times found — place them by hand.')
    } catch (err) {
      setPlaceError(err instanceof Error ? err.message : 'Could not suggest times')
    } finally {
      setIsPlacing(false)
    }
  }

  function dismissSuggestion(id: string) {
    setSuggestions((prev) => prev.filter((s) => s.id !== id))
  }

  async function acceptSuggestion(id: string) {
    const s = suggestions.find((x) => x.id === id)
    if (!s) return
    // Optimistically move the item onto the grid and clear the ghost.
    patchLocal(id, { start_minute: s.startMinute, duration_minutes: s.durationMinutes, source: 'ai-placed' })
    dismissSuggestion(id)
    const res = await fetch('/api/plan-items/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placements: [{ id, startMinute: s.startMinute, durationMinutes: s.durationMinutes }] }),
    })
    if (res.ok) {
      const { items: updated } = await res.json()
      if (updated?.[0]) upsertItem(updated[0])
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="shell-panel space-y-4 px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="shell-kicker">Day plan</p>
          <div className="flex flex-wrap items-center gap-3">
            {dayGridScrollMode === 'calendar' ? (
              <SkyTimingToggle checked={skyTimingVisible} onCheckedChange={setSkyTimingPersisted} />
            ) : null}
            {dayGridScrollMode === 'calendar' && skyTimingVisible ? <EnergyLegend /> : null}
            {dayGridScrollMode !== 'calendar' ? <EnergyLegend /> : null}
          </div>
        </div>
        <DayGrid
          date={date}
          isToday={isToday}
          items={scheduled}
          windows={windows}
          planetaryHourBands={planetaryHourBands}
          showSkyTiming={dayGridScrollMode === 'calendar' ? skyTimingVisible : true}
          suggestions={suggestions}
          onMove={moveItem}
          onResize={resizeItem}
          onAdd={(title, startMinute) => addItem(title, startMinute)}
          onAcceptSuggestion={acceptSuggestion}
          onDismissSuggestion={dismissSuggestion}
          scrollMode={dayGridScrollMode}
        />
      </div>
      <UnscheduledTray
        items={unscheduled}
        isPlacing={isPlacing}
        placeError={placeError}
        onSchedule={(id) => moveItem(id, DEFAULT_SLOT_MINUTE)}
        onAdd={(title) => addItem(title, null)}
        onSuggest={requestSuggestions}
      />
    </div>
  )
}
