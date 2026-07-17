'use client'

import type { PlacementSuggestion } from './DayPlanner'

interface Props {
  suggestion: PlacementSuggestion
  pxPerMinute: number
  onAccept: (id: string) => void
  onDismiss: (id: string) => void
}

export function GhostBlock({ suggestion, pxPerMinute, onAccept, onDismiss }: Props) {
  const top = suggestion.startMinute * pxPerMinute
  const height = Math.max(28, suggestion.durationMinutes * pxPerMinute)

  return (
    <div
      data-plan-block
      className="absolute inset-x-1.5 z-20 flex flex-col overflow-hidden rounded-md border border-dashed border-leather-300/80 bg-stone-900/90 px-2 py-1 text-xs text-leather-100"
      style={{ top, height }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="truncate font-medium">{suggestion.title}</span>
        <span className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onAccept(suggestion.id)}
            title="Accept this time"
            className="rounded px-1 text-[13px] leading-none text-moss-300 hover:bg-moss-500/20"
          >
            ✓
          </button>
          <button
            type="button"
            onClick={() => onDismiss(suggestion.id)}
            title="Dismiss"
            className="rounded px-1 text-[13px] leading-none text-bone-muted/70 hover:bg-stone-700/40 hover:text-bone"
          >
            ✕
          </button>
        </span>
      </div>
      {suggestion.rationale && height > 34 && (
        <span className="truncate text-[10px] italic text-leather-200/70">{suggestion.rationale}</span>
      )}
    </div>
  )
}
