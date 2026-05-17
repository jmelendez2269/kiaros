# Phase 2 Month — Handoff (2026-05-16)

You're picking up Phase 2 after the Month tab was finished out with real
data and a clickable Active Transits panel. Phase 1 (Today + Stelloquy
drawer) is still on `feature/warm-almanac` in **PR #1**, unmerged.
Phase 2 work-in-progress lives on `feature/warm-almanac-year`, stacked
on Phase 1.

**Read this first, then `docs/handoff-2026-05-15-phase2-year.md` for the
prior session's snapshot. Both are authoritative.**

---

## 1. TL;DR

The Month tab on `/year?view=month` is now **fully real-data**. The
remaining placeholders from yesterday's handoff are all replaced:

- **Monthly brief** — Claude-generated 3–4 paragraph letter, cached
  per (user, plan_year, month) in a new `month_briefs` table. Lazy
  generation on first view of each month. Pinnable so a brief you love
  can't be overwritten by an accidental regenerate.
- **Sabian-of-week** — real `getSabianForDegree()` lookup against the
  Sun's longitude on today (if displayed month contains today) or the
  15th otherwise. Shows the prose, position, and a `NEAREST` marker
  when the symbol is a fallback for a not-yet-transcribed degree.
- **Push-rest ribbon** — new `push_rest_arc JSONB` column on
  `blueprints`. When NULL, the UI derives an arc from the existing
  `pushPeriods` / `restPeriods` Claude already generates. When
  populated, it overrides (and may include `edit` segments).

Separately, Active Transits on `/today` rows are now clickable — same
pattern as SkyBanner's Sun/Moon chips. Click any transit → drawer
opens (subscribers) or inline overlay fires (free tier) with a
preseeded "tell me about this transit" prompt.

---

## 2. State of branches

- `main` — untouched
- `feature/warm-almanac` — pushed; **PR #1** still open against `main`
  (https://github.com/jmelendez2269/kiaros/pull/1). User wants to live
  with Today + drawer before merging.
- `feature/warm-almanac-year` — **this session's commit landed locally,
  unpushed.** Stacked on `feature/warm-almanac`.
- Migrations **0015, 0016, 0017** were all applied to **production**
  via the Supabase dashboard this session. Staging was not touched.
  The Supabase MCP plugin was authenticated mid-session against an
  unrelated org (`digital-grimoire`) and never had access to the
  Kiaros project, so all DB writes went through the user's dashboard.

When PR #1 merges, rebase this branch onto `main` (clean fast-forward,
nothing else has landed) before opening Phase 2's PR.

---

## 3. Decisions locked this session

Treat as final unless the user revisits explicitly:

1. **Monthly brief storage = new `month_briefs` table** (not folded
   into `blueprints.months[].dynamic_brief`). Migration 0015. Lets
   regen happen without rewriting the blueprint row.
2. **Brief generation is lazy, on first Month view per month.** Cached
   forever after. Only path to overwrite is the `REGENERATE` button.
3. **Brief context sources, in order assembled:** natal chart summary,
   year vision / word of year / what-to-release, quarter context,
   this month's `MonthBlueprint` (theme, energyArc, intentions,
   keyTransits, moonPhases), top 6 journal `user_pattern_insights`,
   top 5 `oracle_captures` with `include_in_planner=true`, top 8
   `curriculum_sessions` scheduled this month.
4. **Brief format = 3–4 paragraphs, plain prose, no headers, no
   lists, ~180–280 words.** Second-person voice. Reference at least
   one specific natal placement and one transit/moon/retrograde.
5. **Pin lock is server-enforced.** Pinned brief + regen request →
   server throws `MonthBriefPinnedError` → API returns 409 with
   `{ code: 'pinned' }`. UI also hides the REGENERATE button when
   pinned, so the 409 path is defensive only.
6. **Sabian-of-week date selection: today (if in displayed month) or
   the 15th.** Sun moves ~1°/day so this is effectively the
   week-midpoint reading the prior handoff called for.
7. **Push-rest arc fallback derivation** lives at
   `lib/year/push-rest-arc.ts`. `pushPeriods` → `kind: 'push'`,
   `restPeriods` → `kind: 'rest'`. Authored `edit` segments are only
   surfaced when `blueprints.push_rest_arc` is populated.
