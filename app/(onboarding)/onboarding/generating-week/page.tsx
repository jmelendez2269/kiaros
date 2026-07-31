"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 3 * 60 * 1000;

export default function GeneratingWeekPage() {
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    let interval: ReturnType<typeof setInterval> | null = null;
    let canceled = false;

    async function begin() {
      const response = await fetch("/api/preview/week/generate", { method: "POST" });
      if (!response.ok) {
        setError("Your personal week couldn't be started. Please try again.");
        return;
      }

      const startedAt = Date.now();
      interval = setInterval(async () => {
        if (canceled) return;
        if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
          if (interval) clearInterval(interval);
          setError("This is taking longer than expected. Your progress is saved, so it is safe to try again.");
          return;
        }

        const statusResponse = await fetch("/api/preview/week/status", { cache: "no-store" });
        if (!statusResponse.ok) return;
        const result = (await statusResponse.json()) as { status: string; error?: string | null };

        if (result.status === "ready") {
          if (interval) clearInterval(interval);
          router.replace("/preview");
        } else if (result.status === "error") {
          if (interval) clearInterval(interval);
          setError(result.error ?? "Your personal week couldn't be generated.");
        }
      }, POLL_INTERVAL_MS);
    }

    begin().catch(() => setError("We lost the connection while creating your week."));
    return () => {
      canceled = true;
      if (interval) clearInterval(interval);
    };
  }, [router]);

  return (
    <div className="flex min-h-[65vh] items-center justify-center">
      <div className="max-w-lg space-y-8 text-center">
        <div className="mx-auto h-16 w-16 rounded-full border border-leather-400/40 bg-leather-500/10 p-3">
          <div className="h-full w-full animate-pulse rounded-full bg-gradient-to-br from-leather-300/70 to-plum-400/30" />
        </div>
        <div>
          <p className="shell-kicker">Your personal week</p>
          <h2 className="mt-3 font-serif text-3xl text-bone">Looking at the seven days ahead</h2>
          <p className="mx-auto mt-4 max-w-md leading-7 text-bone-muted">
            Kairos is bringing together the intentions you named, your personal timing, and the
            changing sky of this week. This usually takes less than a minute.
          </p>
        </div>
        <div className="mx-auto h-1.5 max-w-xs overflow-hidden rounded-full bg-stone-900">
          <div className="h-full w-1/2 animate-[loading-bar_1.8s_ease-in-out_infinite] rounded-full bg-leather-300" />
        </div>
        {error ? (
          <div className="space-y-4 rounded-2xl border border-red-400/30 bg-red-500/8 p-5">
            <p className="text-sm leading-6 text-red-100">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-11 rounded-full border border-red-300/40 px-5 text-sm font-semibold text-bone"
            >
              Try again
            </button>
          </div>
        ) : null}
        <style jsx>{`
          @keyframes loading-bar {
            0% { transform: translateX(-110%); }
            100% { transform: translateX(210%); }
          }
        `}</style>
      </div>
    </div>
  );
}
