import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  BrainCircuit,
  CalendarRange,
  Check,
  Command,
  Layers3,
  MessageCircleMore,
  MoonStar,
  Orbit,
} from "lucide-react";

import { StarField } from "@/components/almanac/StarField";
import { SamplerCheckoutButton } from "@/components/commerce/SamplerCheckoutButton";
import { StelloquyOrb } from "@/components/oracle/StelloquyOrb";
import { BRAND } from "@/lib/brand";
import { formatUsd, getCommerceTier } from "@/lib/commerce/config";

interface Props {
  isSignedIn: boolean;
}

const CONTEXT_LAYERS = [
  {
    label: "Your natal baseline",
    detail:
      "Your chart, natal aspects, and Human Design give the conversation a personal foundation.",
    Icon: Orbit,
    tone: "text-almanac-copper-hi",
  },
  {
    label: "The sky right now",
    detail:
      "Live transits, the Moon, and retrogrades place the question inside the timing of this moment.",
    Icon: MoonStar,
    tone: "text-almanac-prism",
  },
  {
    label: "The year you named",
    detail:
      "Your goals, Year Vision, blueprint, and current week and quarter are already in the room.",
    Icon: CalendarRange,
    tone: "text-almanac-starlight",
  },
  {
    label: "The life in motion",
    detail:
      "Active life areas, curriculum, tracker notes, planned work, and reviews add present-tense context.",
    Icon: Layers3,
    tone: "text-almanac-sage",
  },
  {
    label: "The memory you choose",
    detail:
      "Selected journal entries, routed captures, and recurring pattern summaries create continuity.",
    Icon: BookOpenCheck,
    tone: "text-almanac-plum",
  },
] as const;

const QUESTION_STARTERS = [
  "What deserves my energy this week?",
  "Is this a real rest window, or am I avoiding the thing?",
  "What keeps returning in my journal around this Moon phase?",
  "Which of my goals has the clearest timing right now?",
  "What did I say I wanted before this got noisy?",
  "Help me turn this insight into one grounded next step.",
] as const;

const MEMORY_STEPS = [
  {
    number: "01",
    label: "Notice",
    detail: "A line in the conversation feels worth keeping.",
  },
  {
    number: "02",
    label: "Capture",
    detail: "Save the line or the full exchange in place.",
  },
  {
    number: "03",
    label: "Choose",
    detail: "Keep it saved, or route it to Insights, your Planner, or both.",
  },
  {
    number: "04",
    label: "Return",
    detail: "The route you chose decides where it can become useful later.",
  },
] as const;

const FAQS = [
  {
    question: "Is Stelloquy the Oracle?",
    answer:
      "Yes. Stelloquy is the name of the Oracle inside Kairos: the conversational, context-aware layer included with Planner + Oracle.",
  },
  {
    question: "How is this different from a general AI chat?",
    answer:
      "A general chat begins with whatever you paste into the prompt. Stelloquy begins with your Kairos context already assembled: your chart, current sky, goals, blueprint, active planning context, and the memory you have chosen to carry forward.",
  },
  {
    question: "Does Stelloquy read my whole journal?",
    answer:
      "Direct journal memory is opt-in. An entry's text becomes available as recent Stelloquy memory when you mark it for that purpose. Separately, compact pattern summaries can describe recurring timing themes across your journal; Stelloquy is instructed to treat those as observations, not fate.",
  },
  {
    question: "How much conversation is included?",
    answer:
      "Planner + Oracle currently includes up to 200 Stelloquy messages each month. The allowance resets on the first of the month.",
  },
] as const;

