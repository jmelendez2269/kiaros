# Phase 2 Year — Handoff (2026-05-15)

You're picking up Phase 2 of the Kairos redesign. Phase 1 (Today + the
Stelloquy drawer) is on `feature/warm-almanac` in **PR #1**, sitting
unmerged. Phase 2 work-in-progress lives on `feature/warm-almanac-year`
(stacked on Phase 1), **all uncommitted**.

**Read this first, then `docs/handoff-2026-05-14-warm-almanac.md` for the
Phase 1 baseline. Both are authoritative.**

---

## 1. TL;DR

`/year` is now a 3-tab screen (Year / Month / Week) that replaces
`/calendar`. The Year and Week tabs use the existing CosmicCalendar
sub-components (the chart view the user loves). The Month tab is the new
Almanac layout (grid + side panel + push-rest ribbon), still on placeholder
data. The cocoa/copper "Warm Almanac" palette is retired — the `K` tokens
now resolve to the **Obsidian** palette, so Today + Year/Month + sidebar +
Stelloquy chrome all feel coherent for the first time. The Stelloquy drawer
is now reachable from any client component via `useStelloquy().openWith()`;
SkyBanner's Sun/Moon are wired as the first consumers.

---

## 2. State of branches

- `main` — untouched
- `feature/warm-almanac` — pushed; **PR #1** open against `main`
  (https://github.com/jmelendez2269/kiaros/pull/1). User wants to live
  with Today + the drawer before merging.
- `feature/warm-almanac-year` — **local only, all uncommitted.** Stacked
  on `feature/warm-almanac`. Everything in this handoff lives here.
- Working tree: 9 modified files + 4 untracked directories (the new
  `app/(app)/year/`, `components/year/`, `components/oracle/StelloquyProvider.tsx`,
  and the design canon `Kairos-handoff/` which is intentionally not committed).

When PR #1 merges, rebase this branch onto `main` (it'll be a clean
fast-forward since nothing else has landed) before opening Phase 2's PR.

---

## 3. Decisions locked this session

Treat as final unless the user revisits explicitly:

1. **`/calendar` consolidates into `/year`.** Redirect added; old folder
   deleted. The Year section IS what `/calendar` used to be.
2. **Three-tab outer switcher: Year / Month / Week.** No more internal
   CosmicCalendar pills — the user explicitly complained about the
   double-switcher problem.
3. **Year tab = CosmicCalendar's YearView** (heatmap chart, with month/day
   click handlers piping into URL state).
4. **Month tab = new Almanac layout** — `MonthGrid` + side panel
   (`brief / Sabian-of-week / curriculum`) + `PushRestRibbon`. Still on
   placeholders; needs real-data wiring.
5. **Week tab = CosmicCalendar's WeekView** (the detailed week the user
   loves), with breadcrumb back to Year/Month.
6. **Palette unification — Obsidian.** The cocoa/copper "Warm Almanac"
   direction is dead. `K` tokens (`components/almanac/tokens.ts`) and
   `--almanac-*` CSS variables (`app/globals.css`) now resolve to Obsidian
   hex equivalents. Token *names* are unchanged (`K.copper`, `K.brick`,
   `K.sage`) so component code didn't move — only the values shifted.
7. **Stelloquy drawer is global.** State lives in `StelloquyProvider`
   context, exposing `openWith(prompt)`. Any client component can drop a
   preseeded question into the drawer; `OracleConversation` consumes the
   preseed on mount and fires it as the first user message.
8. **Today's clickable aspects use that drawer.** SkyBanner is now a
   client component; Sun and Moon are clickable chips that build a
   `PlacementExplanation` and route through `AskOracleButton`. Subscribers
   get the drawer; free tier still gets the inline `/api/oracle/explain`
   overlay (unchanged behaviour, still leather-themed — see §6 debt).

---

## 4. New file inventory

