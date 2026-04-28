---
type: architecture
subject: kiaros
status: active
created: 2026-04-12
supersedes:
  - kiaros-ai-dev-starter-pack-v1.md
  - kiaros-build-sequence-v1.md
  - kiaros-developer-handoff-v1.md
  - kiaros-mvp-cut-v1.md
  - kiaros-phase2-handoff.md
  - kiaros-phase3-handoff.md
---

# Kiaros — Architecture v2

**This document is the engineering source of truth.**
The product source of truth is [`/PRODUCT_BIBLE.md`](../PRODUCT_BIBLE.md). Read that first. This document shows how we bridge the existing code (built from the old MVP-cut docs) to the Product Bible vision.

---

## 1. Context: What Changed

Kiaros was previously scoped as a "smallest credible beta" — birth data in, a 6-field text blueprint out, rendered on a single page. That scope was too thin. It removed the real differentiator of the product (actual astrological data, calendar, tracker, oracle) and reduced Claude to *guessing* an astrological summary from a date of birth.

The Product Bible restores the full vision: real ephemeris calculations, a computed natal chart, a blueprint structured across 52 weeks / 12 months / 4 quarters, a cosmic calendar, a daily tracker, the Oracle chat, a moon-phase-aware journal, quarterly reviews, and the Year Unwrapped.

**Cosmic Life Planner and Kiaros are the same product.** Kiaros is the name. The Product Bible describes it.

The old `kiaros-*-v1.md` docs are archived — they describe a watered-down MVP that we're no longer building.

---

## 2. What Carries Forward (Don't Rewrite)

| Area | Current state | Carries forward |
|---|---|---|
| Tech stack | Next.js 15, TypeScript, Tailwind, Clerk, Supabase, Anthropic SDK | ✅ All correct |
| Auth shell | Clerk wired, middleware in place, sign-in/sign-up pages built | ✅ Keep |
| Routing shape | `app/(auth)` for unauth, `app/(app)` for auth | ✅ Keep (rename `(app)` → `(dashboard)` in the rebuild) |
| Styling | Dark-mode-first Tailwind tokens | ✅ Keep and extend |
| Env setup | `.env.local` pattern, Clerk + Supabase + Anthropic keys | ✅ Keep |
| ESLint / TS config | Default Next | ✅ Keep |
| Birth data step UI | Step 1 of onboarding | ✅ Keep the fields, redo the flow |

---

## 3. What Gets Replaced

| Area | Why it goes |
|---|---|
| `users` + `onboarding_data` + `blueprints` tables | Shape doesn't fit the Product Bible schema. We're still pre-beta so no user data is at risk. |
| `lib/services/blueprint.ts` (current) | Generates a flat 6-field JSON. Target is a nested structure (quarters/months/weeks) fed by real ephemeris. |
| Onboarding steps 3, 4, 5 (goals, vision, reflection) | Needs a complete rebuild for Goals (DnD + icon/color + "success looks like"), Year Focus, and Cycle steps. Drop the reflection step — it was a workaround for not having real astrology. |
| Lazy user creation (`getOrCreateUser`) | Replace with a Clerk webhook on `user.created` that inserts the `user_profiles` row. Webhooks are the PB pattern and avoid race conditions on first visit. |
| Service-role-only Supabase access | Replace with per-request RLS using `current_setting('app.clerk_user_id', TRUE)`. Admin client stays, but only for webhooks and system jobs. |
| `@anthropic-ai/sdk` direct usage | Move to AI SDK v6 via Vercel AI Gateway for streaming (Oracle, year-end letter). Keep the Anthropic SDK fallback only if needed. |

---

## 4. Target Directory Shape

