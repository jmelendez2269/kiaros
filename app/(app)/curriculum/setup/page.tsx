"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { K } from "@/components/almanac/tokens";

const DURATION_OPTIONS = [
  { label: "4 weeks", value: 4 },
  { label: "8 weeks", value: 8 },
  { label: "12 weeks", value: 12 },
  { label: "16 weeks", value: 16 },
];

const INTENSITY_OPTIONS: {
  label: string;
  description: string;
  value: "light" | "balanced" | "dense";
}[] = [
  { label: "Light", description: "1–2 hrs/week", value: "light" },
  { label: "Balanced", description: "3–5 hrs/week", value: "balanced" },
  { label: "Dense", description: "6+ hrs/week", value: "dense" },
];

export default function CurriculumSetupPage() {
  const router = useRouter();

  const [topic, setTopic] = useState("");
  const [durationWeeks, setDurationWeeks] = useState(8);
  const [intensity, setIntensity] = useState<"light" | "balanced" | "dense">("balanced");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/profile", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const sf = (data?.profile?.study_focus as string | null) ?? "";
        if (sf.trim()) setTopic(sf.slice(0, 140));
      })
      .catch(() => {});
  }, []);

  async function handleSubmit() {
    const trimmed = topic.trim();
    if (!trimmed) {
      setError("Please enter a topic so Kiaros knows what to plan.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/curriculum/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: trimmed, durationWeeks, intensity, skills: [] }),
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
        maxWidth: 560,
        margin: "0 auto",
        padding: "40px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 28,
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
          Curriculum setup
        </div>
        <div style={{ fontFamily: K.fSerif, fontStyle: "italic", fontSize: 32, lineHeight: 1.15, marginBottom: 10 }}>
          Build your first study plan
        </div>
        <p style={{ fontSize: 14.5, color: K.inkDim, lineHeight: 1.65 }}>
          Kiaros generates a week-by-week curriculum tied to your blueprint timeline. Sessions schedule themselves and surface on Today so nothing falls through.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Topic */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 13.5, fontWeight: 500, color: K.ink }}>What are you studying?</label>
          <p style={{ fontSize: 12, color: K.inkDim, lineHeight: 1.5 }}>
            A short description of the topic, track, or outcome you want to study toward.
          </p>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value.slice(0, 140))}
            disabled={loading}
            rows={3}
            placeholder="e.g., Depth psychology and Jungian archetypes"
            style={{
              width: "100%",
              resize: "none",
              borderRadius: 12,
              border: `1px solid ${K.line}`,
              background: "rgba(0,0,0,0.3)",
              padding: "12px 14px",
              color: K.ink,
              fontFamily: K.fBody,
              fontSize: 14,
              outline: "none",
              opacity: loading ? 0.5 : 1,
            }}
          />
          <span style={{ fontSize: 10, color: K.inkSoft, textAlign: "right" }}>{topic.length}/140</span>
        </div>

        {/* Duration */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 13.5, fontWeight: 500, color: K.ink }}>How long?</label>
          <div style={{ display: "flex", gap: 8 }}>
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={loading}
                onClick={() => setDurationWeeks(opt.value)}
                style={{
                  flex: 1,
                  padding: "8px 4px",
                  borderRadius: 10,
                  border: `1px solid ${durationWeeks === opt.value ? K.copper : K.line}`,
                  background: durationWeeks === opt.value ? `${K.copper}22` : "transparent",
                  color: durationWeeks === opt.value ? K.ink : K.inkDim,
                  fontFamily: K.fBody,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  opacity: loading ? 0.5 : 1,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Intensity */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 13.5, fontWeight: 500, color: K.ink }}>Intensity</label>
          <div style={{ display: "flex", gap: 8 }}>
            {INTENSITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={loading}
                onClick={() => setIntensity(opt.value)}
                style={{
                  flex: 1,
                  padding: "10px 4px",
                  borderRadius: 10,
                  border: `1px solid ${intensity === opt.value ? K.copper : K.line}`,
                  background: intensity === opt.value ? `${K.copper}22` : "transparent",
                  color: intensity === opt.value ? K.ink : K.inkDim,
                  fontFamily: K.fBody,
                  fontSize: 13,
                  cursor: "pointer",
                  opacity: loading ? 0.5 : 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <span style={{ fontWeight: 500 }}>{opt.label}</span>
                <span style={{ fontSize: 10.5, opacity: 0.7 }}>{opt.description}</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p style={{ fontSize: 13.5, color: "#f87171", lineHeight: 1.5 }}>{error}</p>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          style={{
            padding: "12px 20px",
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
          {loading ? "Building your curriculum…" : "Build my curriculum"}
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
