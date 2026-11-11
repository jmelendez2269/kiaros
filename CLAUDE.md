# CLAUDE.md — Kiaros Development Guide

## Sources of truth

1. **[`PRODUCT_BIBLE.md`](./PRODUCT_BIBLE.md)** — product vision, all shipped features, AI architecture, schema reference. Updated 2026-06-02 from live code audit, with a targeted update on 2026-11-10 for check-ins, look backs, reflections and Insights — this is the definitive feature list.
2. **[`docs/architecture-v2.md`](./docs/architecture-v2.md)** — engineering phase plan and open decisions. Check before adding new features.
3. This file — conventions, common mistakes, known gaps.

Anything in `docs/kiaros-*-v1.md` or the `phase2/phase3` handoffs is **archived**. Those describe a watered-down beta that we no longer build. Do not treat them as authoritative.

## Active initiative

- **[`docs/planning/access-memory-commerce-roadmap.md`](./docs/planning/access-memory-commerce-roadmap.md)** — canonical plan and status tracker for journal consent/memory, Blueprint access packaging, the paid Stelloquy sampler, honest preview positioning, funnel analytics, and Etsy artifact fulfillment. Read its **Next three actions**, active dispatch board, exclusive file locks, and tracker before working in any of those areas.

## What Kiaros is

Kiaros (formerly "Cosmic Life Planner") is a personalised yearly planning system built on a user's real natal chart, their goals, and the actual astronomical weather of their year. Real ephemeris calculations feed a Claude-generated blueprint structured across 52 weeks / 12 months / 4 quarters, surfaced through a cosmic calendar, a Today dashboard with a daily check-in, a moon-phase-aware journal, look backs and reviews, and the Oracle chat.

## Tech stack (don't change without a reason)

- Next.js 15 (App Router) — Product Bible specifies 16; upgrade when convenient, not blocking
- TypeScript
- Tailwind CSS (dark-mode first)
- Clerk — auth
- Supabase (Postgres, RLS) — data
- Vercel AI SDK (`ai` with the `@ai-sdk/anthropic` provider), calling Anthropic directly — Claude Sonnet 4.6 and Haiku 4.5. Not routed through the Vercel AI Gateway, with one exception: the admin card generator (`lib/admin/card-generator.ts`) uses the Gateway when running on Vercel. `@anthropic-ai/sdk` is installed but nothing imports it
- `astronomia` — ephemeris
- shadcn/ui — components
- Recharts — charts (Phase 7)
- `@dnd-kit/sortable` — DnD (Phase 2)

## Current state (2026-06-02, reflections and Insights re-checked 2026-11-10)

Kiaros went live ~2026-05-01. Migration files run to 0057. See [`PRODUCT_BIBLE.md`](./PRODUCT_BIBLE.md) for the full shipped feature inventory.

**All of the following are live in production:**
- Auth (Clerk), DB (Supabase), RLS clients, Clerk webhook
- Blueprint generation (Sonnet 4.6, `after()` async, `maxDuration = 300`)
- Stelloquy / Oracle — streaming chat, 4-layer prompt caching, captures, topic extraction, capture network graph
- Journal — transit-stamped entries, pattern insights, voice-customizable AI synthesis
- Insights — home page at `/insights`; Reviews timeline (weeks, months, quarters); Patterns (with a preview for members without Stelloquy, and check-in rhythms by moon phase); Mind map star chart
- Look backs and Reflections — month, quarter and sky-cycle look backs; weekly, monthly, quarterly and yearly reflections that always carry a sky reading, so a period with nothing recorded is never blank; Yearly Unwrapped
- Cosmic Calendar — year / month / week / review tabs
- Daily check-in — energy and mood on Today, one row per day in `daily_logs`, moon-stamped. The earlier Daily Tracker (90-day grid, `tracker_metrics`) is not in the code
- Today Dashboard — sky now, active transits, season read, daily intention (taken from the Blueprint), check-in, last week's look back, curriculum session
- Curriculum — AI plan generation, session detail, progress tracking
- Areas + Goals — detail pages, natal house mappings, timing windows, `area_goals`
- Quarterly Reviews — user fills wins/challenges/pivots, AI summary, delta vs prior quarter
- Month Briefs — generated per month, editable, shown in month view
- Human Design — bodygraph chart, type/strategy/authority/profile
- Blueprint page — full 52-week read view
- Settings — profile, theme, oracle usage, billing
- Commerce — Stripe + Etsy + activation codes + `product_entitlements`
- Admin console — content import / card approval workflow
- Onboarding — 6-step flow → blueprint generation polling page

