"use client";

import { useState, useTransition } from "react";
import { ThemePicker } from "@/components/shared/ThemePicker";
import { THEMES, type ThemeId } from "@/lib/constants";

const COOKIE_NAME = "kiaros-theme";

function applyTheme(theme: ThemeId) {
  document.documentElement.dataset.theme = theme;
  document.cookie = `${COOKIE_NAME}=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export default function SettingsPage() {
  const currentTheme = (() => {
    if (typeof document === "undefined") return "obsidian";
    return (document.documentElement.dataset.theme as ThemeId) ?? "obsidian";
  })();

  const [theme, setTheme] = useState<ThemeId>(currentTheme);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleChange = (t: ThemeId) => {
    setTheme(t);
    setSaved(false);
    applyTheme(t);
  };

  const handleSave = () => {
    startTransition(async () => {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      });
      setSaved(true);
    });
  };

  const selectedTheme = THEMES.find((t) => t.id === theme)!;

  return (
    <div className="mx-auto max-w-2xl space-y-10 px-4 py-10 md:px-8">
      {/* Header */}
      <div className="space-y-1">
        <p className="shell-eyebrow">Settings</p>
        <h1 className="shell-section-title">Preferences</h1>
      </div>

      {/* Theme section */}
      <section className="space-y-5">
        <div className="space-y-1 border-b border-border/50 pb-4">
          <h2 className="shell-subsection-title">Visual theme</h2>
          <p className="text-sm text-bone-muted">
            Choose the palette that feels true to you. Changes apply instantly.
          </p>
        </div>

        <ThemePicker value={theme} onChange={handleChange} />

        {/* Description */}
        <div className="rounded-xl border border-border/60 bg-stone-950/40 px-4 py-3">
          <p className="text-sm leading-relaxed text-bone-muted">
            <span className="font-medium text-bone">{selectedTheme.name} — </span>
            {selectedTheme.description}
          </p>
        </div>

        {/* Save button */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-xl border border-leather-400/50 bg-leather-500/30 px-5 py-2.5 text-sm font-medium text-bone shadow-glow transition hover:bg-leather-500/45 disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save theme"}
          </button>
          {saved && (
            <p className="text-sm text-moss-400">Saved</p>
          )}
        </div>
      </section>
    </div>
  );
}
