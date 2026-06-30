import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'

const FEELS_OFF_CATEGORY = 'feels_off'
const NOTIFY_EMAIL = 'support@kairosplanner.xyz'

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { category, sub_category, message, page_context } = body as {
    category?: string
    sub_category?: string
    message?: string
    page_context?: string
  }

  if (!category) return NextResponse.json({ error: 'category is required' }, { status: 400 })

  const supabase = await createServerSupabase()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, email, tradition')
    .maybeSingle()

  const admin = createAdminSupabase()
  await admin.from('feedback').insert({
    user_id: profile?.id ?? null,
    category,
    sub_category: sub_category ?? null,
    message: message ?? null,
    page_context: page_context ?? null,
  })

  if (category === FEELS_OFF_CATEGORY && process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'Kiaros Feedback <noreply@kairosplanner.xyz>',
        to: NOTIFY_EMAIL,
        subject: `[Feels Off] ${sub_category ?? 'unspecified'} — ${profile?.email ?? userId}`,
        text: [
          `Category: ${category}`,
          `Sub-category: ${sub_category ?? '—'}`,
          `User: ${profile?.email ?? userId}`,
          `Tradition: ${profile?.tradition ?? 'not set'}`,
          `Page: ${page_context ?? '—'}`,
          ``,
          `Message:`,
          message ?? '(no message)',
        ].join('\n'),
      })
    } catch (err) {
      // Non-fatal — feedback is already saved to DB
      console.error('[feedback] Email send failed:', err)
    }
  }

  return NextResponse.json({ ok: true })
}
