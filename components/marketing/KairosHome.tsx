import Link from "next/link";
import { StarField } from "@/components/almanac/StarField";
import { EphemerisWheel } from "@/components/almanac/EphemerisWheel";
import { Divider } from "@/components/almanac/Divider";
import { CheckoutButton } from "@/components/commerce/CheckoutButton";
import { COMMERCE_TIERS, formatUsd, CURRENT_PLANNER_YEAR } from "@/lib/commerce/config";
import { BRAND } from "@/lib/brand";

interface Props {
  isSignedIn: boolean;
}

// ── Demo data — purely illustrative, no real user data on the marketing page ──

const HERO_NATAL = {
  sun: 108,
  moon: 340,
  mercury: 95,
  venus: 128,
  mars: 250,
  jupiter: 12,
  saturn: 305,
  uranus: 32,
  neptune: 356,
  pluto: 278,
} as const;

const HERO_TRANSIT = {
  sun: 100,
  moon: 210,
  saturn: 300,
  jupiter: 40,
} as const;

const HERO_ASPECTS = [
  { a: 108, b: 305, kind: "square" as const },
  { a: 108, b: 12, kind: "trine" as const },
  { a: 340, b: 128, kind: "sextile" as const },
];

const TICKER_ITEMS = [
  "☉ 10°42′ CANCER",
  "☽ WANING GIBBOUS · 62%",
  "♄ STATIONARY RETROGRADE",
  "NEXT FULL MOON · 6 DAYS",
  "♃ 12° CAPRICORN · APPLYING TRINE",
];

const INSTRUMENTS: Array<{
  glyph: string;
  name: string;
  body: string;
}> = [
  { glyph: "☉", name: "Blueprint", body: "Your full year, generated once from your chart — 52 weeks, 12 months, 4 quarters." },
  { glyph: "☽", name: "Cosmic Calendar", body: "Year, month, and week views carrying real transits, moon phases, and retrogrades." },
  { glyph: "✦", name: "Stelloquy · Oracle", body: "A conversation that already knows your chart, your goals, and what you told it last time." },
  { glyph: "✎", name: "Journal", body: "Every entry stamped with the sky above it. Patterns surface on their own, over time." },
  { glyph: "▦", name: "Daily Tracker", body: "A 90-day rhythm for whatever you're actually building — no guilt, just a record." },
  { glyph: "▤", name: "Curriculum", body: "Tell it what you're studying. It writes the weeks, then the sessions, one at a time." },
  { glyph: "⬡", name: "Human Design", body: "Type, Strategy, Authority, Profile — one more honest input. Never a verdict." },
  { glyph: "◈", name: "Quarterly Review", body: "Your own words about the last 90 days, reflected back with real timing." },
  { glyph: "☾", name: "Month Briefs", body: "A short letter for the month ahead, written fresh — not a template filled in." },
  { glyph: "✳", name: "Insights Map", body: "The shape of what you keep circling back to, drawn from everything you've saved." },
];

