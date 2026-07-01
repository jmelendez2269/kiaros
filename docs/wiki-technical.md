# Kiaros — Technical Wiki (Internal Only)

> Not for public/user-facing use. Written from a live code read on 2026-07-01 (schema at migration 0025+,
> branch `main`). Verifies/corrects claims in `PRODUCT_BIBLE.md` and `CLAUDE.md` where they've drifted.
> Companion doc: [wiki-end-user.md](./wiki-end-user.md).

---

## 1. Stack Recap

Next.js 15 (App Router) · TypeScript · Tailwind · Clerk (auth) · Supabase/Postgres+RLS (data) · Anthropic
SDK direct via Vercel AI SDK (`generateText`/`streamText`, no AI Gateway) · `astronomia` (ephemeris) ·
shadcn/ui · Recharts (Phase 7, not yet used) · `@dnd-kit/sortable` (Phase 2, not yet used).

Route groups: `(onboarding)`, `(auth)`, `(app)`, `(admin)`, plus ungrouped public routes (`/`, `/pricing`,
`/contact`, `/privacy`, `/terms`, `/activate`, `/purchase`).

---

## 2. ⚠️ Urgent / Time-Sensitive Findings

### 2.1 Ascendant calculation bug — fixed in working tree, not yet applied to existing data

`lib/ephemeris/astronomia-adapter.ts` (currently **uncommitted**) fixes a real bug: both
`computePlacidusCusps` and `computeNatalChart` were computing the **Descendant** where the **Ascendant** was
expected (an `atan2(...)` off by 180°). The fix adds `+ 180`; comments in the diff cite verification against
a reference chart (MC exact, ASC previously 180° off) and against astro-charts.com (all 12 Placidus cusps
now within 0.01°). A second, related fix corrects the Placidus "below horizon" semi-arc formula.

**Blast radius:** every existing user's stored `natal_chart` (rising sign, ascendant longitude, and any
non-whole-sign house cusps) is wrong until recomputed. Blueprints already generated have the wrong Ascendant
baked permanently into their `astrological_context` — there's no backfill path for blueprint *content*
itself, only the profile's cached chart.

**Two new untracked scripts exist to address this:**
- `scripts/recompute-all-charts.ts` — unconditional recompute of `natal_chart` for every profile with birth
  data. This is the actual fix for the Ascendant bug. Dry-run by default; needs `--apply`.
- `scripts/backfill-house-cusps.ts` — narrower, addresses a separate earlier issue (migration 0026 defaulted
  `house_system` to `'porphyry'` on existing rows without recomputing charts). Only touches rows where
  `house_system` is set and mismatched. Also dry-run by default.

**Open questions for the founder (unresolved as of this writing):**
1. Has `recompute-all-charts.ts --apply` been run against production yet?
2. Is `backfill-house-cusps.ts` now redundant given `recompute-all-charts.ts` is unconditional and broader —
   should it just be deleted, or is there a reason to run both in a specific order?
3. `ephemeris_cache` (which embeds natal-chart-derived transit/house placements) is not touched by either
   script — does it need separate invalidation?

### 2.2 Default house system silently changed: Whole Sign → Placidus

Same uncommitted diff changes the default house system everywhere it's referenced:
`computeNatalChart`'s default param, `blueprint-generator.ts`'s null-fallback, and `app/api/profile/route.ts`
PATCH's null-fallback (previously `"porphyry"`, now `"placidus"`). This directly contradicts
`CLAUDE.md`'s "Phase 3 Ephemeris Decisions" memory entry, which documents Whole Sign as the validated
default (2026-05-10). **This reads like a change that rode in alongside the Ascendant fix rather than a
deliberate product decision — confirm with the founder before treating it as final, and update CLAUDE.md
either way.**

### 2.3 Quarterly Reviews Q2 polish — RESOLVED, contrary to initial concern

`feature/warm-almanac-year` (the branch containing the streaming-reflection + stats-delta work from
`docs/handoff-2026-05-19-quarterly-reviews-polish.md`) **is merged into `main`** via merge commit `353387c`,
and local `main` matches `origin/main`. The Q2 review polish is live in production. (CLAUDE.md's gap note
about "Quarterly Reviews Q2 polish" should be re-verified against the actual UI/user experience, not just
assumed outstanding — the code is there.)

### 2.4 CLAUDE.md gap claim is stale: `area_goals` IS wired into the Oracle prompt

