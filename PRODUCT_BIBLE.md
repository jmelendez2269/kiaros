# PRODUCT_BIBLE.md — Kairos

> Source of truth for product vision, shipped features, AI architecture, and design. Updated 2026-06-02 from live code audit.
>
> **Rule:** What's in this file reflects what's in `app/`, `lib/`, `components/`, and `supabase/migrations/`. If the code disagrees with this doc, the code wins — update this doc.

---

## 1. What Kairos Is

Kairos is a personalized yearly planning system built around three inputs that most planners ignore:

- **Your birth chart** — a snapshot of the sky at your moment of birth, which shapes timing windows and life area themes throughout your year.
- **Your goals** — in your own words, tied to areas of life you actually care about.
- **The live sky** — what the planets are actually doing this week, this month, this year.

These three inputs are woven together by Claude into a week-by-week blueprint. That blueprint then feeds every surface in the app: the calendar, the tracker, the Oracle conversation, the journal insights, and the quarterly reviews.

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

**Models used:** Claude Sonnet 4.6 via Anthropic AI SDK (direct, not Vercel AI Gateway — see commit `e202cf6`).

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

**Insights surface** (`/journal/insights`): patterns are detected across journal history on five axes — lunar phase, lunar sign, transit aspects, retrogrades. Each pattern has a confidence score and links back to the supporting entries. An AI synthesis layer (Claude Haiku 4.5) runs on top of the SQL pattern summary and can be regenerated. The synthesis voice is user-configurable (three presets + custom prompt, stored in `user_settings.journal_insight_voice`).

---

### 3.4 Cosmic Calendar

**Route:** `/year` (year/month/week/review switcher)

Four views driven by a shared ephemeris dataset:

| View | What it shows |
|------|---------------|
| **Year** | Full-year grid of push/rest periods, planetary stations, moon phases |
| **Month** | Calendar grid with moon glyphs, journal entries, month brief, intentions, key transits, Sabian symbols, curriculum sessions |
| **Week** | Detailed week with blueprint week content, transits, Daily Tracker ribbon |
| **Review** | Quarterly review builder (see §3.7) |

---

### 3.5 Daily Tracker

**Route:** `/tracker` → `TrackerView` component

Users define metric categories tied to their goal areas. Each day they log values per metric. The tracker surface shows:

- **90-day consistency grid** — one cell per day per metric, color-coded by value
- **14-day per-category bars** — recent trend per goal area
- **Lunar phase stamp** — every log is stored with the moon's phase and sign at log time

Metric definitions live in `tracker_metrics`. Daily logs in `daily_logs`.

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
| Today's Intention | AI-generated one-liner from blueprint week + transits |
| Week Ribbon | Current week in the year arc (push/rest coloring) |
| Curriculum | Today's scheduled session (if curriculum is active) |
| Journal Streak | Consecutive days with journal entries |

---

### 3.7 Quarterly Reviews

**Route:** `/year` (review mode tab)

Users fill in wins, challenges, and pivots for the quarter. Kairos then:

1. Pulls activity stats (journal entries, tracker consistency, oracle captures, curriculum sessions)
2. Shows deltas vs. the prior quarter
3. Generates an AI summary via `quarterly-review-generator.ts` (streaming)

Reviews are stored in `quarterly_reviews`. The AI runs on Claude via the Anthropic SDK.

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

All AI calls use the Anthropic SDK directly (`@ai-sdk/anthropic`). The Vercel AI Gateway is **not used** (removed in commit `e202cf6`).

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
| Moon phase + sign + cycle phase | Journal stamps, tracker logs, today dashboard |
| Retrograde periods | Blueprint push/rest arc, insights |
| Transit aspects to natal | Today dashboard, Oracle memory, journal context |
| Sabian symbols (Sun degree) | Month view |

**House system:** Whole Sign (default, per user preference).

**Pluto:** computed via `astronomia.pluto` (JDE-based), validated against Michelsen Book of Tables 2026-05-10.

**Ephemeris cache:** computed once per user per year and stored in the DB. Refreshed if birth data changes.

---

## 6. Database Schema (as of migration 0025)

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
| `daily_logs` | Daily tracker entries |
| `tracker_metrics` | Metric definitions per user |
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
| **Year Unwrapped** | Not started. Q4 year-end retrospective: 8-section recap + Recharts visualizations + AI year-end letter. See `docs/architecture-v2.md` Phase 7. |
| **Areas → Oracle wiring** | `area_goals` exists but is not pulled into Oracle's system prompt or quarterly review stats. |
| **Areas → Quarterly Review stats** | Area goal progress not yet surfaced in QR activity stats. |
| **Gene Keys deepening** | HD math layer validated; IQ/EQ/SQ/Core/Culture/Vocation paths not implemented. |
| **Cycle step (onboarding)** | `/onboarding/cycle` page exists but cycle data is not used downstream in any AI prompt or tracker context. |

---

## 8. Definition of Done

A feature is done when:
1. It works end-to-end in the browser on the golden path and one edge case
2. Types compile with no `any`-shaped cheats
3. Error paths are handled (user-visible message, not a console trace)
4. RLS holds (tested with a second user if it touches user data)
5. No TODOs about "real implementation" — if it's mocked, it's flagged in session notes
