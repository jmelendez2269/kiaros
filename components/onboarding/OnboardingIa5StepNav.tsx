'use client'

import { useRouter } from 'next/navigation'
import {
  ONBOARDING_IA5_BACK_BUTTON,
  ONBOARDING_IA5_FOCUS_RING,
  ONBOARDING_IA5_PRIMARY_BUTTON,
} from '@/lib/onboarding/ia5-ui'

type Props = {
  backHref: string
  onContinue: () => void
  continueLabel?: string
  continueType?: 'button' | 'submit'
  continueForm?: string
  isSubmitting?: boolean
  continueDisabled?: boolean
}

export function OnboardingIa5StepNav({
  backHref,
  onContinue,
  continueLabel = 'Continue',
  continueType = 'button',
  continueForm,
  isSubmitting = false,
  continueDisabled = false,
}: Props) {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
      <button
        type="button"
        onClick={() => router.push(backHref)}
        disabled={isSubmitting}
        className={`${ONBOARDING_IA5_BACK_BUTTON} ${ONBOARDING_IA5_FOCUS_RING} sm:w-auto`}
      >
        Back
      </button>
      <button
        type={continueType}
        form={continueForm}
        onClick={continueType === 'button' ? onContinue : undefined}
        disabled={isSubmitting || continueDisabled}
        className={`${ONBOARDING_IA5_PRIMARY_BUTTON} ${ONBOARDING_IA5_FOCUS_RING} sm:flex-1`}
      >
        {isSubmitting ? 'Saving...' : continueLabel}
      </button>
    </div>
  )
}