`app/api/oracle/chat/route.ts` (lines ~98-103, 169-186) queries `area_goals` directly, and
`buildLayer5()` in `lib/ai/oracle-system-prompt.ts` (lines ~527-538) renders itemized area goals into the
system prompt. This half of the CLAUDE.md gap ("Areas → Oracle wiring") is done. The other half — `area_goals`
feeding **Quarterly Review activity stats** — is confirmed still **not** done (see §9.3).

---

## 3. Ephemeris & Natal Chart

**Files:** `lib/ephemeris/astronomia-adapter.ts`, `lib/ephemeris/index.ts` (year ephemeris + transit calc),
`lib/astrology/**`.

**Core pipeline:** birth date/time/location → `astronomia`-based planetary longitude calc → house cusp calc
(Whole Sign / Porphyry / Placidus, user-selectable) → aspect calc → cached on `user_profiles.natal_chart`
(JSONB). Year-long transit data is precomputed once per user per plan year and cached in `ephemeris_cache`
(a `YearEphemeris` blob, one row per day of the year) — most features read from this cache rather than
recomputing ephemeris on every request.

No dedicated test suite for cusp math was found — verification is manual (code comments referencing one
reference chart + astro-charts.com cross-check). Regression risk on future ephemeris changes is real; worth
flagging for anyone touching `astronomia-adapter.ts`.

---

## 4. Blueprint Generation

**Files:** `app/api/blueprint/generate/route.ts`, `lib/ai/blueprint-generator.ts`,
`lib/ai/blueprint-system-prompt.ts`, `app/(app)/blueprint/**`.

**Pipeline:**
1. `POST /api/blueprint/generate` — looks up profile, computes `version = MAX(version)+1` per
   user+plan_year (confirmed matches CLAUDE.md convention), inserts a `status: 'generating'` row.
2. Fires `after(() => runBlueprintGeneration(...))` — work continues after the HTTP response returns
   (`maxDuration = 300` on the route).
3. `runBlueprintGeneration`: loads profile + goals + journal patterns + Oracle planner-flagged captures →
   loads/computes natal chart → loads/computes Human Design (skipped if birth time unknown) → loads/computes
   year ephemeris & transits → assembles prompt → `generateText` via Vercel AI SDK, model
   **`claude-sonnet-4-6`** (fixed string; note the hyphenated slug, was previously a typo'd `4.6` — fixed in
   commit `a701ac9`), `temperature: 0.7`, `maxOutputTokens: 16000`, 290s internal abort.
4. Strips markdown fences, `JSON.parse`s, validates coverage (4 quarters / 12 months / full 52-week
   coverage) — `validateFullYearBlueprint` was recently loosened (commit `12043fe`) from exact
   `YYYY-01-01`/`YYYY-12-31` boundary equality to a coverage + ±6-day plausibility check, since ISO
   Monday-anchored week generation doesn't land on exact date boundaries.
5. Writes to `blueprints`, sets `onboarding_completed_at` only on success.

**Admin regeneration:** `app/api/admin/users/[userId]/regenerate-blueprint/route.ts` follows the identical
versioning convention; polled by `RegenerateBlueprintButton.tsx` every 8s (20-min timeout) against
`GET /api/admin/blueprint/[blueprintId]`, then `router.refresh()`s the admin table.

**Year rollover:** `app/(app)/renewing/page.tsx` (client) — `app/(app)/layout.tsx` compares
`profile.plan_year` to the current calendar year and redirects here when behind. POSTs a rollover endpoint,
then polls blueprint status every 8s (10-min timeout), functionally parallel to the onboarding generation
screen but for returning users.

---

## 5. Human Design

**Files:** `app/(app)/human-design/page.tsx` (server component, no dedicated API route — all computation
inline), `lib/human-design.ts`, `lib/ephemeris/human-design/{design-chart,gate-wheel,bodygraph,gene-keys}.ts`.

Reuses core ephemeris primitives (`getSunLongitude`, `getDailyLongitudes`, `birthLocalToUTC`, `msToJDE`)
from the astrology adapter, but applies its own 64-gate Rave Mandala wheel (anchored at 302.25°, calibrated
against Ra Uru Hu's own chart via MyBodyGraph) and its own true-lunar-node calculation (Meeus 47.7, distinct
from whatever the astrology side uses). Two chart sets computed: Personality (birth-moment longitudes) and
Design (moment Sun was exactly 88° before natal Sun, solved via Newton iteration).