```
app/
  (app)/
    year/
      page.tsx                 3-view dispatcher. Server component.
                               Branches on ?view= for Year / Month / Week.

components/
  year/
    YearViewSwitcher.tsx       Client pill, 3 tabs, URL-driven (?view=).
    YearChartShell.tsx         Client wrapper around CosmicCalendar's
                               YearView — converts onMonthClick / onDayClick
                               into URL-driven view changes.
    MonthGrid.tsx              6-week month grid, auto-sized cellCount,
                               per-day events + moon glyphs.
    PushRestRibbon.tsx         Year-long arc strip with today marker.
                               Takes ArcPeriod[] + todayPct.
  oracle/
    StelloquyProvider.tsx      Client context. State: open. Actions:
                               openDrawer / closeDrawer / toggleDrawer /
                               openWith(prompt) / hasOracleAccess.

Modified:
  app/(app)/layout.tsx         Wraps body in <StelloquyProvider>;
                               hoists hasOracleAccess into context.
  app/globals.css              --almanac-* CSS vars retuned to Obsidian.
  components/almanac/AlmanacSidebar.tsx  Year nav href: /calendar → /year.
  components/almanac/tokens.ts K retuned to Obsidian hex equivalents.
  components/oracle/StelloquyShell.tsx
                               Consumes context (no longer owns open state).
  components/oracle/AskOracleButton.tsx
                               Subscriber path uses openWith() (was
                               router.push('/oracle')). Accepts custom
                               `children` for transparent triggers.
  components/today/SkyBanner.tsx
                               'use client'. Sun/Moon are clickable chips
                               wrapped in AskOracleButton.
  next.config.js               Added /calendar → /year redirect.

Deleted:
  app/(app)/calendar/          Folder removed (redirect supersedes it).
```

---

## 5. Open / pending — priority order

### HIGH

