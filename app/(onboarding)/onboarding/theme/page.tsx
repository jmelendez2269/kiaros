"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ThemePicker } from "@/components/shared/ThemePicker";
import { THEMES, type ThemeId } from "@/lib/constants";

const STORAGE_KEY = "kiaros_onboarding_step6";
const COOKIE_NAME = "kiaros-theme";

function applyThemeLocally(theme: ThemeId) {
  document.documentElement.dataset.theme = theme;
  document.cookie = `${COOKIE_NAME}=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export default function OnboardingThemePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<ThemeId>("obsidian");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
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

  const onSubmit = async () => {
    setIsSubmitting(true);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: selected }));

    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: selected }),
    });

    router.push("/onboarding/generating");
  };

  const selectedTheme = THEMES.find((t) => t.id === selected)!;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="shell-kicker">Step 6</p>
        <h2 className="font-serif text-3xl text-bone">Choose your aesthetic</h2>
        <p className="leading-relaxed text-bone-muted">
          Choose the atmosphere you want to live with. Your blueprint will live in this palette
          throughout the year, and you can always change it later.
        </p>
      </div>

      <ThemePicker value={selected} onChange={handleChange} />

      <div className="rounded-xl border border-border/60 bg-stone-950/40 px-4 py-3">
        <p className="text-sm leading-relaxed text-bone-muted">
          <span className="font-medium text-bone">{selectedTheme.name} - </span>
          {selectedTheme.description}
        </p>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={isSubmitting}
        className="w-full rounded-2xl border border-leather-400/50 bg-leather-500/35 px-4 py-3 font-medium text-bone shadow-glow hover:bg-leather-500/45 disabled:opacity-50"
      >
        {isSubmitting ? "Saving..." : "Begin my planner"}
      </button>
    </div>
  );
}
