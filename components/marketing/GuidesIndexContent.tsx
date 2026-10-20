import Link from "next/link";

import { StarField } from "@/components/almanac/StarField";
import { MarketingAlmanacShell } from "@/components/marketing/MarketingAlmanacChrome";
import { guideCanonicalPath, type GuideDocument } from "@/lib/marketing/guides";

interface Props {
  guides: GuideDocument[];
}

export function GuidesIndexContent({ guides }: Props) {
  return (
    <MarketingAlmanacShell>
      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <StarField count={72} seed={41} opacity={0.35} />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 50% 45% at 20% 20%, rgba(112,75,210,0.18), transparent 65%)",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-[720px] px-5 py-14 md:px-8 md:py-20">
          <h1 className="font-almanac-display text-4xl tracking-[0.06em] text-almanac-ink md:text-5xl">
            Guides
          </h1>
          <p className="mt-6 text-base leading-7 text-almanac-ink-dim">
            Practical guides on planning with your natal chart, moon journaling, quarterly reviews,
            and naming rest in your year.
          </p>

          <ul className="mt-12 space-y-8">
            {guides.map((guide) => (
              <li key={guide.slug}>
                <Link
                  href={guideCanonicalPath(guide.slug)}
                  className="group block rounded-2xl border border-almanac-line bg-[rgba(10,12,20,0.35)] p-6 transition-colors hover:border-almanac-kairos-hi"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="font-almanac-display text-xl tracking-[0.04em] text-almanac-ink group-hover:text-almanac-starlight">
                      {guide.seoTitle}
                    </h2>
                    <span
                      className="shrink-0 font-almanac-body text-lg text-almanac-kairos-hi transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    >
                      →
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-almanac-ink-dim">{guide.metaDescription}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </MarketingAlmanacShell>
  );
}
