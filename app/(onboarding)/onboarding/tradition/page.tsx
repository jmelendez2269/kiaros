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

export default function OnboardingTraditionPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Tradition | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleContinue = async () => {
    if (!selected) return;
    setIsSaving(true);
    setError("");

    const houseSystem: HouseSystem = TRADITION_HOUSE_DEFAULTS[selected];

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tradition: selected, house_system: houseSystem }),
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
          Different astrological traditions read the same chart through different lenses. Your
          tradition shapes which techniques Kiaros emphasizes and which house system it uses. You
          can change this later in Settings — and override the house system independently if you
          want to.
        </p>
        <p className="text-sm italic text-bone-muted/80">
          Not sure? Evolutionary is a good starting place for most people new to intentional
          astrology.
        </p>
      </div>

      <div className="space-y-3">
        {TRADITIONS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelected(t.id)}
            className={`w-full rounded-xl border px-5 py-4 text-left transition-colors ${
              selected === t.id
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

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="button"
        onClick={handleContinue}
        disabled={isSaving || !selected}
        className="w-full rounded-2xl border border-leather-400/50 bg-leather-500/35 px-4 py-3 font-medium text-bone shadow-glow hover:bg-leather-500/45 disabled:opacity-50"
      >
        {isSaving ? "Saving…" : "Continue"}
      </button>
    </div>
  );
}