function MarketingHeader({ isSignedIn }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-almanac-line-hi bg-[rgba(10,12,20,0.86)] backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 md:px-8">
        <Link href="/" className="flex min-h-11 items-center gap-2">
          <span className="text-lg text-almanac-copper-hi" aria-hidden>
            &#10022;
          </span>
          <span className="font-almanac-display text-lg tracking-[0.08em] text-almanac-ink">
            {BRAND.product.toUpperCase()}
          </span>
        </Link>

        <nav
          aria-label="Stelloquy page"
          className="hidden items-center gap-7 font-almanac-mono text-[0.7rem] uppercase tracking-[0.16em] text-almanac-ink-dim md:flex"
        >
          <Link href="#context" className="transition-colors hover:text-almanac-ink">
            Context
          </Link>
          <Link href="#memory" className="transition-colors hover:text-almanac-ink">
            Memory
          </Link>
          <Link href="#questions" className="transition-colors hover:text-almanac-ink">
            Questions
          </Link>
          <Link href="#upgrade" className="transition-colors hover:text-almanac-ink">
            Access
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {!isSignedIn ? (
            <Link
              href="/sign-in"
              className="inline-flex min-h-11 items-center font-almanac-mono text-[0.7rem] uppercase tracking-[0.14em] text-almanac-ink-dim transition-colors hover:text-almanac-ink"
            >
              Sign in
            </Link>
          ) : null}
          <Link
            href={isSignedIn ? "/oracle" : "/pricing#tiers"}
            className="inline-flex min-h-11 items-center rounded-full border border-[rgba(169,138,239,0.5)] bg-[rgba(112,75,210,0.2)] px-4 font-almanac-mono text-[0.68rem] uppercase tracking-[0.12em] text-almanac-starlight transition-colors hover:bg-[rgba(112,75,210,0.35)]"
          >
            {isSignedIn ? "Open Stelloquy" : "See plans"}
          </Link>
        </div>
      </div>
    </header>
  );
}

function ContextOrbit() {
  const orbitLabels = [
    { label: "Natal chart", className: "left-0 top-8 sm:left-2 sm:top-14" },
    { label: "Live sky", className: "right-0 top-8 sm:right-2 sm:top-14" },
    { label: "Goals + blueprint", className: "bottom-8 left-0 sm:bottom-14 sm:left-2" },
    { label: "Chosen memory", className: "bottom-8 right-0 sm:bottom-14 sm:right-2" },
  ] as const;

  return (
    <div
      className="relative mx-auto min-h-[430px] w-full max-w-[520px] sm:min-h-[520px]"
      aria-label="Stelloquy brings together your natal chart, live sky, goals and blueprint, and chosen memory"
    >
      <div className="absolute inset-[10%] rounded-full border border-[rgba(169,138,239,0.22)] shadow-[0_0_80px_rgba(112,75,210,0.12)]" />
      <div className="absolute inset-[22%] rounded-full border border-dashed border-[rgba(78,231,253,0.2)]" />
      <div className="absolute inset-[34%] rounded-full border border-[rgba(199,179,245,0.2)] bg-[rgba(112,75,210,0.06)]" />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <StelloquyOrb
            size={116}
            state="speaking"
            ariaLabel="Stelloquy, the Oracle inside Kairos"
          />
          <span className="mt-7 font-almanac-display text-[0.72rem] uppercase tracking-[0.34em] text-almanac-ink">
            {BRAND.oracle}
          </span>
          <span className="mt-2 font-almanac-mono text-[0.58rem] uppercase tracking-[0.16em] text-almanac-ink-soft">
            context assembled
          </span>
        </div>
      </div>

      {orbitLabels.map((item) => (
        <div
          key={item.label}
          className={`absolute ${item.className} max-w-[9.5rem] rounded-full border border-almanac-line-hi bg-[rgba(10,12,20,0.88)] px-3 py-2 text-center font-almanac-mono text-[0.58rem] uppercase tracking-[0.1em] text-almanac-starlight shadow-[0_10px_28px_rgba(0,0,0,0.28)] sm:max-w-none sm:px-4 sm:text-[0.64rem]`}
        >
          {item.label}
        </div>
      ))}
    </div>
  );
}

