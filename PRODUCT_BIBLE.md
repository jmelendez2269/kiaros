# PRODUCT_BIBLE.md — Kairos

> Source of truth for product vision, shipped features, AI architecture, and design. Updated 2026-06-02 from live code audit.
>
> **Targeted update 2026-11-10:** the Journal insights, Daily check-in, Today, Look backs / Reflections / Insights (§3.16), schema and "not yet built" sections were re-audited against the code. Every other section still dates from 2026-06-02 and has not been re-checked.
>
> **Rule:** What's in this file reflects what's in `app/`, `lib/`, `components/`, and `supabase/migrations/`. If the code disagrees with this doc, the code wins — update this doc.

---

## 1. What Kairos Is

Kairos is a personalized yearly planning system built around three inputs that most planners ignore:

- **Your birth chart** — a snapshot of the sky at your moment of birth, which shapes timing windows and life area themes throughout your year.
- **Your goals** — in your own words, tied to areas of life you actually care about.
- **The live sky** — what the planets are actually doing this week, this month, this year.

These three inputs are woven together by Claude into a week-by-week blueprint. That blueprint then feeds every surface in the app: the calendar, the Today dashboard, the Oracle conversation, the journal insights, and the look backs and reviews.

**It is not a generic productivity system.** It does not assume every week should look the same, that progress is linear, or that rest is a failure. It works with cycles — astronomical, personal, seasonal.

**It is not a gimmicky astrology app.** It does not reduce you to a sun sign or recycle zodiac fortune-cookie copy. It uses real ephemeris calculations and grounds every output in your specific chart, not a generic archetype.

---

## 2. Brand

| Constant | Value |
|----------|-------|
| Product name | **Kairos** |
| Tagline | Your year, anchored to the sky. |
| AI guide name | **Stelloquy** |
| Pronunciation | steh-LOH-kwee |
| Internal code name | Kiaros (repo, DB tables, routes — do not rename) |

### Voice

Warm, grounded, mystical-but-practical. Anti-hustle. Rest is strategy.

**Never write:**
- "where you think you should be" / "what it actually is vs. what you wish it were" (implies self-deception)
- "optimize / level up / grind" — anything hustle-adjacent
- Generic astrology copy that could apply to anyone

**Always write:**
- Specific references to the user's actual chart, actual transits, actual goals
- Spacious prose that meets the user where they are right now

---

## 3. Shipped Features (production, as of 2026-06-02)

### 3.1 Blueprint Generation

**Route:** `POST /api/blueprint/generate` → `lib/ai/blueprint-generator.ts`

The user's natal chart + year ephemeris + goals are assembled into a ~600-line structured prompt and sent to Claude. The output is a 52-week plan organized across 4 quarters and 12 months, each with:

- Themes, intentions, energy type (push / rest / reflect)
- Cosmic context (key transits, lunar phase arc)
- Push/rest arc periods (cached in `blueprints.push_rest_arc`)

Generation runs asynchronously via Next.js `after()` (5-minute max). The UI polls `/api/blueprint/status` until `status = ready`.

**Models used:** Claude Sonnet 4.6 via the Vercel AI SDK's Anthropic provider (`@ai-sdk/anthropic`), calling Anthropic directly and not through the Vercel AI Gateway — see commit `e202cf6`.

---

### 3.2 Stelloquy — the Oracle

**Route:** `POST /api/oracle/chat` → `lib/ai/oracle-system-prompt.ts`

Stelloquy is a streaming conversational AI assembled from two prompt-caching segments
(`lib/ai/oracle-system-prompt.ts`, `buildOracleSystemPromptSegments`):

- **Cached segment** (Anthropic ephemeral cache) — persona, chosen interpretive tradition, natal chart +
  aspects, Human Design bodygraph, and Goals + Blueprint (current week/quarter theme). Expensive to
  assemble, rarely changes within a conversation.
- **Dynamic segment** (uncached, rebuilt per request) — today's live transits/moon phase, plus a "Produced
  Context" block: goal categories, itemized `area_goals`, curriculum plans/sessions, daily tracker logs,
  journal entries, Oracle captures flagged for planning, pattern insights, and quarterly reviews.

