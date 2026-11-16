"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ThemePicker } from "@/components/shared/ThemePicker";
import { THEMES, type ThemeId } from "@/lib/constants";
import { BRAND } from "@/lib/brand";
import { iaOnboarding5FlagEnabled } from "@/lib/onboarding/ia-onboarding-flag";
import {
  onboardingGeneratingHref,
  persistIa5OnboardingRoutingFromDestination,
} from "@/lib/onboarding/ia-onboarding-routes";
import {
  ONBOARDING_IA5_FOCUS_RING,
  ONBOARDING_IA5_SECONDARY_BUTTON,
  onboardingIa5FieldClass,
} from "@/lib/onboarding/ia5-ui";
import { OnboardingIa5StepKicker } from "@/components/onboarding/OnboardingIa5StepKicker";
import { OnboardingIa5StepNav } from "@/components/onboarding/OnboardingIa5StepNav";

const STORAGE_KEY = "kiaros_onboarding_step6";
const STUDY_FOCUS_KEY = "kiaros_onboarding_step3_study_focus";
const COOKIE_NAME = "kiaros-theme";

function applyThemeLocally(theme: ThemeId) {
  document.documentElement.dataset.theme = theme;
  document.cookie = `${COOKIE_NAME}=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export default function OnboardingThemePage() {
  const router = useRouter();
  const ia5 = iaOnboarding5FlagEnabled(process.env.NEXT_PUBLIC_IA_ONBOARDING5);
  const [selected, setSelected] = useState<ThemeId>("obsidian");
  const [studyFocus, setStudyFocus] = useState("");
  const [showStudyFocus, setShowStudyFocus] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { theme } = JSON.parse(saved);
        if (theme) {
          setSelected(theme as ThemeId);
          applyThemeLocally(theme);
        }
      } catch {}
    }
  }, []);

  const handleChange = (theme: ThemeId) => {
    setSelected(theme);
    applyThemeLocally(theme);
  };

  const persistStudyFocus = async (text: string) => {
    const trimmed = text.trim();
    localStorage.setItem(STUDY_FOCUS_KEY, JSON.stringify({ study_focus: trimmed }));
    if (!trimmed) return;
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ study_focus: trimmed }),
    });
  };

  const onSubmit = async () => {
    setIsSubmitting(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: selected }));

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: selected }),
    });

    if (!res.ok) {
      setSaveError("Something went wrong saving your theme. Please try again.");
      setIsSubmitting(false);
      return;
    }

    if (ia5 && studyFocus.trim()) {
      await persistStudyFocus(studyFocus);
    }

    const completeRes = await fetch("/api/onboarding/complete", { method: "POST" });
    if (!completeRes.ok) {
      setSaveError("Your setup was saved, but we couldn't open the next step. Please try again.");
      setIsSubmitting(false);
      return;
    }

    const { destination } = (await completeRes.json()) as { destination: string };
    if (ia5) {
      persistIa5OnboardingRoutingFromDestination(destination);
      router.push(onboardingGeneratingHref(true, destination));
      return;
    }
    router.push(destination);
  };

  const selectedTheme = THEMES.find((t) => t.id === selected)!;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <OnboardingIa5StepKicker legacyKicker="Step 6" />
        <h2 className="font-serif text-3xl text-bone">Choose your aesthetic</h2>
        <p className="leading-relaxed text-bone-muted">
          Choose the atmosphere you want to live with. Your blueprint will live in this palette
          throughout the year, and you can always change it later.
        </p>
      </div>

      <ThemePicker value={selected} onChange={handleChange} ia5FocusRing={ia5} />

      <div className="rounded-xl border border-border/60 bg-stone-950/40 px-4 py-3">
        <p className="text-sm leading-relaxed text-bone-muted">
          <span className="font-medium text-bone">{selectedTheme.name} - </span>
          {selectedTheme.description}
        </p>
      </div>

      {ia5 ? (
        <div className="rounded-xl border border-border/60 bg-stone-950/40 px-4 py-4">
          <p className="text-sm font-medium text-bone">Something you&apos;re studying (optional)</p>
          <p className="mt-1 text-xs leading-relaxed text-bone-muted">
            If you&apos;re learning something this year, you can add it here. We use it in Curriculum
            and in your blueprint. You can also add it later in Settings or from Curriculum.
          </p>
          {!showStudyFocus ? (
            <button
              type="button"
              onClick={() => setShowStudyFocus(true)}
              disabled={isSubmitting}
              className={`mt-3 ${ONBOARDING_IA5_SECONDARY_BUTTON} ${ONBOARDING_IA5_FOCUS_RING}`}
            >
              Add study focus
            </button>
          ) : (
            <div className="mt-3 space-y-2">
              <label className="block text-sm font-medium text-bone">What are you studying or deepening?</label>
              <textarea
                value={studyFocus}
                onChange={(e) => setStudyFocus(e.target.value)}
                disabled={isSubmitting}
                rows={4}
                placeholder="Topics, books, or skills"
                className={onboardingIa5FieldClass(true, "w-full resize-none rounded-xl border border-border/80 bg-stone-950/70 px-4 py-3 text-sm text-bone placeholder:text-bone-muted/45")}
              />
            </div>
          )}
        </div>
      ) : null}

      {saveError && <p className="text-sm text-destructive">{saveError}</p>}

      {ia5 ? (
        <OnboardingIa5StepNav
          backHref="/onboarding/year-focus"
          onContinue={() => void onSubmit()}
          continueLabel="Continue"
          isSubmitting={isSubmitting}
        />
      ) : (
        <button
          type="button"
          onClick={() => void onSubmit()}
          disabled={isSubmitting}
          className="w-full rounded-2xl border border-leather-400/50 bg-leather-500/35 px-4 py-3 font-medium text-bone shadow-glow hover:bg-leather-500/45 disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "See what comes next"}
        </button>
      )}
    </div>
  );
}
