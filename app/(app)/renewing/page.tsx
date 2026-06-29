"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const POLL_TIMEOUT_MS = 10 * 60 * 1000;
const POLL_INTERVAL_MS = 8000;

const SLIDES = [
  {
    kicker: "Your new planner",
    title: "Built fresh from your chart and this year's sky",
    body: "The same natal chart, the same goals you've been working with — now mapped to a brand new year of transits. Your arc continues; the timing is new.",
  },
  {
    kicker: "Continuity",
    title: "Your history carries forward",
    body: "Your journal, your oracle captures, your areas and goals — all of it persists into the new year. The blueprint updates; your record doesn't start over.",
  },
  {
    kicker: "A new blueprint",
    title: "52 weeks of real timing",
    body: "This year's activation windows, rest periods, and quarter themes are calculated from actual ephemeris data. What the sky offers this year is genuinely different from last year.",
  },
  {
    kicker: "Cosmic Calendar",
    title: "Your year as a living map",
    body: "The updated calendar will reflect this year's transits, moon phases, and timing windows — so you can see what's coming and plan with intention from the start.",
  },
];

export default function RenewingPage() {
  const router = useRouter();
  const hasFired = useRef(false);

  const [failed, setFailed] = useState(false);
  const [errorDetail, setErrorDetail] = useState("");
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setSlideIndex((i) => (i + 1) % SLIDES.length);
    }, 7000);
    return () => clearInterval(id);
  }, []);

  async function startRollover() {
    try {
      const res = await fetch("/api/blueprint/rollover", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorDetail((data as { error?: string }).error ?? "Rollover request failed. Please try again.");
        setFailed(true);
        return;
      }
    } catch {
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
        setErrorDetail("Generation is taking longer than expected. Please try again.");
        setFailed(true);
        return;
      }
      try {
        const res = await fetch("/api/blueprint/status");
        if (!res.ok) {
          clearInterval(poll);
          setErrorDetail(`Status check failed (HTTP ${res.status}). Please try again.`);
          setFailed(true);
          return;
        }
        const data = await res.json();
        console.log(`[renewing] Poll #${pollCount}: status = ${data.status}`);

        if (data.status === "ready" || data.status === "error") {
          clearInterval(poll);
          if (data.status === "error") {
            setErrorDetail(data.error || "Something went wrong during generation.");
            setFailed(true);
            return;
          }
          router.replace("/dashboard");
        }
      } catch {
        clearInterval(poll);
        setErrorDetail("Lost connection while waiting. Please try again.");
        setFailed(true);
      }
    }, POLL_INTERVAL_MS);
  }

  useEffect(() => {
    if (hasFired.current) return;
    hasFired.current = true;
    startRollover();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRetry() {
    setFailed(false);
    setErrorDetail("");
    hasFired.current = false;
    await startRollover();
  }

  if (failed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="shell-panel max-w-sm space-y-6 px-6 py-10 text-center">
          <div className="text-5xl text-bone-muted">*</div>
          <h2 className="font-serif text-3xl text-bone">Something went wrong</h2>
          <p className="text-bone-muted">
            Your new year planner couldn&apos;t be generated right now. It&apos;s worth trying again — your existing data is safe.
          </p>
          {errorDetail && (
            <p className="rounded-xl bg-stone-950/60 p-3 text-sm text-bone-muted/80">{errorDetail}</p>
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

  const slide = SLIDES[slideIndex];

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-10 px-4 py-12">
      <div className="space-y-2 text-center">
        <p className="shell-kicker">New year, new blueprint</p>
        <h2 className="font-serif text-3xl text-bone">
          Building your {new Date().getFullYear()} planner
        </h2>
        <p className="mx-auto max-w-sm text-sm text-bone-muted">
          This takes <strong className="text-bone/80">5–15 minutes</strong>. Your existing journal, goals, and oracle history are all still here.
        </p>
      </div>

      <div className="w-full max-w-xs space-y-2">
        <div className="h-2 overflow-hidden rounded-full bg-stone-900/90 ring-1 ring-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-leather-500 via-leather-300 to-leather-500 animate-[loading-bar_2s_ease-in-out_infinite]" />
        </div>
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-bone-muted/60">
          <span>Reading this year&apos;s transits</span>
          <span>Shaping your year</span>
        </div>
      </div>

      <div className="w-full max-w-md">
        <div className="shell-panel px-8 py-10 text-center">
          <p className="shell-kicker mb-2">{slide.kicker}</p>
          <h3 className="mb-3 font-serif text-xl text-bone">{slide.title}</h3>
          <p className="text-sm leading-relaxed text-bone-muted">{slide.body}</p>

          <div className="mt-8 flex items-center justify-center gap-1.5">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlideIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === slideIndex ? "w-5 bg-leather-400" : "w-1.5 bg-stone-600 hover:bg-stone-500"
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
