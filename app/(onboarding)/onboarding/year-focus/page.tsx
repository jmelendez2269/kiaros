"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BRAND } from "@/lib/brand";
import {
  OnboardingCycleFields,
  cycleStateToProfilePayload,
  type CycleFormState,
} from "@/components/onboarding/OnboardingCycleFields";
import { iaOnboarding5FlagEnabled } from "@/lib/onboarding/ia-onboarding-flag";

const STORAGE_KEY = "kiaros_onboarding_step4";
const CYCLE_STORAGE_KEY = "kiaros_onboarding_step5";

const schema = z.object({
  year_vision: z.string().min(1, "Please share your year vision"),
  word_of_year: z.string().optional(),
  what_to_release: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface AstrologicalWordResponse {
  astrological_word_of_year: {
    word: string;
    profectionHouse: number;
    profectionSign: string;
    rationale: string;
  } | null;
}

function ordinalSuffix(value: number) {
  const remainderTen = value % 10;
  const remainderHundred = value % 100;

  if (remainderTen === 1 && remainderHundred !== 11) return "st";
  if (remainderTen === 2 && remainderHundred !== 12) return "nd";
  if (remainderTen === 3 && remainderHundred !== 13) return "rd";
  return "th";
}

export default function OnboardingYearFocusPage() {
  const router = useRouter();
  const ia5 = iaOnboarding5FlagEnabled(process.env.NEXT_PUBLIC_IA_ONBOARDING5);
  const [astrologicalWord, setAstrologicalWord] =
    useState<AstrologicalWordResponse["astrological_word_of_year"]>(null);

  const [saveError, setSaveError] = useState<string>("");
  const [cycleState, setCycleState] = useState<CycleFormState>({
    enabled: false,
    cycleLength: 28,
    periodLength: 5,
    lastPeriodStart: "",
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const data = JSON.parse(saved) as Partial<FormValues>;
      (Object.keys(data) as Array<keyof FormValues>).forEach((k) => {
        if (data[k]) setValue(k, data[k] as string);
      });
    } catch {}
  }, [setValue]);

  useEffect(() => {
    if (!ia5) return;
    const saved = localStorage.getItem(CYCLE_STORAGE_KEY);
    if (!saved) return;
    try {
      const data = JSON.parse(saved) as {
        cycle_enabled?: boolean;
        avg_cycle_length?: number;
        avg_period_length?: number;
        last_period_start?: string;
      };
      setCycleState({
        enabled: data.cycle_enabled ?? false,
        cycleLength: data.avg_cycle_length ?? 28,
        periodLength: data.avg_period_length ?? 5,
        lastPeriodStart: data.last_period_start ?? "",
      });
    } catch {}
  }, [ia5]);

  useEffect(() => {
    let cancelled = false;

    async function loadAstrologicalWord() {
      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as AstrologicalWordResponse;
        if (!cancelled) {
          setAstrologicalWord(data.astrological_word_of_year);
        }
      } catch {}
    }

    void loadAstrologicalWord();

    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (values: FormValues) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values));

    const cyclePayload = ia5 ? cycleStateToProfilePayload(cycleState) : {};
    if (ia5) {
      localStorage.setItem(CYCLE_STORAGE_KEY, JSON.stringify(cyclePayload));
    }

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year_vision: values.year_vision,
        word_of_year: values.word_of_year || null,
        what_to_release: values.what_to_release || null,
        plan_year: new Date().getFullYear(),
        ...cyclePayload,
      }),
    });

    if (!res.ok) {
      setSaveError("Something went wrong saving your details. Please try again.");
      return;
    }

    router.push(ia5 ? "/onboarding/theme" : "/onboarding/cycle");
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="shell-kicker">{ia5 ? "Step 3" : "Step 4"}</p>
        <h2 className="font-serif text-3xl text-bone">
          {ia5 ? "Shape your year and energy" : "Shape the customization layer"}
        </h2>
        <p className="leading-relaxed text-bone-muted">
          What do you want this year to feel like and mean? {BRAND.product} works best when it understands
          not just what you want to do, but what kind of year you are trying to live.
        </p>
        <div className="flex w-fit items-center gap-2 rounded-full border border-leather-500/25 bg-leather-500/8 px-3 py-1.5 text-xs text-leather-200/80">
          <span className="h-1.5 w-1.5 rounded-full bg-leather-300/70" />
          With Planner + Oracle, this can anchor Stelloquy to your season
        </div>
        <p className="text-sm italic text-bone-muted/80">
          Messy, honest answers make better blueprints than polished ones.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-bone">
            What do you want this year to feel like and mean?
          </label>
          <p className="text-xs text-bone-muted">
            Think big picture - not tasks, but the quality and direction of the year.
          </p>
          <textarea
            placeholder="e.g., A year of grounding and momentum. I want to build something that lasts and move with more steadiness, trust, and intention..."
            {...register("year_vision")}
            disabled={isSubmitting}
            rows={5}
            className="w-full resize-none rounded-xl border border-border/80 bg-stone-950/70 px-4 py-3 text-bone placeholder:text-bone-muted/45 focus:outline-none focus:ring-2 focus:ring-leather-400"
          />
          {errors.year_vision && <p className="text-xs text-destructive">{errors.year_vision.message}</p>}
        </div>

        <div className="space-y-2">
          <div className="rounded-[1.2rem] border border-leather-400/30 bg-leather-500/8 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-leather-200/85">
              Astrology word for the year
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="text-2xl font-semibold text-bone">
                {astrologicalWord?.word || "Generating from your chart..."}
              </p>
              {astrologicalWord ? (
                <span className="rounded-full border border-leather-400/30 bg-stone-950/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-leather-200">
                  {astrologicalWord.profectionHouse}
                  {ordinalSuffix(astrologicalWord.profectionHouse)} house in {astrologicalWord.profectionSign}
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-sm leading-7 text-bone-muted">
              {astrologicalWord?.rationale ||
                `Once your chart data is available, ${BRAND.product} will suggest a word based on your yearly astrology.`}
            </p>
            <p className="mt-3 text-xs text-bone-muted">
              Keep this as your astrology-derived anchor, add your own word below, or use both.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-bone">
            Your own word of the year <span className="font-normal text-bone-muted">(optional)</span>
          </label>
          <p className="text-xs text-bone-muted">
            Add a personal word if you want one alongside the astrological word.
          </p>
          <input
            type="text"
            placeholder="e.g., Roots, Expansion, Presence, Devotion..."
            {...register("word_of_year")}
            disabled={isSubmitting}
            className="w-full rounded-xl border border-border/80 bg-stone-950/70 px-4 py-3 text-bone placeholder:text-bone-muted/45 focus:outline-none focus:ring-2 focus:ring-leather-400"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-bone">
            What do you want to release? <span className="font-normal text-bone-muted">(optional)</span>
          </label>
          <p className="text-xs text-bone-muted">
            Habits, beliefs, relationships, or patterns you&apos;re consciously leaving behind.
          </p>
          <textarea
            placeholder="e.g., Perfectionism, people-pleasing, scattered attention..."
            {...register("what_to_release")}
            disabled={isSubmitting}
            rows={3}
            className="w-full resize-none rounded-xl border border-border/80 bg-stone-950/70 px-4 py-3 text-bone placeholder:text-bone-muted/45 focus:outline-none focus:ring-2 focus:ring-leather-400"
          />
        </div>

        {ia5 ? (
          <OnboardingCycleFields
            state={cycleState}
            onChange={setCycleState}
            disabled={isSubmitting}
          />
        ) : null}

        {saveError && <p className="text-sm text-destructive">{saveError}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl border border-leather-400/50 bg-leather-500/35 px-4 py-3 font-medium text-bone shadow-glow hover:bg-leather-500/45 disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Continue"}
        </button>
      </form>
    </div>
  );
}