```
app/
  (marketing)/              → landing, pricing, privacy, terms
  (auth)/                   → sign-in, sign-up
  (dashboard)/
    dashboard/
      overview/
      blueprint/
      calendar/
      oracle/
      journal/
      reviews/
      tracker/              → dynamic, also at /tracker?category=<id>
      settings/
  onboarding/
    birth-data/
    goals/
    year-focus/
    cycle/
    generating/
  api/
    webhooks/clerk/
    profile/
    goals/
    geocode/
    ephemeris/
    blueprint/generate/
    blueprint/status/
    tracker/logs/
    tracker/metrics/
    journal/entries/
    oracle/chat/
    reviews/[quarter]/
    reviews/unwrapped/letter/
    og/year-stats/

components/
  onboarding/
  dashboard/
  blueprint/
  calendar/
  tracker/
  oracle/
  journal/
  reviews/
  shared/
  settings/
  ui/                       → shadcn/ui

lib/
  ai/
    blueprint-generator.ts
    oracle-system-prompt.ts
    year-end-letter.ts
  ephemeris/
    astronomia-adapter.ts
    transit-calculator.ts
    index.ts
  cycle/
    cycle-calculator.ts
  reviews/
    stats-calculator.ts
  supabase/
    client.ts               → browser
    server.ts               → server with RLS setting
    admin.ts                → service role (webhooks only)

types/
  ephemeris.ts
  blueprint.ts
  database.ts               → generated via `supabase gen types`

supabase/
  migrations/
    0001_product_bible_schema.sql
```

---

## 5. Database Migration

The migration file lives at [`supabase/migrations/0001_product_bible_schema.sql`](../supabase/migrations/0001_product_bible_schema.sql) and does a clean cut: drops the four existing beta tables, creates the nine Product Bible tables with RLS, indexes, and the Clerk-session helper.

