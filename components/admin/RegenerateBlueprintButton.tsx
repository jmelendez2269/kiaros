"use client";

import { useState } from "react";

interface Props {
  userId: string;
  displayName: string | null;
}

type State = "idle" | "loading" | "generating" | "done" | "error";

const POLL_INTERVAL_MS = 8000;
const POLL_TIMEOUT_MS = 20 * 60 * 1000;

export function RegenerateBlueprintButton({ userId, displayName }: Props) {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");

  function pollUntilDone(blueprintId: string) {
    const startedAt = Date.now();
    const interval = setInterval(async () => {
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        clearInterval(interval);
        setError("Timed out after 20 minutes");
        setState("error");
        return;
      }
      try {
        const res = await fetch(`/api/admin/blueprint/${blueprintId}`);
        if (!res.ok) { clearInterval(interval); setError("Status check failed"); setState("error"); return; }
        const { status, error: errMsg } = await res.json() as { status: string; error?: string };
        if (status === "ready") { clearInterval(interval); setState("done"); }
        else if (status === "error") { clearInterval(interval); setError(errMsg ?? "Generation failed"); setState("error"); }
      } catch {
        clearInterval(interval);
        setError("Lost connection during polling");
        setState("error");
      }
    }, POLL_INTERVAL_MS);
  }

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
      const { blueprintId } = await res.json() as { blueprintId: string };
      setState("generating");
      pollUntilDone(blueprintId);
    } catch {
      setError("Network error");
      setState("error");
    }
  }

  if (state === "generating") {
    return <span className="text-xs text-amber-400">Generating…</span>;
  }

  if (state === "done") {
    return <span className="text-xs text-emerald-400">Done ✓</span>;
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
