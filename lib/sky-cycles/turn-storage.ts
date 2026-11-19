/**
 * Where the "sky turned today" popup remembers it has been shown. Kept in the
 * browser, as the other auto-opened popups are: seen once per member per day,
 * and an off switch for this device.
 */
export const SKY_TURN_OPEN_EVENT = 'kiaros:open-sky-cycle'

export const skyTurnSeenKey = (userId: string, date: string) => `kiaros-sky-turn-seen:${userId}:${date}`
export const skyTurnOffKey = (userId: string) => `kiaros-sky-turn-off:${userId}`

function read(key: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function write(key: string): void {
  try {
    window.localStorage.setItem(key, '1')
  } catch {
    /* ignore quota / private mode */
  }
}

export const isSkyTurnSeen = (userId: string, date: string) => read(skyTurnSeenKey(userId, date))
export const markSkyTurnSeen = (userId: string, date: string) => write(skyTurnSeenKey(userId, date))
export const isSkyTurnOff = (userId: string) => read(skyTurnOffKey(userId))
export const turnSkyTurnOff = (userId: string) => write(skyTurnOffKey(userId))