**Data model:** single JSONB column `user_profiles.human_design` (migration `0014_human_design.sql`) —
stores the full computed payload, not just inputs. `HUMAN_DESIGN_METHODOLOGY_VERSION = 1`; stale/mismatched
charts recompute lazily on page read via `createAdminSupabase()` (service-role, appropriate for a system
recompute path).

**Gene Keys:** only 4 of 11 documented spheres implemented (Life's Work, Evolution, Radiance, Purpose) —
even "Attraction" (often considered the 5th core sphere) is absent, not just the CLAUDE.md-listed
IQ/EQ/SQ/Core/Culture/Vocation. `gene-keys.ts`'s own doc comment states this explicitly.

**Accuracy caveat worth preserving in any future docs:** `gate-wheel.ts` self-documents as needing validation
against MyBodyGraph/Jovian Archive "before the math is trusted for production prompt integration" — CLAUDE.md's
"HD math validated" means calibrated against *one* reference chart, not exhaustively verified.

---

## 6. Oracle / Stelloquy

**Files:** `app/api/oracle/chat/route.ts`, `lib/ai/oracle-system-prompt.ts`,
`components/oracle/OracleConversation.tsx`.

Model: `claude-sonnet-4.6` (note: dot, not hyphen — inconsistent slug format vs. blueprint's `4-6`, presumably
each is correct for its own API-side model ID, but worth double-checking these aren't typos of each other).
`streamText` + `maxDuration = 60`, streamed via `toUIMessageStreamResponse()`, consumed client-side by
`useChat` (`@ai-sdk/react`).

**Prompt caching is 2 cache segments, not literally "4 layers"** (contrary to a loose reading of
`PRODUCT_BIBLE.md`'s "4-layer prompt caching" phrasing) — though the code's own comments describe up to 7
conceptual content layers folded into those 2 segments:
- **`cached` segment** (`providerOptions.anthropic.cacheControl: { type: 'ephemeral' }`): persona, chosen
  interpretive tradition, natal chart + aspects, Human Design bodygraph, Goals + Blueprint (current
  week/quarter theme).
- **`dynamic` segment** (uncached, per-request): today's live transits/moon phase, plus "Produced Context" —
  goal categories, itemized `area_goals`, curriculum plans/sessions, tracker logs, journal entries, Oracle
  captures flagged `include_in_insights`, pattern insights, quarterly reviews.

**Usage limits found in code:** `ORACLE_MONTHLY_MESSAGE_LIMIT = 200`/month, `ORACLE_EXPLAIN_MONTHLY_LIMIT = 20`/month
for one-shot "Ask Oracle" deep links (`lib/ai/usage.ts`). No per-conversation token/cost ceiling beyond the
monthly message gate.

**Captures:** `POST /api/oracle/captures` inserts into `oracle_captures`, fires `tagCaptureInBackground` via
`after()` — async, non-blocking.

**Topic extraction:** `lib/ai/capture-topic-extractor.ts`, model `claude-haiku-4-5`, structured output via
zod schema (`Output.object`), `maxOutputTokens: 600`. Extracts 5 axes (themes, natal_aspects, transit_aspects,
hd_elements, moods) with confidence scores; only ≥0.7 confidence tags are persisted to `capture_topics`.

**Insights map:** `GET /api/insights/map` reads all `capture_topics`, groups by `capture_id`, builds one node
per unique `(kind,label)` pair (count = frequency) and an edge per co-occurring pair within a capture (weight
= co-occurrence count). Rendered by `components/insights/CaptureGraph.tsx` via `react-force-graph-2d`.

**Correction needed in `PRODUCT_BIBLE.md`:** it describes graph nodes as "captures" — the actual
implementation's nodes are **topics/tags**, not captures. Edges connect topics, not capture records. Worth
fixing in the Bible.

---

## 7. Cosmic Calendar, Today Dashboard, "Almanac"

**Files:** `app/(app)/year/page.tsx` (single file, dispatches by `?view=` query param to
`YearChartView`/`MonthChartView`/`WeekChartView`/`QuarterReviewView`), `app/(app)/today/page.tsx`,
`lib/today/**`, `lib/year/**`, `components/almanac/**`.

**Today dashboard** (`app/(app)/today/page.tsx`) is a Server Component; loads profile then in parallel calls
`lib/today/get-*` helpers (`getActiveTransits`, `getJournalStreak`, `getTodayIntention`, `getTodayCurriculum`,
`getSkyNow`, `getLifeArc`, `getJupiterSeason`). `getTodayContext()` computes today's Sun/Moon
position/sign/phase and the 7-day strip via direct ephemeris math (no DB call), pinned to `America/New_York`.
`getActiveTransits` reads the cached `ephemeris_cache` row for the year (not a live astronomical call per
request), calls `buildSkyTimeline` (shared with the Human Design module), filters to active transits, splits
into `current` (Moon–Jupiter) vs `lifetime` (Saturn–Pluto) by rarity.

**Journal quick-entry** (`app/(app)/today/actions.ts`, `'use server'` action `saveLineForToday`) inserts into
`journal_entries` + `journal_entry_sky` + `journal_entry_aspects`, triggers `refresh_user_pattern_insight`
RPC calls, `revalidatePath('/today')`.

**Year page** shares one `loadYearData()` across all four tabs — resolves profile, current blueprint,
`ephemeris_cache`, `curriculum_sessions`. Month view additionally queries `journal_entries` (day markers) and
`month_briefs`; Sabian symbol is computed from today's Sun degree if the displayed month contains today, else
the 15th of that month (an implicit, undocumented convention).

**Month Briefs:** `app/api/month-brief/route.ts` (`maxDuration = 90`) → `lib/ai/month-brief-generator.ts`.
Cache-checks `month_briefs` (unique on `user_id, plan_year, month`); on miss/force, gathers profile,
blueprint, pattern insights, planner-flagged Oracle captures, curriculum sessions, prior month's brief, most
recent completed quarterly review, calls `claude-sonnet-4-6` (temp 0.75, max 700 output tokens). Client panel
(`MonthBriefPanel.tsx`) supports regen (blocked if pinned), direct text edit (bypasses AI), and pin toggle —
same route, different request body shapes.

**"Almanac" is not a feature or route** — it's a shared presentational design-system module
(`components/almanac/`: Frame, Kicker, Seal, Divider, Stat, StarField, MoonGlyph, EphemerisWheel, color/font
tokens), imported by Today and Year/Calendar. If any doc implies it's a user-facing page, that's inaccurate.

**Year Unwrapped:** confirmed zero scaffolding anywhere in the codebase (`grep` for "unwrapped" across
app/lib/components returns nothing) — CLAUDE.md's "not built" claim is accurate, not even a stub route.

**Loose thread:** `app/(app)/dashboard/page.tsx` exists as a real route (`DashboardOverview`, 1250 lines,
called with hardcoded `firstName={null}`) separate from `/today`, which `app/page.tsx` redirects
authenticated users to. This looks like it may be legacy/superseded by `/today` as the actual landing page —
worth confirming whether `/dashboard` is still linked from anywhere live or is dead weight.

---

## 8. Daily Tracker & Journal

**Files:** `app/(app)/tracker/**`, `app/api/tracker/**`, `app/(app)/journal/**`, `app/api/journal/**`,
`lib/journal/intelligence.ts`, `lib/ai/journal-insight-synthesis.ts`.

**Tracker:** pure CRUD, no AI. `app/api/tracker/logs/route.ts` upserts `daily_logs` keyed on
`(user_id, log_date)`, stamps `lunar_phase`/`lunar_sign` from the cached `ephemeris_cache` and (if
`cycle_enabled`) computes `cycle_phase` arithmetically from `cycle_entries.period_start`. User-defined
metrics live in `tracker_metrics` (label, `data_type`, `config` JSON). **Confirmed write-only**: lunar/cycle
data is stamped onto every log row but no tracker UI component currently renders it — it's captured for later
cross-referencing (e.g. by Oracle context) but not surfaced on the Tracker page itself.

**Journal:** `POST /api/journal` validates with zod, upserts `journal_entries`, writes
`journal_entry_sky` (one row, sky summary) and `journal_entry_aspects` (one row per active transit) via
builder functions in `lib/journal/intelligence.ts`. Fires `getPatternRefreshTargets()` per entry → Postgres
RPC `refresh_user_pattern_insight()` (defined in migration `0012_journal_intelligence.sql`) per matching
pattern key.

**Pattern insights are rule-based SQL, not AI**, at the aggregation layer: `refresh_user_pattern_insight`
counts matching entries, computes `confidence = LEAST(1.00, sample_size / 5.0)`, writes a templated fallback
summary, upserts `user_pattern_insights` (unique on `user_id, pattern_type, pattern_key`).

**AI synthesis is a separate, optional layer on top** — `lib/ai/journal-insight-synthesis.ts` (note: lives
under `lib/ai/`, not `lib/journal/`, which is a minor CLAUDE.md-convention deviation worth flagging, not
necessarily fixing). Model `claude-haiku-4-5`, `maxOutputTokens: 220`, temp 0.6, 3 voice presets +
free-text custom voice (`user_settings.journal_insight_voice(_label)`). `regenerateAllForUser` runs
concurrency-5 via a manual work-stealing loop inside `after()` (202 response, `maxDuration = 300`).
`/api/journal/insights/status` is polled every 3s to drive the "Synthesising… N of M ready" banner.

**Confirmed gap:** AI synthesis does **not** regenerate automatically when a new journal entry updates a
pattern's `sample_size`/`evidence` — it only regenerates when the user explicitly hits "Save & apply to all"
in the Voice panel. A pattern card can show a stale AI summary next to a grown sample size. Unclear if
intentional (cost control) or an oversight — worth a founder call.

---

## 9. Curriculum, Areas + Goals, Quarterly Reviews

**Files:** `app/(app)/curriculum/**`, `app/api/curriculum/**`, `lib/ai/curriculum-session-generator.ts`,
`app/(app)/areas/[slug]/**`, `lib/areas.ts`, `app/api/areas/**`, `lib/reviews/save-review.ts`,
`lib/ai/quarterly-review-generator.ts`, `lib/ai/quarterly-review-system-prompt.ts`,
`app/api/quarterly-review/**`.

**Curriculum:** `POST /api/curriculum/generate` streams SSE progress (`analyzing`/`generating`/`saving`)
while Claude builds a plan (`curriculum_plans.curriculum`, JSON draft of weeks/sessions);
`POST /api/curriculum/detect` checks whether a prompt actually describes two separate courses. Session
content generated on demand (`POST /api/curriculum/[id]/sessions/[week]/[order]/generate`, cache-checked
against `curriculum_session_content` unless `?force=1`). Completion
(`PATCH .../complete`) upserts `curriculum_session_progress` and, if the plan is approved, best-effort syncs
`curriculum_sessions.status` so calendar/Today stay consistent.

**Areas + Goals:** `AREA_DEFINITIONS` (static config in `lib/areas.ts`) maps each area to primary/secondary
houses, energy mode, support strategies. Helpers cross-reference blueprint weeks/months against house
rulership to build the year narrative and timing windows. `area_goals` table (migration 0020):
`user_id, category_id, title, description, status, target_label, linked_week_number, sort_order`.

**Quarterly Reviews:** `saveQuarterlyReview()` upserts `quarterly_reviews` (onConflict
`user_id,plan_year,quarter`); `updateQuarterlyReviewSynthesis()` writes `ai_summary` + `stats_snapshot`
after. AI generation: `claude-sonnet-4-6`, temp 0.75, 600 max output tokens (streaming variant uses
`streamText().toTextStreamResponse()`, persists `onFinish`). `loadQuarterlyReviewPromptBundle()` pulls
profile, latest ready blueprint, pattern insights, quarter-scoped counts from `daily_logs`/`journal_entries`/
`oracle_captures`/`curriculum_sessions`, and the prior quarter's completed review. Delta-vs-prior-quarter is
computed **client-side** in `QuarterReviewPanel.tsx` by simple subtraction against a server-loaded prior
`stats_snapshot`.

### 9.3 Confirmed: `area_goals` still NOT wired into Quarterly Review stats

Grep confirms `area_goals` is used only in the Oracle chat route and the Areas UI/API — `statsSnapshot` in
`quarterly-review-generator.ts` only pulls `daily_logs`/`journal_entries`/`oracle_captures`/
`curriculum_sessions` counts. No goals-completed count, no area-goal status breakdown. This matches CLAUDE.md
and is a real, current gap (not touched by the 05-19 QR polish work, which explicitly lists this as a
still-open item).

**Other gaps confirmed from `docs/handoff-2026-05-19-quarterly-reviews-polish.md`** (still accurate as of this
read): Year Unwrapped is a 404 stub (Recharts not installed); 12 Sabian fallback interpretations intentionally
left blank pending a source PDF (deliberate, not a bug); Journal Intelligence pattern data computed but no
dedicated user-facing surface beyond `/journal/insights`; `/oracle` deprecation (in favor of some other entry
point?) deferred — worth clarifying what this means with the founder.

---

## 10. Onboarding, Auth, Commerce

**Files:** `app/(onboarding)/onboarding/**` (page.tsx, tradition, goals, study-focus, year-focus, cycle,
theme, generating), `app/(auth)/**` (Clerk), `app/api/onboarding/**`, `app/activate/**`,
`app/api/activate/{claim,complete}/route.ts`, `app/pricing/**`, `app/purchase/success/**`,
`app/api/commerce/**`, `lib/commerce/{config,entitlements,activation,etsy-mapping,stripe,
marketplace-orders,access}.ts`, `app/api/webhooks/{clerk,stripe}/route.ts`.

**Onboarding steps map to profile columns directly** — each step `PATCH`es `/api/profile` incrementally.
Step numbering in code comments doesn't always match a clean 1-6 (goals/study-focus ordering looked
inconsistent to one research pass) — not a functional bug, just worth a naming pass if step numbers ever
show up in user-facing copy.

**Blueprint generation trigger:** theme step (last step) redirects to `/onboarding/generating`, which
`POST`s `/api/blueprint/generate` and polls `/api/blueprint/status` every 8s (10-min timeout).

**Entitlement resolution:** `resolveUserAccess(entitlements[])` → `UserAccessSnapshot`
(`hasPlannerAccess`, `hasReadOnlyPlannerAccess`, `hasOracleAccess`). Per-entitlement state
(`resolveEntitlementAccessState`): `revoked` if marked; `active` if `today ∈ [starts_at, ends_at]`; past
`ends_at` → `read_only` if `access_plan = 'yearly'` (permanent), else `expired`. This is confirmed
intentional: annual purchasers keep lifetime read access as a loyalty mechanic; monthly subscribers lose
access entirely on lapse.

**Key tables:** `user_profiles`, `product_entitlements`, `marketplace_orders` (Etsy, imported via an
external N8N workflow hitting `/api/commerce/etsy-ingest`), `activation_claims` (7-day expiry tokens),
`direct_purchase_orders` (Stripe), `loyalty_rewards`.

**Stripe:** annual = `mode: "payment"` one-time + `customer_creation: "always"`; monthly =
`mode: "subscription"`. Webhook (`checkout.session.completed`, `invoice.payment_succeeded/failed`,
`customer.subscription.updated/deleted`) syncs `product_entitlements`.

**Etsy tier inference** (`lib/commerce/etsy-mapping.ts`): matches listing ID env vars first, then SKU env
vars, then falls back to checking whether listing text contains "oracle", finally defaults to base "planner"
tier.

**Access gate:** `requireActivePlannerAccess(clerkUserId)` — 403s writes when no active entitlement exists;
exempts users with Clerk `publicMetadata.isAdmin === true`.

**Open questions flagged by research (unresolved, worth asking the founder):**
- Is cycle-tracking data (collected at onboarding step 5) actually consumed anywhere downstream (blueprint
  prompt, Oracle context, tracker display) beyond the raw `cycle_phase` stamp on tracker logs? No consumer
  was found in this pass.
- How/when are `loyalty_rewards` (status `pending`) actually redeemed at the next renewal — no code path
  found for "delivering" them.
- `Clerk publicMetadata.isAdmin` — confirmed set manually via Clerk dashboard (no in-app admin-granting UI
  found); worth documenting the process somewhere if it isn't already.

---

## 11. Admin Console & Settings

**Files:** `app/(admin)/admin/{page,users,sources,imports,published,drafts,mapping,commerce,feedback}/
page.tsx`, `app/(admin)/layout.tsx`, 15 routes under `app/api/admin/**`, `lib/admin/**`,
`app/(app)/settings/page.tsx`, `app/api/profile/route.ts`.

**Auth gating — confirmed fully consistent** across all 15 admin API routes + the layout:
```ts
const user = await currentUser();
if (!user || user.publicMetadata?.isAdmin !== true) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```
Zero remaining references to the old, broken `isAdminSession(sessionClaims)` helper — commit `02c5377`'s
fix is fully applied with no stragglers.

**Admin console covers:** Users (table + regenerate-blueprint action), Sources/Imports/Drafts/Published/
Mapping (AI content-import pipeline: register sources → run imports → review AI-drafted "cards" → approve/
reject into published content → house/theme mapping), Commerce (manual order entry + Etsy order import),
Feedback review. Root `/admin` redirects to `/admin/sources`.

**`app/api/profile/route.ts` diff (uncommitted):** one-line change — the fallback default house system used
only when recomputing a chart server-side with `profile.house_system` null, changed `"porphyry"` →
`"placidus"`. Consistent with the broader default-house-system change in §2.2; does not touch the Settings
UI's own defaults (those come from `TRADITION_HOUSE_DEFAULTS`, tradition-driven).

**Nothing mocked found** in admin or settings — no TODO/mock/placeholder markers; regenerate-blueprint, card
approval, and settings save/billing-portal all call real Supabase/Clerk/Stripe integrations.

---

## 12. Cross-Feature Data Map

| Table | Written by | Read by |
|---|---|---|
| `user_profiles` | Onboarding, Settings, Clerk webhook | nearly everything |
| `blueprints` | Blueprint generator, Admin regen | Blueprint page, Calendar, Today, Areas, Month Briefs, QR, Oracle prompt |
| `ephemeris_cache` | Year ephemeris precompute (per user/year) | Today, Tracker, Journal, Calendar, Human Design (`buildSkyTimeline`) |
| `natal_chart` (on `user_profiles`) | Onboarding, recompute scripts, profile PATCH | Blueprint gen, Oracle prompt, Human Design, Areas |
| `human_design` (on `user_profiles`) | HD page (lazy compute) | HD page, Oracle prompt |
| `journal_entries` + `journal_entry_sky/aspects` | Journal, Today quick-entry | Journal UI, Pattern Insights RPC, Oracle "Produced Context", Month Briefs, QR stats |
| `daily_logs` | Tracker | Tracker UI, Oracle context, QR stats |
| `user_pattern_insights` | SQL RPC (rule-based) + AI synthesis layer | Journal Insights UI, Month Briefs, Oracle context, QR prompt |
| `oracle_captures` + `capture_topics` | Oracle chat, topic extractor | Insights map, Month Briefs (planner-flagged), QR stats, Oracle "Produced Context" |
| `area_goals` | Areas UI | Areas UI, Oracle prompt (NOT QR stats — confirmed gap) |
| `curriculum_plans/sessions/session_progress/session_content` | Curriculum | Curriculum UI, Today, Calendar, QR stats |
| `quarterly_reviews` | Quarterly Review save/synthesis | QR UI, Month Briefs (prior review reference) |
| `month_briefs` | Month Brief generator | Calendar month view |
| `product_entitlements` | Stripe webhook, Etsy activation, Admin commerce | Access gate everywhere |

---

## 13. Consolidated Open Questions For The Founder

1. Has `scripts/recompute-all-charts.ts --apply` run against production? (§2.1 — highest priority)
2. Is `scripts/backfill-house-cusps.ts` now redundant, or is there an intended run order? (§2.1)
3. Was the Whole Sign → Placidus default house system switch intentional, or should it revert? Either way,
   CLAUDE.md needs updating to match reality. (§2.2)
4. Is AI journal-insight synthesis supposed to regenerate automatically as new entries land, or is
   manual-only ("apply to all") intentional cost control? (§8)
5. Is cycle-tracking data meant to feed the blueprint prompt, Oracle context, or tracker display — currently
   it's collected and stamped but not visibly consumed anywhere. (§10)
6. How are `loyalty_rewards` actually redeemed at renewal — no code path found. (§10)
7. Should `PRODUCT_BIBLE.md` be corrected on: (a) Insights graph nodes = topics not captures (§6), (b) prompt
   caching = 2 segments not literally "4 layers" (§6), (c) Whole Sign vs Placidus default (§2.2)?
8. Is `/dashboard` (separate from `/today`) still in active use anywhere, or is `DashboardOverview.tsx`
   (1250 lines) dead weight worth removing? (§7)
9. What does "`/oracle` deprecation deferred" (noted in the 05-19 QR handoff) actually mean — is there a
   plan to replace the Oracle route/entry point? (§9.3)
10. Etsy/homepage marketing gaps — see `wiki-end-user.md` §18 for the full list (naming, under-sold features,
    stale pricing in `docs/etsy-listing-prep.md`, empty Privacy/Terms pages). None of these were changed;
    all need a founder decision before publishing new assets.