function TickerRow() {
  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="relative overflow-hidden border-y border-almanac-line bg-almanac-bg2/60 py-3">
      <div className="flex w-max gap-10 whitespace-nowrap font-almanac-mono text-[0.72rem] tracking-[0.18em] text-almanac-ink-dim kairos-ticker-track">
        {doubled.map((item, i) => (
          <span key={i} className="flex items-center gap-10">
            {item}
            <span className="text-[rgba(169,138,239,0.5)]">&middot;</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function NavBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-almanac-line-hi bg-[rgba(10,12,20,0.85)] backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
        <div className="flex items-center gap-2">
          <span className="text-lg text-almanac-copper-hi" aria-hidden>&#10022;</span>
          <span className="flex items-baseline gap-1.5">
            <span className="font-almanac-display text-lg tracking-[0.08em] text-almanac-ink">
              {BRAND.product.toUpperCase()}
            </span>
            <span className="font-almanac-mono text-[0.62rem] uppercase tracking-[0.18em] text-almanac-ink-soft">
              Planner
            </span>
          </span>
        </div>
        <nav className="hidden items-center gap-7 font-almanac-mono text-[0.72rem] uppercase tracking-[0.16em] text-almanac-ink-dim md:flex">
          <Link href="#instruments" className="transition-colors hover:text-almanac-ink">Instruments</Link>
          <Link href="#oracle" className="transition-colors hover:text-almanac-ink">Oracle</Link>
          <Link href="#pricing" className="transition-colors hover:text-almanac-ink">Pricing</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="hidden font-almanac-mono text-[0.72rem] uppercase tracking-[0.16em] text-almanac-ink-dim transition-colors hover:text-almanac-ink sm:inline"
          >
            Sign in
          </Link>
          <Link
            href="#pricing"
            className="rounded-full border border-[rgba(169,138,239,0.5)] bg-[rgba(112,75,210,0.2)] px-4 py-2 font-almanac-mono text-[0.7rem] uppercase tracking-[0.14em] text-almanac-starlight transition-colors hover:bg-[rgba(112,75,210,0.35)]"
          >
            Get your year
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-almanac-line">
      <div className="pointer-events-none absolute inset-0">
        <StarField count={90} seed={11} opacity={0.5} />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 78% 20%, rgba(112,75,210,0.22), transparent 62%), radial-gradient(ellipse 40% 40% at 10% 85%, rgba(78,231,253,0.08), transparent 60%)",
          }}
        />
      </div>

      <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-[1.05fr_0.95fr] md:items-center md:px-8 md:py-24">
        <div className="min-w-0 kairos-rise" style={{ animationDelay: "0.05s" }}>
          <p className="font-almanac-mono text-[0.72rem] uppercase tracking-[0.28em] text-almanac-copper-hi">
            An observatory for your own year
          </p>
          <h1 className="mt-5 flex flex-wrap items-baseline gap-3 font-almanac-display leading-[0.98] tracking-[0.02em] text-almanac-ink">
            <span className="text-[clamp(2.6rem,7vw,5rem)]">{BRAND.product}</span>
            <span className="font-almanac-mono text-[0.9rem] uppercase tracking-[0.24em] text-almanac-ink-soft">
              Planner
            </span>
          </h1>
          <p className="mt-4 max-w-md font-almanac-serif text-2xl italic leading-snug text-almanac-starlight md:text-[1.7rem]">
            {BRAND.productTagline}
          </p>
          <p className="mt-6 max-w-md text-[0.98rem] leading-7 text-almanac-ink-dim">
            Real planetary positions at the moment you were born. Real transits for the months ahead.
            One system that turns both into a year you can actually use — not a horoscope, not a
            template.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="#pricing"
              className="rounded-full bg-almanac-kairos-hi px-6 py-3 text-sm font-semibold text-almanac-midnight transition-transform hover:scale-[1.02]"
            >
              Get your {CURRENT_PLANNER_YEAR} blueprint
            </Link>
            <Link
              href="#oracle"
              className="rounded-full border border-almanac-line-hi px-6 py-3 text-sm font-medium text-almanac-ink transition-colors hover:border-[rgba(169,138,239,0.6)] hover:text-almanac-copper-hi"
            >
              See the Oracle in conversation &rarr;
            </Link>
          </div>
        </div>

        <div
          className="relative min-w-0 flex items-center justify-center kairos-rise md:justify-end"
          style={{ animationDelay: "0.22s" }}
        >
          <div className="relative w-full max-w-[420px] [&_svg]:h-auto [&_svg]:w-full">
            <div
              className="absolute inset-0 -z-10 rounded-full blur-3xl"
              style={{ background: "radial-gradient(circle, rgba(112,75,210,0.35), transparent 65%)" }}
            />
            <div className="kairos-wheel-spin">
              <EphemerisWheel size={420} natal={HERO_NATAL} transit={HERO_TRANSIT} aspects={HERO_ASPECTS} />
            </div>
          </div>
        </div>
      </div>

      <TickerRow />
    </section>
  );
}

