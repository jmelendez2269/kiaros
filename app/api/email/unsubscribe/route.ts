import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { BRAND } from '@/lib/brand'

export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get('u')
  if (!userId) return NextResponse.json({ error: 'Missing user id' }, { status: 400 })

  const admin = createAdminSupabase()
  await admin.from('user_profiles').update({ marketing_consent: false }).eq('id', userId)

  return new NextResponse(
    `<!doctype html><html><body style="background:#12100e;color:#e8e2d8;font-family:Georgia,serif;padding:48px 20px;text-align:center;">
      <p>You won't hear from ${BRAND.product} by email again. The app is still here whenever you are.</p>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  )
}
