"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const STORAGE_KEY = "kiaros_onboarding_step2";

const SUGGESTED_CATEGORIES = [
  "Work & Career",
  "Relationships",
  "Health & Wellness",
  "Creative Projects",
  "Personal Growth",
  "Family",
  "Financial",
  "Spirituality",
];

interface GoalCategory {
  name: string;
  success: string;
}

export default function OnboardingGoalsPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<GoalCategory[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSelected(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const isSelectedName = (name: string) => selected.some((c) => c.name === name);

  const toggleCategory = (name: string) => {
    if (isSelectedName(name)) {
      setSelected((prev) => prev.filter((c) => c.name !== name));
    } else {
      if (selected.length >= 7) {
        setError("Choose up to 7 areas.");
        return;
      }
      setSelected((prev) => [...prev, { name, success: "" }]);
      setError("");
    }
  };

  const addCustom = () => {
    const name = customInput.trim();
    if (!name) return;
    if (selected.length >= 7) {
      setError("Choose up to 7 areas.");
      return;
    }
    if (isSelectedName(name)) return;
    setSelected((prev) => [...prev, { name, success: "" }]);
    setCustomInput("");
    setError("");
  };

  const updateSuccess = (name: string, value: string) => {
    setSelected((prev) => prev.map((c) => (c.name === name ? { ...c, success: value } : c)));
  };

  const onSubmit = async () => {
    if (selected.length === 0) {
      setError("Choose at least 1 area.");
      return;
    }
    setIsSubmitting(true);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(selected));

    await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categories: selected.map((c, i) => ({
          name: c.name,
          success: c.success || null,
          sort_order: i,
        })),
      }),
    });

    router.push("/onboarding/study-focus");
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="shell-kicker">Step 2</p>
        <h2 className="font-serif text-3xl text-bone">Choose your focus layers</h2>
        <p className="leading-relaxed text-bone-muted">
          What parts of your life matter most right now? Choose the areas you want this planner to
          support. These are the places where you want more clarity, alignment, support, or
          movement this year.
        </p>
        <div className="flex w-fit items-center gap-2 rounded-full border border-leather-500/25 bg-leather-500/8 px-3 py-1.5 text-xs text-leather-200/80">
          <span className="h-1.5 w-1.5 rounded-full bg-leather-300/70" />
          Your Oracle knows your goals by name and what success looks like to you
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-bone">Choose your focus areas</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_CATEGORIES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => toggleCategory(name)}
              className={`rounded-full border px-3 py-2 text-sm transition-colors ${
                isSelectedName(name)
                  ? "border-leather-400/50 bg-leather-500/25 text-bone"
                  : "border-border/80 bg-stone-950/70 text-bone-muted hover:bg-stone-850"
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())}
            placeholder="Add your own..."
            className="flex-1 rounded-xl border border-border/80 bg-stone-950/70 px-3 py-2 text-sm text-bone placeholder:text-bone-muted/45 focus:outline-none focus:ring-2 focus:ring-leather-400"
          />
          <button
            type="button"
            onClick={addCustom}
            className="rounded-xl border border-border/80 bg-stone-900 px-3 py-2 text-sm text-bone-muted hover:bg-stone-800 hover:text-bone"
          >
            Add
          </button>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}
        <p className="text-xs text-bone-muted">{selected.length}/7 selected</p>
      </div>

      {selected.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-bone">What does success look like in each area?</p>
          <p className="text-xs text-bone-muted">
            Optional. Keep this focused on what success in each life area would feel or look like
            for you.
          </p>
          {selected.map((cat) => (
            <div key={cat.name} className="space-y-1.5">
              <label className="block text-sm font-medium text-bone">{cat.name}</label>
              <textarea
                value={cat.success}
                onChange={(e) => updateSuccess(cat.name, e.target.value)}
                placeholder={`What does success look like for ${cat.name.toLowerCase()}?`}
                rows={2}
                className="w-full resize-none rounded-xl border border-border/80 bg-stone-950/70 px-3 py-3 text-sm text-bone placeholder:text-bone-muted/45 focus:outline-none focus:ring-2 focus:ring-leather-400"
              />
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={isSubmitting || selected.length === 0}
        className="w-full rounded-2xl border border-leather-400/50 bg-leather-500/35 px-4 py-3 font-medium text-bone shadow-glow hover:bg-leather-500/45 disabled:opacity-50"
      >
        {isSubmitting ? "Saving..." : "Continue"}
      </button>
    </div>
  );
}
