"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BRAND } from "@/lib/brand";

const POLL_TIMEOUT_MS = 10 * 60 * 1000; // 10 min — generous ceiling for Claude generation
const POLL_INTERVAL_MS = 8000;

// ─── Feature slides ────────────────────────────────────────────────────────

const SLIDES = [
  {
    kicker: "Your planner",
    title: "Built around your year, not a template",
    body: "Kairos weaves your birth chart, goals, and the actual sky overhead into a week-by-week plan. This generation happens once — and it's yours forever.",
  },
  {
    kicker: "The blueprint",
    title: "52 weeks shaped around you",
    body: "Your planner is structured across quarters, months, and weeks — each one anchored to real astronomical timing and your stated goals, not generic milestones.",
  },
  {
    kicker: "Cosmic Calendar",
    title: "Your year as a living map",
    body: "The Cosmic Calendar shows you the full arc of the year: planetary transits, moon phases, and timing windows — so you can see what's coming and plan with intention.",
  },
  {
    kicker: "Daily Tracker",
    title: "Log your days in context",
    body: "Every log entry is automatically stamped with where the moon is, what sign it's in, and where you are in the lunar cycle. Patterns surface over time — not just numbers.",
  },
  {
    kicker: "Journal",
    title: "Reflection that knows your sky",
    body: "Each journal entry captures the transits active when you wrote it. The Insights surface uses those patterns to show you what's actually been moving through your life.",
  },
  {
    kicker: `Meet ${BRAND.oracle}`,
    title: `${BRAND.oracle} — your AI guide`,
    body: `Pronounced ${BRAND.oraclePronunciation}. ${BRAND.oracle} is a conversational guide built into your planner. It knows your natal chart, your current transits, and your goals — not just generic astrology.`,
  },
  {
    kicker: `${BRAND.oracle}`,
    title: "Grounded in your data, not the internet",
    body: `Most AI assistants start from scratch every conversation. ${BRAND.oracle} starts from your blueprint, your journal captures, and your goals. Every answer is shaped around where you actually are.`,
  },
  {
    kicker: "Memory",
    title: "Save what matters",
    body: `When a conversation with ${BRAND.oracle} lands on something important, you can save it. Those captures feed back into your Insights and ground future guidance — so the planner learns your arc over the year.`,
  },
  {
    kicker: "Areas + Goals",
    title: "Your life, organized by what matters",
    body: "Kairos tracks the areas of your life you care about — career, relationships, health, creativity — and ties specific goals to each one. Your quarterly reviews measure real movement, not abstract scores.",
  },
  {
    kicker: "Curriculum",
    title: "A study path, week by week",
    body: "If you're working toward something that requires learning, Kairos can generate a week-by-week curriculum tied to your timeline. Study sessions feed into your blueprint context.",
  },
];

// ─── Component ─────────────────────────────────────────────────────────────

