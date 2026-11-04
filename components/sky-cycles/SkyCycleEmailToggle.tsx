'use client'

import { useState } from 'react'
import { K } from '@/components/almanac'

/** Opt-in switch for sky cycle emails. Off until the member turns it on. */
export function SkyCycleEmailToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function toggle(next: boolean) {
    setSaving(true)
    setError(null)
    setEnabled(next)
    try {
      const res = await fetch('/api/settings/sky-cycle-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? "We couldn't save that. Please try again.")
      }
    } catch (e) {
      setEnabled(!next)
      setError(e instanceof Error ? e.message : "We couldn't save that. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ marginTop: 14 }}>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: saving ? 'wait' : 'pointer' }}>
        <input
          type="checkbox"
          role="switch"
          aria-checked={enabled}
          checked={enabled}
          disabled={saving}
          onChange={(e) => toggle(e.target.checked)}
          style={{ marginTop: 3 }}
        />
        <span>
          <span style={{ display: 'block', fontSize: 14, color: K.ink }}>Email me heads-ups</span>
          <span style={{ display: 'block', fontSize: 12.5, color: K.inkDim, marginTop: 2, lineHeight: 1.5 }}>
            A short note before a cycle begins, and another when its look back is ready.
          </span>
        </span>
      </label>
      {error ? (
        <p role="alert" style={{ margin: '6px 0 0', fontSize: 12.5, color: K.brickHi }}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
