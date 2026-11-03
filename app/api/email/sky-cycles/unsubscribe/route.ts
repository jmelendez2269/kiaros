import { NextResponse } from 'next/server'
import { BRAND } from '@/lib/brand'
import { verifySkyCycleUnsubscribeToken } from '@/lib/email/sky-cycle-unsubscribe-token'
import { createAdminSupabase } from '@/lib/supabase/admin'

function page(message: string, status = 200) {
  return new NextResponse(
    `<!doctype html><html><body style="background:#12100e;color:#e8e2d8;font-family:Georgia,serif;padding:48px 20px;text-align:center;">
      <p>${message}</p>
    </body></html>`,
    { status, headers: { 'Content-Type': 'text/html' } },
  )
}

/** One-click opt-out from sky cycle emails. Signed, so a link only affects its own recipient. */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const userId = url.searchParams.get('u') ?? ''
  const token = url.searchParams.get('t') ?? ''
  if (!userId || !token || !verifySkyCycleUnsubscribeToken(userId, token)) {
    return page('This link is not valid. You can turn sky cycle emails off from Today or Reviews in the app.', 400)
  }

  const admin = createAdminSupabase()
  const now = new Date().toISOString()
  const { error } = await admin
    .from('user_settings')
    .upsert({ user_id: userId, sky_cycle_emails: false, sky_cycle_emails_updated_at: now, updated_at: now }, { onConflict: 'user_id' })
  if (error) {
    console.error('[sky-cycle-emails] unsubscribe failed:', error.message)
    return page("We couldn't turn these emails off just now. Please try again, or switch them off in the app.", 500)
  }
  return page(`Sky cycle emails are off. The heads-ups are still on Today in ${BRAND.product} whenever you want them.`)
}
