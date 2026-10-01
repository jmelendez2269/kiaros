import { FieldNotesKitSubscribeForm } from "./FieldNotesKitSubscribeForm";

type Variant = "almanac" | "shell";

interface Props {
  variant: Variant;
}

export function FieldNotesFooterSignup({ variant }: Props) {
  if (variant === "almanac") {
    return (
      <section
        aria-labelledby="field-notes-footer-heading"
        className="border-t border-almanac-line bg-[rgba(10,12,20,0.35)]"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 md:flex-row md:items-center md:justify-between md:gap-8 md:px-8">
          <p
            id="field-notes-footer-heading"
            className="max-w-md text-sm leading-6 text-almanac-ink-dim"
          >
            Field Notes, Jack&apos;s email newsletter.
          </p>
          <div className="w-full md:max-w-md">
            <FieldNotesKitSubscribeForm layout="inline" variant="almanac" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="field-notes-footer-heading"
      className="border-t border-border/50 bg-stone-950/50"
    >
      <div className="container flex flex-col gap-4 py-8 md:flex-row md:items-center md:justify-between md:gap-8">
        <p
          id="field-notes-footer-heading"
          className="max-w-md text-sm leading-6 text-bone-muted"
        >
          Field Notes, Jack&apos;s email newsletter.
        </p>
        <div className="w-full md:max-w-md">
          <FieldNotesKitSubscribeForm layout="inline" variant="shell" />
        </div>
      </div>
    </section>
  );
}