8. **`AskOracleButton` now accepts `triggerClassName`** so a custom
   trigger can be made full-width. Used by Active Transits rows;
   future full-width clickable rows can reuse it.
9. **Vercel-plugin model-slug validator (hyphen vs dot) is ignored.**
   `claude-sonnet-4-6` is the canonical model ID used throughout the
   codebase (`blueprint-generator.ts:249`, `oracle/explain/route.ts:20`)
   and matches Anthropic's published IDs. Do not change to
   `claude-sonnet-4.6` because a hook lints for it.

---

## 4. New / modified file inventory

```
NEW:
  supabase/migrations/
    0015_month_briefs.sql           Table for cached monthly briefs.
    0016_month_briefs_pinned.sql    Adds `pinned BOOLEAN` to month_briefs.
    0017_blueprints_push_rest_arc.sql
                                    Adds `push_rest_arc JSONB` to blueprints.
  lib/ai/
    month-brief-system-prompt.ts    Letter-format system + user prompt assembly.
    month-brief-generator.ts        fetchOrGenerateMonthBrief + setMonthBriefPinned.
                                    Throws MonthBriefPinnedError on locked regen.
  lib/year/
    push-rest-arc.ts                derivePushRestArc + sanitizePushRestArc.
  app/api/month-brief/
    route.ts                        POST handler. Fetch-or-generate by default;
                                    { pin: boolean } switches to pin action;
                                    { regen: true } forces regeneration.
  components/year/
    MonthBriefPanel.tsx             Client island. Lazy fetch, regen, pin toggle.
                                    Skeleton + error + pinned states.

MODIFIED:
  app/(app)/year/page.tsx           Pulls yearEphemeris into MonthChartView for
                                    Sabian, server pre-fetches the brief and
                                    its pinned state, computes Sabian and arc,
                                    passes initialBrief / initialPinned to panel,
                                    replaces placeholderArc() with authored-or-
                                    derived arc.
  lib/blueprint/load.ts             Reads push_rest_arc column, sanitizes it,
                                    exposes pushRestArc: ArcPeriod[] | null on
                                    LoadedBlueprint.
  lib/ai/usage.ts                   Added "month_brief" to AIFeature union.
  lib/oracle/preseed.ts             Added buildActiveTransitPrompt(row).
  components/oracle/AskOracleButton.tsx
                                    Added triggerClassName prop for full-width
                                    custom triggers.
  components/today/ActiveTransits.tsx
                                    Now 'use client'. Each row wrapped in
                                    AskOracleButton with the new prop.
                                    useStelloquy().hasOracleAccess.
```

---

## 5. Open / pending — priority order

### HIGH (none — all closed)

The Month tab is now 100% real data. The remaining items are visual
judgement calls or design refinements, none of which block shipping.

### MEDIUM

1. **SkyBanner gradient still has cocoa-era hex literals.**
   `linear-gradient(#1a2240 → #3a2d4a → #6b3d4a → K.copper → K.copperHi)`.
   The user was going to open `/today` and decide whether to retune
   to `K.midnight → K.bg4 → K.brick → K.copper → K.copperHi`. Not done.

2. **Stripped CosmicCalendar chrome.** Rendering `YearView` directly
   instead of `<CosmicCalendar>` cost the Year tab its kicker, SIGNALS
   legend / filter chips, Today pill, and internal breadcrumb. User
   was going to look at the simpler view and tell us which (if any)
   to bring back. Don't assume they want it all back.

3. **Free-tier inline overlay theming.** `OracleOverlay` inside
   `AskOracleButton` is still leather-themed. After the Obsidian retune
   leather classes resolve to violet which is "fine" but the chrome
   was designed for the old aesthetic and may benefit from a pass.

### LOW / aspirational

4. **Day click in MonthGrid.** New month grid doesn't wire day clicks.
   Wire to `/year?view=week&date=YYYY-MM-DD` so users can drill from
   the Almanac month into CosmicCalendar's week detail.

5. **Brief content extensions.** Right now the brief draws on a fixed
   set of inputs. Future candidates the user picked but we shipped
   without: more curriculum context (lesson titles vs just count),
   quarterly review insights (when those exist), prior month's brief
   for narrative continuity. Not promised, just on the table.

