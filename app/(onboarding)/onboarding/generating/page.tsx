"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BRAND } from "@/lib/brand";
import { TOUR_PENDING_KEY } from "@/lib/tour/config";

const POLL_TIMEOUT_MS = 10 * 60 * 1000;
const POLL_INTERVAL_MS = 8000;
const STUDY_FOCUS_KEY = "kiaros_onboarding_step3_study_focus";

// ─── Tradition-specific copy ───────────────────────────────────────────────

type Tradition = "evolutionary" | "karmic" | "psychological" | "traditional" | "synthesis";

const TRADITION_SLIDES: Record<Tradition, { kicker: string; title: string; body: string }> = {
  evolutionary: {
    kicker: "Your lens",
    title: "Built through an evolutionary lens",
    body: "Kiaros is reading your chart the way evolutionary astrology does — Pluto's current position and what it's asking of your soul, the South Node story you're evolving beyond, and the North Node calling you forward. Every week in your blueprint reflects those themes.",
  },
  karmic: {
    kicker: "Your lens",
    title: "Built through a karmic lens",
    body: "Kiaros is reading your chart through karma and dharma — Saturn's current position and what it's consolidating, the nodal axis and the soul contracts encoded in it, and the past-life patterns that surface as present-life patterns.",
  },
  psychological: {
    kicker: "Your lens",
    title: "Built through a psychological lens",
    body: "Kiaros is reading your chart through a Jungian lens — the archetypes at work in your life this year, the shadow material activated by current transits, and the inner figures that show up as outer events.",
  },
  traditional: {
    kicker: "Your lens",
    title: "Built through a Hellenistic lens",
    body: "Kiaros is reading your chart the traditional way — sect light, essential dignities, and time lords. The ancient timing techniques determine which planets carry the most weight in your year.",
  },
  synthesis: {
    kicker: "Your lens",
    title: "Woven from all four traditions",
    body: "Kiaros is reading your chart through all four lenses — evolutionary, karmic, psychological, and traditional — letting each placement determine which framework fits best. The result holds more complexity than any single tradition can.",
  },
};

const TRADITION_PROGRESS: Record<Tradition, [string, string]> = {
  evolutionary: ["Tracing your Pluto arc", "Mapping your evolutionary year"],
  karmic: ["Reading your nodal story", "Mapping your karmic year"],
  psychological: ["Reading your archetypes", "Mapping your psyche's year"],
  traditional: ["Reading your sect light", "Mapping your time lords"],
  synthesis: ["Reading all four lenses", "Weaving your blueprint"],
};

// ─── Feature slides ────────────────────────────────────────────────────────

const FEATURE_SLIDES = [
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
    body: "Kiaros tracks the areas of your life you care about and ties specific goals to each one. Your quarterly reviews measure real movement in those areas, not abstract scores.",
  },
  {
    kicker: "Curriculum",
    title: "A study path, week by week",
    body: "If you're working toward something that requires learning, Kiaros can generate a week-by-week curriculum tied to your timeline. Study sessions feed into your blueprint context.",
  },
];

// ─── Build slide deck from profile ────────────────────────────────────────

function buildSlides(tradition: Tradition | null, goals: string[]) {
  const slides: { kicker: string; title: string; body: string }[] = [];

  if (tradition && tradition in TRADITION_SLIDES) {
    slides.push(TRADITION_SLIDES[tradition]);
  }

  if (goals.length > 0) {
    const listed =
      goals.length <= 3
        ? goals.join(", ")
        : `${goals.slice(0, 2).join(", ")}, and ${goals.length - 2} more`;
    slides.push({
      kicker: "Your focus areas",
      title:
        goals.length === 1
          ? `Anchored to ${goals[0]}`
          : `Anchored to ${listed}`,
      body: `${goals.join(", ")} — each gets its own timing windows, transit phases, and milestone rhythm across the year. Not general advice for those areas. Yours.`,
    });
  }

  return [...slides, ...FEATURE_SLIDES];
}

// ─── Other constants ───────────────────────────────────────────────────────

const DURATION_OPTIONS = [
  { label: "4 weeks", value: 4 },
  { label: "8 weeks", value: 8 },
  { label: "12 weeks", value: 12 },
  { label: "16 weeks", value: 16 },
];

const INTENSITY_OPTIONS: { label: string; description: string; value: "light" | "balanced" | "dense" }[] = [
  { label: "Light", description: "1–2 hrs/week", value: "light" },
  { label: "Balanced", description: "3–5 hrs/week", value: "balanced" },
  { label: "Dense", description: "6+ hrs/week", value: "dense" },
];

type Phase = "loading" | "nudge" | "building";

// ─── Component ─────────────────────────────────────────────────────────────