1. **Month tab data wiring (placeholders → real data).** Currently the
   month grid events, monthly brief, Sabian-of-week, curriculum tracks,
   and push-rest arc are all hardcoded placeholders in
   `app/(app)/year/page.tsx`. Real sources:
   - **Events:** `yearEphemeris.days` for the selected month → moon-phase
     events, retrograde stations, exact aspect days. The Year-view data
     loader (`loadYearData()` in the same file) already pulls
     `yearEphemeris`; lift it to be shared by Month view too.
   - **Monthly brief:** the user picked "generate fresh via Claude, cached
     per (user, year, month)". New `lib/ai/month-brief-{generator,
     system-prompt}.ts` + storage. Caching strategy still open — could be
     a new `month_briefs` table or fold into `blueprints.months[].dynamic_brief`.
   - **Sabian-of-week:** `getSabianForDegree(weekMidpointSunLongitude)`.
   - **Curriculum:** the existing `curriculum_sessions` rows for the month.
   - **Push-rest arc:** see migration 0015 below.

2. **Migration 0015 — `push_rest_arc` JSON on `blueprints`.** Per the
   Phase 1 handoff but renumbered (0014 is HD). Shape:
   `Array<{ kind: 'push' | 'rest' | 'edit'; startPct: number; endPct: number; label: string }>`.
   Write a fallback derivation in `lib/year/push-rest-arc.ts` so existing
   blueprints without the column still render a deterministic arc from
   quarter themes. Get user approval before running on prod (CLAUDE.md
   rule).

3. **SkyBanner gradient still has cocoa-era hex literals.** The gradient
   is `linear-gradient(#1a2240 → #3a2d4a → #6b3d4a → K.copper → K.copperHi)`.
   The `K.*` stops are now Obsidian violet; the middle stops are still
   warm cocoa hex. Net result is a navy → dark plum → dark brown → violet
   → light violet gradient. May or may not work visually — user was going
   to check. If it reads wrong, retune to `K.midnight → K.bg4 → K.brick →
   K.copper → K.copperHi`.

### MEDIUM

4. **Stripped CosmicCalendar chrome.** By rendering `YearView` directly
   instead of `<CosmicCalendar>`, the `/year` Year tab lost:
   - "Cosmic Calendar" kicker + the `shell-panel-hero` chrome
   - SIGNALS legend toggle + the collapsible filter chips
     (Sun arc / Moon phases / Retrogrades / Aspects / Personal plan)
   - The "Today" pill button
   - The internal breadcrumb (which the Week tab gained a custom version of)
   
   User was going to look at the simpler view and tell us which (if any)
   to bring back as outer chrome. Don't assume they want it all back —
   removing the duplicate switcher was their explicit request.

5. **ActiveTransits clickability.** Same pattern as SkyBanner's
   Sun/Moon: each transit row should be wrappable in `AskOracleButton`
   with a `buildTransitPrompt(...)`. The data is already there in
   `lib/today/get-active-transits.ts`. ~30-min job.

6. **Inline overlay for free tier is still leather-themed.** The overlay
   component lives inside `AskOracleButton` (the `OracleOverlay`
   function near the bottom). After the Obsidian retune, leather classes
   resolve to violet which is "fine" — but the chrome was designed for
   the old aesthetic and may benefit from a pass.

### LOW / aspirational

7. **Day click in MonthGrid.** The new Month grid doesn't wire day
   clicks yet. Wire it to navigate to `/year?view=week&date=YYYY-MM-DD`
   so users can drill from the Almanac month into CosmicCalendar's
   week detail.

8. **Stelloquy preseed when drawer already open.** Current behaviour:
   `openWith` writes preseed and sets `open=true`. If the drawer is
   already open, the OracleConversation's preseed-ref is already set,
   so the new prompt won't fire. Either close+reopen, or have
   `OracleConversation` listen for preseed updates via context. Low
   priority — modal backdrop means user can't click an aspect with the
   drawer open in practice.

---

## 6. Carry-over debt from earlier phases

These are not new — they're in the Phase 1 handoff too. Re-listed so the
next session doesn't lose them:

- **Sabian 360** — 32 transcribed, 328 pending fallbacks. Data-only,
  single edits to `TRANSCRIBED` in `lib/ephemeris/sabian.ts`.
- **Quick-line composer duplication** — `app/(app)/today/actions.ts`
  duplicates ~50 lines with `/api/journal/route.ts`. Converge during
  Phase 4 (Journal) onto a shared `lib/journal/create-entry.ts`.
- **`/oracle` deprecation** — the legacy page still exists as a safety
  net. Doc says redirect lands in Phase 5 cleanup.

---

## 7. Verification

```bash
git checkout feature/warm-almanac-year
npm install
npm run dev   # :3699

# Sign in. Sidebar's Year nav now goes to /year.
# /year             → 3-tab pill, default Year tab. CosmicCalendar's
#                     heatmap chart renders. Click a month → drilldown.
# /year?view=month  → new Almanac month grid + side panel + push-rest
#                     ribbon. Obsidian palette. Placeholder data.
# /year?view=week   → CosmicCalendar's WeekView with breadcrumb above.
# /calendar         → 308 redirects to /year.
#
# /today            → SkyBanner Sun and Moon are bordered chips with
#                     hover state. Click either → drawer opens with
#                     "Tell me about the Sun at X° Y..." auto-fired
#                     as the first message.
# ⌘K from anywhere  → drawer opens (no preseed, blank conversation).
# /year → Year tab → click a month → URL becomes ?view=month → switcher pill flips.
```

`npx tsc --noEmit` should pass clean.

---

## 8. House rules (from CLAUDE.md, do not violate)

- **Voice:** warm, grounded, anti-hustle. Reference the user's actual
  chart, transits, goals — never "where you should be."
- **No new `.md` planning docs unless explicitly asked.** This one was.
- **No service-role Supabase client outside webhooks / system jobs.**
- **No `any`-shaped type cheats.**
- **Migrations get user approval before running.** Migration 0014 was
  applied this session via the Supabase dashboard.
- **Don't refactor what works unless the refactor is the task.**
- **Server Components by default; `'use client'` only when necessary.**
  Today + Year pages are server; SkyBanner became client when it needed
  `useStelloquy()`; YearChartShell is client only to bridge YearView's
  callbacks into router navigation.

---

## 9. Quick links

- Design canon: `Kairos-handoff/kairos/project/kairos/year.jsx` (Year),
  `today.jsx`, `self.jsx`, `journal.jsx`, `ambient.jsx` (Stelloquy)
- Phase 1 baseline: `docs/handoff-2026-05-14-warm-almanac.md`
- Open PR: https://github.com/jmelendez2269/kiaros/pull/1
- Working branch: `feature/warm-almanac-year` (uncommitted)
