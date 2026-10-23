'use client'

import { usePathname } from 'next/navigation'
import { ONBOARDING_STEPS_IA5 } from '@/lib/onboarding/ia-onboarding-routes'
import { iaOnboarding5FlagEnabled } from '@/lib/onboarding/ia-onboarding-flag'

type Props = {
  /** Legacy kicker when IA5 flag is off, e.g. "Step 4". */
  legacyKicker: string
}

export function OnboardingIa5StepKicker({ legacyKicker }: Props) {
  const pathname = usePathname()
  const ia5 = iaOnboarding5FlagEnabled(process.env.NEXT_PUBLIC_IA_ONBOARDING5)

  if (!ia5) {
    return <p className="shell-kicker">{legacyKicker}</p>
  }

  const step = ONBOARDING_STEPS_IA5.find((s) => s.path === pathname)
  const stepNumber = step?.step ?? 1

  return <p className="shell-kicker">Step {stepNumber}</p>
}
