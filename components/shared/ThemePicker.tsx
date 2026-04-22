"use client";

import { THEMES, type ThemeId } from "@/lib/constants";

interface ThemePickerProps {
  value: ThemeId;
  onChange: (theme: ThemeId) => void;
  compact?: boolean;
}

export function ThemePicker({ value, onChange, compact = false }: ThemePickerProps) {
  return (
    <div className={`grid gap-3 ${compact ? "grid-cols-3" : "grid-cols-1 sm:grid-cols-3"}`}>
      {THEMES.map((theme) => {
        const selected = value === theme.id;
        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => onChange(theme.id)}
            className={`group relative overflow-hidden rounded-2xl border text-left transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              selected
                ? "border-accent/70 bg-card/90 shadow-glow"
                : "border-border/60 bg-stone-900/50 hover:border-border hover:bg-stone-900/70"
            }`}
          >
            {/* Mini palette preview */}
            <div className="relative flex h-20 w-full items-end overflow-hidden rounded-t-2xl"
              style={{ background: theme.swatches[0] }}
            >
              {/* Atmospheric glow */}
              <div
                className="absolute inset-0 opacity-60"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${theme.swatches[1]}22, transparent 60%), radial-gradient(circle at 80% 70%, ${theme.swatches[2]}18, transparent 50%)`,
                }}
              />
              {/* Colour swatches row */}
              <div className="relative flex w-full items-center justify-center gap-2 pb-3">
                {theme.swatches.map((color, i) => (
                  <span
                    key={i}
                    className="h-4 w-4 rounded-full border border-white/10 shadow-sm"
                    style={{ background: color }}
                  />
                ))}
              </div>
              {/* Selected ring overlay */}
              {selected && (
                <div
                  className="pointer-events-none absolute inset-0 rounded-t-2xl"
                  style={{ boxShadow: `inset 0 0 0 1.5px ${theme.swatches[1]}66` }}
                />
              )}
            </div>

            {/* Text content */}
            <div className={`${compact ? "px-3 py-2.5" : "px-4 py-3"} space-y-0.5`}>
              <div className="flex items-center gap-2">
                <p className={`font-display font-medium text-bone ${compact ? "text-sm" : "text-[0.95rem]"}`}>
                  {theme.name}
                </p>
                {selected && (
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                )}
              </div>
              {!compact && (
                <p className="text-[0.72rem] leading-snug text-bone-muted/80">
                  {theme.tagline}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
