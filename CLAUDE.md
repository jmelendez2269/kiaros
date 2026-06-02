# CLAUDE.md — Kiaros Development Guide

## Sources of truth

1. **[`PRODUCT_BIBLE.md`](./PRODUCT_BIBLE.md)** — product vision, feature specs, design system, AI architecture. This is the "what" and "why."
2. **[`docs/architecture-v2.md`](./docs/architecture-v2.md)** — engineering plan, database migration, phase order, open decisions. This is the "how" and "in what order." Reading it before touching code is mandatory.
3. This file — conventions, common mistakes, and how the current code differs from the target.

Anything in `docs/kiaros-*-v1.md` or the `phase2/phase3` handoffs is **archived**. Those describe a watered-down beta that we no longer build. Do not treat them as authoritative.

## What Kiaros is

Kiaros (formerly "Cosmic Life Planner") is a personalised yearly planning system built on a user's real natal chart, their goals, and the actual astronomical weather of their year. Real ephemeris calculations feed a Claude-generated blueprint structured across 52 weeks / 12 months / 4 quarters, surfaced through a cosmic calendar, a daily tracker, a moon-phase-aware journal, quarterly reviews, and the Oracle chat.

## Tech stack (don't change without a reason)

- Next.js 15 (App Router) — Product Bible specifies 16; upgrade when convenient, not blocking
- TypeScript
- Tailwind CSS (dark-mode first)
- Clerk — auth
- Supabase (Postgres, RLS) — data
- Anthropic via Vercel AI Gateway + AI SDK v6 — Claude Sonnet 4.6 and Haiku 4.5
- `astronomia` — ephemeris
- shadcn/ui — components
- Recharts — charts (Phase 7)
- `@dnd-kit/sortable` — DnD (Phase 2)

## Current state (2026-05-20)

Kiaros went live ~2026-05-01. The original phase plan is no longer the right map — see [`docs/handoff-2026-05-08.md`](./docs/handoff-2026-05-08.md) for the authoritative snapshot.

**Shipped (production):**
- Next.js + Clerk + Supabase wired, RLS-aware clients (`lib/supabase/{client,server,admin}.ts`)
- Clerk webhook (`app/api/webhooks/clerk/route.ts`); full onboarding flow
- Schema through migration 0020 (`supabase/migrations/`); `types/database.ts` generated from live schema
- Ephemeris engine (`lib/ephemeris/`) and blueprint generator (`lib/ai/blueprint-generator.ts`) — AI SDK v6 via Vercel AI Gateway
- **Cosmic Calendar** — year/month/week views
- **Tracker** — dynamic per-category metrics, daily logs auto-stamped with lunar phase / sign / cycle phase, 90-day grid + 14-day per-category bars
- **Oracle chat** — 4-layer system prompt, streaming Sonnet 4.6 with prompt caching, captures (`oracle_captures`) with `include_in_insights` / `include_in_planner` flags, monthly limit
- **Journal** — entry creation with transit context; `journal_entry_sky` and `journal_entry_aspects` populated per save; `refresh_user_pattern_insight` RPC keeps `user_pattern_insights` current
- **Curriculum** — AI-generated week-by-week study plans, sessions, approval flow, fed into Oracle context
- **Areas** — list view enriched with house interpretations (`lib/areas.ts`)
- **Commerce** — Stripe subscriptions (yearly/monthly) + Etsy `marketplace_orders`; `npm run stripe:sync-catalog`
- **Admin console** — `app/(admin)/admin/*` (internal)
- **Public pages** — homepage, contact, policy pages, manifest, icons
- **Journal Insights** — `/journal/insights` surfaces `user_pattern_insights` with an AI synthesis layer (Haiku 4.5) on top of the SQL summary fallback; per-user voice control (`user_settings`) with three presets + custom prompt; bulk regen via Next 15 `after()` with page polling. See [`docs/handoff-2026-05-19-journal-insight-voice.md`](./docs/handoff-2026-05-19-journal-insight-voice.md).
- **Quarterly Reviews** — create/edit surface live; deltas vs prior quarter shown under each activity stat. See [`docs/handoff-2026-05-19-quarterly-reviews-polish.md`](./docs/handoff-2026-05-19-quarterly-reviews-polish.md).
- **Areas detail pages** — `/areas/[slug]` is a real detail page (hero, current window, year narrative, chart anchors, upcoming windows) plus an itemised goals surface (`area_goals` table, migration 0020 applied to prod) via `AreaGoalsPanel`. See [`docs/handoff-2026-05-20-areas-goals.md`](./docs/handoff-2026-05-20-areas-goals.md).
- **HD + Gene Keys in the blueprint** — `blueprint-generator.ts` computes/stores Human Design and feeds it to `blueprint-system-prompt.ts` (`humanDesignToText`, per-Type weekly framing). `/human-design` surfaces the chart. (HD is framed as a tool, not an authority — it should admit uncertainty.)
- **Journal Insights entry points** — JournalComposer CTA promoted to a bordered panel; AlmanacSidebar has an indented Insights sub-entry under Journal.

**Gaps (priority order):**
- **Quarterly Reviews UI polish backlog** — see latest QR handoff for residual items (Q2 ends 2026-06-30)
- **Year Unwrapped** — not built; distinct from the `/year` Cosmic Calendar (which is shipped). It's the Q4 year-end recap: 8-section retrospective with Recharts (not yet installed) + AI year-end letter. See `docs/architecture-v2.md` Phase 7.
- **Areas → Oracle / quarterly-review wiring** — `area_goals` exists as a standalone surface; not yet pulled into Oracle's system prompt or QR activity stats (handoff-2026-05-20 §5 MEDIUM #5–6).
- **HD + Gene Keys deepening** — math layer validated under `lib/ephemeris/human-design/`; further Gene Keys / onboarding work is Phase 4.5 in `docs/architecture-v2.md` §8.

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

**Last updated:** 2026-05-22 — Doc reconciliation: Areas detail pages + goals (migration 0020 confirmed applied to prod), HD-in-blueprint, and Journal Insights entry points moved to Shipped (they were stale "gaps"). Schema at 0020. Remaining real gaps: Year Unwrapped (Q4), Areas→Oracle wiring, HD deepening.
