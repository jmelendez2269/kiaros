"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const STORAGE_KEY = "kiaros_onboarding_step5";

export default function OnboardingCyclePage() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [lastPeriodStart, setLastPeriodStart] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const data = JSON.parse(saved);
      if (data.cycle_enabled !== undefined) setEnabled(data.cycle_enabled);
      if (data.avg_cycle_length) setCycleLength(data.avg_cycle_length);
      if (data.avg_period_length) setPeriodLength(data.avg_period_length);
      if (data.last_period_start) setLastPeriodStart(data.last_period_start);
    } catch {}
  }, []);

  const onSubmit = async () => {
    setIsSubmitting(true);
    const payload = {
      cycle_enabled: enabled,
      avg_cycle_length: enabled ? cycleLength : null,
      avg_period_length: enabled ? periodLength : null,
      last_period_start: enabled && lastPeriodStart ? lastPeriodStart : null,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    router.push("/onboarding/generating");
  };

  const skip = async () => {
    setIsSubmitting(true);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ cycle_enabled: false }));
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cycle_enabled: false }),
    });
    router.push("/onboarding/generating");
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="shell-kicker">Step 5</p>
        <h2 className="font-serif text-3xl text-bone">
          Add an optional energy layer <span className="text-base font-normal text-bone-muted">(optional)</span>
        </h2>
        <p className="leading-relaxed text-bone-muted">
          Kiaros can layer your menstrual cycle phases into your calendar and tracker -
          helping you plan with your energy, not against it. This is entirely optional
          and you can enable or change it anytime in settings.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        {[
          { phase: "Menstrual", days: "Days 1-5", desc: "Rest, reflect, release" },
          { phase: "Follicular", days: "Days 6-13", desc: "Plan, initiate, explore" },
          { phase: "Ovulatory", days: "Days 14-17", desc: "Connect, lead, communicate" },
          { phase: "Luteal", days: "Days 18-28", desc: "Focus, refine, complete" },
        ].map(({ phase, days, desc }) => (
          <div key={phase} className="rounded-xl border border-border/70 bg-stone-950/55 p-3">
            <p className="font-medium text-bone">{phase}</p>
            <p className="text-xs text-bone-muted">{days} - {desc}</p>
          </div>
        ))}
      </div>

      <label className="flex cursor-pointer items-center gap-3">
        <div
          onClick={() => setEnabled((v) => !v)}
          className={`relative h-6 w-11 rounded-full transition-colors ${enabled ? "bg-leather-400" : "bg-stone-700"}`}
        >
          <span
            className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-5" : ""}`}
          />
        </div>
        <span className="text-sm font-medium text-bone">Track my cycle with Kiaros</span>
      </label>

      {enabled && (
        <div className="space-y-5 pl-1">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <label className="font-medium text-bone">Average cycle length</label>
              <span className="text-bone-muted">{cycleLength} days</span>
            </div>
            <input
              type="range"
              min={21}
              max={35}
              value={cycleLength}
              onChange={(e) => setCycleLength(Number(e.target.value))}
              className="w-full accent-[#b8a07b]"
            />
            <div className="flex justify-between text-xs text-bone-muted">
              <span>21</span>
              <span>35</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <label className="font-medium text-bone">Average period length</label>
              <span className="text-bone-muted">{periodLength} days</span>
            </div>
            <input
              type="range"
              min={2}
              max={8}
              value={periodLength}
              onChange={(e) => setPeriodLength(Number(e.target.value))}
              className="w-full accent-[#b8a07b]"
            />
            <div className="flex justify-between text-xs text-bone-muted">
              <span>2</span>
              <span>8</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-bone">
              First day of your last period <span className="font-normal text-bone-muted">(optional)</span>
            </label>
            <input
              type="date"
              value={lastPeriodStart}
              onChange={(e) => setLastPeriodStart(e.target.value)}
              className="w-full rounded-xl border border-border/80 bg-stone-950/70 px-4 py-3 text-bone focus:outline-none focus:ring-2 focus:ring-leather-400"
            />
            <p className="text-xs text-bone-muted">Lets Kiaros calculate your current phase accurately.</p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="w-full rounded-2xl border border-leather-400/50 bg-leather-500/35 px-4 py-3 font-medium text-bone shadow-glow hover:bg-leather-500/45 disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : enabled ? "Continue" : "Continue without cycle tracking"}
        </button>
        {!enabled && (
          <button
            type="button"
            onClick={skip}
            disabled={isSubmitting}
            className="w-full text-sm text-bone-muted hover:text-bone"
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}
