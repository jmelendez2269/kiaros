'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type DataType = 'boolean' | 'number' | 'scale' | 'text'

interface CategoryOption {
  id: string
  name: string
}

interface Props {
  categories: CategoryOption[]
  onDone?: () => void
}

const DATA_TYPE_OPTIONS: { value: DataType; label: string }[] = [
  { value: 'boolean', label: 'Yes / no' },
  { value: 'scale', label: '1-5 scale' },
  { value: 'number', label: 'Number' },
  { value: 'text', label: 'Short text' },
]

export function AddMetricForm({ categories, onDone }: Props) {
  const router = useRouter()
  const [label, setLabel] = useState('')
  const [dataType, setDataType] = useState<DataType>('boolean')
  const [categoryId, setCategoryId] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!label.trim()) {
      setError('Give the metric a name first.')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/tracker/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: label.trim(),
          data_type: dataType,
          category_id: categoryId || null,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'Could not add that metric.')
        return
      }
      setLabel('')
      setDataType('boolean')
      setCategoryId('')
      router.refresh()
      onDone?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add that metric.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr_1fr]">
        <label className="block">
          <span className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-bone-muted/60">
            Metric name
          </span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Meditated, Workout minutes, Focus level"
            className="w-full rounded-lg border border-border/80 bg-stone-950/80 px-3 py-2 text-sm text-bone placeholder:text-bone-muted/40"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-bone-muted/60">
            Type
          </span>
          <select
            value={dataType}
            onChange={(e) => setDataType(e.target.value as DataType)}
            className="w-full rounded-lg border border-border/80 bg-stone-950/80 px-3 py-2 text-sm text-bone"
          >
            {DATA_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-bone-muted/60">
            Category (optional)
          </span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-lg border border-border/80 bg-stone-950/80 px-3 py-2 text-sm text-bone"
          >
            <option value="">No category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <button
        type="submit"
        disabled={isSaving}
        className="inline-flex items-center rounded-full bg-leather-300 px-4 py-2 text-sm font-semibold text-stone-950 transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isSaving ? 'Adding...' : 'Add metric'}
      </button>
    </form>
  )
}
