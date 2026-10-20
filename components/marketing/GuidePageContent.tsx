import { GuideMarkdown } from "@/components/marketing/GuideMarkdown";
import { GuideReadingBackdrop } from "@/components/marketing/GuideReadingBackdrop";
import { MarketingAlmanacShell } from "@/components/marketing/MarketingAlmanacChrome";
import type { GuideDocument } from "@/lib/marketing/guides";

interface Props {
  guide: GuideDocument;
}

export function GuidePageContent({ guide }: Props) {
  return (
    <MarketingAlmanacShell>
      <main className="relative overflow-hidden">
        <GuideReadingBackdrop seed={guide.slug.length * 7} />

        <article className="relative z-10 mx-auto max-w-[720px] px-5 py-14 md:px-8 md:py-20">
          <GuideMarkdown markdown={guide.bodyMarkdown} />
        </article>
      </main>
    </MarketingAlmanacShell>
  );
}
