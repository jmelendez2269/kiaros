"use client";

import { usePathname } from "next/navigation";
import { ONBOARDING_STEPS } from "@/lib/constants";

export function OnboardingProgressBar() {
  const pathname = usePathname();

  const currentStep = ONBOARDING_STEPS.find((s) => s.path === pathname);
  const stepNumber = currentStep?.step ?? 1;
  const stepTitle = currentStep?.title ?? "";
  const total = ONBOARDING_STEPS.length;
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
