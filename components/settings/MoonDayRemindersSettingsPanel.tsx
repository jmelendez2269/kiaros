'use client'

import { Bell } from 'lucide-react'
import { useEffect, useState } from 'react'

export function MoonDayRemindersSettingsPanel() {
  const [enabled, setEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/settings/moon-day-reminders', { cache: 'no-store' })
        const data = (await res.json()) as { remindersEnabled?: boolean; error?: string }
        if (!res.ok) throw new Error(data.error ?? 'Unable to load moon-day reminders.')
        if (!cancelled) setEnabled(data.remindersEnabled ?? true)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load moon-day reminders.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleToggle(next: boolean) {
    setSaving(true)
    setError(null)
    setEnabled(next)
    try {
      const res = await fetch('/api/settings/moon-day-reminders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remindersEnabled: next }),
      })
      const data = (await res.json()) as { remindersEnabled?: boolean; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Unable to save.')
      setEnabled(data.remindersEnabled ?? next)
    } catch (err) {
      setEnabled((current) => !next || current)
      setError(err instanceof Error ? err.message : 'Unable to save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="shell-panel px-6 py-6 md:px-8">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-400/30 bg-violet-400/10 text-violet-200">
          <Bell size={18} />
        </div>
        <div>
          <p className="shell-kicker">Notifications</p>
          <h2 className="shell-subsection-title mt-1">In-app reminders</h2>
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-[1rem] border border-border/70 bg-stone-950/55 px-4 py-4">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-border/80"
          checked={enabled}
          disabled={loading || saving}
          onChange={(event) => void handleToggle(event.target.checked)}
        />
        <span>
          <span className="block text-sm font-medium text-bone">Moon-day reminders</span>
          <span className="mt-1 block text-sm leading-6 text-bone-muted">
            On new and full moon days, show a gentle strip on Today offering a ritual journal entry. No push
            notifications.
          </span>
        </span>
      </label>

      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
    </section>
  )
}