function ContextSection() {
  return (
    <section id="context" className="scroll-mt-24 border-b border-almanac-line py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
          <div>
            <p className="font-almanac-mono text-[0.7rem] uppercase tracking-[0.28em] text-almanac-copper-hi">
              Context before prompt
            </p>
            <h2 className="mt-4 font-almanac-serif text-4xl italic leading-tight text-almanac-ink md:text-5xl">
              It arrives carrying your year.
            </h2>
          </div>
          <p className="max-w-2xl text-[0.98rem] leading-7 text-almanac-ink-dim lg:justify-self-end">
            The upgrade is not simply access to a chat box. It is the connection between the
            question you ask now and the chart, timing, intentions, actions, and reflections that
            already live inside {BRAND.product}.
          </p>
        </div>

        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-almanac-line bg-almanac-line sm:grid-cols-2 lg:grid-cols-5">
          {CONTEXT_LAYERS.map(({ label, detail, Icon, tone }) => (
            <article key={label} className="bg-almanac-bg2 p-6 lg:min-h-[260px]">
              <Icon className={`h-5 w-5 ${tone}`} strokeWidth={1.5} aria-hidden />
              <h3 className="mt-8 font-almanac-serif text-xl text-almanac-ink">{label}</h3>
              <p className="mt-3 text-[0.84rem] leading-6 text-almanac-ink-soft">{detail}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ConversationSection() {
  return (
    <section className="border-b border-almanac-line bg-almanac-bg2/40 py-20 md:py-28">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 md:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <div>
          <p className="font-almanac-mono text-[0.7rem] uppercase tracking-[0.28em] text-almanac-copper-hi">
            One question, grounded
          </p>
          <h2 className="mt-4 font-almanac-serif text-4xl italic leading-tight text-almanac-ink md:text-5xl">
            The context changes the answer.
          </h2>
          <p className="mt-5 text-[0.98rem] leading-7 text-almanac-ink-dim">
            For questions about the moment you are in, Stelloquy connects a current timing signal
            with something true in your natal baseline and the intentions you have already named.
            Human Design joins that framing when it is available.
          </p>
          <div className="mt-7 flex items-start gap-3 rounded-xl border border-almanac-line-hi bg-almanac-bg3/55 p-4">
            <Command className="mt-0.5 h-4 w-4 shrink-0 text-almanac-copper-hi" aria-hidden />
            <p className="text-sm leading-6 text-almanac-ink-dim">
              Stelloquy travels with you through the planner. Open it from any workspace with
              <span className="text-almanac-ink"> Command or Ctrl + K</span>.
            </p>
          </div>
          <div className="mt-6">
            <p className="font-almanac-mono text-[0.58rem] uppercase tracking-[0.16em] text-almanac-ink-soft">
              Choose an interpretive lens
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Evolutionary", "Karmic", "Psychological", "Traditional", "Synthesis"].map(
                (lens) => (
                  <span
                    key={lens}
                    className="rounded-full border border-almanac-line-hi bg-almanac-bg/70 px-3 py-1.5 font-almanac-mono text-[0.56rem] uppercase tracking-[0.08em] text-almanac-ink-dim"
                  >
                    {lens}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>

        <article className="rounded-2xl border border-almanac-line-hi bg-[rgba(10,12,20,0.82)] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.38)] sm:p-7">
          <div className="flex items-center justify-between gap-4 border-b border-almanac-line pb-4">
            <div className="flex items-center gap-3">
              <StelloquyOrb size={34} state="listening" ariaLabel="Stelloquy listening" />
              <div>
                <p className="font-almanac-display text-[0.72rem] uppercase tracking-[0.22em] text-almanac-ink">
                  {BRAND.oracle}
                </p>
                <p className="mt-1 font-almanac-mono text-[0.58rem] uppercase tracking-[0.13em] text-almanac-ink-soft">
                  Illustrative exchange
                </p>
              </div>
            </div>
            <span className="rounded-full border border-almanac-line-hi px-3 py-1 font-almanac-mono text-[0.56rem] uppercase tracking-[0.12em] text-almanac-ink-soft">
              Context ready
            </span>
          </div>

          <div className="mt-6 space-y-5">
            <div className="ml-auto max-w-[88%] rounded-2xl rounded-tr-sm border border-[rgba(112,75,210,0.42)] bg-[rgba(112,75,210,0.16)] px-4 py-3 text-sm leading-6 text-almanac-ink">
              I&apos;ve been pulled in two directions about my creative work. Focus on one thing, or
              keep both going?
            </div>

            <div className="flex items-start gap-3">
              <StelloquyOrb size={28} state="speaking" ariaLabel="Stelloquy speaking" />
              <div className="space-y-3 rounded-2xl rounded-tl-sm border border-almanac-line-hi bg-almanac-bg2/80 px-4 py-4">
                <p className="text-sm leading-7 text-almanac-ink-dim">
                  Saturn trine your Midheaven is exact right now, which asks for consolidation
                  more than expansion. But your Jupiter–Moon window through June carries a Cancer
                  quality: emotional truth matters more than strategic neatness here.
                </p>
                <p className="text-sm leading-7 text-almanac-ink-dim">
                  You wrote in your Year Vision that you wanted to stop holding back on work you
                  actually care about. I would use that as the deciding edge: which direction is
                  the work you most want to stand behind?
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {["Saturn △ Midheaven", "Jupiter ☌ Moon", "Year Vision"].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-almanac-line-hi bg-[rgba(10,12,20,0.72)] px-2.5 py-1 font-almanac-mono text-[0.56rem] uppercase tracking-[0.08em] text-almanac-ink-soft"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

function MemorySection() {
  return (
    <section id="memory" className="scroll-mt-24 border-b border-almanac-line py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="max-w-xl">
            <p className="font-almanac-mono text-[0.7rem] uppercase tracking-[0.28em] text-almanac-copper-hi">
              Memory with edges
            </p>
            <h2 className="mt-4 font-almanac-serif text-4xl italic leading-tight text-almanac-ink md:text-5xl">
              You decide what continues.
            </h2>
            <p className="mt-5 text-[0.98rem] leading-7 text-almanac-ink-dim">
              Mark a journal entry for Stelloquy when you want its words available in later
              conversations. Leave it unmarked and it is not added as direct journal memory.
            </p>
            <p className="mt-4 text-[0.98rem] leading-7 text-almanac-ink-dim">
              Inside a conversation, capture a sentence or save the whole exchange. You choose
              whether it stays saved, joins your Insights, feeds planning context, or does both.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {MEMORY_STEPS.map((step, index) => (
              <article
                key={step.number}
                className="relative rounded-2xl border border-almanac-line-hi bg-almanac-bg2/70 p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-almanac-mono text-[0.62rem] tracking-[0.16em] text-almanac-copper-hi">
                    {step.number}
                  </span>
                  {index < MEMORY_STEPS.length - 1 ? (
                    <ArrowRight className="h-4 w-4 text-almanac-ink-soft sm:hidden" aria-hidden />
                  ) : (
                    <Check className="h-4 w-4 text-almanac-sage" aria-hidden />
                  )}
                </div>
                <h3 className="mt-8 font-almanac-serif text-2xl text-almanac-ink">
                  {step.label}
                </h3>
                <p className="mt-2 text-sm leading-6 text-almanac-ink-soft">{step.detail}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-[rgba(176,140,220,0.34)] bg-[rgba(176,140,220,0.08)] p-5 md:flex md:items-center md:justify-between md:gap-8 md:p-6">
          <div className="flex items-start gap-3">
            <BrainCircuit className="mt-0.5 h-5 w-5 shrink-0 text-almanac-plum" aria-hidden />
            <div>
              <p className="font-almanac-mono text-[0.64rem] uppercase tracking-[0.14em] text-almanac-starlight">
                Patterns are observations, not verdicts
              </p>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-almanac-ink-dim">
                When a lunar or transit pattern repeats across your journal, Stelloquy can carry a
                compact pattern summary into the conversation. The system treats it as a tendency
                worth examining, never as fate.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function QuestionsSection() {
  return (
    <section
      id="questions"
      className="scroll-mt-24 border-b border-almanac-line bg-almanac-bg2/40 py-20 md:py-28"
    >
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="max-w-3xl">
          <p className="font-almanac-mono text-[0.7rem] uppercase tracking-[0.28em] text-almanac-copper-hi">
            Bring the real question
          </p>
          <h2 className="mt-4 font-almanac-serif text-4xl italic leading-tight text-almanac-ink md:text-5xl">
            Ask from the middle of your life.
          </h2>
          <p className="mt-5 text-[0.98rem] leading-7 text-almanac-ink-dim">
            You do not need to summarize your chart or rebuild the backstory first. Begin with the
            part that is alive now.
          </p>
        </div>

        <div className="mt-12 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {QUESTION_STARTERS.map((question, index) => (
            <article
              key={question}
              className="group flex min-h-[150px] flex-col justify-between rounded-2xl border border-almanac-line-hi bg-almanac-bg/75 p-5 transition-colors hover:border-[rgba(169,138,239,0.5)] hover:bg-almanac-bg3/65"
            >
              <MessageCircleMore
                className="h-5 w-5 text-almanac-copper transition-colors group-hover:text-almanac-copper-hi"
                strokeWidth={1.5}
                aria-hidden
              />
              <p className="mt-8 font-almanac-serif text-xl italic leading-snug text-almanac-ink">
                “{question}”
              </p>
              <span className="mt-4 font-almanac-mono text-[0.56rem] uppercase tracking-[0.12em] text-almanac-ink-soft">
                Question {String(index + 1).padStart(2, "0")}
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ComparisonSection() {
  return (
    <section className="border-b border-almanac-line bg-almanac-bg2/40 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-almanac-mono text-[0.7rem] uppercase tracking-[0.28em] text-almanac-copper-hi">
            What the upgrade changes
          </p>
          <h2 className="mt-4 font-almanac-serif text-4xl italic leading-tight text-almanac-ink md:text-5xl">
            Add a conversation layer to the planner.
          </h2>
          <p className="mt-5 text-[0.98rem] leading-7 text-almanac-ink-dim">
            The core Planner holds your calendar and reflective tools. Planner + Oracle adds
            Stelloquy&apos;s continuing, context-aware dialogue.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <article className="rounded-2xl border border-almanac-line bg-almanac-bg2/45 p-6 md:p-8">
            <p className="font-almanac-mono text-[0.66rem] uppercase tracking-[0.16em] text-almanac-ink-soft">
              Core Planner · no Stelloquy generation
            </p>
            <ul className="mt-7 space-y-5 text-sm leading-6 text-almanac-ink-dim">
              <li>Your Blueprint, calendar, journal, and tracker remain the core planning workspace.</li>
              <li>Planner guidance is available without opening an AI conversation.</li>
              <li>Stelloquy questions and captures require an active Planner + Oracle plan.</li>
              <li>You can add the conversation layer whenever you want deeper dialogue.</li>
            </ul>
          </article>

          <article className="rounded-2xl border border-[rgba(169,138,239,0.45)] bg-gradient-to-br from-[rgba(112,75,210,0.18)] via-almanac-bg2 to-[rgba(78,231,253,0.05)] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.3)] md:p-8">
            <div className="flex items-center gap-3">
              <StelloquyOrb size={30} state="speaking" ariaLabel="Stelloquy" />
              <p className="font-almanac-display text-[0.7rem] uppercase tracking-[0.2em] text-almanac-ink">
                {BRAND.oracle}
              </p>
            </div>
            <ul className="mt-7 space-y-5 text-sm leading-6 text-almanac-ink">
              {[
                "Up to 200 messages each month in an ongoing, streaming conversation.",
                "Follow up, disagree, clarify, and switch among five interpretive lenses.",
                "Capture a highlight, exchange, or thread and choose where it should go.",
                "Open Stelloquy from anywhere in Kairos with the persistent drawer.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-almanac-copper-hi" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}

function SamplerSection({ isSignedIn }: Props) {
  return (
    <section className="border-b border-almanac-line py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-almanac-mono text-[0.7rem] uppercase tracking-[0.28em] text-almanac-copper-hi">
            Not ready for a full year?
          </p>
          <h2 className="mt-4 font-almanac-serif text-4xl italic leading-tight text-almanac-ink md:text-5xl">
            Try Stelloquy for $1.
          </h2>
          <p className="mt-5 text-[0.98rem] leading-7 text-almanac-ink-dim">
            Get three Stelloquy conversations grounded in your natal chart and the current sky —
            no planner required.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-[rgba(169,138,239,0.4)] bg-gradient-to-br from-[rgba(112,75,210,0.12)] to-almanac-bg p-6 md:p-8">
          <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="font-almanac-display text-[0.68rem] uppercase tracking-[0.18em] text-almanac-copper-hi">
                Stelloquy Sampler
              </p>
              <div className="mt-3 flex items-end gap-2">
                <span className="font-almanac-display text-5xl text-almanac-ink">$1</span>
                <span className="pb-1 text-sm text-almanac-ink-soft">one-time</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-almanac-ink-dim">
                Three messages with chart and sky context. One sampler per account.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {isSignedIn ? (
                <>
                  <SamplerCheckoutButton
                    label="Buy sampler — $1"
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-almanac-kairos-hi px-5 text-sm font-semibold text-almanac-midnight transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <Link
                    href="/sampler"
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-almanac-line-hi px-5 text-sm font-medium text-almanac-ink transition-colors hover:border-[rgba(169,138,239,0.6)]"
                  >
                    Learn more
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/sign-up?redirect_url=/sampler"
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-almanac-kairos-hi px-5 text-sm font-semibold text-almanac-midnight transition-transform hover:scale-[1.02]"
                  >
                    Create account
                  </Link>
                  <Link
                    href="/sampler"
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-almanac-line-hi px-5 text-sm font-medium text-almanac-ink transition-colors hover:border-[rgba(169,138,239,0.6)]"
                  >
                    Learn more
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-3 border-t border-almanac-line-hi pt-6 sm:grid-cols-3">
            <div>
              <p className="font-almanac-mono text-[0.6rem] uppercase tracking-[0.14em] text-almanac-ink-soft">
                Included
              </p>
              <p className="mt-2 text-sm text-almanac-ink">Your natal chart</p>
            </div>
            <div>
              <p className="font-almanac-mono text-[0.6rem] uppercase tracking-[0.14em] text-almanac-ink-soft">
                Included
              </p>
              <p className="mt-2 text-sm text-almanac-ink">Current sky</p>
            </div>
            <div>
              <p className="font-almanac-mono text-[0.6rem] uppercase tracking-[0.14em] text-almanac-ink-soft">
                Messages
              </p>
              <p className="mt-2 text-sm text-almanac-ink">3 total</p>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-almanac-ink-soft">
          Want ongoing Stelloquy with your planner?{" "}
          <Link
            href="/pricing#tiers"
            className="text-almanac-ink underline transition-colors hover:text-almanac-copper-hi"
          >
            See Planner + Oracle
          </Link>
        </p>
      </div>
    </section>
  );
}

function UpgradeSection({ isSignedIn }: Props) {
  const planner = getCommerceTier("planner");
  const premium = getCommerceTier("planner_oracle");
  const monthlyDelta = premium.monthlyPriceCents - planner.monthlyPriceCents;
  const annualDelta = premium.annualPriceCents - planner.annualPriceCents;

  return (
    <section id="upgrade" className="scroll-mt-24 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-[rgba(169,138,239,0.45)] bg-[rgba(17,19,30,0.92)] px-6 py-10 shadow-[0_32px_90px_rgba(0,0,0,0.4)] sm:px-8 md:px-12 md:py-14">
          <div className="pointer-events-none absolute inset-0">
            <StarField count={48} seed={47} opacity={0.32} />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 55% 80% at 92% 15%, rgba(112,75,210,0.26), transparent 68%), radial-gradient(ellipse 35% 55% at 0% 100%, rgba(78,231,253,0.08), transparent 65%)",
              }}
            />
          </div>

          <div className="relative grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <div className="flex items-center gap-4">
                <StelloquyOrb size={48} state="speaking" ariaLabel="Stelloquy" />
                <div>
                  <p className="font-almanac-mono text-[0.66rem] uppercase tracking-[0.2em] text-almanac-copper-hi">
                    The premium layer
                  </p>
                  <p className="mt-1 font-almanac-display text-[0.65rem] uppercase tracking-[0.24em] text-almanac-ink-soft">
                    Included in Planner + Oracle
                  </p>
                </div>
              </div>

              <h2 className="mt-7 max-w-3xl font-almanac-serif text-4xl italic leading-tight text-almanac-ink md:text-5xl">
                The planner shows the timing. Stelloquy helps you think with it.
              </h2>
              <p className="mt-5 max-w-2xl text-[0.98rem] leading-7 text-almanac-ink-dim">
                Add the conversational layer to the full {BRAND.product} year: 200 messages each
                month, available from anywhere in your planner.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/pricing#tiers"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-almanac-kairos-hi px-6 text-sm font-semibold text-almanac-midnight transition-transform hover:scale-[1.02]"
                >
                  Choose Planner + Oracle
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  href={isSignedIn ? "/oracle" : "/sign-up"}
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-almanac-line-hi px-6 text-sm font-medium text-almanac-ink transition-colors hover:border-[rgba(169,138,239,0.6)]"
                >
                  {isSignedIn ? "Open Stelloquy" : "Create an account"}
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-almanac-line-hi bg-[rgba(10,12,20,0.72)] p-6">
              <p className="font-almanac-mono text-[0.62rem] uppercase tracking-[0.16em] text-almanac-ink-soft">
                Planner + Oracle
              </p>
              <div className="mt-4 flex items-end gap-3">
                <span className="font-almanac-display text-5xl text-almanac-ink">
                  {formatUsd(premium.monthlyPriceCents)}
                </span>
                <span className="pb-1 text-sm text-almanac-ink-soft">per month</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-almanac-ink-dim">
                Or {formatUsd(premium.annualPriceCents)} for the year.
              </p>
              <div className="my-6 h-px bg-almanac-line" />
              <p className="text-sm leading-6 text-almanac-ink-dim">
                The Planner + Oracle tier is {formatUsd(monthlyDelta)} more per month or{" "}
                {formatUsd(annualDelta)} more per year than the core Planner.
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-16 max-w-3xl">
          <p className="text-center font-almanac-mono text-[0.68rem] uppercase tracking-[0.24em] text-almanac-copper-hi">
            A few practical questions
          </p>
          <div className="mt-7 divide-y divide-almanac-line border-y border-almanac-line">
            {FAQS.map((item) => (
              <details key={item.question} className="group py-5">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-6 font-almanac-serif text-xl text-almanac-ink marker:hidden">
                  {item.question}
                  <span
                    className="text-almanac-copper transition-transform duration-200 group-open:rotate-45"
                    aria-hidden
                  >
                    +
                  </span>
                </summary>
                <p className="max-w-2xl pb-2 pr-10 text-sm leading-7 text-almanac-ink-dim">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MarketingFooter() {
  return (
    <footer className="border-t border-almanac-line py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 md:flex-row md:items-center md:justify-between md:px-8">
        <Link href="/" className="flex min-h-11 items-center gap-2">
          <span className="text-base text-almanac-copper-hi" aria-hidden>
            &#10022;
          </span>
          <span className="font-almanac-display text-sm tracking-[0.08em] text-almanac-ink">
            {BRAND.product.toUpperCase()}
          </span>
        </Link>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 font-almanac-mono text-[0.68rem] uppercase tracking-[0.14em] text-almanac-ink-soft">
          <Link href="/" className="transition-colors hover:text-almanac-ink">
            Planner
          </Link>
          <Link href="/pricing" className="transition-colors hover:text-almanac-ink">
            Pricing
          </Link>
          <Link href="/contact" className="transition-colors hover:text-almanac-ink">
            Contact
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-almanac-ink">
            Privacy
          </Link>
          <Link href="/terms" className="transition-colors hover:text-almanac-ink">
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}

export function StelloquyMarketingPage({ isSignedIn }: Props) {
  const premium = getCommerceTier("planner_oracle");

  return (
    <div className="min-h-screen overflow-x-hidden bg-almanac-bg font-almanac-body text-almanac-ink">
      <MarketingHeader isSignedIn={isSignedIn} />

      <main>
        <section className="relative overflow-hidden border-b border-almanac-line">
          <div className="pointer-events-none absolute inset-0">
            <StarField count={100} seed={31} opacity={0.48} />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 55% 52% at 78% 35%, rgba(112,75,210,0.24), transparent 66%), radial-gradient(ellipse 38% 42% at 8% 90%, rgba(78,231,253,0.07), transparent 64%)",
              }}
            />
          </div>

          <div className="relative mx-auto grid min-h-[760px] max-w-6xl gap-8 px-5 py-16 md:px-8 md:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div className="min-w-0 kairos-rise" style={{ animationDelay: "0.05s" }}>
              <p className="font-almanac-mono text-[0.68rem] uppercase tracking-[0.26em] text-almanac-copper-hi">
                {BRAND.oracle} &middot; {BRAND.oraclePronunciation}
              </p>
              <h1
                className="mt-6 max-w-3xl"
                aria-label={`${BRAND.oracle}. Doesn't begin with a blank prompt.`}
              >
                <span className="block font-almanac-display text-[clamp(2.75rem,7vw,5.7rem)] leading-none tracking-[0.04em] text-almanac-ink">
                  {BRAND.oracle.toUpperCase()}
                </span>
                <span className="mt-5 block max-w-2xl font-almanac-serif text-[clamp(2.15rem,5vw,4.2rem)] italic leading-[1.05] text-almanac-starlight">
                  doesn&apos;t begin with a blank prompt.
                </span>
              </h1>
              <p className="mt-7 max-w-xl text-[1rem] leading-7 text-almanac-ink-dim">
                The Oracle inside {BRAND.product}, grounded in your natal chart, the live sky,
                your goals and blueprint, and the journal memory you choose to carry forward.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="#upgrade"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-almanac-kairos-hi px-6 text-sm font-semibold text-almanac-midnight transition-transform hover:scale-[1.02]"
                >
                  Add Stelloquy to my year
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  href="#context"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-almanac-line-hi px-6 text-sm font-medium text-almanac-ink transition-colors hover:border-[rgba(169,138,239,0.6)] hover:text-almanac-copper-hi"
                >
                  See what it carries in
                </Link>
              </div>

              <p className="mt-5 font-almanac-mono text-[0.62rem] uppercase tracking-[0.12em] text-almanac-ink-soft">
                Included in {premium.name} &middot; from {formatUsd(premium.monthlyPriceCents)}/month
              </p>
            </div>

            <div className="kairos-rise" style={{ animationDelay: "0.2s" }}>
              <ContextOrbit />
            </div>
          </div>
        </section>

        <ContextSection />
        <ConversationSection />
        <MemorySection />
        <QuestionsSection />
        <ComparisonSection />
        <SamplerSection isSignedIn={isSignedIn} />
        <UpgradeSection isSignedIn={isSignedIn} />
      </main>

      <MarketingFooter />
    </div>
  );
}