**Gaps (priority order):**
- **Quarterly Reviews Q2 polish** — Q2 ends 2026-06-30; see latest QR handoff
- **Year Unwrapped charts** — Yearly Unwrapped ships as the yearly reflection (story, full report, share card). The Recharts visualizations in `docs/architecture-v2.md` Phase 7 are not built.
- **Consent for check-ins and plans** — no per-item "include" switch, unlike journal entries and saved conversations; reflections read them all
- **Areas → Oracle / QR wiring** — `area_goals` not yet pulled into Oracle system prompt or QR activity stats
- **Gene Keys deepening** — HD math validated; IQ/EQ/SQ/Core/Culture/Vocation paths not implemented
- **Cycle onboarding step** — page exists but cycle data unused downstream

## Conventions

### Files
- `app/` — Next.js routes (UI and API)
- `components/` — organised by domain (`onboarding/`, `calendar/`, `tracker/`, `shared/`, `ui/`)
- `lib/` — no UI; business logic, AI, ephemeris, Supabase clients
- `types/` — shared TypeScript types; `database.ts` is generated by `supabase gen types`

### Components
- `"use client"` only when truly needed (interactivity, hooks, browser APIs)
- Server Components for anything that reads from Supabase on first paint
- Client Components use the browser Supabase client (anon key) or fetch from API routes

### Services
Return `ApiResponse<T>` = `{ success: true, data: T } | { success: false, error: string }`. Handle the error at the call site, don't throw across module boundaries unless it's truly exceptional.

### Prompts
System prompts are assembled fresh per request in `lib/ai/*-system-prompt.ts`. Don't hardcode prompt strings in route handlers. Don't mix prompt text and response parsing in the same function.

### SQL
Any new migration goes in `supabase/migrations/` with a numbered prefix. Never hand-edit an already-run migration — write a new one.

## Tone principles (product, not just UI)

The product voice: warm, grounded, mystical-but-practical. Anti-hustle. Rest is strategy, not failure.

Never write:
- "where you think you should be"
- "what it actually is" vs "what you wish it were" (implies the user is self-deceiving)
- "optimise / level up / grind" or anything hustle-adjacent
- Generic astrology fortune-cookie copy

Always write:
- Specific references to the user's actual chart placements, their actual transits, their actual goals in their words
- Spacious prose that honours where the user is right now

## Common mistakes to avoid

- Treating any `kiaros-*-v1.md` doc as current
- Hardcoding blueprint version to 1 — use `MAX(version) + 1` per user per `plan_year`
- Querying Supabase directly from client components (always through API routes)
- Using the service-role client outside webhooks and system jobs
- Assuming Claude knows the ephemeris — it doesn't, feed it real data
- Letting any period but the year be read before it ends — only the open year has a "so far" reading (`isOpenYear` in `lib/reflections/periods.ts`)
- Treating a period with no journal entries as empty — reflections and look backs still read the sky; rest and unrecorded time are never explained or scored
- Passing pattern readings or journal text from one period into another period's look back — only names, counts and dates cross periods (`lib/period-review/returning-threads.ts`)
- Asking it to output markdown when we need JSON — we always want structured output for blueprint/review generation

## Definition of Done

A feature is done when:
1. It works end-to-end in the browser on the golden path and one edge case
2. Types compile with no `any`-shaped cheats
3. Error paths are handled (user-visible message, not a console trace)
4. RLS holds (tested with a second user if it touches user data)
5. No TODOs about "real implementation" — if it's mocked, it's flagged as mocked in the session notes

## Definitely Don't Do

- Don't run the schema migration without confirming with the user first
- Don't add features from the Product Bible outside the current phase
- Don't refactor code that works unless the refactor is the task
- Don't create `.md` planning or analysis docs unless explicitly asked — use the conversation

---

**Last updated:** 2026-11-10 — Targeted update for the daily check-in, look backs, reflections and Insights; Daily Tracker noted as not in the code. Other sections date from the 2026-06-02 live code audit (PRODUCT_BIBLE.md created from scratch; maxDuration on blueprint/generate raised to 300; AI stack: Vercel AI SDK with the Anthropic provider, not the AI Gateway).