function InstrumentPanel() {
  return (
    <section id="instruments" className="relative border-b border-almanac-line bg-almanac-bg2/40 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="max-w-2xl">
          <p className="font-almanac-mono text-[0.72rem] uppercase tracking-[0.28em] text-almanac-copper-hi">
            Nine instruments. One chart.
          </p>
          <h2 className="mt-4 font-almanac-serif text-4xl italic text-almanac-ink md:text-5xl">
            Everything reads from the same sky.
          </h2>
          <p className="mt-4 text-[0.98rem] leading-7 text-almanac-ink-dim">
            Most planners ask for your goals and ignore your timing. Most astrology apps read your
            chart and ignore your goals. Every surface below shares one natal chart, one plan year,
            and one running memory of you.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 divide-y divide-almanac-line/50 border-y border-almanac-line sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-5 lg:divide-x">
          {INSTRUMENTS.map((item, i) => (
            <div
              key={item.name}
              className="group relative px-6 py-8 transition-colors hover:bg-almanac-bg3/60 sm:[&:nth-child(2n)]:border-l sm:[&:nth-child(2n)]:border-almanac-line lg:[&:nth-child(2n)]:border-l-0"
              style={{
                borderTop: i >= 5 ? undefined : undefined,
              }}
            >
              <span className="font-almanac-serif text-3xl text-almanac-copper transition-colors group-hover:text-almanac-copper-hi" aria-hidden>
                {item.glyph}
              </span>
              <h3 className="mt-4 font-almanac-mono text-[0.78rem] uppercase tracking-[0.12em] text-almanac-ink">
                {item.name}
              </h3>
              <p className="mt-2 text-[0.85rem] leading-6 text-almanac-ink-soft">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BlueprintDeepDive() {
  const weeks = [
    { label: "W14", tone: "push" },
    { label: "W15", tone: "push" },
    { label: "W16", tone: "rest" },
    { label: "W17", tone: "steady" },
    { label: "W18", tone: "steady" },
    { label: "W19", tone: "push" },
    { label: "W20", tone: "rest" },
  ];
  const toneColor: Record<string, string> = {
    push: "bg-almanac-kairos-hi",
    rest: "bg-[rgba(223,155,63,0.7)]",
    steady: "bg-[rgba(103,152,203,0.6)]",
  };

  return (
    <section className="border-b border-almanac-line py-20 md:py-28">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 md:grid-cols-[0.9fr_1.1fr] md:px-8">
        <div>
          <p className="font-almanac-mono text-[0.72rem] uppercase tracking-[0.28em] text-almanac-copper-hi">
            The blueprint
          </p>
          <h2 className="mt-4 font-almanac-serif text-4xl italic text-almanac-ink md:text-5xl">
            52 weeks, shaped around you — not a template.
          </h2>
          <p className="mt-5 text-[0.98rem] leading-7 text-almanac-ink-dim">
            Your birth date, time, and place produce a real natal chart: ten planetary positions,
            house placements, a precise snapshot of the sky the moment you arrived. That chart, plus
            the actual astronomical weather for your year and the goals you name in your own words,
            becomes a single generated blueprint — quarters, months, weeks, each with its own
            reason for being what it is.
          </p>
          <Divider glyph="&#9737;" />
          <p className="text-[0.95rem] leading-7 text-almanac-ink-soft">
            Regenerate whenever your year changes shape. Nothing is overwritten — every version
            is kept, so your history stays intact.
          </p>
        </div>

        <div className="rounded-2xl border border-almanac-line-hi bg-almanac-bg2/70 p-6 md:p-8">
          <p className="font-almanac-mono text-[0.68rem] uppercase tracking-[0.16em] text-almanac-ink-soft">
            Quarter 2 &middot; sample week arc
          </p>
          <div className="mt-5 flex items-end gap-2">
            {weeks.map((w) => (
              <div key={w.label} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className={`w-full rounded-t-md ${toneColor[w.tone]}`}
                  style={{ height: w.tone === "push" ? 92 : w.tone === "rest" ? 40 : 64 }}
                />
                <span className="font-almanac-mono text-[0.62rem] text-almanac-ink-soft">{w.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-4 font-almanac-mono text-[0.65rem] uppercase tracking-[0.1em] text-almanac-ink-soft">
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-almanac-kairos-hi" /> Push</span>
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[rgba(103,152,203,0.6)]" /> Steady</span>
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[rgba(223,155,63,0.7)]" /> Rest</span>
          </div>
          <p className="mt-6 border-t border-almanac-line pt-5 text-[0.88rem] italic leading-6 text-[rgba(193,220,239,0.9)]">
            "Week 16 asks for withdrawal, not momentum — Venus stations retrograde on your
            descendant. Week 19 is the one to move on the Q2 goal you named."
          </p>
        </div>
      </div>
    </section>
  );
}

function OracleDeepDive() {
  return (
    <section id="oracle" className="scroll-mt-24 border-b border-almanac-line bg-almanac-bg2/40 py-20 md:py-28">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 md:grid-cols-[1fr_1.1fr] md:px-8 md:items-center">
        <div>
          <p className="font-almanac-mono text-[0.72rem] uppercase tracking-[0.28em] text-almanac-copper-hi">
            Stelloquy &middot; the Oracle
          </p>
          <h2 className="mt-4 font-almanac-serif text-4xl italic text-almanac-ink md:text-5xl">
            Not a chatbot. A conversation with context.
          </h2>
          <p className="mt-5 text-[0.98rem] leading-7 text-almanac-ink-dim">
            Stelloquy opens already knowing your chart, this week's transits, the goals you named,
            and whatever you've chosen to let it remember from your journal. You don't re-explain
            your situation. You just ask.
          </p>
          <ul className="mt-6 space-y-3 text-[0.9rem] leading-6 text-almanac-ink-soft">
            <li className="flex gap-3"><span className="text-almanac-copper">&middot;</span> Grounded in an actual transit or placement, never a generic sun-sign line.</li>
            <li className="flex gap-3"><span className="text-almanac-copper">&middot;</span> Five interpretive lenses — evolutionary, karmic, psychological, traditional, synthesis.</li>
            <li className="flex gap-3"><span className="text-almanac-copper">&middot;</span> Save anything that matters; it feeds your Insights map and future guidance.</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-almanac-line-hi bg-[rgba(10,12,20,0.8)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] md:p-7">
          <p className="font-almanac-mono text-[0.65rem] uppercase tracking-[0.14em] text-almanac-ink-soft">
            Sample exchange
          </p>
          <div className="mt-4 space-y-4">
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm border border-[rgba(112,75,210,0.4)] bg-[rgba(112,75,210,0.15)] px-4 py-3 text-sm leading-6 text-almanac-ink">
              I've been pulled in two directions about my creative work. Focus on one thing, or keep both going?
            </div>
            <div className="max-w-[92%] space-y-3 rounded-2xl rounded-tl-sm border border-almanac-line-hi bg-almanac-bg2/80 px-4 py-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[rgba(199,179,245,0.8)]">
                Stelloquy &middot; grounded in your chart, your goals, your memory
              </p>
              <p className="text-sm leading-7 text-almanac-ink-dim">
                Saturn trine your Midheaven is exact right now — that usually asks for
                consolidation, not expansion. But your Jupiter–Moon conjunction through June carries
                a Cancer flavor, which means emotional truth matters more than strategic logic here.
              </p>
              <p className="text-sm leading-7 text-almanac-ink-dim">
                You wrote in your Year Vision that you wanted to stop holding back on work you
                actually care about. I'd start there.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {["Saturn △ Midheaven", "Jupiter ☌ Moon", "Year Vision"].map((tag) => (
                  <span key={tag} className="rounded-full border border-almanac-line-hi bg-[rgba(10,12,20,0.7)] px-2.5 py-0.5 text-[0.62rem] text-almanac-ink-soft">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Manifesto() {
  return (
    <section className="relative overflow-hidden border-b border-almanac-line py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0">
        <StarField count={50} seed={23} opacity={0.3} />
      </div>
      <div className="relative mx-auto max-w-3xl px-5 text-center md:px-8">
        <p className="font-almanac-mono text-[0.7rem] uppercase tracking-[0.3em] text-almanac-copper-hi">
          Anti-hustle, on principle
        </p>
        <p className="mt-8 font-almanac-serif text-3xl italic leading-[1.35] text-almanac-ink md:text-4xl">
          Rest is strategy, not a failure of discipline. Timing is data, not a feeling you talk
          yourself out of. {BRAND.product} exists so your year doesn't have to guess which is which.
        </p>
      </div>
    </section>
  );
}

function PricingTeaser({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <section id="pricing" className="scroll-mt-24 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="max-w-2xl">
          <p className="font-almanac-mono text-[0.72rem] uppercase tracking-[0.28em] text-almanac-copper-hi">
            Choose your rhythm
          </p>
          <h2 className="mt-4 font-almanac-serif text-4xl italic text-almanac-ink md:text-5xl">
            Monthly for accessibility. Annual for the best value.
          </h2>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {COMMERCE_TIERS.map((tier) => (
            <div
              key={tier.key}
              className="flex flex-col rounded-2xl border border-almanac-line-hi bg-almanac-bg2/60 p-7 md:p-8"
            >
              <p className="font-almanac-mono text-[0.68rem] uppercase tracking-[0.14em] text-almanac-copper-hi">
                {tier.shortName}
              </p>
              <h3 className="mt-2 font-almanac-serif text-2xl text-almanac-ink">{tier.name}</h3>
              <p className="mt-3 flex-1 text-[0.9rem] leading-6 text-almanac-ink-dim">{tier.tagline}</p>

              <div className="mt-6 flex items-baseline gap-2">
                <span className="font-almanac-display text-4xl text-almanac-ink">
                  {formatUsd(tier.monthlyPriceCents)}
                </span>
                <span className="text-sm text-almanac-ink-soft">/mo, or {formatUsd(tier.annualPriceCents)}/yr</span>
              </div>

              <ul className="mt-6 space-y-2 text-[0.85rem] leading-6 text-almanac-ink-soft">
                {tier.features.slice(0, 3).map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="mt-1 text-almanac-copper">&middot;</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                {isSignedIn ? (
                  <Link
                    href="/settings"
                    className="rounded-full bg-almanac-kairos-hi px-5 py-2.5 text-sm font-semibold text-almanac-midnight"
                  >
                    Manage plan
                  </Link>
                ) : (
                  <CheckoutButton
                    tierKey={tier.key}
                    accessPlan="yearly"
                    label={`Get ${tier.shortName}`}
                    className="rounded-full bg-almanac-kairos-hi px-5 py-2.5 text-sm font-semibold text-almanac-midnight transition-transform hover:scale-[1.02]"
                  />
                )}
                <Link
                  href="/pricing"
                  className="text-sm text-almanac-ink-soft underline decoration-almanac-line-hi underline-offset-4 transition-colors hover:text-almanac-ink"
                >
                  Full comparison + Etsy access
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MarketingFooter() {
  return (
    <footer className="border-t border-almanac-line py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="flex items-center gap-2">
          <span className="text-base text-almanac-copper-hi" aria-hidden>&#10022;</span>
          <span className="font-almanac-display text-sm tracking-[0.08em] text-almanac-ink">
            {BRAND.product.toUpperCase()}
          </span>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 font-almanac-mono text-[0.7rem] uppercase tracking-[0.14em] text-almanac-ink-soft">
          <Link href="/contact" className="transition-colors hover:text-almanac-ink">Contact</Link>
          <Link href="/privacy" className="transition-colors hover:text-almanac-ink">Privacy</Link>
          <Link href="/terms" className="transition-colors hover:text-almanac-ink">Terms</Link>
          <Link href="/activate" className="transition-colors hover:text-almanac-ink">Activate Etsy purchase</Link>
        </nav>
        <p className="font-almanac-mono text-[0.68rem] uppercase tracking-[0.12em] text-[rgba(110,109,124,0.7)]">
          &copy; {CURRENT_PLANNER_YEAR} {BRAND.product}
        </p>
      </div>
    </footer>
  );
}

export function KairosHome({ isSignedIn }: Props) {
  return (
    <div className="bg-almanac-bg text-almanac-ink">
      <NavBar />
      <Hero />
      <InstrumentPanel />
      <BlueprintDeepDive />
      <OracleDeepDive />
      <Manifesto />
      <PricingTeaser isSignedIn={isSignedIn} />
      <MarketingFooter />
    </div>
  );
}
