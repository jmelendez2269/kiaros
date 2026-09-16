import { runReflectionSchedule } from '@/lib/reflections/schedule'
export const maxDuration = 300
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 })
  try { return Response.json(await runReflectionSchedule()) }
  catch { return Response.json({ error: 'Reflection scheduling failed' }, { status: 503 }) }
}