export default function OnboardingGeneratingPage() {
  const router = useRouter();
  const hasFired = useRef(false);
  const [failed, setFailed] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string>("");
  const [slideIndex, setSlideIndex] = useState(0);
  const [, setRetrying] = useState(false);

  // Auto-advance slides every 7 seconds
  useEffect(() => {
    const id = setInterval(() => {
      setSlideIndex((i) => (i + 1) % SLIDES.length);
    }, 7000);
    return () => clearInterval(id);
  }, []);

  async function startGeneration() {
    try {
      const generateRes = await fetch("/api/blueprint/generate", { method: "POST" });
      if (!generateRes.ok) {
        console.error("[generating] Blueprint generation request failed:", generateRes.status);
        setErrorDetail("The generation request failed to start. Please try again.");
        setFailed(true);
        return;
      }
      const generateData = await generateRes.json();
      console.log("[generating] Blueprint creation started:", generateData);
    } catch (err) {
      console.error("[generating] Failed to initiate blueprint generation:", err);
      setErrorDetail("Couldn't reach the server. Check your connection and try again.");
      setFailed(true);
      return;
    }

    const startedAt = Date.now();
    let pollCount = 0;
    const poll = setInterval(async () => {
      pollCount++;
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        clearInterval(poll);
        setErrorDetail(
          "Generation is taking longer than expected. This sometimes happens on the first run — please try again and it should be faster."
        );
        setFailed(true);
        return;
      }
      try {
        const res = await fetch("/api/blueprint/status");
        if (!res.ok) {
          console.error("[generating] Status check failed:", res.status);
          clearInterval(poll);
          setErrorDetail(`Status check failed (HTTP ${res.status}). Please try again.`);
          setFailed(true);
          return;
        }
        const data = await res.json();
        const { status, error } = data;
        console.log(`[generating] Poll #${pollCount}: status = ${status}`);

        if (status === "ready" || status === "error") {
          clearInterval(poll);
          ["kiaros_onboarding_step1", "kiaros_onboarding_step2", "kiaros_onboarding_step3", "kiaros_onboarding_step4"].forEach(
            (k) => sessionStorage.removeItem(k)
          );

          if (status === "error") {
            setErrorDetail(error || "Something went wrong during generation.");
            setFailed(true);
            return;
          }

          router.replace("/dashboard");
        }
      } catch (err) {
        console.error("[generating] Poll error:", err);
        clearInterval(poll);
        setErrorDetail("Lost connection while waiting. Please try again.");
        setFailed(true);
      }
    }, POLL_INTERVAL_MS);
  }

  useEffect(() => {
    if (hasFired.current) return;
    hasFired.current = true;
    startGeneration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRetry() {
    setFailed(false);
    setErrorDetail("");
    setRetrying(true);
    hasFired.current = false;
    setRetrying(false);
    await startGeneration();
  }

  const slide = SLIDES[slideIndex];

  if (failed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="shell-panel max-w-sm space-y-6 px-6 py-10 text-center">
          <div className="text-5xl text-bone-muted">*</div>
          <h2 className="font-serif text-3xl text-bone">Something went wrong</h2>
          <p className="text-bone-muted">
            Your planner couldn&apos;t be generated right now. This sometimes happens with network
            hiccups, and it&apos;s worth trying again.
          </p>
          {errorDetail && (
            <p className="rounded-xl bg-stone-950/60 p-3 text-sm text-bone-muted/80">
              {errorDetail}
            </p>
          )}
          <button
            onClick={handleRetry}
            className="mt-4 rounded-2xl border border-leather-400/50 bg-leather-500/35 px-6 py-3 font-medium text-bone shadow-glow hover:bg-leather-500/45"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-10 px-4 py-12">

      {/* Header */}
      <div className="space-y-2 text-center">
        <p className="shell-kicker">Building your planner</p>
        <h2 className="font-serif text-3xl text-bone">
          Creating your personalized {BRAND.product}
        </h2>
        <p className="mx-auto max-w-sm text-sm text-bone-muted">
          This takes <strong className="text-bone/80">5–15 minutes</strong> depending on your
          connection. Go get a coffee — this only ever happens once.
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs space-y-2">
        <div className="h-2 overflow-hidden rounded-full bg-stone-900/90 ring-1 ring-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-leather-500 via-leather-300 to-leather-500 animate-[loading-bar_2s_ease-in-out_infinite]" />
        </div>
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-bone-muted/60">
          <span>Reading your chart</span>
          <span>Shaping your year</span>
        </div>
      </div>

      {/* Feature slides */}
      <div className="w-full max-w-md">
        <div className="shell-panel relative overflow-hidden px-8 py-10 text-center transition-all duration-500">
          <p className="shell-kicker mb-2">{slide.kicker}</p>
          <h3 className="mb-3 font-serif text-xl text-bone">{slide.title}</h3>
          <p className="text-sm leading-relaxed text-bone-muted">{slide.body}</p>

          {/* Slide dots */}
          <div className="mt-8 flex items-center justify-center gap-1.5">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlideIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === slideIndex
                    ? "w-5 bg-leather-400"
                    : "w-1.5 bg-stone-600 hover:bg-stone-500"
                }`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes loading-bar {
          0% { transform: translateX(-110%); }
          100% { transform: translateX(210%); }
        }
      `}</style>
    </div>
  );
}
