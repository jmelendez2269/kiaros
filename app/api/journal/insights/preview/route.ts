import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserProfileId } from '@/lib/ai/usage'
import {
  VOICE_PRESETS,
  resolveVoicePrompt,
  synthesizePreview,
} from '@/lib/ai/journal-insight-synthesis'

export const maxDuration = 60

interface RequestBody {
  voiceKey?: string
  voicePrompt?: string
}

function pickVoicePrompt(body: RequestBody): string | null {
  if (body.voicePrompt && body.voicePrompt.trim().length > 0) {
    return body.voicePrompt.trim()
  }
  if (body.voiceKey && VOICE_PRESETS[body.voiceKey]) {
    return VOICE_PRESETS[body.voiceKey].prompt
  }
  return null
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as RequestBody
    const voicePrompt = pickVoicePrompt(body) ?? resolveVoicePrompt(null)

    const profileId = await getUserProfileId(userId)
    if (!profileId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const result = await synthesizePreview({ userProfileId: profileId, voicePrompt })
    if (!result) {
      return NextResponse.json(
        { error: 'No patterns yet — write a few journal entries first.' },
        { status: 404 },
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[journal-insights/preview] Failed:', error)
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
