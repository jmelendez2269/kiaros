import Link from 'next/link'
import { Frame, K, Kicker } from '@/components/almanac'
import { loadSkyStamp } from '@/lib/journal/load-sky-stamp'
import { getTodayIntention } from '@/lib/today/get-today-intention'
import { rememberedEntriesLine, topThemes } from '@/lib/oracle/holding'
import { createAdminSupabase } from '@/lib/supabase/admin'
import type { createServerSupabase } from '@/lib/supabase/server'

const label = { fontFamily: K.fMono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: K.inkDim }
const linkStyle = { fontFamily: K.fMono, fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: K.copperHi, textDecoration: 'none' }

/** What this conversation can draw on: the sky, remembered entries, the Blueprint week, and the themes that keep returning. Read-only; Stelloquy members only. */
export async function OracleHoldingPanel({ supabase, profileId, today }: { supabase: Awaited<ReturnType<typeof createServerSupabase>>; profileId: string; today: string }) {
  const [stamp, memoryRes, intention, topicsRes] = await Promise.all([
    loadSkyStamp(supabase, profileId, today).catch(() => null),
    supabase.from('journal_entries').select('id', { count: 'exact', head: true }).eq('include_in_stelloquy', true),
    getTodayIntention(today, profileId).catch(() => ({ status: 'no-blueprint' as const })),
    createAdminSupabase().from('capture_topics').select('capture_id, kind, label').eq('user_id', profileId).limit(5000),
  ])
  const remembered = memoryRes.error ? 0 : (memoryRes.count ?? 0)
  const themes = topThemes((topicsRes.data ?? []).map((t) => ({ capture_id: String(t.capture_id), kind: String(t.kind), label: String(t.label) })))
  const week = intention.status === 'ok' && intention.data.weekNumber ? intention.data : null

  return (
    <aside aria-label="What Stelloquy is holding" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Frame>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Kicker color={K.plum}>In this conversation</Kicker>
          <div><div style={label}>The sky</div>
            <div style={{ fontSize: 14.5 }}>{stamp ? `${stamp.moonPhase} Moon in ${stamp.moonSign}${stamp.retrogrades.length ? ` · ${stamp.retrogrades.join(', ')} retrograde` : ''}` : 'Today’s sky is not stored yet'}</div></div>
          <div><div style={label}>Your words</div><div style={{ fontSize: 14.5 }}>{rememberedEntriesLine(remembered)}</div></div>
          <div><div style={label}>Your plan</div>
            <div style={{ fontSize: 14.5 }}>{week ? `Blueprint week ${week.weekNumber} · “${week.theme}”` : 'No Blueprint for this year yet'}</div></div>
          <Link href="/settings" style={linkStyle}>Manage what it remembers →</Link>
        </div>
      </Frame>
      <Frame stars>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Kicker color={K.violetDim}>Themes here</Kicker>
          {themes.length ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {themes.map((t) => <span key={t} style={{ padding: '6px 12px', borderRadius: 999, border: `1px solid ${K.violetDim}66`, background: `${K.violetDim}1a`, fontSize: 13 }}>{t}</span>)}
            </div>
          ) : null}
          <span style={{ fontSize: 13.5, lineHeight: 1.55, color: K.inkDim }}>Capture a moment and these join your mind map as stars.</span>
          <Link href="/insights/mind-map" style={linkStyle}>Open your mind map →</Link>
        </div>
      </Frame>
      <Link href="/insights" style={linkStyle}>Back to Insights →</Link>
    </aside>
  )
}