6. **Stelloquy preseed when drawer already open.** Same race as prior
   handoff — if drawer is open, `openWith(prompt)` writes the preseed
   ref but the new prompt won't auto-fire. Low priority because modal
   backdrop blocks click-through in practice.

7. **Brief authoring UI.** No surface yet for users to edit a generated
   brief or write one from scratch. Pin is the lightest version of
   "lock the version I like." Edit / dictate would be a Phase 4 thing.

---

## 6. Carry-over debt from earlier phases

Re-listed so the next session doesn't lose them:

- **Sabian 360** — 32 transcribed, 328 pending fallbacks. The new
  Month-tab Sabian panel shows ` · NEAREST` when serving a fallback,
  so the user can see at a glance which months need transcribed
  symbols. Data-only edits to `TRANSCRIBED` in `lib/ephemeris/sabian.ts`.
- **Quick-line composer duplication** — `app/(app)/today/actions.ts`
  duplicates ~50 lines with `/api/journal/route.ts`. Converge during
  Phase 4 onto a shared `lib/journal/create-entry.ts`.
- **`/oracle` deprecation** — the legacy page still exists as a safety
  net. Redirect lands in Phase 5 cleanup.

---

## 7. Verification

```bash
git checkout feature/warm-almanac-year
npm install
npm run dev   # :3699

# /year?view=month
#   - Header shows MonthBlueprint.theme + energyArc.
#   - Quarter context strip with intentions / transits / sessions /
#     moon-phase counts.
#   - Month grid with real moon-phase events + journal ✎ glyphs.
#   - "This month's brief" panel below the calendar:
#       First visit  → skeleton → 5–10s wait → 3–4 paragraph letter.
#       Refresh      → renders instantly from cache.
#       ★ PIN toggle → optimistic flip; REGENERATE disappears.
#       REGENERATE   → only visible when unpinned; fresh letter.
#   - Sabian panel shows real Sun-degree symbol with position +
#     date + ` · NEAREST` if it's a fallback.
#   - "Year's pulse" ribbon at the bottom uses derived arc (from
#     blueprint.pushPeriods + restPeriods) unless push_rest_arc was
#     authored on the blueprint row.
#
# /today
#   - SkyBanner Sun and Moon still clickable (Phase 1).
#   - Active Transits rows are now clickable end-to-end. Hover gives
#     a subtle bone-tinted background. Click → drawer preseed.
```

`npx tsc --noEmit` passes clean. The supabase clients in this project
aren't generic-typed with `Database`, so adding new tables didn't
require regenerating types — but you can still run your usual
`supabase gen types` command if you want IntelliSense on the new
`month_briefs` and `blueprints.push_rest_arc` schema.

---

## 8. House rules (from CLAUDE.md, unchanged)

- **Voice:** warm, grounded, anti-hustle. Reference the user's actual
  chart, transits, goals — never "where you should be."
- **No new `.md` planning docs unless explicitly asked.** This one was.
- **No service-role Supabase client outside webhooks / system jobs.**
  `month-brief-generator.ts` uses the admin client because it runs
  from a route handler that's just done its own Clerk auth check and
  resolved the profile ID — same pattern as `blueprint-generator.ts`.
- **No `any`-shaped type cheats.**
- **Migrations get user approval before running.** 0015, 0016, 0017
  were all explicitly approved this session before being applied.
- **Don't refactor what works unless the refactor is the task.**
- **Server Components by default; `'use client'` only when necessary.**
  ActiveTransits became client this session because it needed
  `useStelloquy()` for entitlement. The Year page itself is still
  server; only the new MonthBriefPanel island is client.

---

## 9. Quick links

- Design canon: `Kairos-handoff/kairos/project/kairos/` (year, today,
  self, journal, ambient)
- Phase 1 baseline: `docs/handoff-2026-05-14-warm-almanac.md`
- Prior Phase 2 snapshot: `docs/handoff-2026-05-15-phase2-year.md`
- Open PR: https://github.com/jmelendez2269/kiaros/pull/1
- Working branch: `feature/warm-almanac-year` (this session's commit
  is the latest; unpushed)
