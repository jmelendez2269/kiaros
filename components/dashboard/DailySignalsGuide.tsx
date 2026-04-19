'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'kiaros-hide-daily-signals-guide'

export function DailySignalsGuide({ signalStyles }: { signalStyles: string[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const dismissed = window.localStorage.getItem(STORAGE_KEY) === 'true'
    setIsDismissed(dismissed)
    setIsOpen(!dismissed)
    setIsReady(true)
  }, [])

  function dismissForever() {
    window.localStorage.setItem(STORAGE_KEY, 'true')
    setIsDismissed(true)
    setIsOpen(false)
  }

  function restoreGuide() {
    window.localStorage.removeItem(STORAGE_KEY)
    setIsDismissed(false)
    setIsOpen(true)
  }

  if (!isReady) {
    return null
  }

  if (isDismissed) {
    return (
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={restoreGuide}
          className="text-xs text-bone-muted underline decoration-border underline-offset-4 transition-colors hover:text-bone"
        >
          Show daily signals guide again
        </button>
      </div>
    )
  }

  return (
    <div className="mt-4 rounded-[1rem] border border-border/70 bg-stone-950/60 px-4 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-bone-muted/55">
            Daily signals guide
          </p>
          <p className="mt-1 text-[0.95rem] leading-6 text-bone-muted/90">
            Use this when you want help reading the bars. You can collapse it or hide it for good.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            className="text-xs text-bone-muted underline decoration-border underline-offset-4 transition-colors hover:text-bone"
          >
            {isOpen ? 'Collapse guide' : 'Open guide'}
          </button>
          <button
            type="button"
            onClick={dismissForever}
            className="text-xs text-bone-muted underline decoration-border underline-offset-4 transition-colors hover:text-bone"
          >
            Don&apos;t show again
          </button>
        </div>
      </div>

      {isOpen ? (
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-[0.9rem] border border-border/60 bg-stone-900/50 px-3 py-3">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-5 rounded-full ${signalStyles[0]}`} />
              <p className="text-[0.98rem] font-semibold text-bone">Activation</p>
            </div>
            <p className="mt-2 text-[0.95rem] leading-7 text-bone-muted/90">
              Higher means the day has more momentum for action, decisions, outreach, and forward movement.
            </p>
          </div>
          <div className="rounded-[0.9rem] border border-border/60 bg-stone-900/50 px-3 py-3">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-5 rounded-full ${signalStyles[1]}`} />
              <p className="text-[0.98rem] font-semibold text-bone">Review</p>
            </div>
            <p className="mt-2 text-[0.95rem] leading-7 text-bone-muted/90">
              Higher means the day is better for revision, reflection, slowing down, and reworking what is already in motion.
            </p>
          </div>
          <div className="rounded-[0.9rem] border border-border/60 bg-stone-900/50 px-3 py-3">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-5 rounded-full ${signalStyles[2]}`} />
              <p className="text-[0.98rem] font-semibold text-bone">Lunar charge</p>
            </div>
            <p className="mt-2 text-[0.95rem] leading-7 text-bone-muted/90">
              Higher means the moon tone is louder, so intuition, emotion, and inner weather may shape the day more strongly.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
