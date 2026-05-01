import Link from "next/link";
import { Activity, Brain, Orbit } from "lucide-react";

import { CheckoutButton } from "@/components/commerce/CheckoutButton";
import { MoonPhaseIcon } from "@/components/shared/MoonPhaseIcon";
import { COMMERCE_TIERS, CURRENT_PLANNER_YEAR, formatUsd } from "@/lib/commerce/config";

interface Props {
  isSignedIn: boolean;
  mode?: "home" | "pricing";
  showCanceledMessage?: boolean;
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      className="mt-0.5 shrink-0 text-leather-300"
      aria-hidden
    >
      <circle cx="7" cy="7" r="6.5" stroke="currentColor" strokeOpacity="0.4" />
      <path
        d="M4.5 7L6.2 8.8L9.5 5.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Demo data ─────────────────────────────────────────────────────────────────

const DEMO_WEEK_PULSE = [
  {
    date: "21", month: "Apr", day: "Mon",
    moon: "Gemini", phase: "waxing-crescent" as const,
    activation: 0.72, review: 0.24, lunar: 0.40,
    note: "Sharp communication. Good for writing and decisions.",
  },
  {
    date: "22", month: "Apr", day: "Tue",
    moon: "Cancer", phase: "waxing-crescent" as const,
    activation: 0.68, review: 0.28, lunar: 0.62,
    note: "Your moon sign is active. Emotional clarity.",
    isToday: true,
  },
  {
    date: "23", month: "Apr", day: "Wed",
    moon: "Cancer", phase: "first-quarter" as const,
    activation: 0.55, review: 0.35, lunar: 0.58,
    note: "Jupiter △ natal Venus. Creative output amplified.",
  },
  {
    date: "24", month: "Apr", day: "Thu",
    moon: "Leo", phase: "first-quarter" as const,
    activation: 0.85, review: 0.18, lunar: 0.85,
    note: "First Quarter Moon exact. Visibility opens now.",
  },
  {
    date: "25", month: "Apr", day: "Fri",
    moon: "Leo", phase: "waxing-gibbous" as const,
    activation: 0.65, review: 0.22, lunar: 0.65,
    note: "Mercury ✶ Jupiter. Best day for key conversations.",
  },
  {
    date: "26", month: "Apr", day: "Sat",
    moon: "Virgo", phase: "waxing-gibbous" as const,
    activation: 0.38, review: 0.48, lunar: 0.48,
    note: "Integration. Tend the system.",
  },
  {
    date: "27", month: "Apr", day: "Sun",
    moon: "Virgo", phase: "waxing-gibbous" as const,
    activation: 0.22, review: 0.55, lunar: 0.40,
    note: "Rest before the week ahead.",
  },
] as const;

const DEMO_LANES = [
  {
    kicker: "Primary lane",
    percent: "60%",
    value: "Creative Projects",
    body: "This is the workstream your blueprint asks you to protect first. In this window, Saturn's structural backing and Jupiter's expansive reach are active simultaneously — a combination that appears rarely. What you build here is built to last and built to grow.",
    tone: "border-leather-500/35 bg-gradient-to-br from-leather-500/12 to-stone-900",
    Icon: Orbit,
  },
  {
    kicker: "Tending",
    percent: "30%",
    value: "Restoration rhythm",
    body: "The Moon transiting Cancer this week activates your natal Moon — your chart's emotional center. Your tending lane this week is maintaining the vessel: rest, nourishment, and the conditions that make sustained creative work possible.",
    tone: "border-moss-500/30 bg-gradient-to-br from-moss-500/10 to-stone-900",
    Icon: Activity,
  },
  {
    kicker: "Depth",
    percent: "10%",
    value: "Philosophy + music theory",
    body: "The study focus you named during onboarding. The depth lane accumulates slowly at the edge of attention — not a project to complete, but an orientation that compounds across the year.",
    tone: "border-border/70 bg-gradient-to-br from-stone-850 to-stone-900",
    Icon: Brain,
  },
] as const;

const DEMO_Q2_HIGHLIGHTS = [
  "Jupiter conjunct natal Moon (Cancer) — exact Apr 28 and again Jun 4 — the most emotionally generative transit of the year",
  "Venus enters Gemini May 2 — communication and creative partnership activated",
  "Saturn trine natal Midheaven holds through May — structural support for long-term creative commitments",
  "New Moon in Taurus May 12 — strong for beginning creative projects that require material form",
];

const DEMO_AREAS = [
  {
    kicker: "Most activated this week",
    name: "🎨 Creative Projects",
    summary: "The timing supports visible output. Jupiter's transit amplifies reach.",
    prompt: "What specific piece of creative work is ready to be seen right now?",
  },
  {
    kicker: "Most activated this week",
    name: "🌱 Personal Growth",
    summary: "Saturn this quarter invites structural honesty.",
    prompt: "What pattern is ready to be named and consciously replaced?",
  },
  {
    kicker: "Most activated this week",
    name: "💛 Relationships",
    summary: "Jupiter through your 7th house brings expansive connection.",
    prompt: "What relationship needs your full, undivided attention this month?",
  },
];

const DEMO_JOURNAL_PROMPTS = [
  {
    source: "Week 18 · Jupiter window",
    prompt: "You're in week 18 of your Jupiter–Moon activation window. What is opening up in your creative life that you haven't named out loud yet?",
  },
  {
    source: "First Quarter Moon · Leo",
    prompt: "The First Quarter Moon is exact today. It's activating your 10th house of visibility. What brave step have you been postponing that this moment is asking for?",
  },
  {
    source: "Creative Projects area",
    prompt: "Your Creative Projects area is the most activated of the week. What specific piece of work is asking for your full presence right now — not someday, this week?",
  },
  {
    source: "Upcoming · Mars direct",
    prompt: "Mars stations direct in eleven days. What have you been holding back — in your work or in a relationship — that is ready to move again?",
  },
];

// ─────────────────────────────────────────────────────────────────────────────

export function PublicPricingPage({
  isSignedIn,
  mode = "pricing",
  showCanceledMessage = false,
}: Props) {
  const isFullPage = mode === "pricing";

  const navLinks: { href: string; label: string }[] = [
    { href: "#how-it-works", label: "How it works" },
    { href: "#demo", label: "Demo" },
    { href: "#oracle", label: "Oracle" },
    { href: "#tiers", label: "Pricing" },
  ];

  return (
    <div className="page-wrapper">
      <header className="sticky top-0 z-40 border-b border-border/40 bg-stone-950/70 backdrop-blur-md supports-[backdrop-filter]:bg-stone-950/55">
        <div className="container flex items-center justify-between gap-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-display text-xl tracking-wide text-bone transition-colors hover:text-leather-200"
          >
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full bg-gradient-to-br from-leather-300 to-plum-300 shadow-[0_0_12px_2px_rgba(216,180,151,0.35)]"
            />
            Kairos
          </Link>

          <nav
            aria-label="Primary"
            className="hidden items-center gap-7 text-sm text-bone-muted md:flex"
          >
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="transition-colors hover:text-bone"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {isSignedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center rounded-full bg-leather-300 px-4 py-2 text-sm font-semibold text-stone-950 transition-opacity hover:opacity-90"
              >
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="hidden text-sm text-bone-muted transition-colors hover:text-bone sm:inline-flex"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center rounded-full bg-leather-300 px-4 py-2 text-sm font-semibold text-stone-950 transition-opacity hover:opacity-90"
                >
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="container pb-14">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="shell-panel-hero px-7 py-10 md:px-10 md:py-12">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <p className="shell-kicker mb-4">{CURRENT_PLANNER_YEAR} Planner</p>
              <h1 className="shell-hero-title max-w-4xl">
                The planets move on their own schedule. Your year should too.
              </h1>
              <p className="shell-prose-lead mt-5">
                Your personalized {CURRENT_PLANNER_YEAR} blueprint, built from your natal chart
                and this year&apos;s real planetary transits.
              </p>
              <p className="mt-4 max-w-3xl text-base leading-7 text-bone-muted">
                I built Kairos because it genuinely changed how I moved through a year — and I
                wanted to share it. I made it for myself first, and then realized it was too
                useful to keep to myself.
              </p>
              <p className="mt-4 max-w-3xl text-base leading-7 text-bone-muted">
                Whether you approach astrology as a meaningful system or simply as a structured
                framework for reflection, the outcome is the same: a plan that&apos;s actually
                built around you — not your sun sign. Around you.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="#demo"
                  className="inline-flex items-center rounded-full bg-leather-300 px-5 py-3 text-sm font-semibold text-stone-950"
                >
                  See a real demo planner
                </Link>
                <Link
                  href="#tiers"
                  className="inline-flex items-center rounded-full border border-border/80 px-5 py-3 text-sm font-semibold text-bone"
                >
                  Get your planner
                </Link>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="shell-panel-soft p-5 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <p className="shell-eyebrow">Built for you, not your sign</p>
                <p className="mt-2 text-lg font-semibold text-bone">A full natal chart. Not a horoscope.</p>
                <p className="mt-3 text-sm leading-7 text-bone-muted">
                  Your sun sign is one placement among ten. Kairos uses all of them — synthesized
                  with real ephemeris data into a year-long blueprint that is specifically yours.
                </p>
              </div>
              <div className="shell-panel-soft p-5 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <p className="shell-eyebrow">Grounded in orbital mechanics</p>
                <p className="mt-2 text-lg font-semibold text-bone">Real data. Real cycles.</p>
                <p className="mt-3 text-sm leading-7 text-bone-muted">
                  Saturn returns at approximately 29 years. Jupiter orbits every 12. The moon
                  cycles every 29.5 days. These aren&apos;t metaphors — they&apos;re measurable,
                  and Kairos maps them to your year.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Story ────────────────────────────────────────────────────────── */}
        <section className="mt-5 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="shell-panel p-6 md:p-7">
            <p className="shell-kicker mb-3">Why timing matters</p>
            <h2 className="shell-section-title">
              Timing is not one-size-fits-all. Yours is specific.
            </h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-bone-muted">
              <p>
                The planets have been marking time longer than we have. Their positions at the
                moment of your birth set a pattern of cycles that continues to unfold across your
                life. Those cycles are different for every person, which means the best time for
                expansion, for rest, for visibility, for withdrawal — all of it varies by who you
                are and when you were born.
              </p>
              <p>
                In an era where everyone is telling you to push constantly, Kairos exists to offer
                a different read: one that distinguishes the seasons in your life, honors the ones
                that ask for rest, and names the ones that are genuinely yours for movement.
              </p>
            </div>
          </article>

          <article className="shell-panel p-6 md:p-7">
            <p className="shell-kicker mb-3">What makes this different</p>
            <h2 className="shell-section-title">
              I wanted to share something that actually worked.
            </h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-bone-muted">
              <p>
                I&apos;ve used planners of every kind. Bullet journals, goal-tracking apps,
                astrological guides, seasonal spreads. None of them talked to each other — and
                none of them knew anything about me specifically.
              </p>
              <p>
                Kairos knows your chart, your actual transits, your goals in your own words, and
                the season of life you&apos;re in. The blueprint it generates is the thing I
                wished existed. I built it and then realized I had to share it.
              </p>
            </div>
          </article>
        </section>

        {/* ── How the engine works ─────────────────────────────────────────── */}
        <section id="how-it-works" className="mt-5 scroll-mt-24 shell-panel p-6 md:p-8">
          <p className="shell-kicker mb-3">How it works</p>
          <h2 className="shell-section-title max-w-3xl">
            Your birth data and your answers go through the same engine — together.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-bone-muted">
            Most planners ask for your goals and ignore your timing. Most astrology apps read your
            chart and ignore your goals. Kairos feeds both to the same synthesis layer, so the
            output reflects the intersection of who you actually are and what the year is actually
            offering.
          </p>

          <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                title: "Birth data → natal chart",
                body: "Your birth date, time, and location produce a real natal chart: ten planetary positions, Whole Sign house placements, and a precise snapshot of the sky at the moment you were born. This is the fixed layer — it doesn't change.",
                accent: "text-leather-300",
                border: "border-leather-500/25",
              },
              {
                step: "02",
                title: "Your year → live transits",
                body: "Kairos calculates the actual planetary positions for every day of your year. Where is Saturn right now relative to your natal Venus? When does Jupiter cross your Moon? These transit windows become the timing architecture of your blueprint.",
                accent: "text-plum-300",
                border: "border-plum-400/25",
              },
              {
                step: "03",
                title: "Your answers → layered intent",
                body: "Your onboarding answers — your goals in your own words, what you want to release, what you're studying, how your energy cycles — aren't decorative. They become the second load-bearing layer the engine reads alongside your chart.",
                accent: "text-moss-300",
                border: "border-moss-500/25",
              },
              {
                step: "04",
                title: "Synthesis → your blueprint",
                body: "An AI reads your chart and your answers together — not separately. The result is a structured blueprint: 52 weeks, 12 months, 4 quarters, named activation windows, named rest periods, and a year theme that is about you specifically, not your sign.",
                accent: "text-ember-300",
                border: "border-ember-400/25",
              },
            ].map(({ step, title, body, accent, border }) => (
              <div key={step} className={`shell-panel-inline border p-5 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${border}`}>
                <p className={`font-display text-3xl font-semibold leading-none ${accent} opacity-50`}>{step}</p>
                <p className="mt-4 text-sm font-semibold text-bone">{title}</p>
                <p className="mt-3 text-xs leading-6 text-bone-muted">{body}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1rem] border border-border/50 bg-stone-950/50 p-5 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <p className="shell-eyebrow mb-3">What you tell Kairos during onboarding</p>
              <ul className="space-y-2">
                {[
                  "Birth date, time, and city of birth",
                  "Your goals — named in your words, ordered by priority, each with an icon you choose",
                  "A word of intention for the year and what you want to release",
                  "What you're studying or reading this year",
                  "How your energy naturally cycles (7, 14, or 28-day rhythms)",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm leading-7 text-bone-muted">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-leather-300/60" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[1rem] border border-border/50 bg-stone-950/50 p-5 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <p className="shell-eyebrow mb-3">What the engine understands from those answers</p>
              <ul className="space-y-2">
                {[
                  "Which life areas your energy is genuinely behind this year",
                  "The gap between what you want and what your chart is offering — and where they align",
                  "How to pace 52 weeks around your real energy rhythm, not a generic Monday–Sunday default",
                  "What kind of language to use in your weekly intentions — your voice, your priorities",
                  "When to schedule activation windows versus when your chart is asking for rest",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm leading-7 text-bone-muted">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-moss-300/60" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Demo Planner ─────────────────────────────────────────────────── */}
        <section id="demo" className="mt-5 scroll-mt-24 shell-panel p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="shell-kicker mb-3">Full demo planner</p>
              <h2 className="shell-section-title">
                This is what your actual dashboard looks like.
              </h2>
              <p className="mt-4 text-sm leading-7 text-bone-muted">
                Every element below is pulled from a fictional person&apos;s real natal chart and
                2026 transits. The layout, language, and data structure is exactly what you&apos;ll
                see when you log in.
              </p>
            </div>
            <Link
              href="#tiers"
              className="inline-flex items-center rounded-full bg-leather-300 px-5 py-3 text-sm font-semibold text-stone-950 shrink-0"
            >
              Get your planner
            </Link>
          </div>

          {/* ── Demo viewport ── */}
          <div className="mt-6 overflow-hidden rounded-[1.75rem] border border-leather-500/20 bg-stone-950/75 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_0_0_1px_rgba(0,0,0,0.25)]">
            {/* Chrome bar */}
            <div className="flex items-center justify-between border-b border-white/[0.05] bg-black/30 px-5 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-stone-700" />
                  <span className="h-2 w-2 rounded-full bg-stone-700" />
                  <span className="h-2 w-2 rounded-full bg-stone-700" />
                </div>
                <p className="text-[0.62rem] font-medium uppercase tracking-[0.22em] text-bone-muted/30">
                  Kairos · Your Dashboard
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-leather-400/25 bg-leather-500/10 px-2.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-leather-200/70">
                <span className="h-1 w-1 animate-pulse rounded-full bg-leather-300/80" />
                Demo preview
              </span>
            </div>
            <div className="p-5 md:p-6">

          {/* Demo: Hero bar */}
          <div className="rounded-[1.35rem] border border-border/80 bg-card/95 px-6 py-6 md:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="shell-kicker mb-3">Kairos Life OS · Demo</p>
                <h3 className="font-display text-[2rem] leading-tight text-bone md:text-[2.4rem]">
                  Alex, your year runs on timing first and customization second.
                </h3>
                <p className="mt-3 text-base leading-7 text-bone-muted">
                  The Year of Deliberate Expression — Saturn's trine to your Midheaven opens the
                  year with structural clarity, and Jupiter's conjunction to your natal Moon brings
                  an expansive second quarter unlike anything in the last 12 years.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[22rem]">
                <div className="shell-panel-soft px-4 py-4">
                  <p className="shell-kicker mb-2">Today</p>
                  <div className="flex items-center gap-2 text-bone">
                    <MoonPhaseIcon phase="waxing-crescent" size={18} />
                    <span className="text-sm font-medium">Moon in Cancer 22°</span>
                  </div>
                  <p className="mt-2 text-sm text-bone-muted">
                    Sun in Taurus 2° · 4 active transits
                  </p>
                </div>
                <div className="shell-panel-soft px-4 py-4">
                  <p className="shell-kicker mb-2">Your words</p>
                  <p className="text-sm font-medium text-bone">Expression + Renewal</p>
                  <p className="mt-2 text-sm text-bone-muted">
                    Astrological: Renewal (Jupiter–Moon cycle). Personal: Expression (onboarding).
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Demo: Three lanes */}
          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            {DEMO_LANES.map((lane) => {
              const Icon = lane.Icon;
              return (
                <article key={lane.kicker} className={`shell-panel px-6 py-6 backdrop-blur-sm ${lane.tone}`}>
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="shell-kicker">{lane.kicker}</p>
                        <span className="shell-pill border-white/10 bg-black/25 text-bone">{lane.percent}</span>
                      </div>
                      <h4 className="mt-4 text-[1.8rem] font-semibold leading-tight text-bone">{lane.value}</h4>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-black/15 text-bone-muted">
                      <Icon size={18} />
                    </div>
                  </div>
                  <p className="border-t border-border/70 pt-4 text-sm leading-7 text-bone-muted">{lane.body}</p>
                </article>
              );
            })}
          </div>

          {/* Demo: Week pulse */}
          <div className="mt-4 shell-panel px-6 py-6 md:px-8">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="shell-kicker">The Week Pulse</p>
                <h4 className="mt-2 font-display text-[1.8rem] text-bone">Week of April 21 — Jupiter window</h4>
              </div>
              <span className="shell-pill border-leather-500/30 bg-leather-500/15 text-leather-200">
                Primary lane rhythm
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-7">
              {DEMO_WEEK_PULSE.map((day) => (
                <div
                  key={day.date}
                  className={`rounded-[1.1rem] border px-3 py-4 ${
                    "isToday" in day && day.isToday
                      ? "border-leather-400/50 bg-leather-500/15"
                      : "border-border/70 bg-stone-950/60"
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bone-muted">{day.day}</p>
                  <p className="mt-2 text-2xl font-semibold text-bone">{day.date}</p>
                  <p className="text-sm text-bone-muted">{day.month}</p>
                  <div className="mt-4 flex items-center gap-2 text-sm text-bone">
                    <MoonPhaseIcon phase={day.phase} size={16} />
                    <span className="text-xs">{day.moon}</span>
                  </div>
                  <div className="mt-4 space-y-1.5">
                    <div
                      className="h-1.5 rounded-full bg-leather-300"
                      style={{ width: `${Math.round(day.activation * 100)}%` }}
                      title={`Activation: ${Math.round(day.activation * 100)}%`}
                    />
                    <div
                      className="h-1.5 rounded-full bg-plum-300"
                      style={{ width: `${Math.round(day.review * 100)}%` }}
                      title={`Review: ${Math.round(day.review * 100)}%`}
                    />
                    <div
                      className="h-1.5 rounded-full bg-moss-300"
                      style={{ width: `${Math.round(day.lunar * 100)}%` }}
                      title={`Lunar charge: ${Math.round(day.lunar * 100)}%`}
                    />
                  </div>
                  <p className="mt-2 text-[0.68rem] leading-5 text-bone-muted/75">{day.note}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { label: "Activation", color: "bg-leather-300" },
                { label: "Review", color: "bg-plum-300" },
                { label: "Lunar charge", color: "bg-moss-300" },
              ].map(({ label, color }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-stone-950/60 px-3 py-1.5 text-xs text-bone-muted"
                >
                  <span className={`h-2 w-5 rounded-full ${color}`} />
                  {label}
                </span>
              ))}
              <span className="inline-flex items-center rounded-full border border-border/60 bg-stone-950/50 px-3 py-1.5 text-xs text-bone-muted/70">
                Bar width = signal intensity for the day
              </span>
            </div>
          </div>

          {/* Demo: Q2 quarter section */}
          <div className="mt-4 overflow-hidden rounded-[1.35rem] border border-leather-400/30 bg-leather-500/8">
            <div className="px-6 py-5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="shell-kicker text-leather-200">Q2 · Apr–Jun</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-leather-400/40 bg-leather-500/20 px-2.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-leather-200">
                  <span className="h-1 w-1 rounded-full bg-leather-300" />
                  Now
                </span>
              </div>
              <h4 className="font-display text-[1.6rem] leading-tight text-bone md:text-[1.8rem]">
                The Expanding Heart
              </h4>
            </div>

            <div className="space-y-5 border-t border-border/50 px-6 pb-7 pt-5">
              <p className="shell-prose max-w-3xl">
                Jupiter&apos;s conjunction to your natal Moon (Cancer) makes this the most
                emotionally generative quarter of 2026. What you begin here has room to grow in
                ways that slower seasons simply cannot offer. The creative work of Q1 now finds
                its audience. Relationships deepen or clarify. The risk is expansion without
                ground — Saturn&apos;s trine to your Midheaven is still active and provides the
                structural counterweight.
              </p>

              <div className="flex flex-wrap gap-1.5">
                {["Creative Projects", "Relationships", "Personal Growth"].map((area) => (
                  <span key={area} className="shell-pill">{area}</span>
                ))}
              </div>

              <div>
                <p className="shell-eyebrow mb-3">Cosmic highlights</p>
                <ul className="space-y-2">
                  {DEMO_Q2_HIGHLIGHTS.map((h) => (
                    <li key={h} className="flex gap-3 text-sm leading-[1.65] text-bone-muted">
                      <span className="mt-[0.4rem] h-1 w-1 shrink-0 rounded-full bg-bone-muted/35" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="shell-panel-inline px-4 py-3">
                  <p className="shell-eyebrow mb-2 text-leather-200/80">Activation windows</p>
                  <div className="space-y-1 text-xs text-bone-muted">
                    <div><span className="font-medium text-bone">Apr 4 – May 18</span> — Jupiter–Moon peak; initiate and share</div>
                    <div><span className="font-medium text-bone">May 28 – Jun 14</span> — Venus in Gemini trine natal Mercury; creative communication</div>
                  </div>
                </div>
                <div className="shell-panel-inline px-4 py-3">
                  <p className="shell-eyebrow mb-2 text-moss-200/80">Rest periods</p>
                  <div className="space-y-1 text-xs text-bone-muted">
                    <div><span className="font-medium text-bone">May 18 – May 28</span> — Mercury retrograde shadow; review, don&apos;t launch</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Demo: Focused areas with journal prompts */}
          <div className="mt-4">
            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-bone-muted/55">
                Top life areas activated this week
              </p>
              <p className="text-xs text-bone-muted/60">
                Each area links to the journal with a pre-seeded prompt for this exact moment.
              </p>
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              {DEMO_AREAS.map((area) => (
                <div
                  key={area.name}
                  className="group rounded-[1rem] border border-border/70 bg-stone-950/60 px-4 py-4"
                >
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-leather-200/85">
                    {area.kicker}
                  </p>
                  <div className="mt-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-bone">{area.name}</p>
                      <p className="mt-2 text-sm leading-7 text-bone-muted">{area.summary}</p>
                    </div>
                    <span className="shell-pill shrink-0 border-leather-400/20 bg-leather-500/10 text-leather-200">
                      Open
                    </span>
                  </div>
                  <p className="mt-3 border-t border-border/70 pt-3 text-sm leading-6 text-bone-muted/80 italic">
                    &ldquo;{area.prompt}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </div>
          {/* Demo: Oracle context panel */}
          <div className="mt-4">
            <p className="shell-kicker mb-3">Oracle context · what the Oracle carries in</p>
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="rounded-[1.15rem] border border-leather-400/25 bg-leather-500/8 p-5">
                <p className="shell-eyebrow mb-3 text-leather-200/80">Natal chart · permanent</p>
                <p className="text-base font-semibold text-bone">Libra Sun · Scorpio Rising</p>
                <p className="text-sm text-bone-muted">Cancer Moon · House 9</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {["Mercury in Virgo", "Venus in Scorpio", "Mars in Gemini", "Jupiter in Cancer", "Saturn in Capricorn"].map((p) => (
                    <span key={p} className="shell-pill">{p}</span>
                  ))}
                </div>
              </div>
              <div className="rounded-[1.15rem] border border-moss-500/25 bg-moss-500/8 p-5">
                <p className="shell-eyebrow mb-3 text-moss-200/80">Your goals · from onboarding</p>
                <ul className="space-y-2">
                  {["🎨 Creative Projects", "🌱 Personal Growth", "💛 Relationships", "📚 Study: Philosophy", "💰 Financial"].map((g) => (
                    <li key={g} className="text-sm text-bone">{g}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[1.15rem] border border-plum-400/25 bg-plum-400/8 p-5">
                <p className="shell-eyebrow mb-3 text-plum-300/80">Journal memory · your choice</p>
                <p className="text-3xl font-semibold text-bone">3</p>
                <p className="text-sm text-bone-muted">entries added to Oracle memory</p>
                <p className="mt-4 text-xs leading-6 text-bone-muted/70">
                  Alex has marked 3 journal entries for the Oracle to reference — a reflection on creative block from February, a note about a relationship shift in March, and a goal clarification from April.
                </p>
              </div>
            </div>
          </div>
            </div>{/* /demo inner */}
          </div>{/* /demo viewport */}
        </section>

        {/* ── Journal section ───────────────────────────────────────────────── */}
        <section id="journal" className="mt-5 scroll-mt-24 shell-panel p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
            <div>
              <p className="shell-kicker mb-3">The journal</p>
              <h2 className="shell-section-title">
                You never have to think of a prompt. The app already knows what to ask.
              </h2>
              <div className="mt-5 space-y-4 text-sm leading-7 text-bone-muted">
                <p>
                  Every area, timing window, and week in Kairos links directly to the journal with
                  a prompt already written for that specific moment. The prompt reflects what&apos;s
                  happening cosmically and in your goals simultaneously — not a generic question,
                  but one that knows you&apos;re in a Jupiter window and your Creative Projects
                  lane is active.
                </p>
                <p>
                  On new moon and full moon days, the journal opens in ritual mode — a quieter
                  format for reflection rather than output. The distinction is made for you.
                </p>
                <p>
                  You choose which journal entries become part of the Oracle&apos;s memory. When
                  you mark an entry, it becomes available context for every future conversation —
                  the Oracle will reference it when relevant, without you having to repeat yourself.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="shell-eyebrow mb-1">Sample journal prompts — generated for Alex this week</p>
              {DEMO_JOURNAL_PROMPTS.map((jp) => (
                <div
                  key={jp.source}
                  className="group rounded-[1rem] border border-border/70 bg-stone-950/60 px-4 py-4 transition-all hover:border-leather-400/35 hover:bg-leather-500/8"
                >
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-leather-300/70">
                    {jp.source}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-bone-muted italic">
                    &ldquo;{jp.prompt}&rdquo;
                  </p>
                  <p className="mt-3 text-[0.68rem] font-medium text-leather-300/60 uppercase tracking-[0.14em]">
                    Opens journal with this prompt →
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Oracle section ────────────────────────────────────────────────── */}
        <section id="oracle" className="mt-5 scroll-mt-24 shell-panel p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.15fr] lg:items-start">
            <div>
              <p className="shell-kicker mb-3">The Oracle</p>
              <h2 className="shell-section-title">
                Not a chatbot. A conversation grounded in your specific data.
              </h2>
              <div className="mt-5 space-y-4 text-sm leading-7 text-bone-muted">
                <p>
                  The Oracle isn&apos;t a general astrology assistant. When you open a conversation,
                  it already knows the living context around your year:
                </p>
                <ul className="space-y-3">
                  {[
                    {
                      label: "Your natal chart + current transits",
                      detail: "Every active planetary aspect, retrograde period, and timing window for today — drawn from real ephemeris data calculated for your birth placement.",
                    },
                    {
                      label: "Your goals and year vision",
                      detail: "The goals you named during onboarding, the intention you set, what you said you want to release — all of it is part of the Oracle's context before you type a single word.",
                    },
                    {
                      label: "Journal entries you've added to memory",
                      detail: "You control what the Oracle knows from your journal. Mark an entry and it becomes available context. The Oracle won't reference it without your permission.",
                    },
                    {
                      label: "Your personal sky patterns",
                      detail: "Planner + Oracle tracks the lunar phase, moon sign, retrogrades, and transit-to-natal aspects around each journal entry, then turns repeated themes into compact pattern insights.",
                    },
                    {
                      label: "A smarter next-year calendar",
                      detail: "The more you journal, the more evidence Kairos has about what certain skies tend to bring up for you, so the next calendar can be shaped by your actual lived history.",
                    },
                  ].map(({ label, detail }) => (
                    <li key={label} className="flex gap-3">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-leather-300/60" />
                      <div>
                        <span className="font-medium text-bone">{label} — </span>
                        {detail}
                      </div>
                    </li>
                  ))}
                </ul>
                <p>
                  The result is a conversation that doesn&apos;t need you to explain your
                  situation from scratch. It already knows. You just ask.
                </p>
              </div>
            </div>

            {/* Sample Oracle conversation */}
            <div className="rounded-[1.15rem] border border-border/60 bg-stone-950/50 overflow-hidden">
              <div className="border-b border-border/50 px-5 py-3">
                <p className="shell-eyebrow">Sample Oracle conversation · Alex · Apr 22</p>
              </div>
              <div className="space-y-4 px-5 py-5">
                {/* User message */}
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-[1rem] rounded-tr-sm bg-leather-500/20 border border-leather-500/30 px-4 py-3">
                    <p className="text-sm leading-6 text-bone">
                      I&apos;ve been feeling pulled in two directions about my creative work. Should I focus on one thing or keep both going?
                    </p>
                  </div>
                </div>

                {/* Oracle response */}
                <div className="flex justify-start">
                  <div className="max-w-[92%] space-y-3 rounded-[1rem] rounded-tl-sm border border-border/60 bg-stone-900/80 px-4 py-4">
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-leather-300/70">
                      Oracle · grounded in your chart, your goals, and your memory
                    </p>
                    <p className="text-sm leading-7 text-bone-muted">
                      Your chart has something specific to say about this moment. Saturn trine
                      your Midheaven — which is exact right now — typically asks for consolidation
                      rather than expansion. The Saturn instinct in this transit is to pick the
                      lane with the strongest foundation, not the brightest promise.
                    </p>
                    <p className="text-sm leading-7 text-bone-muted">
                      That said, your Jupiter–Moon conjunction active through June is one of the
                      more expansive configurations in your chart, and it has a Cancer flavor —
                      which means emotional truth matters more than strategic logic in this window.
                      The question isn&apos;t which direction is smarter.
                    </p>
                    <p className="text-sm leading-7 text-bone-muted">
                      It&apos;s which one you&apos;d grieve losing. You wrote in your Year Vision
                      that you wanted to stop holding back on work you actually care about. Given
                      that — I&apos;d start there.
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {["Saturn △ Midheaven", "Jupiter ☌ Moon", "Year Vision", "Journal · Mar 4"].map((tag) => (
                        <span key={tag} className="inline-flex items-center rounded-full border border-border/60 bg-stone-950/60 px-2.5 py-0.5 text-[0.62rem] text-bone-muted/70">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t border-border/50 px-5 py-3">
                <p className="text-xs text-bone-muted/50">
                  Sources shown — Oracle cites which chart data, goals, and journal entries it drew from.
                </p>
              </div>
            </div>
          </div>
        </section>

        {showCanceledMessage ? (
          <div className="mt-6 rounded-[1.15rem] border border-border/80 bg-card/90 px-5 py-4 text-sm text-bone-muted">
            Your checkout was canceled before payment completed. Your tier is still here when
            you&apos;re ready.
          </div>
        ) : null}

        <section className="mt-8 shell-panel p-6 md:p-7">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <p className="shell-kicker mb-3">Choose your rhythm</p>
              <h2 className="shell-section-title max-w-3xl">
                Start with the way you want to pay, not the way you think you should.
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-bone-muted">
                Kairos is built to guide you throughout the year, so the pricing can be flexible
                too: monthly for accessibility, annual for the best value, and Etsy annual access
                for people who prefer a marketplace checkout. Oracle intelligence is tied to the
                Planner + Oracle tier no matter which checkout path you use.
              </p>
            </div>
            <div className="rounded-[1.1rem] border border-leather-500/25 bg-leather-500/10 px-5 py-4">
              <p className="text-sm font-semibold text-bone">Current checkout status</p>
              <p className="mt-2 text-sm leading-7 text-bone-muted">
                Direct monthly subscriptions and annual checkout are live now. Etsy annual access
                still activates through the marketplace claim flow.
              </p>
            </div>
          </div>
        </section>

        {/* ── Tiers ────────────────────────────────────────────────────────── */}
        <section id="tiers" className="mt-8 scroll-mt-24 grid gap-5 lg:grid-cols-2">
          {COMMERCE_TIERS.map((tier) => {
            const annualSavings = tier.monthlyPriceCents * 12 - tier.annualPriceCents;
            const etsyDelta = tier.etsyPriceCents - tier.annualPriceCents;
            const isPremium = tier.oracleEnabled;

            return (
              <article
                key={tier.key}
                className={[
                  "shell-panel p-6 md:p-7",
                  isPremium
                    ? "border-leather-500/35 bg-gradient-to-br from-stone-900/95 via-card/95 to-stone-950/95"
                    : "",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="shell-kicker mb-3">{tier.shortName}</p>
                    <h2 className="shell-section-title">{tier.name}</h2>
                    <p className="mt-3 text-sm leading-7 text-bone-muted">{tier.tagline}</p>
                  </div>
                  {isPremium ? (
                    <span className="shell-pill border-leather-500/40 text-leather-300/80">
                      Premium
                    </span>
                  ) : null}
                </div>

                <div className="mt-6 flex flex-wrap items-end gap-4">
                  <div>
                    <p className="text-3xl font-semibold text-bone">
                      {formatUsd(tier.monthlyPriceCents)}
                    </p>
                    <p className="text-sm text-bone-muted">Monthly direct access</p>
                  </div>
                  <div className="text-sm leading-6 text-bone-muted">
                    <p>Annual: {formatUsd(tier.annualPriceCents)}</p>
                    <p className="text-leather-300/80">Save {formatUsd(annualSavings)} per year</p>
                  </div>
                  <div className="text-sm leading-6 text-bone-muted">
                    <p>Etsy annual: {formatUsd(tier.etsyPriceCents)}</p>
                    <p className="text-bone-muted/70">
                      Marketplace convenience adds {formatUsd(etsyDelta)}
                    </p>
                  </div>
                </div>

                <ul className="mt-6 space-y-3">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 text-sm leading-6 text-bone-muted"
                    >
                      <CheckIcon />
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="mt-7 flex flex-wrap gap-3">
                  {isSignedIn ? (
                    <>
                      <CheckoutButton
                        tierKey={tier.key}
                        accessPlan="monthly"
                        label="Start monthly"
                        className="inline-flex items-center rounded-full border border-border/80 px-5 py-3 text-sm font-semibold text-bone disabled:cursor-not-allowed disabled:opacity-60"
                      />
                      <CheckoutButton
                        tierKey={tier.key}
                        accessPlan="yearly"
                        label="Buy annual direct"
                        className="inline-flex items-center rounded-full bg-leather-300 px-5 py-3 text-sm font-semibold text-stone-950 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </>
                  ) : (
                    <Link
                      href="/sign-up"
                      className="inline-flex items-center rounded-full bg-leather-300 px-5 py-3 text-sm font-semibold text-stone-950"
                    >
                      Create account to choose checkout
                    </Link>
                  )}
                  <Link
                    href="/activate"
                    className="inline-flex items-center rounded-full border border-border/80 px-5 py-3 text-sm font-semibold text-bone"
                  >
                    Activate Etsy purchase
                  </Link>
                </div>
              </article>
            );
          })}
        </section>

        {/* ── How it works steps ───────────────────────────────────────────── */}
        <section className="mt-5 shell-panel p-6 md:p-7">
          <p className="shell-kicker mb-3">What happens next</p>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Create your account",
                body: "Sign up, then tell Kairos your birth data, your goals in your own words, and where you are in your life right now.",
              },
              {
                step: "2",
                title: "Choose your planner",
                body: "Pick Planner or Planner + Oracle, then choose the payment path that fits you best.",
              },
              {
                step: "3",
                title: "Your blueprint generates",
                body: "Kairos runs your natal chart, calculates your 2026 transits, and generates a full year-long blueprint built specifically for you.",
              },
            ].map(({ step, title, body }) => (
              <div key={step} className="flex gap-4">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-leather-500/40 text-xs font-semibold text-leather-300">
                  {step}
                </span>
                <div>
                  <p className="text-sm font-semibold text-bone">{title}</p>
                  <p className="mt-1.5 text-sm leading-6 text-bone-muted">{body}</p>
                </div>
              </div>
            ))}
          </div>
          {!isSignedIn && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border/50 pt-5">
              <p className="text-sm text-bone-muted">
                Already have an account?{" "}
                <Link href="/sign-in" className="text-bone transition-colors hover:text-leather-300">
                  Sign in to access your planner
                </Link>
              </p>
              <Link
                href="/sign-up"
                className="inline-flex items-center rounded-full bg-leather-300 px-5 py-2.5 text-sm font-semibold text-stone-950"
              >
                Get started
              </Link>
            </div>
          )}
        </section>

        {isFullPage ? (
          <section className="mt-5 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <article className="shell-panel p-6 md:p-7">
              <p className="shell-kicker mb-3">Why this ladder</p>
              <h2 className="shell-section-title">
                The planner is the core relationship. Oracle is the deeper reflective layer.
              </h2>
              <div className="mt-5 space-y-4 text-sm leading-7 text-bone-muted">
                <p>
                  Kairos already gives guidance throughout the year, so a monthly option makes
                  sense for people who need a more accessible way in. Annual access is still the
                  clearest best-value commitment for people who know they want the full year.
                </p>
                <p>
                  Oracle adds the higher-touch layer for people who want more interpretation,
                  reflection, and dialogue as the year unfolds. It is also where the journal
                  intelligence lives: entries can become evidence for recurring lunar, retrograde,
                  and transit patterns instead of staying as isolated notes.
                </p>
              </div>
            </article>

            <article className="shell-panel p-6 md:p-7">
              <p className="shell-kicker mb-3">Direct vs Etsy</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="shell-panel-inline px-5 py-4">
                  <p className="text-sm font-semibold text-bone">Buy direct if you want</p>
                  <ul className="mt-3 space-y-2 text-sm leading-7 text-bone-muted">
                    {[
                      "The best annual value",
                      "A future monthly access path",
                      "Immediate Stripe checkout and activation",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckIcon />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="shell-panel-inline px-5 py-4">
                  <p className="text-sm font-semibold text-bone">Choose Etsy if you want</p>
                  <ul className="mt-3 space-y-2 text-sm leading-7 text-bone-muted">
                    {[
                      "Marketplace familiarity and gifting convenience",
                      "A one-time annual purchase only",
                      "The same purchased tier once imported and activated",
                      "Oracle intelligence when the Etsy purchase is Planner + Oracle",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckIcon />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          </section>
        ) : (
          <section className="mt-5 shell-panel p-6 md:p-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="shell-kicker mb-2">The ladder</p>
                <h2 className="shell-section-title">
                  Direct makes room for flexibility while keeping Oracle premium.
                </h2>
              </div>
              <Link
                href="/pricing"
                className="inline-flex items-center rounded-full border border-border/80 px-5 py-3 text-sm font-semibold text-bone shrink-0"
              >
                See the full pricing breakdown
              </Link>
            </div>
          </section>
        )}
      </div>

      <footer className="mt-10 border-t border-border/50 bg-stone-950/40">
        <div className="container flex flex-col gap-6 py-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Link href="/" className="flex items-center gap-2 font-display text-lg text-bone">
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 rounded-full bg-gradient-to-br from-leather-300 to-plum-300 shadow-[0_0_12px_2px_rgba(216,180,151,0.35)]"
              />
              Kairos
            </Link>
            <p className="mt-3 text-sm leading-6 text-bone-muted">
              Personalized yearly planning, built from your real natal chart and the actual
              planetary transits of your year.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-10 gap-y-3 text-sm sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <p className="shell-eyebrow mb-1">Product</p>
              <Link href="#how-it-works" className="text-bone-muted transition-colors hover:text-bone">How it works</Link>
              <Link href="#demo" className="text-bone-muted transition-colors hover:text-bone">Demo</Link>
              <Link href="#oracle" className="text-bone-muted transition-colors hover:text-bone">Oracle</Link>
              <Link href="#tiers" className="text-bone-muted transition-colors hover:text-bone">Pricing</Link>
            </div>
            <div className="flex flex-col gap-2">
              <p className="shell-eyebrow mb-1">Account</p>
              {isSignedIn ? (
                <Link href="/dashboard" className="text-bone-muted transition-colors hover:text-bone">Dashboard</Link>
              ) : (
                <>
                  <Link href="/sign-in" className="text-bone-muted transition-colors hover:text-bone">Sign in</Link>
                  <Link href="/sign-up" className="text-bone-muted transition-colors hover:text-bone">Create account</Link>
                </>
              )}
              <Link href="/activate" className="text-bone-muted transition-colors hover:text-bone">Activate Etsy purchase</Link>
            </div>
            <div className="flex flex-col gap-2">
              <p className="shell-eyebrow mb-1">Legal</p>
              <Link href="/privacy" className="text-bone-muted transition-colors hover:text-bone">Privacy</Link>
              <Link href="/terms" className="text-bone-muted transition-colors hover:text-bone">Terms</Link>
              <Link href="/contact" className="text-bone-muted transition-colors hover:text-bone">Contact</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-border/40">
          <div className="container flex flex-col gap-2 py-4 text-xs text-bone-muted/70 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Kairos. Built with intention.</p>
            <p className="italic">The planets move on their own schedule. Your year should too.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
