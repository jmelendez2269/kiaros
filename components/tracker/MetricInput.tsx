'use client'

import type { Tables } from '@/types/database'

interface Props {
  metric: Tables<'tracker_metrics'>
  value: boolean | number | string | undefined
  onChange: (value: boolean | number | string) => void
}

export function MetricInput({ metric, value, onChange }: Props) {
  const config = (metric.config ?? {}) as { min?: number; max?: number; step?: number }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-stone-950/45 px-3 py-3">
      <label className="min-w-0 flex-1 text-sm text-bone">{metric.label}</label>

      {metric.data_type === 'boolean' && (
        <button
          type="button"
          role="switch"
          aria-checked={value === true}
          onClick={() => onChange(value !== true)}
          className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${
            value === true ? 'bg-leather-400' : 'bg-stone-700'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
              value === true ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      )}

      {metric.data_type === 'number' && (
        <input
          type="number"
          value={(value as number | undefined) ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
          min={config.min}
          max={config.max}
          step={config.step ?? 1}
          className="w-24 rounded-lg border border-border/80 bg-stone-900/75 px-2 py-1 text-right text-sm text-bone focus:outline-none focus:ring-1 focus:ring-leather-400"
        />
      )}

      {metric.data_type === 'scale' && (
        <div className="flex gap-1">
          {Array.from(
            { length: (config.max ?? 5) - (config.min ?? 1) + 1 },
            (_, i) => (config.min ?? 1) + i
          ).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n === value ? '' : n)}
              className={`h-7 w-7 rounded-lg text-xs font-medium transition-colors ${
                value === n
                  ? 'bg-leather-400 text-stone-950'
                  : 'bg-stone-900 text-bone-muted hover:bg-stone-800'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {metric.data_type === 'text' && (
        <input
          type="text"
          value={(value as string | undefined) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-lg border border-border/80 bg-stone-900/75 px-2 py-1 text-sm text-bone focus:outline-none focus:ring-1 focus:ring-leather-400"
        />
      )}
    </div>
  )
}
