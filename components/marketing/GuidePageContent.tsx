import { StarField } from "@/components/almanac/StarField";
import { GuideMarkdown } from "@/components/marketing/GuideMarkdown";
import { MarketingAlmanacShell } from "@/components/marketing/MarketingAlmanacChrome";
import type { GuideDocument } from "@/lib/marketing/guides";

interface Props {
  guide: GuideDocument;
}

export function GuidePageContent({ guide }: Props) {
  return (
    <MarketingAlmanacShell>
      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <StarField count={72} seed={guide.slug.length * 7} opacity={0.35} />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 50% 45% at 20% 20%, rgba(112,75,210,0.18), transparent 65%)",
            }}
          />
        </div>

        <article className="relative mx-auto max-w-2xl px-5 py-14 md:px-8 md:py-20">
          <GuideMarkdown markdown={guide.bodyMarkdown} />
        </article>
      </main>
    </MarketingAlmanacShell>
  );
}
