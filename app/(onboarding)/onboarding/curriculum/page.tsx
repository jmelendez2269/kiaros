"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const DURATION_OPTIONS = [
  { label: "4 weeks", value: 4 },
  { label: "8 weeks", value: 8 },
  { label: "12 weeks", value: 12 },
  { label: "16 weeks", value: 16 },
];

const INTENSITY_OPTIONS: {
  label: string;
  description: string;
  value: "light" | "balanced" | "dense";
}[] = [
  { label: "Light", description: "1–2 hrs/week", value: "light" },
  { label: "Balanced", description: "3–5 hrs/week", value: "balanced" },
  { label: "Dense", description: "6+ hrs/week", value: "dense" },
];

export default function CurriculumSetupPage() {
  const router = useRouter();

  const [topic, setTopic] = useState("");
  const [durationWeeks, setDurationWeeks] = useState(8);
  const [intensity, setIntensity] = useState<"light" | "balanced" | "dense">("balanced");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill from profile study_focus
  useEffect(() => {
    fetch("/api/profile", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const sf = (data?.profile?.study_focus as string | null) ?? "";
        if (sf.trim()) setTopic(sf.slice(0, 140));
      })
      .catch(() => {});
  }, []);

  async function handleSubmit() {
    const trimmed = topic.trim();
    if (!trimmed) {
      setError("Please enter a topic so Kiaros knows what to plan.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/curriculum/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: trimmed, durationWeeks, intensity, skills: [] }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          (data as { error?: string }).error ??
            "Couldn't generate the curriculum right now. Try again or skip."
        );
        setLoading(false);
        return;
      }
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setLoading(false);
      return;
    }
    router.replace("/curriculum");
  }

  function handleSkip() {
    router.replace("/today");
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="shell-kicker">Curriculum setup</p>
        <h2 className="font-serif text-3xl text-bone">Build your first study plan</h2>
        <p className="leading-relaxed text-bone-muted">
          Kiaros generates a week-by-week curriculum tied to your blueprint timeline. Sessions schedule
          themselves and show up on Today so nothing falls through.
        </p>
      </div>

      <div className="space-y-6">
        {/* Topic */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-bone">What are you studying?</label>
          <p className="text-xs text-bone-muted">
            A short description of the topic, track, or outcome you want to study toward.
          </p>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value.slice(0, 140))}
            disabled={loading}
            rows={3}
            placeholder="e.g., Depth psychology and Jungian archetypes"
            className="w-full resize-none rounded-xl border border-border/80 bg-stone-950/70 px-4 py-3 text-bone placeholder:text-bone-muted/45 focus:outline-none focus:ring-2 focus:ring-leather-400 disabled:opacity-50"
          />
          <p className="text-right text-[10px] text-bone-muted/50">{topic.length}/140</p>
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-bone">How long?</label>
          <div className="flex gap-2">
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={loading}
                onClick={() => setDurationWeeks(opt.value)}
                className={`flex-1 rounded-xl border py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
                  durationWeeks === opt.value
                    ? "border-leather-400 bg-leather-500/30 text-bone"
                    : "border-border/60 bg-transparent text-bone-muted hover:border-leather-400/50 hover:text-bone"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Intensity */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-bone">Intensity</label>
          <div className="flex gap-2">
            {INTENSITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={loading}
                onClick={() => setIntensity(opt.value)}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl border py-2.5 transition-colors disabled:opacity-50 ${
                  intensity === opt.value
                    ? "border-leather-400 bg-leather-500/30 text-bone"
                    : "border-border/60 bg-transparent text-bone-muted hover:border-leather-400/50 hover:text-bone"
                }`}
              >
                <span className="text-xs font-medium">{opt.label}</span>
                <span className="text-[10px] opacity-70">{opt.description}</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-stone-950/60 p-3 text-sm text-bone-muted/80">{error}</p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="w-full rounded-2xl border border-leather-400/50 bg-leather-500/35 px-4 py-3 font-medium text-bone shadow-glow hover:bg-leather-500/45 disabled:opacity-60"
        >
          {loading ? "Building your curriculum…" : "Build my curriculum"}
        </button>
        <button
          type="button"
          onClick={handleSkip}
          disabled={loading}
          className="w-full rounded-2xl border border-border/40 bg-transparent px-4 py-3 text-sm text-bone-muted hover:text-bone disabled:opacity-50"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
