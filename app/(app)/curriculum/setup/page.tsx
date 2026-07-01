"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { K } from "@/components/almanac/tokens";
import { BRAND } from "@/lib/brand";

const STEPS = [
  { key: 'analyzing', label: 'Analyzing your prompt' },
  { key: 'generating', label: 'Building your curriculum' },
  { key: 'saving', label: 'Saving your plan' },
] as const

type StepKey = typeof STEPS[number]['key']

function stepIndex(key: StepKey | null): number {
  if (key === null) return -1
  return STEPS.findIndex(s => s.key === key)
}

export default function CurriculumSetupPage() {
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentStep, setCurrentStep] = useState<StepKey | null>(null)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!loading) { setElapsed(0); return }
    const interval = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(interval)
  }, [loading])

  async function handleSubmit() {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setError("Tell us what you want to learn first.");
      return;
    }
    setError("");
    setLoading(true);
    setCurrentStep(null);

    try {
      const res = await fetch("/api/curriculum/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setError(
          (data as { error?: string }).error ??
            "Couldn't generate the curriculum right now. Try again."
        );
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6)) as { step: string; error?: string };

            if (event.step === "error") {
              setError(event.error ?? "Something went wrong.");
              setLoading(false);
              return;
            }
            if (event.step === "done") {
              router.replace("/curriculum");
              return;
            }
            if (["analyzing", "generating", "saving"].includes(event.step)) {
              setCurrentStep(event.step as StepKey);
            }
          } catch {
            // ignore malformed lines
          }
        }
      }
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setLoading(false);
    }
  }

  const activeIdx = stepIndex(currentStep);

  return (
    <>
      <style>{`
        @keyframes kiaros-dot-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.75); }
        }
      `}</style>
      <div
        style={{
          fontFamily: K.fBody,
          color: K.ink,
          maxWidth: 600,
          margin: "0 auto",
          padding: "48px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 32,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: K.fMono,
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: K.copper,
              marginBottom: 10,
            }}
          >
            New course
          </div>
          <div style={{ fontFamily: K.fSerif, fontStyle: "italic", fontSize: 32, lineHeight: 1.15, marginBottom: 12 }}>
            What do you want to learn?
          </div>
          <p style={{ fontSize: 15, color: K.inkDim, lineHeight: 1.7 }}>
            Describe it in your own words — your goal, your deadline, your tools, where you&apos;re starting from.
            {BRAND.product} will figure out the structure, the pacing, and the depth.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value.slice(0, 2000))}
            disabled={loading}
            rows={9}
            placeholder={`e.g. I want to learn to DJ for my sister's wedding next May. I have a Launchpad MK2 and Resolume, and I've been freestyling melodic bass and afro house for about a year. I need to learn transitions, effects, and how to put on a real performance — not just press play.`}
            style={{
              width: "100%",
              resize: "vertical",
              borderRadius: 14,
              border: `1px solid ${K.line}`,
              background: "rgba(0,0,0,0.3)",
              padding: "16px 18px",
              color: K.ink,
              fontFamily: K.fBody,
              fontSize: 14.5,
              lineHeight: 1.65,
              outline: "none",
              opacity: loading ? 0.5 : 1,
            }}
          />
          <span style={{ fontSize: 10, color: K.inkSoft, textAlign: "right" }}>
            {prompt.length}/2000
          </span>
        </div>

        {loading && (
          <div
            style={{
              borderRadius: 14,
              border: `1px solid ${K.line}`,
              background: "rgba(0,0,0,0.2)",
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div
              style={{
                fontFamily: K.fMono,
                fontSize: 10,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: K.copper,
                marginBottom: 2,
              }}
            >
              Generating
            </div>

            {STEPS.map((step, i) => {
              const isDone = i < activeIdx;
              const isActive = i === activeIdx;
              const isPending = i > activeIdx;

              return (
                <div key={step.key} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{ paddingTop: 3, flexShrink: 0 }}>
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: isDone || isActive ? K.copper : "transparent",
                        border: `2px solid ${isDone || isActive ? K.copper : K.line}`,
                        opacity: isPending ? 0.35 : 1,
                        animation: isActive ? "kiaros-dot-pulse 1.4s ease-in-out infinite" : "none",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <span
                      style={{
                        fontSize: 13.5,
                        color: isDone ? K.inkDim : isActive ? K.ink : K.inkSoft,
                        fontWeight: isActive ? 500 : 400,
                        opacity: isPending ? 0.45 : 1,
                      }}
                    >
                      {step.label}
                    </span>
                    {isActive && step.key === "generating" && elapsed >= 10 && (
                      <span style={{ fontSize: 11.5, color: K.inkSoft, lineHeight: 1.55 }}>
                        {elapsed < 45
                          ? "This usually takes 1–2 minutes for longer courses…"
                          : `Still working — ${Math.floor(elapsed / 60)}m ${String(elapsed % 60).padStart(2, "0")}s`}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {error && (
          <p style={{ fontSize: 13.5, color: "#f87171", lineHeight: 1.5 }}>{error}</p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: "13px 20px",
              borderRadius: 14,
              border: `1px solid ${K.copper}88`,
              background: `${K.copper}22`,
              color: K.ink,
              fontFamily: K.fBody,
              fontSize: 15,
              fontWeight: 500,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Building your plan…" : "Build my plan"}
          </button>
          <button
            type="button"
            onClick={() => router.replace("/curriculum")}
            disabled={loading}
            style={{
              padding: "10px 20px",
              borderRadius: 14,
              border: `1px solid ${K.line}`,
              background: "transparent",
              color: K.inkDim,
              fontFamily: K.fBody,
              fontSize: 14,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.5 : 1,
            }}
          >
            Skip for now
          </button>
        </div>
      </div>
    </>
  );
}