export default function OnboardingGeneratingPage() {
  const router = useRouter();
  const hasFired = useRef(false);

  const [phase, setPhase] = useState<Phase>("loading");
  const [failed, setFailed] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string>("");
  const [slideIndex, setSlideIndex] = useState(0);
  const [, setRetrying] = useState(false);

  // Personalization state
  const [firstName, setFirstName] = useState("");
  const [tradition, setTradition] = useState<Tradition | null>(null);
  const [goalAreas, setGoalAreas] = useState<string[]>([]);
  const [slides, setSlides] = useState(() => buildSlides(null, []));

  // Nudge form state
  const [topic, setTopic] = useState("");
  const [durationWeeks, setDurationWeeks] = useState(8);
  const [intensity, setIntensity] = useState<"light" | "balanced" | "dense">("balanced");
  const [nudgeError, setNudgeError] = useState("");

  // Load personalization from localStorage + profile API
  useEffect(() => {
    let goals: string[] = [];
    try {
      const raw = localStorage.getItem("kiaros_onboarding_step2");
      if (raw) {
        const parsed = JSON.parse(raw) as { name: string }[];
        goals = parsed.map((g) => g.name);
        setGoalAreas(goals);
      }
    } catch {}

    fetch("/api/profile", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.profile) return;
        const name = (data.profile.display_name as string | null)?.split(" ")[0] ?? "";
        const t = (data.profile.tradition as Tradition | null) ?? null;
        setFirstName(name);
        setTradition(t);
        setSlides(buildSlides(t, goals));
        setSlideIndex(0);
      })
      .catch(() => {
        setSlides(buildSlides(null, goals));
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-advance slides every 7 seconds
  useEffect(() => {
    const id = setInterval(() => {
      setSlideIndex((i) => (i + 1) % slides.length);
    }, 7000);
    return () => clearInterval(id);
  }, [slides.length]);

  function clearOnboardingStorage() {
    ["kiaros_onboarding_step1", "kiaros_onboarding_step2", "kiaros_onboarding_step3", "kiaros_onboarding_step4"].forEach(
      (k) => localStorage.removeItem(k)
    );
  }

  function finishAndRedirect() {
    localStorage.removeItem(STUDY_FOCUS_KEY);
    localStorage.setItem(TOUR_PENDING_KEY, "1");
    router.replace("/dashboard");
  }

  function onBlueprintReady() {
    clearOnboardingStorage();
    try {
      const raw = localStorage.getItem(STUDY_FOCUS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { study_focus?: string };
        const text = parsed.study_focus?.trim() ?? "";
        if (text.length > 0) {
          setTopic(text.slice(0, 140));
          setPhase("nudge");
          return;
        }
      }
    } catch {
      // localStorage parse failed — just redirect
    }
    finishAndRedirect();
  }

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

          if (status === "error") {
            clearOnboardingStorage();
            setErrorDetail(error || "Something went wrong during generation.");
            setFailed(true);
            return;
          }

          onBlueprintReady();
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

  async function handleBuildCurriculum() {
    const trimmed = topic.trim();
    if (!trimmed) {
      setNudgeError("Please enter a topic so Kiaros knows what to plan.");
      return;
    }
    setNudgeError("");
    setPhase("building");
    try {
      const res = await fetch("/api/curriculum/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed, targetWeeks: durationWeeks }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setNudgeError((data as { error?: string }).error ?? "Couldn't build the curriculum right now — you can create one from the Curriculum page.");
        setPhase("nudge");
        return;
      }
    } catch {
      setNudgeError("Couldn't reach the server — you can create a curriculum from the Curriculum page.");
      setPhase("nudge");
      return;
    }
    finishAndRedirect();
  }

  const slide = slides[slideIndex] ?? slides[0];
  const [progressLeft, progressRight] =
    tradition && tradition in TRADITION_PROGRESS
      ? TRADITION_PROGRESS[tradition]
      : ["Reading your chart", "Shaping your year"];

  // ── Error state ──────────────────────────────────────────────────────────
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

  // ── Curriculum nudge ─────────────────────────────────────────────────────
  if (phase === "nudge" || phase === "building") {
    const isBuilding = phase === "building";
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center gap-8 px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-3 text-center">
            <p className="shell-kicker">Your planner is ready</p>
            <h2 className="font-serif text-3xl text-bone">Build your first curriculum?</h2>
            <p className="text-sm leading-relaxed text-bone-muted">
              You mentioned what you want to study. Kiaros can generate a week-by-week plan around it right now — tied to your blueprint timeline.
            </p>
          </div>

          <div className="shell-panel space-y-6 px-6 py-7">
            {/* Topic */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-bone">What are you studying?</label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value.slice(0, 140))}
                disabled={isBuilding}
                rows={3}
                placeholder="e.g., Depth psychology and Jungian archetypes"
                className="w-full resize-none rounded-xl border border-border/80 bg-stone-950/70 px-4 py-3 text-sm text-bone placeholder:text-bone-muted/45 focus:outline-none focus:ring-2 focus:ring-leather-400 disabled:opacity-50"
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
                    disabled={isBuilding}
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
                    disabled={isBuilding}
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

            {nudgeError && (
              <p className="rounded-xl bg-stone-950/60 p-3 text-sm text-bone-muted/80">{nudgeError}</p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleBuildCurriculum}
              disabled={isBuilding}
              className="w-full rounded-2xl border border-leather-400/50 bg-leather-500/35 px-4 py-3 font-medium text-bone shadow-glow hover:bg-leather-500/45 disabled:opacity-60"
            >
              {isBuilding ? "Building your curriculum…" : "Yes, build my curriculum"}
            </button>
            <button
              onClick={finishAndRedirect}
              disabled={isBuilding}
              className="w-full rounded-2xl border border-border/40 bg-transparent px-4 py-3 text-sm text-bone-muted hover:text-bone disabled:opacity-50"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-10 px-4 py-12">

      {/* Header */}
      <div className="space-y-2 text-center">
        <p className="shell-kicker">
          {firstName ? `Building ${firstName}'s planner` : "Building your planner"}
        </p>
        <h2 className="font-serif text-3xl text-bone">
          Creating your personalized {BRAND.product}
        </h2>
        {(tradition || goalAreas.length > 0) && (
          <p className="text-xs uppercase tracking-[0.16em] text-bone-muted/60">
            {[
              tradition ? `${tradition.charAt(0).toUpperCase() + tradition.slice(1)} tradition` : null,
              goalAreas.length > 0 ? `${goalAreas.length} focus area${goalAreas.length !== 1 ? "s" : ""}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
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
          <span>{progressLeft}</span>
          <span>{progressRight}</span>
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
            {slides.map((_, i) => (
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
