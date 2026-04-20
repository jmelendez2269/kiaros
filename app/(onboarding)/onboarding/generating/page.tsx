"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const MESSAGES = [
  "Reading your natal chart...",
  "Mapping planetary transits for your year...",
  "Building your timing framework...",
  "Weaving your focus layers into the planner...",
  "Shaping your quarterly rhythms...",
  "Aligning activation windows and rest windows...",
  "Almost there...",
];

export default function OnboardingGeneratingPage() {
  const router = useRouter();
  const hasFired = useRef(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const [, setRetrying] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string>("");

  const POLL_TIMEOUT_MS = 5 * 60 * 1000;
  const POLL_INTERVAL_MS = 5000;

  useEffect(() => {
    const id = setInterval(() => {
      setMessageIndex((i) => (i + 1) % MESSAGES.length);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  async function startGeneration() {
    try {
      const generateRes = await fetch("/api/blueprint/generate", { method: "POST" });
      if (!generateRes.ok) {
        let errorText = "";
        try {
          errorText = await generateRes.text();
        } catch {
          errorText = "(unreadable)";
        }
        console.error("[generating] Blueprint generation request failed:", generateRes.status, errorText);
        setFailed(true);
        return;
      }
      const generateData = await generateRes.json();
      console.log("[generating] Blueprint creation started:", generateData);
    } catch (err) {
      console.error("[generating] Failed to initiate blueprint generation:", err);
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
          "Generation took longer than expected and didn't finish. In dev, Fast Refresh can kill the background task - restart the dev server and try again."
        );
        setFailed(true);
        return;
      }
      try {
        const res = await fetch("/api/blueprint/status");
        if (!res.ok) {
          console.error("[generating] Status check failed with status:", res.status);
          clearInterval(poll);
          setErrorDetail(`Status check failed with HTTP ${res.status}`);
          setFailed(true);
          return;
        }
        const data = await res.json();
        const { status, error } = data;
        console.log(`[generating] Poll #${pollCount}: status = ${status}`);

        if (status === "ready" || status === "error") {
          clearInterval(poll);
          ["kiaros_onboarding_step1","kiaros_onboarding_step2","kiaros_onboarding_step3","kiaros_onboarding_step4"]
            .forEach((k) => sessionStorage.removeItem(k));

          if (status === "error") {
            setErrorDetail(error || "");
            setFailed(true);
            return;
          }

          router.replace("/dashboard");
        }
      } catch (err) {
        console.error("[generating] Poll error:", err);
        clearInterval(poll);
        setErrorDetail(err instanceof Error ? err.message : String(err));
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
    setRetrying(true);
    hasFired.current = false;
    setRetrying(false);
    await startGeneration();
  }

  if (failed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="shell-panel max-w-sm space-y-6 px-6 py-10 text-center">
          <div className="text-5xl text-bone-muted">*</div>
          <h2 className="font-serif text-3xl text-bone">Something went wrong</h2>
          <p className="text-bone-muted">
            Your blueprint couldn&apos;t be generated right now. This sometimes happens with network
            hiccups, and it&apos;s worth trying again.
          </p>
          {errorDetail && (
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-stone-950/60 p-3 text-left text-xs text-bone-muted/80">
              {errorDetail}
            </pre>
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
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="shell-panel max-w-sm space-y-6 px-6 py-10 text-center">
        <div className="text-5xl animate-pulse text-bone-muted">*</div>
        <p className="shell-kicker">Generating</p>
        <h2 className="font-serif text-3xl text-bone">Creating your Life OS blueprint</h2>
        <p className="min-h-[1.5rem] text-bone-muted transition-all duration-500">
          {MESSAGES[messageIndex]}
        </p>
        <div className="flex justify-center gap-1 pt-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 animate-pulse rounded-full bg-leather-400"
              style={{ animationDelay: `${i * 0.25}s` }}
            />
          ))}
        </div>
        <p className="text-xs text-bone-muted">This usually takes about 30 seconds.</p>
      </div>
    </div>
  );
}
