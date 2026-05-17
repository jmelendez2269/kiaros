import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  MonthBriefPinnedError,
  fetchOrGenerateMonthBrief,
  setMonthBriefPinned,
} from '@/lib/ai/month-brief-generator'
import { getUserProfileId } from '@/lib/ai/usage'

export const maxDuration = 90

interface RequestBody {
  year?: number
  month?: number
  regen?: boolean
  pin?: boolean
}

function getErrorMessage(error: unknown): string {
  if (error == null) return 'unknown error'
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  try { return JSON.stringify(error) } catch { return 'unknown error' }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as RequestBody
    const year = Number(body.year)
    const month = Number(body.month)

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 })
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Invalid month (1–12)' }, { status: 400 })
    }

    const profileId = await getUserProfileId(userId)
    if (!profileId) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (typeof body.pin === 'boolean') {
      try {
        const result = await setMonthBriefPinned({
          userProfileId: profileId,
          planYear: year,
          month,
          pinned: body.pin,
        })
        return NextResponse.json(result)
      } catch (error) {
        const message = getErrorMessage(error)
        const status = message.includes('No brief exists') ? 404 : 500
        return NextResponse.json({ error: message }, { status })
      }
    }

    try {
      const result = await fetchOrGenerateMonthBrief({
        userProfileId: profileId,
        planYear: year,
        month,
        forceRegen: Boolean(body.regen),
      })
      return NextResponse.json(result)
    } catch (error) {
      if (error instanceof MonthBriefPinnedError) {
        return NextResponse.json({ error: error.message, code: 'pinned' }, { status: 409 })
      }
      throw error
    }
  } catch (error) {
    console.error('[month-brief] Failed:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
