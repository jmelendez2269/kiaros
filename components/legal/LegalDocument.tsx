import Link from "next/link";

export interface LegalNavigationItem {
  href: `#${string}`;
  label: string;
}

export function LegalDocument({
  children,
  effectiveDate,
  eyebrow,
  navigation,
  summary,
  title,
}: {
  children: React.ReactNode;
  effectiveDate: string;
  eyebrow: string;
  navigation: readonly LegalNavigationItem[];
  summary: string;
  title: string;
}) {
  return (
    <main className="page-wrapper">
      <div className="container py-12 md:py-16">
        <header className="shell-panel-hero p-8 md:p-10">
          <p className="shell-kicker mb-4">{eyebrow}</p>
          <h1 className="shell-hero-title max-w-4xl">{title}</h1>
          <p className="shell-prose-lead mt-4 max-w-3xl">{summary}</p>
          <p className="mt-5 text-sm font-medium text-bone-muted">Effective {effectiveDate}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              className="inline-flex min-h-11 items-center rounded-full bg-leather-300 px-5 py-3 text-sm font-semibold text-stone-950 transition-opacity hover:opacity-90"
              href="/contact"
            >
              Contact Kiaros
            </Link>
            <Link
              className="inline-flex min-h-11 items-center rounded-full border border-border px-5 py-3 text-sm font-semibold text-bone transition-colors hover:bg-muted"
              href={eyebrow === "Privacy" ? "/terms" : "/privacy"}
            >
              Read the {eyebrow === "Privacy" ? "Terms" : "Privacy Policy"}
            </Link>
          </div>
        </header>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(14rem,0.34fr)_minmax(0,1fr)]">
          <nav aria-label={`${eyebrow} sections`} className="shell-panel-soft p-5 lg:sticky lg:top-6">
            <p className="shell-kicker">On this page</p>
            <ol className="mt-4 space-y-2 text-sm leading-6 text-bone-muted">
              {navigation.map((item, index) => (
                <li key={item.href}>
                  <a className="block rounded-lg px-2 py-1 transition-colors hover:bg-muted hover:text-bone" href={item.href}>
                    {index + 1}. {item.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="shell-panel space-y-10 p-6 md:p-9 [&_a]:text-leather-200 [&_a]:underline-offset-4 hover:[&_a]:underline [&_h2]:scroll-mt-8 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-bone [&_li]:leading-7 [&_p]:leading-7 [&_p]:text-bone-muted [&_ul]:space-y-2 [&_ul]:pl-5">
            {children}
          </article>
        </div>
      </div>
    </main>
  );
}

