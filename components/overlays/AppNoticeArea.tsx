'use client'

import type { ReactNode } from 'react'

/**
 * Single notice stack for global overlays (reflection + pattern discovery).
 * Pinned outside page content — mounted from the app shell / sidebar, not Today.
 */
export function AppNoticeArea({ children }: { children: ReactNode }) {
  if (!children) return null

  return (
    <div
      className="flex w-full flex-col gap-2"
      aria-label="Notices"
      data-testid="app-notice-area"
    >
      {children}
    </div>
  )
}
