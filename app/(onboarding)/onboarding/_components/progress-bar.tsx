"use client";

import { usePathname } from "next/navigation";
import { ONBOARDING_STEPS } from "@/lib/constants";
import { ONBOARDING_STEPS_IA5 } from "@/lib/onboarding/ia-onboarding-routes";
import { iaOnboarding5FlagEnabled } from "@/lib/onboarding/ia-onboarding-flag";

export function OnboardingProgressBar() {
  const pathname = usePathname();
  const ia5 = iaOnboarding5FlagEnabled(process.env.NEXT_PUBLIC_IA_ONBOARDING5);

  if (pathname === "/onboarding/generating" && ia5) {
    const total = ONBOARDING_STEPS_IA5.length;
    const progressPercent = 100;
    return (
      <div className="mt-6 space-y-2">
        <div className="flex justify-between text-xs uppercase tracking-[0.18em] text-bone-muted/70">
          <span>Building</span>
          <span>
            {total} of {total}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-stone-800">
          <div
            className="h-full rounded-full bg-leather-400 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    );
  }

  if (pathname === "/onboarding/generating-week") {
    return (
      <div className="mt-6 space-y-2">
        <div className="flex justify-between text-xs uppercase tracking-[0.18em] text-bone-muted/70">
          <span>Week reading</span>
          <span>Ready</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-stone-800">
          <div className="h-full w-full rounded-full bg-leather-400" />
        </div>
      </div>
    );
  }

  const steps = ia5 ? ONBOARDING_STEPS_IA5 : ONBOARDING_STEPS;
  const currentStep = steps.find((s) => s.path === pathname);
  const stepNumber = currentStep?.step ?? 1;
  const stepTitle = currentStep?.title ?? "";
  const total = steps.length;
  const progressPercent = (stepNumber / total) * 100;

  return (
    <div className="mt-6 space-y-2">
      <div className="flex justify-between text-xs uppercase tracking-[0.18em] text-bone-muted/70">
        <span>{stepTitle}</span>
        <span>
          {stepNumber} of {total}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-stone-800">
        <div
          className="h-full rounded-full bg-leather-400 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
