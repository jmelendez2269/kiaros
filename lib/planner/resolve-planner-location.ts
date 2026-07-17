import 'server-only'

// Fallback location/timezone when the user hasn't completed onboarding's
// birth-location step yet — matches the app-wide default used for the
// Today dashboard's ephemeris snapshot.
export const FALLBACK_LAT = 40.7128
export const FALLBACK_LNG = -74.006
export const FALLBACK_TZ = 'America/New_York'

export interface LocationProfileFields {
  birth_lat: number | null
  birth_lng: number | null
  birth_tz: string | null
  planner_lat: number | null
  planner_lng: number | null
  planner_tz: string | null
}

export interface ResolvedLocation {
  lat: number
  lng: number
  timeZone: string
}

/**
 * Resolves which location powers a user's energy-window computation.
 *
 * The planner location override is atomic: lat, lng, and timezone must all
 * be set together, or the birth location is used in full. Falling back
 * field-by-field would let a user's planner timezone (e.g. "America/Los_Angeles")
 * pair with their birth-city coordinates, computing sunrise for the wrong
 * place and then reading it as the wrong local time — desyncing the whole
 * energy-window calculation.
 */
export function resolvePlannerLocation(profile: LocationProfileFields | null | undefined): ResolvedLocation {
  const hasPlannerOverride =
    profile?.planner_lat != null && profile?.planner_lng != null && profile?.planner_tz != null

  if (hasPlannerOverride) {
    return {
      lat: profile.planner_lat as number,
      lng: profile.planner_lng as number,
      timeZone: profile.planner_tz as string,
    }
  }

  return {
    lat: profile?.birth_lat ?? FALLBACK_LAT,
    lng: profile?.birth_lng ?? FALLBACK_LNG,
    timeZone: profile?.birth_tz ?? FALLBACK_TZ,
  }
}
