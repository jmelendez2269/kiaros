import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getUserProfileId } from '@/lib/ai/usage'
import {
  DEFAULT_VOICE_KEY,
  VOICE_PRESETS,
} from '@/lib/ai/journal-insight-synthesis'

const MAX_VOICE_PROMPT_LENGTH = 800
const MAX_VOICE_LABEL_LENGTH = 60

interface PutBody {
  voiceKey?: string
  voicePrompt?: string
  voiceLabel?: string
}

interface ResolvedVoice {
  voicePrompt: string
  voiceLabel: string
}

function resolveBody(body: PutBody): ResolvedVoice | { error: string; status: number } {
  if (body.voicePrompt && body.voicePrompt.trim().length > 0) {
    const trimmed = body.voicePrompt.trim()
    if (trimmed.length > MAX_VOICE_PROMPT_LENGTH) {
      return { error: `voicePrompt exceeds ${MAX_VOICE_PROMPT_LENGTH} characters`, status: 400 }
    }
    const label = (body.voiceLabel?.trim() || 'Custom').slice(0, MAX_VOICE_LABEL_LENGTH)
    return { voicePrompt: trimmed, voiceLabel: label }
  }
  const key = body.voiceKey || DEFAULT_VOICE_KEY
  const preset = VOICE_PRESETS[key]
  if (!preset) {
    return { error: `Unknown voiceKey: ${key}`, status: 400 }
  }
  return { voicePrompt: preset.prompt, voiceLabel: preset.label }
}

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profileId = await getUserProfileId(userId)
    if (!profileId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const admin = createAdminSupabase()
    const { data } = await admin
      .from('user_settings')
      .select('journal_insight_voice, journal_insight_voice_label, journal_insight_voice_updated_at')
      .eq('user_id', profileId)
      .maybeSingle()

    return NextResponse.json({
      voicePrompt: data?.journal_insight_voice ?? null,
      voiceLabel: data?.journal_insight_voice_label ?? null,
      updatedAt: data?.journal_insight_voice_updated_at ?? null,
    })
  } catch (error) {
    console.error('[journal-insights/settings GET] Failed:', error)
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as PutBody
    const resolved = resolveBody(body)
    if ('error' in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status })
    }

    const profileId = await getUserProfileId(userId)
    if (!profileId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const admin = createAdminSupabase()
    const now = new Date().toISOString()
    const { error } = await admin
      .from('user_settings')
      .upsert(
        {
          user_id: profileId,
          journal_insight_voice: resolved.voicePrompt,
          journal_insight_voice_label: resolved.voiceLabel,
          journal_insight_voice_updated_at: now,
        },
        { onConflict: 'user_id' },
      )

    if (error) throw error

    return NextResponse.json({
      voicePrompt: resolved.voicePrompt,
      voiceLabel: resolved.voiceLabel,
      updatedAt: now,
    })
  } catch (error) {
    console.error('[journal-insights/settings PUT] Failed:', error)
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
