import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import {
  ORACLE_MONTHLY_MESSAGE_LIMIT,
  getMonthlyUsage,
  getUserProfileId,
} from '@/lib/ai/usage'

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profileId = await getUserProfileId(userId)
  if (!profileId) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const oracle = await getMonthlyUsage(profileId, 'oracle')

  return NextResponse.json({
    oracle: {
      messageCount: oracle.messageCount,
      limit: ORACLE_MONTHLY_MESSAGE_LIMIT,
      remaining: Math.max(0, ORACLE_MONTHLY_MESSAGE_LIMIT - oracle.messageCount),
      inputTokens: oracle.inputTokens,
      inputTokensCached: oracle.inputTokensCached,
      outputTokens: oracle.outputTokens,
      cacheHitRate:
        oracle.inputTokens + oracle.inputTokensCached > 0
          ? oracle.inputTokensCached / (oracle.inputTokens + oracle.inputTokensCached)
          : 0,
    },
  })
}