**Before running this migration:**
- Confirm there is no production user data you care about (we agreed we're early enough to discard)
- Take a Supabase snapshot just in case
- Run in the SQL editor on the `Kairos` project (`fslowrhswawatdfludqp`, us-west-2)

**Table-by-table mapping (old → new):**

| Old | New | Notes |
|---|---|---|
| `users` | `user_profiles` | Absorbs birth data, year vision, cycle config, natal chart JSONB |
| `onboarding_data` | split: `user_profiles` (birth + year vision + cycle) + `goal_categories` (one row per category) | The flat table becomes the normalized shape PB needs |
| `blueprints` (flat) | `blueprints` (nested JSONB) | Same table name, completely new columns: `year_theme`, `year_summary`, `quarters`, `months`, `weeks`, `push_periods`, `rest_periods`, etc. |
| `feedback` | dropped | Beta feedback was scaffolded but never used. Add back later if needed. |
| — | `tracker_metrics` | New |
| — | `daily_logs` | New |
| — | `journal_entries` | New |
| — | `cycle_entries` | New |
| — | `quarterly_reviews` | New |
| — | `ephemeris_cache` | New, per-user-per-year |

**RLS pattern:** Every table has `user_id` and a single policy `USING (user_id = (SELECT id FROM user_profiles WHERE clerk_user_id = current_setting('app.clerk_user_id', TRUE)))`. The server Supabase client (`lib/supabase/server.ts`) sets this setting per request from the Clerk session.

---

## 6. Ephemeris Strategy

**The package:** `astronomia` (pure JS port of Meeus's astronomical algorithms). Vercel-compatible, no native deps, no external API calls. Accurate to within arc-seconds for Sun and Moon; to within a few arc-minutes for planets via VSOP87.

**What astronomia gives us:**
- `moonphase` — exact timestamps of new / first-quarter / full / last-quarter moons for any year
- `solar` — Sun ecliptic longitude for any moment
- `planetposition` + VSOP87 tables — Mercury through Neptune, geocentric ecliptic coordinates
- `sidereal` — sidereal time for house cusp computation
- `base` + `coord` — coordinate system helpers

**What we build on top** (in `lib/ephemeris/`):
- **Natal chart computation** — given birth `{date, time, lat, lng, tz}`, compute sun/moon/rising + 8 other planets with sign and house (Placidus). Done once at onboarding, stored in `user_profiles.natal_chart`.
- **Transit calculator** — for each day of the target year, check all 10 planets against the natal chart for hard aspects (conjunction/opposition/square) within 0.5° and soft aspects (trine/sextile) within 1°. Returns the significant ones.
- **Retrograde detection** — compute planet longitude on day N vs day N-1 and flag sign reversals (accounting for 360° wrap).
- **Year ephemeris** — the full year as `EphemerisDay[]`, cached in `ephemeris_cache` per user per year.

**Known limitations:**
- **Pluto is not in VSOP87.** `astronomia` doesn't ship Pluto. For v1, either (a) drop Pluto from the natal chart or (b) hard-code Pluto's slow transit positions (~1 sign per 15–20 years) using a simple table. Recommend (a) for v1 — only the most astrologically literate users will notice.
- **Speed:** computing a full year of daily positions for 9 planets is ~3–5 seconds uncached. The per-user-per-year cache makes this a one-time cost.

**What Claude still does** (the part LLMs are good at):
- Synthesizes the raw ephemeris + natal chart + user goals into the narrative blueprint (year theme, quarter themes, weekly intentions, energy type assignments)
- Powers the Oracle chat using the same data as grounding
- Writes the quarterly review summary and the year-end letter

In short: math → Claude → prose. Today's system has Claude doing both the math and the prose. That's the core fix.

---

## 7. AI Plane

| Surface | Model | SDK | Streaming |
|---|---|---|---|
| Blueprint generation | `anthropic/claude-sonnet-4-6` | AI SDK v6 via Vercel AI Gateway | Accumulate JSON stream server-side, parse once |
| Oracle chat | `anthropic/claude-sonnet-4-6` | AI SDK v6 (`streamText` → `toUIMessageStreamResponse`) | Yes, via `useChat` on client |
| Quarterly review summary | `anthropic/claude-haiku-4-5` | AI SDK v6 (`generateText`) | No |
| Year-end letter | `anthropic/claude-sonnet-4-6` | AI SDK v6 (`streamText`) | Yes |

Why AI Gateway? Unified auth via Vercel OIDC (no hardcoded Anthropic key in prod), automatic observability, fallback routing if we want it later. Keep `ANTHROPIC_API_KEY` working locally for dev.

---

## 8. Revised Phase Plan

We're mid-flight. Call what's done "Phase 0 — Beta Shell" and renumber from here.

### Phase 0 — Beta Shell (done, partial carry-over)
✅ Next.js + Clerk + Supabase wired
✅ Auth shell, sign-in/up pages, dashboard placeholder
✅ First-pass onboarding UI (Step 1 kept, 2–5 rebuilt)
✅ Blueprint page shell (stripped and rebuilt in Phase 3)

### Phase 1 — Foundation Rebuild ✅ DONE
✅ `0001_product_bible_schema.sql` migration run on Supabase (`fslowrhswawatdfludqp`)
✅ `types/database.ts` generated from live schema
✅ `lib/supabase/{client,server,admin}.ts` — RLS-aware per-request client
✅ Clerk webhook at `app/api/webhooks/clerk/route.ts` — creates `user_profiles` on sign-up
✅ Clerk middleware rewritten with onboarding-redirect guard
✅ shadcn/ui component set installed

### Phase 2 — Onboarding Rebuild ✅ DONE
✅ `components/onboarding/OnboardingShell.tsx` — progress bar, back/next, sessionStorage
✅ Step 1 — Birth Data (unknown time checkbox, location autocomplete via `app/api/geocode`)
✅ Step 2 — Goals (DnD reorder, icon grid, color swatch, "success looks like" per category)
✅ Step 3 — Year Focus (vision, word of year, what to release)
✅ Step 4 — Cycle (optional toggle, sliders, last period date)
✅ Generating screen — polls `/api/blueprint/status` every 5s

### Phase 3 — Ephemeris + Blueprint Generation ✅ DONE
✅ `astronomia` + AI SDK v6 + `@ai-sdk/anthropic` + `@ai-sdk/gateway` installed
✅ `lib/ephemeris/pluto-table.ts` — birth-year Pluto longitude (1930–2030)
✅ `lib/ephemeris/astronomia-adapter.ts` — natal chart (10 planets, Whole Sign houses, Ascendant), moon phases, daily positions
✅ `lib/ephemeris/transit-calculator.ts` — year ephemeris, transit detection, retrograde periods
✅ `types/blueprint.ts` — all blueprint + ephemeris types
✅ `lib/ai/blueprint-system-prompt.ts` — prompt assembly from natal + ephemeris + goals
✅ `lib/ai/blueprint-generator.ts` — AI SDK `generateText`, parse JSON, write to `blueprints`; AI Gateway in prod, direct API key in dev
✅ `app/api/blueprint/generate/route.ts` — `after()` background generation, `maxDuration = 300`
✅ `app/api/profile/route.ts` — recomputes natal chart when birth data is saved
✅ `types/astronomia.d.ts` — ambient type declarations for the `astronomia` package

### Phase 4 — Dashboard + Cosmic Calendar
✅ `components/shared/MoonPhaseIcon.tsx` — Server Component; accepts `LunarPhase` (all 8 phases); two-layer SVG (dark base + masked lit circle); props: `phase`, `size` (default 20), `className`, `showLabel`
✅ `components/shared/TransitBadge.tsx` — planet glyph + aspect glyph + natal planet; hard vs soft colour coding; `size` prop (sm/md)
✅ `components/shared/CyclePhaseTag.tsx` — menstrual/follicular/ovulation/luteal; returns null if phase is null; graceful fallback for unknown values
✅ `components/dashboard/Sidebar.tsx` (Server Component) — fixed nav + dynamic per-category items in the user's sort order
✅ `app/(app)/layout.tsx` — rebuilt with sidebar layout (Sidebar + main content area)
✅ `components/dashboard/DashboardOverview.tsx` — today's cosmic weather + this week's blueprint + per-category cards; Server Component; handles no-blueprint state
✅ `components/blueprint/BlueprintView.tsx` + `QuarterSection.tsx` + `MonthSection.tsx` — renders the new blueprint JSONB
✅ `app/(app)/dashboard/page.tsx` — Server Component using DashboardOverview
✅ `app/(app)/blueprint/page.tsx` — Server Component using BlueprintView
✅ `components/calendar/CosmicCalendar.tsx` + year/month/week views — uses `ephemeris_cache`; `YearView`, `MonthView`, `WeekView` sub-components; `app/(app)/calendar/page.tsx` Server Component

### Phase 5 — Tracker + Oracle
- Tracker UI with dynamic metrics, consistency grid, per-category mini charts
- Oracle chat with the 4-layer system prompt (identity / natal chart / current cosmic context / goals + blueprint)
- `lib/ai/oracle-system-prompt.ts` — assembles fresh per request

### Phase 6 — Journal + Quarterly Reviews
- Journal editor with lunar/cycle auto-population, ritual flagging on new/full moons
- Quarterly review banner, stats snapshot, AI summary generation

### Phase 7 — Year Unwrapped + Polish
- 8-section Unwrapped with Recharts
- Year-end letter generation (`streamText`)
- OG share card (`@vercel/og`)
- Blueprint PDF export via print stylesheet
- Empty states, mobile, settings panels

### Phase 8 — Launch Prep
- Security audit (RLS two-user test, secrets scan, input validation)
- Rate limiting via Upstash Redis
- Stripe subscription OR waitlist (your call)
- Landing page, privacy, terms
- Vercel production deploy

---

## 9. Dependencies to Add (by phase)

- **Phase 1:** `svix` (webhook verification), full shadcn/ui set
- **Phase 2:** `@dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
- **Phase 3:** `astronomia`, `ai @ai-sdk/react @ai-sdk/gateway`
- **Phase 5:** `@ai-sdk/react` (already from Phase 3) — just wire `useChat`
- **Phase 7:** `recharts`, `@vercel/og`
- **Phase 8:** `@upstash/redis @upstash/ratelimit`, optionally `stripe @stripe/stripe-js`

---

## 10. Open Decisions (flag when touching them)

1. **`plan_year` semantics for rolling-entry users.** Updated: generate a full calendar-year blueprint for the selected `plan_year` (Jan 1 to Dec 31), even for users who join later in the year.
2. **Pluto.** ✅ **DECIDED: hard-code slow positions via birth-year lookup table.** Pluto is product-critical. Moves ~1 sign per 15–20 years so a lookup table by birth year is accurate enough. Build `lib/ephemeris/pluto-table.ts`.
3. **House system.** ✅ **DECIDED: Whole Sign as default.** Simpler to compute, no birth-time dependency (graceful for unknown-time users), increasingly standard in modern astrology. Placidus can be a post-beta settings option.
4. **Cycle data sensitivity.** Menstrual data is health data. Do we need anything beyond RLS (e.g. separate encryption at rest)? **Recommendation: RLS-only for v1, revisit before public launch.**
5. **Oracle rate limit.** PB suggests 20/day. Too low for power users, too high for spammers. **Recommendation: 20/day on free trial, higher on paid.**
6. **Landing page copy.** The v1 Kiaros landing copy (`kiaros-landing-page-copy-v1.md`) is more conservative than the product bible vision. Needs a rewrite that leans into the real astrological integration. Flag for later.

---

## 11. Immediate Next Session Plan — Phase 4 (continued)

**Status:** All Phase 4 items are done except the Cosmic Calendar. The dashboard, sidebar, blueprint view, and shared atoms are wired and type-check clean.

### What was built this session (2026-04-12)

| Component | Notes |
|---|---|
| `components/shared/TransitBadge.tsx` | Planet/aspect/natal-planet glyph pill. Hard aspects = destructive red; soft = accent blue. `size` prop (sm/md). |
| `components/shared/CyclePhaseTag.tsx` | Menstrual cycle phase pill (menstrual/follicular/ovulation/luteal). Returns `null` if phase is null. |
| `components/dashboard/Sidebar.tsx` | Async Server Component. Fixed nav + dynamic `goal_categories` in `sort_order`. `UserButton` at bottom. |
| `app/(app)/layout.tsx` | Rebuilt as sidebar layout (`flex` row: 224px Sidebar + `ml-56` main area). Old top-nav header removed. |
| `components/blueprint/MonthSection.tsx` | Month theme, energy arc, intentions, moon phase events with `MoonPhaseIcon`, key transits. |
| `components/blueprint/QuarterSection.tsx` | Quarter header (focus-area tags, cosmic highlights), push/rest period grids, 3 × MonthSection. |
| `components/blueprint/BlueprintView.tsx` | Year theme/summary, year-level push/rest overview, 4 × QuarterSection. |
| `components/dashboard/DashboardOverview.tsx` | Async Server Component. Parallel-fetches blueprint + ephemeris cache + categories. Today's cosmic weather, current week card, per-category cards. Handles no-blueprint state. |
| `app/(app)/dashboard/page.tsx` | Replaced placeholder with async Server Component using `DashboardOverview`. |
| `app/(app)/blueprint/page.tsx` | Replaced placeholder with async Server Component using `BlueprintView`. |

### One thing to know about the layout

The route group is still `(app)` — the architecture doc proposed renaming to `(dashboard)` but that's a non-breaking rename and wasn't done. If the next session renames it, update the middleware redirect guard too.

### What's left in Phase 4 — Cosmic Calendar

**Only one item remains:** `components/calendar/CosmicCalendar.tsx`

Build it in this order:

1. **`app/(app)/calendar/page.tsx`** — async Server Component. Fetches `ephemeris_cache` for the current year and the user's `user_profiles.plan_year`. Passes `YearEphemeris` as prop to `CosmicCalendar`.

2. **`components/calendar/CosmicCalendar.tsx`** — Client Component (needs state for active view/month/week). Receives `yearEphemeris: YearEphemeris` as a prop (pre-fetched server-side, no direct Supabase in client).

3. **Three nested views** — controlled by a `view: 'year' | 'month' | 'week'` state:
   - **Year view** — 12-month grid. Each month cell: month name + a row of moon phase dots (new/full only) with `MoonPhaseIcon size={12}`. Click → month view.
   - **Month view** — 4–5 week rows. Each day cell: day number + `MoonPhaseIcon` if it's a phase-event day + retrograde Rx badge if any planet stations that day. Click → week view.
   - **Week view** — 7 day columns. Each day: full moon phase icon + sign, Sun/Moon positions, `TransitBadge` for each transit, retrograde list, and the corresponding `WeekBlueprint` theme/intentions in a side panel.

4. **Data shape to pass down** — `CosmicCalendar` only needs `YearEphemeris` (from `ephemeris_cache.data`) plus the `weeks: WeekBlueprint[]` from the blueprint. Pass both as props from the page.

5. **Key `YearEphemeris` fields used:**
   - `days: EphemerisDay[]` — indexed by date; the calendar reads `moon.lunarPhase`, `moon.sign`, `sun.sign`, `transits[]`, `retrogrades[]`, `moonPhaseEvent?`
   - `moonPhases: MoonPhaseEvent[]` — the 4 exact phase events per month (new/first-quarter/full/last-quarter)
   - `retrogradePeriods: RetrogradePeriod[]` — used to shade retrograde date ranges

**Done when:** Phase 4 complete condition — a logged-in user can see their week's theme and intentions, navigate the calendar to a full moon and see its sign, and read their quarterly intention — all referencing their actual natal chart and real transits.

### Data access reminder (Phase 4 pattern)

- All Supabase reads go through `createServerSupabase()` in async Server Components.
- Client Components receive pre-fetched props only — no direct Supabase in client code.
- `ephemeris_cache` is the source for all calendar data — do not recompute in render.

---

**Last updated:** 2026-04-13 — Phase 4 complete. All dashboard, blueprint, and calendar components done. Phase 5 (Tracker + Oracle) is next.
**Status:** Adopted — supersedes all `kiaros-*-v1.md` docs
