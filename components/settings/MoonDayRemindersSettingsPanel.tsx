'use client'

import { Bell } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  readMoonDayRemindersEnabled,
  writeMoonDayRemindersEnabled,
} from '@/lib/today/moon-day-nudge-storage'

export function MoonDayRemindersSettingsPanel() {
  const [enabled, setEnabled] = useState(true)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setEnabled(readMoonDayRemindersEnabled())
    setHydrated(true)
  }, [])

  function handleToggle(next: boolean) {
    setEnabled(next)
    writeMoonDayRemindersEnabled(next)
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
          disabled={!hydrated}
          onChange={(event) => handleToggle(event.target.checked)}
        />
        <span>
          <span className="block text-sm font-medium text-bone">Moon-day reminders</span>
          <span className="mt-1 block text-sm leading-6 text-bone-muted">
            On new and full moon days, show a gentle strip on Today offering a ritual journal entry. Stored on
            this device only. No push notifications.
          </span>
        </span>
      </label>
    </section>
  )
}