Cache hit rate is shown in Settings.

**Monthly message limits** are enforced via the `ai_usage` table. Oracle access is gated by `product_entitlements` (active planner + oracle subscription, or Etsy activation code).

**Captures:** users can save any oracle response to `oracle_captures`. Topics are auto-extracted by a separate Claude call (`capture-topic-extractor.ts`) and stored in `capture_topics`. Captures feed back into the Oracle's memory layer and into the Insights surface.

**Capture network:** `/insights/map` renders a network graph where nodes = unique topics/tags (themes, natal aspects, transit aspects, Human Design elements, moods), sized by frequency, and edges connect topics that co-occurred within the same saved capture — it's a map of recurring topics, not a graph of individual captures.

---

### 3.3 Journal

**Route:** `POST /api/journal` → `lib/journal/intelligence.ts`

Every journal entry is automatically enriched at save time:

- **Lunar context** — moon phase, lunar sign, cycle phase (waxing/waning/etc.)
- **Transit context** — which planets are making aspects to the natal chart right now
- **Aspect patterns** — stored in `journal_entry_aspects` for long-term pattern analysis

The Journal composer also lets users tag captures for Stelloquy memory and flag entries as part of a ritual or intention.

**Patterns** (`/insights/map`, or `/journal/patterns` when `NEXT_PUBLIC_IA_JOURNAL` is on): patterns are detected across journal history on four axes — lunar phase, lunar sign, transit aspects, retrogrades. The database computes them only from entries the member includes in Insights. Each pattern links back to the supporting entries and lists the months those entries fall in, each opening that month in Reviews. An AI synthesis layer (Claude Haiku 4.5) runs on top of the SQL pattern summary and can be regenerated. The synthesis voice is user-configurable (three presets + custom prompt, stored in `user_settings.journal_insight_voice`).

Patterns needs Stelloquy access. Members without it see a preview: the top three skies their own journal keeps returning to, with entry counts and the date last seen; the readings and entries stay locked.

**Under each moon** (same page): once a member has at least eight daily check-ins (§3.5), this shows how their energy and mood have sat under each moon phase against their own usual. A phase needs four check-ins of its own and must stand clearly apart. Computed at page load in `lib/insights/check-in-rhythms.ts`; no AI.

---

### 3.4 Cosmic Calendar

**Route:** `/year` (year/month/week/review switcher)

Four views driven by a shared ephemeris dataset:

| View | What it shows |
|------|---------------|
| **Year** | Full-year grid of push/rest periods, planetary stations, moon phases |
| **Month** | Calendar grid with moon glyphs, journal entries, month brief, intentions, key transits, Sabian symbols, curriculum sessions |
| **Week** | Detailed week with blueprint week content and transits |
| **Review** | Quarterly review builder (see §3.7) |

---

### 3.5 Daily Check-in

**Where:** a card on `/today`, "How today is sitting" → `components/today/TodayCheckIn.tsx`, `lib/today/check-in.ts`

One energy level (Resting, Low, Even, Lifted, Full; stored 1 to 5) and one mood word from a short list (`lib/today/check-in-options.ts`). It saves on tap, and tapping the chosen one again clears it. One row per member per day in `daily_logs`, in the member's planner timezone, stamped with the moon phase and sign it was made under, using the same labels journal entries carry.

It is optional and never scored. Reflections, month and quarter look backs, and Stelloquy's context all read it. It also feeds "Under each moon" on Patterns (§3.3).

**The earlier Daily Tracker is not in the app.** As of 2026-11-10 there is no `/tracker` route or `TrackerView` component, nothing reads or writes `tracker_metrics`, and `daily_logs` had no rows in production before the check-in shipped. The 90-day grid and per-metric logging described in earlier versions of this document do not exist in the code.

---

### 3.6 Today Dashboard

**Route:** `/today`

A single-page daily summary pulling live data:

| Card | Source |
|------|--------|
| Shape of Today | Lunar cycle classification (new moon, full moon, waning, etc.) |
| Sky Now | Current planet positions overlaid on natal chart |
| Active Transits | Planets making aspects to natal points today |
| Season Read | 3-month AI synthesis (generated via `season-synthesis.ts`, cached in `season_read` table) |
| Today's Intention | One line taken from the Blueprint (the week's intentions, rotated by weekday; falls back to month, quarter, year). Not written by the member |
| How today is sitting | Daily check-in: energy and mood (§3.5) |
| Last week | Monday to Wednesday: a pointer to the week's reflection, with its first sentence once prepared (§3.16) |
| Month / quarter look back | For seven days after a month or quarter ends (§3.16) |
| Week Ribbon | Current week in the year arc (push/rest coloring) |
| Curriculum | Today's scheduled session (if curriculum is active) |
| Journal Streak | Consecutive days with journal entries |

---

### 3.7 Quarterly Reviews

**Route:** `/year` (review mode tab)

Users fill in wins, challenges, and pivots for the quarter. Kairos then:

1. Pulls activity stats (journal entries, daily check-ins, oracle captures, curriculum sessions)
2. Shows deltas vs. the prior quarter
3. Generates an AI summary via `quarterly-review-generator.ts` (streaming)

Reviews are stored in `quarterly_reviews`. The AI runs on Claude via the Vercel AI SDK's Anthropic provider.

---

### 3.8 Areas + Goals

**Routes:** `/areas`, `/areas/[slug]`

Life areas are pre-defined (career, relationships, health, creativity, finances, spirituality, etc.) and each is mapped to a natal house. The Areas list shows:

- Natal house placement + house interpretation
- Upcoming timing windows (transits to that house's ruler)
- Year narrative for the area
- Goals panel (`area_goals` table, migration 0020)

Area detail pages (`/areas/[slug]`) show:
- Hero section with current transit window
- Full year narrative
- Chart anchors (natal placements relevant to this area)
- Upcoming windows
- Itemized goals with status

**Areas are not yet wired into Oracle's system prompt or quarterly review stats** — that's the next integration milestone.

---

### 3.9 Curriculum

**Routes:** `/curriculum`, `/curriculum/[id]`, `/curriculum/[id]/w/[week]/s/[session]`

Users can generate a week-by-week study plan for any topic. Generation inputs: topic, intensity (light/moderate/intensive), duration in weeks. Output: a structured curriculum with sessions per week, each session having objectives, content, estimated time, and resources.

Curriculum feeds into:
- Today dashboard (shows today's session)
- Month view calendar
- Oracle context (blueprint includes curriculum arc)

Sessions are tracked via `curriculum_session_progress`. Generation uses `curriculum-generator.ts` and `curriculum-session-generator.ts`.

---

### 3.10 Human Design

**Route:** `/human-design` → `HumanDesignView`

Requires a birth time within ~16 minutes of accuracy. Computes:
- Type (Manifestor, Generator, MG, Projector, Reflector)
- Strategy
- Authority
- Profile
- Bodygraph channels

Displayed as a bodygraph chart. HD is **framed as a tool, not an authority** — the interface admits uncertainty, especially on profile/gates where birth time precision matters.

**Gene Keys** (IQ, EQ, SQ, Core, Culture, Vocation paths) are partially computed but not yet surfaced — incomplete.

Human Design feeds into the blueprint system prompt (`humanDesignToText`, per-Type weekly framing in `blueprint-system-prompt.ts`).

---

### 3.11 Month Briefs

**Route:** Generated via `POST /api/month-brief` → `month-brief-generator.ts`

A generated summary for each calendar month, anchored to:
- Blueprint month content
- Actual transits that month
- Moon phase arc

Briefs are editable after generation. They appear in month view and are stored in `month_briefs`.

---

### 3.12 Blueprint Page

**Route:** `/blueprint`

A full read-view of the user's active blueprint: all 4 quarters, 12 months, and 52 weeks expanded. Shows themes, intentions, energy types, and cosmic context per period. Not editable — the blueprint is regenerated as a new version, never patched in place.

---

### 3.13 Settings

**Route:** `/settings`

- Edit profile: display name, birth data, timezone, plan year, year vision, release theme, study focus
- Theme picker: appearance customization
- Oracle usage: monthly message count + prompt cache hit rate
- Billing portal link (Stripe)

---

### 3.14 Commerce

| Surface | What it does |
|---------|-------------|
| `/pricing` | Public pricing page |
| `/activate` | Etsy activation code claim (planner + oracle access) |
| `POST /api/commerce/checkout` | Stripe checkout session |
| `POST /api/commerce/portal` | Stripe customer portal |
| Stripe webhook | Handles checkout + invoice events, writes `product_entitlements` |
| Etsy webhook | Ingests marketplace orders, maps to entitlement tiers |

Entitlement tiers live in `lib/commerce/config.ts`. Access is resolved at runtime via `lib/commerce/entitlements.ts`.

---

### 3.15 Onboarding

Six-step flow:

1. **Name + birth data** — date, time, city (geocoded via Nominatim for lat/lng + timezone)
2. **Goals** — choose goal categories with icon + color
3. **Year focus** — year vision statement + release theme
4. **Study focus** — what the curriculum should be grounded in
5. **Theme** — UI appearance
6. **Blueprint generation** — polling page with feature carousel

---

### 3.16 Look backs, Reflections and Insights

Three connected surfaces under **Insights** in the sidebar. Audited 2026-11-10.

**Insights home** (`/insights` → `lib/insights/load-home.ts`). Three cards: the latest look backs (last week and last month, each with its first sentence once prepared); *Overhead today*, the skies in the air today that the member has journaled under at least twice; and, for members with Stelloquy, the *Brightest star*, the theme in the most saved conversations. No AI calls.

**Two look-back engines.**

| | Look backs (`lib/period-review/`) | Reflections (`lib/reflections/`) |
|---|---|---|
| Periods | Month, quarter, and sky cycles | Week, month, quarter, year (Yearly Unwrapped) |
| Opens from | Reviews timeline, Today card, modal | `/reflections` (or `/journal/look-back`), Reviews week pills, Today "Last week" card |
| Written | On request | Each morning by cron for members with automatic preparation on, including missed periods; or on request |
| Storage | `period_reviews`, `sky_cycle_reviews` | `reflection_reports` and related tables |

- **Every reflection reads the sky.** `lib/reflections/sky-reading.ts` calls the look back engine for the same period and saves the result inside the report's `analysis`. A period with nothing recorded shows that reading instead of a blank state; one with records shows it as its own section. The prompt for a quiet period never mentions or explains that nothing was written (`lib/ai/reflection-sky-prompt.ts`).
- **What counts as lived** is one rule, `isLived` in `lib/reflections/report-schema.ts`: journal entries, the member's own saved Stelloquy words, check-ins with something recorded, finished plan items, learning sessions marked done, intentions with an outcome noted, and their quarterly check-in. A period with any of these gets a written reflection. Finished plans are read as traces of where time went, never counted or scored.
- **Returning threads.** A look back is told which skies overhead in its period the member has already journaled under (four or more entries) and which themes in the period's saved conversations have come up before (`lib/period-review/returning-threads.ts`). Only names, counts and dates go to the model, never the readings or entry text. They show under the look back as "Threads you've met before", linking to Patterns and the Mind map.
- **Yearly Unwrapped** is the yearly reflection: a five-frame story, then the full report, with a downloadable share card (`components/reflections/UnwrappedStory.tsx`).
- **Unwrapped, so far.** The year under way can be unwrapped at any time by a paying member, from their first day (`isOpenYear` / `livedSoFar` in `lib/reflections/periods.ts`). It reads January 1 to today. With nothing recorded it is told from the sky reading alone, as a short story that ends on what the member can add (`buildSkyStoryFrames` in `lib/reflections/story.ts`); once anything is recorded it goes stale and a refresh writes it from their own records. The row keeps the whole year's dates and carries `analysis.through`; after the year ends it is written once more, whole. It is prepared on request only, never by the morning cron while the year is open. Every other period still waits until it has ended. Needs migration `0057`.

**Reviews** (`/reviews` → `components/reviews/ReviewsTimeline.tsx`). The whole year on one line, in a Year view and a List view: months, quarters, the weeks under each month, the sky's cycles, and Unwrapped at the end. `?year=&month=` opens on a month. Requires `NEXT_PUBLIC_KIAROS_PERIOD_REVIEW`; otherwise it redirects to Reflections.

**Mind map** (`/insights/mind-map` → `components/insights/StarChart.tsx`). Topics extracted from saved Stelloquy conversations, drawn as a star chart. Selecting a star shows the months it was brightest in and up to three of the conversations behind it. Needs Stelloquy access.

**Quarterly check-in** (§3.7) is separate: the member writes it themselves.

---

## 4. AI Architecture

### Models

| Feature | Model | Why |
|---------|-------|-----|
| Blueprint generation | Claude Sonnet 4.6 | Large structured JSON output; needs high quality |
| Oracle / Stelloquy | Claude Sonnet 4.6 | Conversational; prompt caching active |
| Journal insights | Claude Haiku 4.5 | Fast synthesis on top of SQL patterns; lower cost |
| Month briefs | Claude (Sonnet) | Medium complexity generation |
| Quarterly review | Claude (Sonnet) | Structured narrative generation |
| Curriculum | Claude (Sonnet) | Structured plan + sessions |
| Capture topics | Claude (Haiku) | Simple extraction task |
| Season read | Claude (Sonnet) | 3-month narrative synthesis |

All AI calls go through the Vercel AI SDK (`ai`) with its Anthropic provider (`@ai-sdk/anthropic`), which calls Anthropic directly. Anthropic's own SDK (`@anthropic-ai/sdk`) is installed but nothing imports it. The Vercel AI Gateway is **not used** (removed in commit `e202cf6`), with one exception: the admin card generator (`lib/admin/card-generator.ts`) uses it when running on Vercel. Checked 2026-11-10.

### Prompt architecture

System prompts are assembled fresh per request in `lib/ai/*-system-prompt.ts`. Never hardcode prompt text in route handlers.

Oracle prompt caching: the natal chart + blueprint layers are cached (they change rarely). The journal memory layer is not cached (rotates per session).

### Data the AI knows

Claude knows what we explicitly feed it:
- Natal chart (planets, houses, aspects)
- Year ephemeris (daily planet positions, moon phases, transit aspects for the plan year)
- User goals (goal_categories + area_goals)
- Blueprint content (the generated plan)
- Recent oracle captures + journal insights (memory layer)
- Human Design chart (where available)

**Claude does not have inherent ephemeris knowledge.** All astronomical data is computed by the `astronomia` library and passed in context.

---

## 5. Ephemeris Engine

**Library:** `astronomia` (JS, JDE-based)

**What it computes:**

| Output | Used by |
|--------|---------|
| Natal chart (planets, houses, aspects) | Blueprint, Oracle, HD, all AI prompts |
| Year ephemeris (daily positions) | Calendar, month briefs, transit cards |
| Moon phase + sign + cycle phase | Journal stamps, daily check-ins, today dashboard |
| Retrograde periods | Blueprint push/rest arc, insights |
| Transit aspects to natal | Today dashboard, Oracle memory, journal context |
| Sabian symbols (Sun degree) | Month view |

**House system:** Whole Sign (default, per user preference).

**Pluto:** computed via `astronomia.pluto` (JDE-based), validated against Michelsen Book of Tables 2026-05-10.

**Ephemeris cache:** computed once per user per year and stored in the DB. Refreshed if birth data changes.

---

## 6. Database Schema

The table below dates from migration 0025, with reflection and look-back tables added on 2026-11-10. Migration files now run to `0056`; tables added between 0026 and 0046 (commerce, plan items, funnel events, artifacts and others) are not listed here.

| Table | Purpose |
|-------|---------|
| `user_profiles` | Birth data, natal chart, Human Design, preferences, entitlement state |
| `blueprints` | Full year plans (status: generating / ready / error) |
| `goal_categories` | User-defined goal areas with icon, color |
| `area_goals` | Goals tied to specific life areas (migration 0020) |
| `journal_entries` | Entry text + oracle memory flag |
| `journal_entry_sky` | Lunar phase, lunar sign, transits at entry time |
| `journal_entry_aspects` | Transit aspects active when entry was written |
| `user_pattern_insights` | Detected patterns (lunar, aspect, retrograde) with confidence + AI summaries |
| `oracle_captures` | Saved conversation snippets (5000 char limit) |
| `capture_topics` | Tags for oracle captures |
| `daily_logs` | Daily check-ins: energy, mood, moon phase and sign. One row per member per day |
| `tracker_metrics` | Unused. Left from the earlier Daily Tracker; no code reads or writes it |
| `reflection_reports` | Weekly, monthly, quarterly and yearly reflections, with their sky reading inside `analysis` (migrations 0047, 0055) |
| `reflection_preferences` | Timezone, automatic preparation, goal context, and the revision that marks reports out of date |
| `reflection_feedback`, `reflection_intentions` | Corrections to a reflection's observations; intentions carried forward and their outcomes |
| `period_reviews` | Month and quarter look backs (migration 0052) |
| `sky_cycle_reviews` | Look backs for a single sky cycle (migration 0053) |
| `curriculum_plans` | Generated study plans |
| `curriculum_session_content` | Session details (objectives, resources) |
| `curriculum_session_progress` | Completion state per user per session |
| `month_briefs` | Generated + editable month summaries |
| `quarterly_reviews` | User-filled reviews + AI summaries |
| `season_read` | 3-month AI synthesis (cached) |
| `ai_usage` | Monthly Oracle message count + cache tracking |
| `product_entitlements` | Purchase access (source, dates, plan tier) |
| `marketplace_orders` | Etsy orders |
| `direct_purchase_orders` | Direct Stripe purchases |
| `human_design` | (stored in `user_profiles.human_design` JSONB column) |

---

## 7. What Is Not Yet Built

| Gap | Status |
|-----|--------|
| **Year Unwrapped charts** | Yearly Unwrapped is built as the yearly reflection (§3.16): a five-frame story, the full report, and a share card. The Recharts visualizations described in `docs/architecture-v2.md` Phase 7 are not built. |
| **Stelloquy themes by transit** | Not built. Too few members have saved conversations for it to say anything honest yet. |
| **Consent for check-ins and plans** | Journal entries and saved conversations have a per-item "include" switch. Check-ins, plan items and learning sessions do not; reflections read them all. |
| **Opened vs prepared** | A week or year counts as "read" on Reviews once its reflection exists. Nothing records whether the member opened it. |
| **Areas → Oracle wiring** | `area_goals` exists but is not pulled into Oracle's system prompt or quarterly review stats. |
| **Areas → Quarterly Review stats** | Area goal progress not yet surfaced in QR activity stats. |
| **Gene Keys deepening** | HD math layer validated; IQ/EQ/SQ/Core/Culture/Vocation paths not implemented. |
| **Cycle step (onboarding)** | `/onboarding/cycle` page exists but cycle data is not used downstream in any AI prompt. |

---

## 8. Definition of Done

A feature is done when:
1. It works end-to-end in the browser on the golden path and one edge case
2. Types compile with no `any`-shaped cheats
3. Error paths are handled (user-visible message, not a console trace)
4. RLS holds (tested with a second user if it touches user data)
5. No TODOs about "real implementation" — if it's mocked, it's flagged in session notes


### Implementation note — Reflections and Yearly Unwrapped

Reflections, Yearly Unwrapped, evidence-backed synthesis, corrections and intention follow-up, scheduling, and relevance-based journal recall are deployed (see §3.16). As of 2026-11-10 the production database holds reflection reports for weeks, months and quarters, and the `period_reviews` and `sky_cycle_reviews` tables exist. The original note here, dated 2026-09-14, described them as local only. See [the implementation and verification record](docs/planning/reflections-memory-unwrapped-plan.md) for scope, tests, limits and activation steps. Goals remain a small optional passage.
