import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'
import { BlueprintView } from '@/components/blueprint/BlueprintView'
import type { BlueprintOutput } from '@/types/blueprint'

export default async function BlueprintPage() {
  const supabase = await createServerSupabase()
  const currentYear = new Date().getFullYear()

  const { data: row } = await supabase
    .from('blueprints')
    .select(
      'id, plan_year, year_theme, year_summary, quarters, months, weeks, push_periods, rest_periods'
    )
    .eq('plan_year', currentYear)
    .eq('status', 'ready')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!row) {
    return (
      <div className="shell-panel flex flex-col items-center justify-center space-y-5 py-24 text-center">
        <div className="text-4xl text-bone-muted">✦</div>
        <h1 className="font-serif text-3xl text-bone">No blueprint yet</h1>
        <p className="max-w-sm text-sm leading-relaxed text-bone-muted">
          Your {currentYear} blueprint hasn&apos;t been generated. Complete onboarding to create
          your personalised year plan grounded in your natal chart and real planetary transits.
        </p>
        <Link
          href="/onboarding"
          className="rounded-2xl border border-leather-400/50 bg-leather-500/35 px-5 py-3 text-sm font-semibold text-bone shadow-glow"
        >
          Complete Setup
        </Link>
      </div>
    )
  }

  const blueprint: BlueprintOutput = {
    yearTheme: row.year_theme ?? '',
    yearSummary: row.year_summary ?? '',
    quarters: (row.quarters as unknown as BlueprintOutput['quarters']) ?? [],
    months: (row.months as unknown as BlueprintOutput['months']) ?? [],
    weeks: (row.weeks as unknown as BlueprintOutput['weeks']) ?? [],
    pushPeriods: (row.push_periods as unknown as BlueprintOutput['pushPeriods']) ?? [],
    restPeriods: (row.rest_periods as unknown as BlueprintOutput['restPeriods']) ?? [],
  }

  return <BlueprintView blueprint={blueprint} planYear={row.plan_year} />
}
