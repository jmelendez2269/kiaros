import { createAdminSupabase } from '@/lib/supabase/admin'

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General feedback',
  feature_request: 'Feature request',
  feels_off: 'Feels off',
  bug: 'Bug',
}

const SUB_LABELS: Record<string, string> = {
  generic: 'Feels generic',
  inaccurate: 'Factually inaccurate',
  tradition_mismatch: 'Tradition / house mismatch',
  other: 'Other',
}

export default async function FeedbackAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter } = await searchParams
  const onlyFeelsOff = filter === 'feels_off'

  const supabase = createAdminSupabase()

  let query = supabase
    .from('feedback')
    .select('id, category, sub_category, message, page_context, created_at, user_id')
    .order('created_at', { ascending: false })
    .limit(100)

  if (onlyFeelsOff) {
    query = query.eq('category', 'feels_off')
  }

  const { data: rows } = await query

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Feedback</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {onlyFeelsOff ? 'Showing: feels off submissions only' : 'All submissions, newest first'}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/admin/feedback"
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              !onlyFeelsOff
                ? 'border-border bg-muted text-foreground'
                : 'border-border/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            All
          </a>
          <a
            href="/admin/feedback?filter=feels_off"
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              onlyFeelsOff
                ? 'border-border bg-muted text-foreground'
                : 'border-border/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            Feels off
          </a>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-muted">
              <tr>
                <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Date</th>
                <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Category</th>
                <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Sub</th>
                <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Page</th>
                <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows?.length ? (
                rows.map((row) => (
                  <tr key={row.id} className={row.category === 'feels_off' ? 'bg-amber-950/20' : ''}>
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-muted-foreground">
                      {row.created_at.slice(0, 16).replace('T', ' ')}
                    </td>
                    <td className="px-5 py-3 text-sm text-foreground">
                      {CATEGORY_LABELS[row.category] ?? row.category}
                    </td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">
                      {row.sub_category ? (SUB_LABELS[row.sub_category] ?? row.sub_category) : '—'}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {row.page_context ?? '—'}
                    </td>
                    <td className="max-w-sm px-5 py-3 text-sm text-muted-foreground">
                      {row.message ?? <span className="italic opacity-50">no message</span>}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-5 py-8 text-sm text-muted-foreground" colSpan={5}>
                    No feedback yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
