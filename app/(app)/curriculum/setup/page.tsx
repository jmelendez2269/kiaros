"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { K } from "@/components/almanac/tokens";

export default function CurriculumSetupPage() {
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setError("Tell us what you want to learn first.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/curriculum/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          (data as { error?: string }).error ??
            "Couldn't generate the curriculum right now. Try again."
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

  return (
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
          Kiaros will figure out the structure, the pacing, and the depth.
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
            cursor: "pointer",
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
            cursor: "pointer",
            opacity: loading ? 0.5 : 1,
          }}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
