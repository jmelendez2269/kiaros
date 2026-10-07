import 'server-only'

import { currentUser } from '@clerk/nextjs/server'
import {
  extractStripeOrderIds,
  loadOrderSubscriptionMap,
  resolveUserAccess,
  type ProductEntitlementRecord,
} from '@/lib/commerce/entitlements'
import { createAdminSupabase } from '@/lib/supabase/admin'

/** Planner + Oracle entitlement, with the same app-admin bypass as Patterns. */
export async function memberHasOracleAccess(
  profileId: string,
  entitlements: ProductEntitlementRecord[],
): Promise<boolean> {
  const clerkUser = await currentUser()
  if (clerkUser?.publicMetadata?.isAdmin === true) return true

  const admin = createAdminSupabase()
  const orderIds = extractStripeOrderIds(entitlements)
  const subscriptionMap = await loadOrderSubscriptionMap(admin, orderIds, { userId: profileId })
  const access = resolveUserAccess(
    entitlements,
    new Date().toISOString().slice(0, 10),
    undefined,
    subscriptionMap,
  )
  return access.hasOracleAccess
}
