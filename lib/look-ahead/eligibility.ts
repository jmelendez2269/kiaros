/**
 * Who sees the look-ahead: every member with active planner access, monthly
 * or yearly. Etsy purchases are out of scope, so access that comes only from
 * an Etsy order doesn't open it.
 */
export function eligibleForLookAhead(access: {
  isAdmin?: boolean
  hasPlannerAccess: boolean
  activeEntitlements: Array<{ source: string }>
}): boolean {
  if (access.isAdmin) return true
  if (!access.hasPlannerAccess) return false
  return access.activeEntitlements.some((e) => e.source !== 'etsy')
}
