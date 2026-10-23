'use client'

import type { TourStep } from '@/lib/tour/tour-step'
import { TourOverlayIa } from '@/components/tour/TourOverlayIa'
import { TourOverlayLegacy } from '@/components/tour/TourOverlayLegacy'

export function TourOverlay({
  steps,
  iaTourActive = false,
}: {
  steps: TourStep[]
  iaTourActive?: boolean
}) {
  if (iaTourActive) {
    return <TourOverlayIa steps={steps} />
  }
  return <TourOverlayLegacy steps={steps} />
}
