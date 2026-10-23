"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ONBOARDING_STEPS } from "@/lib/constants";
import {
  ONBOARDING_STEPS_IA5,
  readIa5GeneratingMode,
  readIa5OnboardingPath,
  type Ia5OnboardingPath,
} from "@/lib/onboarding/ia-onboarding-routes";
import { iaOnboarding5FlagEnabled } from "@/lib/onboarding/ia-onboarding-flag";

function WeekReadingProgressBar() {
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

function NumericProgressBar({
  title,
  stepNumber,
  total,
}: {
  title: string;
  stepNumber: number;
  total: number;
}) {
  const progressPercent = (stepNumber / total) * 100;
  return (
    <div className="mt-6 space-y-2">
      <div className="flex justify-between text-xs uppercase tracking-[0.18em] text-bone-muted/70">
        <span>{title}</span>
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

function NeutralProgressBar({ title }: { title: string }) {
  return (
    <div className="mt-6 space-y-2">
      <div className="text-xs uppercase tracking-[0.18em] text-bone-muted/70">
        <span>{title}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-stone-800">
        <div className="h-full w-[20%] rounded-full bg-leather-400 transition-all duration-500" />
      </div>
    </div>
  );
}

export function OnboardingProgressBar() {
  const pathname = usePathname();
  const ia5 = iaOnboarding5FlagEnabled(process.env.NEXT_PUBLIC_IA_ONBOARDING5);
  const [ia5Path, setIa5Path] = useState<Ia5OnboardingPath | null>(null);
  const [ia5GeneratingMode, setIa5GeneratingMode] = useState<ReturnType<typeof readIa5GeneratingMode>>(null);

  useEffect(() => {
    if (!ia5) return;
    setIa5Path(readIa5OnboardingPath());
    setIa5GeneratingMode(readIa5GeneratingMode());
  }, [ia5, pathname]);

  if (pathname === "/onboarding/generating-week") {
    return <WeekReadingProgressBar />;
  }

  if (pathname === "/onboarding/generating" && ia5) {
    if (ia5GeneratingMode === "week") {
      return <WeekReadingProgressBar />;
    }
    const total = ONBOARDING_STEPS_IA5.length;
    return <NumericProgressBar title="Building" stepNumber={total} total={total} />;
  }

  if (pathname === "/onboarding" && ia5) {
    const title = ONBOARDING_STEPS_IA5[0].title;
    if (ia5Path === "free") {
      return <NumericProgressBar title={title} stepNumber={1} total={2} />;
    }
    if (ia5Path === "paid") {
      return <NumericProgressBar title={title} stepNumber={1} total={ONBOARDING_STEPS_IA5.length} />;
    }
    return <NeutralProgressBar title={title} />;
  }

  const steps = ia5 ? ONBOARDING_STEPS_IA5 : ONBOARDING_STEPS;
  const currentStep = steps.find((s) => s.path === pathname);
  const stepNumber = currentStep?.step ?? 1;
  const stepTitle = currentStep?.title ?? "";
  const total = steps.length;

  return <NumericProgressBar title={stepTitle} stepNumber={stepNumber} total={total} />;
}
