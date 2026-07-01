"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TRADITION_HOUSE_DEFAULTS, type HouseSystem, type Tradition } from "@/types/blueprint";

const TRADITIONS: { id: Tradition; label: string; description: string; defaultSystem: string }[] = [
  {
    id: "evolutionary",
    label: "Evolutionary",
    description: "Soul growth and evolutionary purpose through Pluto, the South Node, and lifelong themes.",
    defaultSystem: "Porphyry",
  },
  {
    id: "karmic",
    label: "Karmic",
    description: "Karma, dharma, and the soul's contracts — Saturn, the nodes, and past-life patterns.",
    defaultSystem: "Porphyry",
  },
  {
    id: "psychological",
    label: "Psychological",
    description: "Jungian archetypes, shadow work, and the inner landscape of your chart.",
    defaultSystem: "Placidus",
  },
  {
    id: "traditional",
    label: "Traditional / Hellenistic",
    description: "Hellenistic roots — sect, essential dignities, time lords, and ancient timing methods.",
    defaultSystem: "Whole Sign",
  },
  {
    id: "synthesis",
    label: "Synthesis",
    description: "A bit of everything — weaving all four lenses based on what each chart placement calls for.",
    defaultSystem: "Placidus",
  },
];

const HOUSE_SYSTEMS: { id: HouseSystem; label: string; description: string; usedBy: string }[] = [
  {
    id: "whole_sign",
    label: "Whole Sign",
    description: "Each house is exactly one full zodiac sign, starting from your rising sign. The oldest, simplest method.",
    usedBy: "Traditional / Hellenistic",
  },
  {
    id: "porphyry",
    label: "Porphyry",
    description: "Houses are unequal, sized by trisecting the arcs between your chart angles (Ascendant, MC, Descendant, IC).",
    usedBy: "Evolutionary, Karmic",
  },
  {
    id: "placidus",
    label: "Placidus",
    description: "The most common modern default — houses are sized by dividing time (not degrees) between the angles.",
    usedBy: "Psychological, Synthesis",
  },
];

type Mode = "tradition" | "house_system";

export default function OnboardingTraditionPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("tradition");
  const [selectedTradition, setSelectedTradition] = useState<Tradition | null>(null);
  const [selectedHouseSystem, setSelectedHouseSystem] = useState<HouseSystem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const canContinue = mode === "tradition" ? !!selectedTradition : !!selectedHouseSystem;

  const handleContinue = async () => {
    if (!canContinue) return;
    setIsSaving(true);
    setError("");

    const payload =
      mode === "tradition"
        ? { tradition: selectedTradition, house_system: TRADITION_HOUSE_DEFAULTS[selectedTradition!] }
        : { tradition: null, house_system: selectedHouseSystem };

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setError("Something went wrong. Please try again.");
      setIsSaving(false);
      return;
    }

    router.push("/onboarding/goals");
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="shell-kicker">Step 2</p>
        <h2 className="font-serif text-3xl text-bone">Choose your interpretive tradition</h2>
        <p className="leading-relaxed text-bone-muted">
          Different astrological traditions read the same chart through different lenses, and each
          one pairs with a specific house system for dividing your chart into its 12 houses. You
          can change either later in Settings, independently of each other.
        </p>
        <p className="text-sm italic text-bone-muted/80">
          Not sure? Evolutionary is a good starting place for most people new to intentional
          astrology.
        </p>
      </div>

      <div className="flex gap-2 rounded-full border border-border/70 bg-stone-950/50 p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode("tradition")}
          className={`flex-1 rounded-full px-4 py-2 transition-colors ${
            mode === "tradition" ? "bg-leather-500/35 text-bone" : "text-bone-muted hover:text-bone"
          }`}
        >
          Choose by tradition
        </button>
        <button
          type="button"
          onClick={() => setMode("house_system")}
          className={`flex-1 rounded-full px-4 py-2 transition-colors ${
            mode === "house_system" ? "bg-leather-500/35 text-bone" : "text-bone-muted hover:text-bone"
          }`}
        >
          I already know my house system
        </button>
      </div>

      {mode === "tradition" ? (
        <div className="space-y-3">
          {TRADITIONS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedTradition(t.id)}
              className={`w-full rounded-xl border px-5 py-4 text-left transition-colors ${
                selectedTradition === t.id
                  ? "border-leather-400/60 bg-leather-500/15 text-bone"
                  : "border-border/70 bg-stone-950/50 text-bone-muted hover:border-border hover:text-bone"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-bone">{t.label}</p>
                  <p className="mt-1 text-sm leading-6 text-bone-muted">{t.description}</p>
                </div>
                <span className="mt-0.5 shrink-0 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-bone-muted/60">
                  {t.defaultSystem}
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-bone-muted">
            Picking a house system directly leaves your interpretive tradition unset for now — you
            can choose one anytime in Settings without affecting this choice.
          </p>
          {HOUSE_SYSTEMS.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => setSelectedHouseSystem(h.id)}
              className={`w-full rounded-xl border px-5 py-4 text-left transition-colors ${
                selectedHouseSystem === h.id
                  ? "border-leather-400/60 bg-leather-500/15 text-bone"
                  : "border-border/70 bg-stone-950/50 text-bone-muted hover:border-border hover:text-bone"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-bone">{h.label}</p>
                  <p className="mt-1 text-sm leading-6 text-bone-muted">{h.description}</p>
                </div>
                <span className="mt-0.5 shrink-0 max-w-[9rem] text-right text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-bone-muted/60">
                  {h.usedBy}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="button"
        onClick={handleContinue}
        disabled={isSaving || !canContinue}
        className="w-full rounded-2xl border border-leather-400/50 bg-leather-500/35 px-4 py-3 font-medium text-bone shadow-glow hover:bg-leather-500/45 disabled:opacity-50"
      >
        {isSaving ? "Saving…" : "Continue"}
      </button>
    </div>
  );
}
