import { getKitFieldNotesSubscribeActionUrl } from "@/lib/marketing/kit-field-notes";
import type { FieldNotesUtmFieldKey } from "@/lib/marketing/field-notes-utm";

import { FieldNotesUtmHiddenInputs } from "./FieldNotesUtmHiddenInputs";

type VisualVariant = "almanac" | "shell";

interface Props {
  layout?: "inline" | "stacked";
  variant?: VisualVariant;
  className?: string;
  initialUtm?: Partial<Record<FieldNotesUtmFieldKey, string>>;
}

const inputClassByVariant: Record<VisualVariant, string> = {
  almanac:
    "min-h-11 w-full rounded-full border border-almanac-line-hi bg-[rgba(10,12,20,0.6)] px-4 text-sm text-almanac-ink placeholder:text-almanac-ink-soft focus:border-[rgba(169,138,239,0.55)] focus:outline-none focus:ring-2 focus:ring-[rgba(112,75,210,0.35)]",
  shell:
    "min-h-11 w-full rounded-full border border-border/80 bg-stone-900/60 px-4 text-sm text-bone placeholder:text-bone-muted/70 focus:border-leather-300/50 focus:outline-none focus:ring-2 focus:ring-leather-300/25",
};

const buttonClassByVariant: Record<VisualVariant, string> = {
  almanac:
    "inline-flex min-h-11 items-center justify-center rounded-full bg-almanac-kairos-hi px-5 text-sm font-semibold text-almanac-midnight transition-transform hover:scale-[1.02]",
  shell:
    "inline-flex min-h-11 items-center justify-center rounded-full bg-leather-300 px-5 text-sm font-semibold text-stone-950 transition-opacity hover:opacity-90",
};

export function FieldNotesKitSubscribeForm({
  layout = "inline",
  variant = "shell",
  className = "",
  initialUtm,
}: Props) {
  const isStacked = layout === "stacked";
  const inputClass = inputClassByVariant[variant];
  const buttonClass = buttonClassByVariant[variant];

  return (
    <form
      action={getKitFieldNotesSubscribeActionUrl()}
      method="post"
      className={className}
    >
      <FieldNotesUtmHiddenInputs initialFromServer={initialUtm} />
      <div
        className={
          isStacked
            ? "flex flex-col gap-3"
            : "flex flex-col gap-3 sm:flex-row sm:items-stretch"
        }
      >
        <label className={isStacked ? "block w-full" : "block min-w-0 flex-1"}>
          <span className="sr-only">Email address</span>
          <input
            type="email"
            name="email_address"
            required
            autoComplete="email"
            placeholder="Your email"
            className={inputClass}
          />
        </label>
        <button type="submit" className={`${buttonClass} w-full shrink-0 sm:w-auto`}>
          Join Field Notes
        </button>
      </div>
    </form>
  );
}
