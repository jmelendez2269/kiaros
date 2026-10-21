/** Per-browser preference for Calendar Day sky overlays (no DB column). */
export const SKY_TIMING_VISIBLE_STORAGE_KEY = 'kiaros-calendar-day-sky-timing-visible'

export function skyTimingVisibleFromStorage(raw: string | null | undefined): boolean {
  if (raw === 'false') return false
  if (raw === 'true') return true
  return true
}

export function readSkyTimingVisibleFromStorage(
  getItem: (key: string) => string | null
): boolean {
  try {
    return skyTimingVisibleFromStorage(getItem(SKY_TIMING_VISIBLE_STORAGE_KEY))
  } catch {
    return true
  }
}

export function writeSkyTimingVisibleToStorage(
  setItem: (key: string, value: string) => void,
  visible: boolean
): void {
  setItem(SKY_TIMING_VISIBLE_STORAGE_KEY, visible ? 'true' : 'false')
}
