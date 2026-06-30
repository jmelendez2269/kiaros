"use client";

import { useState } from "react";

interface Props {
  userId: string;
  displayName: string | null;
}

type State = "idle" | "loading" | "generating" | "done" | "error";

export function RegenerateBlueprintButton({ userId, displayName }: Props) {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");

  async function handleClick() {
    if (!confirm(`Re-generate blueprint for ${displayName ?? userId}? This will create a new version and takes 5–15 minutes.`)) return;

    setState("loading");
    setError("");

    try {
      const res = await fetch(`/api/admin/users/${userId}/regenerate-blueprint`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Request failed");
        setState("error");
        return;
      }
      setState("generating");
    } catch {
      setError("Network error");
      setState("error");
    }
  }

  if (state === "generating" || state === "done") {
    return (
      <span className="text-xs text-emerald-400">
        {state === "generating" ? "Generating…" : "Done"}
      </span>
    );
  }

  if (state === "error") {
    return (
      <span className="text-xs text-red-400" title={error}>
        Error — {error}
      </span>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === "loading"}
      className="rounded border border-border/60 bg-muted px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground disabled:opacity-50"
    >
      {state === "loading" ? "Starting…" : "Re-generate"}
    </button>
  );
}
