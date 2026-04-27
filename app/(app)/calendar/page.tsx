import Link from 'next/link'
import { CosmicPlanView } from '@/components/cosmic-plan/CosmicPlanView'
import { loadCurrentBlueprint } from '@/lib/blueprint/load'

export default async function CalendarPage() {
  const loaded = await loadCurrentBlueprint()
  const currentYear = new Date().getFullYear()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="shell-kicker mb-3">Cosmic Plan</p>
          <h1 className="shell-section-title">
            Planner built from your chart and this year&apos;s sky
          </h1>
        </div>
        <div className="shell-panel-soft px-4 py-3 text-sm text-bone-muted">
          Birth data creates the timing framework. Your onboarding choices deepen the customization.
        </div>
      </div>

      {loaded ? (
        <CosmicPlanView blueprint={loaded.blueprint} planYear={loaded.planYear} />
      ) : (
        <div className="shell-panel flex flex-col items-center justify-center space-y-5 py-24 text-center">
          <div className="text-4xl text-bone-muted">✦</div>
          <h2 className="font-serif text-3xl text-bone">No plan yet</h2>
          <p className="max-w-sm text-sm leading-relaxed text-bone-muted">
            Your {currentYear} cosmic plan hasn&apos;t been generated. Complete onboarding to create
            your personalised year built from your natal chart and real planetary transits.
          </p>
          <Link
            href="/onboarding"
            className="rounded-2xl border border-leather-400/50 bg-leather-500/35 px-5 py-3 text-sm font-semibold text-bone shadow-glow"
          >
            Complete Setup
          </Link>
        </div>
      )}
    </div>
  )
}
