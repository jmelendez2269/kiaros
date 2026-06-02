# Quarterly Reviews UI — Handoff (2026-05-19)

This session built the **Quarterly Reviews UI** end-to-end on
`feature/warm-almanac-year`, closing one of the HIGH-priority gaps
from the 2026-05-08 baseline (`docs/handoff-2026-05-08.md` §28–32).
The `quarterly_reviews` table has existed since migration 0001 and
Oracle has been reading from it; this session shipped the create /
edit surface plus the Claude-powered AI synthesis and stats snapshot.

**Read this first, then `docs/handoff-2026-05-19-sabian-360.md`** for
the immediate-prior session state (Sabian 360 + month-brief edit, both
landed in commits `a4f26f4` and `3a9a09f`).

---

## 1. TL;DR

Built and shipped in three slices, all on the same branch, all in one
session, all in one commit:

- **Slice 1 — Surface + form.** New `Review` tab on `/year`. Quarter
  selector pills (Q1–Q4) with live status badges (`COMPLETED`,
  `DRAFT`, `NOT STARTED`, `FUTURE QUARTER`). Form has four fields:
  wins (multi-line bullets), challenges (multi-line bullets), pivots
  (textarea), next-quarter intentions (textarea). Saves through
  `/api/quarterly-review` to the existing `quarterly_reviews` table —
  **no schema migration needed**.
- **Slice 2 — AI synthesis + stats.** On COMPLETE REVIEW the route
  saves content first (guaranteed) then calls Claude Sonnet 4.6 for a
  2–3 paragraph reflection, simultaneously computing
  `stats_snapshot` from `daily_logs` / `journal_entries` /
  `oracle_captures` / `curriculum_sessions` counts for the quarter's
  date range. AI failure leaves content saved with a null summary —
  the user can regenerate later.
- **Slice 3 — Draft semantics, regen, prior-quarter continuity.**
  Two save modes: `SAVE DRAFT` (no `completed_at`, no AI) and
  `COMPLETE REVIEW` (stamps `completed_at`, runs AI). On completed
  rows the buttons become `SAVE CHANGES` (content-only, preserves
  timestamp) and `REGENERATE` (AI re-run against existing content,
  rejects drafts). The generator now loads the prior completed quarter
  (Q1→prior-year-Q4 rollover) and feeds its summary + wins/challenges
  into the prompt for narrative continuity. System prompt instructs
  Claude to acknowledge genuine continuity only — never invent
  throughlines.

`npx tsc --noEmit` is clean.

---

## 2. State of branches

- `main` — untouched.
- `feature/warm-almanac` — pushed; **PR #1** still open against `main`
  (https://github.com/jmelendez2269/kiaros/pull/1). Unmerged.
- `feature/warm-almanac-year` — **5 commits ahead of origin** after
  this session:
  ```
  <THIS COMMIT> Quarterly Reviews UI: form, AI synthesis, drafts, regen
  3a9a09f Month brief: inline edit flow + edited_at lock against regenerate
  a4f26f4 Sabian 360: replace pending fallbacks with full Jones (1925) set
  cafec1f Month tab: brief generator, pin, Sabian, push-rest arc, transit click
  a8be2b5 Month view: real blueprint data + journal indicators
  ```
- **No migration ran this session.** `quarterly_reviews` has existed
  since 0001; `wins JSONB`, `challenges JSONB`, `stats_snapshot JSONB`,
  `ai_summary TEXT`, and `completed_at TIMESTAMPTZ` were all already in
  place. Slice 2's stats and AI synthesis live in JSONB / TEXT
  columns that were sitting empty.

When PR #1 merges, rebase this branch onto `main` (still a clean
fast-forward) before opening the Phase 2 PR.

---

## 3. Decisions locked this session

Treat as final unless the user revisits explicitly:

1. **Surface = Review tab on `/year`.** Not a top-level `/reviews`
   route. Keeps quarterly framing inside the yearly arc and reuses
   the `YearChartShell` chrome. Tab nav lives in
   `components/year/YearViewSwitcher.tsx`; the route is
   `/year?view=review&quarter=N`.
2. **All four quarters are editable.** Including future ones. Some
   people set intentions early. The status badge in the selector
   reflects state (`FUTURE QUARTER`, `NOT STARTED`, `DRAFT`,
   `COMPLETED`) without gating access.
3. **`wins` and `challenges` = `string[]` (bullet list).** Stored as
   JSONB arrays of strings. UI presents them as multi-line textareas
   where each non-empty line becomes one bullet. Server sanitises:
   max 10 bullets, max 400 chars each.
4. **Draft vs Complete.** Default save is COMPLETE. Drafts are
   explicit — `SAVE DRAFT` posts `markComplete: false` and never sets
   `completed_at` (preserves an existing timestamp on already-completed
   rows). AI synthesis runs only on completion to keep token spend
   to ~4 calls/user/year.
5. **AI synthesis is best-effort.** Content always saves first; AI
   runs after; on failure the row keeps `ai_summary = null` and the
   user can `REGENERATE` later. Route returns 200 with the saved
   content plus a null `aiSummary` — no error surfaces to the user.
6. **Regenerate operates on the row's stored content**, not the
   form's current text. This means: edit, hit SAVE CHANGES (no AI),
   then REGENERATE picks up the updated content. Two-step is
   deliberate — keeps AI tokens behind an explicit user gate.
7. **Prior-quarter continuity load.** Generator queries the prior
   completed quarter with a Q1→prior-year-Q4 rollover. If no prior
   completed review exists, the prompt receives `null` and the system
   prompt's "ONLY acknowledge genuine continuity" clause keeps the
   model from inventing one.
8. **Same Vercel model-slug hyphen vs dot quibble as Phase 2.**
   `claude-sonnet-4-6` (hyphens) is the canonical Anthropic ID used
   throughout the codebase. The plugin's `posttooluse-validate` hook
   flags hyphens and asks for dots — **ignore it.** Documented in
   `docs/handoff-2026-05-16-phase2-month-data.md` §9.

---

## 4. New / modified file inventory

```
NEW:
  lib/ai/
    quarterly-review-system-prompt.ts   System + user prompt assembly.
                                        Includes QuarterlyReviewStats,
                                        PriorQuarterContext, and the
                                        Kiaros-voiced system prompt
                                        with the "no invented
                                        throughlines" continuity clause.
    quarterly-review-generator.ts       generateQuarterlyReviewSummary.
                                        Parallel loads profile,
                                        blueprint, journal patterns,
                                        prior quarter, and the four
                                        per-quarter counts. Calls Claude
                                        Sonnet 4.6 via Vercel AI Gateway,
                                        records usage.
  lib/reviews/
    save-review.ts                      Two helpers:
                                          saveQuarterlyReview(opts)
                                            upserts content fields,
                                            conditionally stamps
                                            completed_at.
                                          updateQuarterlyReviewSynthesis
                                            updates ai_summary +
                                            stats_snapshot for an
                                            existing row.
  app/api/quarterly-review/
    route.ts                            POST handler. Three modes:
                                          regenSummary=true → AI only
                                          markComplete=false → draft
                                          markComplete=true → complete
                                            (default). maxDuration=90.
  components/year/
    QuarterReviewPanel.tsx              Client form island. Wins /
                                        challenges textareas (one
                                        bullet per line), pivots /
                                        intentions textareas, three
                                        save-button states (SAVE DRAFT
                                        + COMPLETE REVIEW for drafts,
                                        SAVE CHANGES + REGENERATE for
                                        completed), reflection block,
                                        stats grid.

MODIFIED:
  components/year/YearViewSwitcher.tsx  Added 'review' to View type and
                                        VIEWS array. Now renders four
                                        tabs: Year / Month / Week /
                                        Review.
  app/(app)/year/page.tsx               Added 'review' to View, parseView,
                                        new parseQuarter() and
                                        currentQuarter() helpers, new
                                        QuarterReviewView server
                                        component (loads reviews for
                                        the plan_year, renders quarter
                                        selector + blueprint context +
                                        QuarterReviewPanel). New
                                        QUARTER_MONTHS, quarterStatus,
                                        statusLabel helpers.

UNCHANGED but worth knowing:
  supabase/migrations/0001_product_bible_schema.sql:272-296
                                        quarterly_reviews table. All
                                        columns this session uses
                                        existed in 0001.
  lib/ai/usage.ts:17                    'quarterly_review' was already
                                        in the AIFeature union — no
                                        change needed.
  app/api/oracle/chat/route.ts:130-134  Oracle has been reading the
                                        last two reviews since before
                                        this session. Untouched.
```

---

## 5. Open / pending — priority order

### HIGH (none)

The Quarterly Reviews UI is shippable. No HIGH items.

### MEDIUM

1. **Q1 backfill prompt.** Today is 2026-05-19 → Q2 in-progress, Q1
   already past. Most users land on `/year?view=review` and see Q2
   selected. There's no nudge to backfill Q1. A small empty-state on
   Q1 ("Q1 ended on March 31 — want to look back?") would convert.
   Lives in `app/(app)/year/page.tsx` inside `QuarterReviewView`.

2. **Eyeball the form in the browser.** The whole thing is
   tsc-clean but unverified visually. Things to check:
   - Status badges in the quarter selector render with the right
     tones (`COMPLETED` = sage, `DRAFT` = copperHi, `NOT STARTED` =
     inkDim, `FUTURE QUARTER` = inkSoft).
   - `REGENERATE` button only appears on completed rows.
   - AI synthesis loading block (10–15 second wait) is bearable; if
     not, consider streaming the response via `streamText`.
   - Stats grid `repeat(auto-fit, minmax(140px, 1fr))` doesn't get
     squeezed on narrow viewports.

3. **GET endpoint for fresh data.** `/api/quarterly-review` is
   POST-only. Server prefetches initial data, then the client mutates
   locally. Works fine in practice but if a user regenerates in one
   tab and switches to another, the second tab is stale until a
   full reload. Low-stakes unless multi-tab becomes common.

### LOW / aspirational

4. **Stream the reflection.** Right now the user waits 10–15 seconds
   staring at "Reflecting on Q{n}…" before the full text appears.
   The AI SDK's `streamText` would let us write tokens as they
   arrive, same pattern Oracle uses
   (`app/api/oracle/chat/route.ts`). Tradeoff: regen flow becomes
   more complex (need to wait for stream end before saving to DB).

5. **`stats_snapshot` is opaque.** It's stored as raw counts. Could
   surface trends (e.g. journal entries up vs prior quarter), but
   that requires loading the prior quarter's snapshot for
   comparison.

6. **Review export.** A user with four completed quarters has the
   ingredients for a year-in-review letter. The `Year Unwrapped`
   gap from the 2026-05-08 baseline could draw on these
   `ai_summary` strings as raw material. Q4 2026 seasonal target.

7. **Carry-over from prior handoffs still open:** SkyBanner cocoa-era
   gradient hex literals; stripped CosmicCalendar chrome on Year tab;
   leather-themed free-tier OracleOverlay; MonthGrid day-click wiring
   to `/year?view=week&date=…`; Stelloquy preseed race; quick-line
   composer + `/oracle` deprecation (Phase 4 / 5 cleanup); 12 Sabian
   fallback interpretations awaiting a cleaner source; OCR cosmetic
   carry-overs in the 348 transcribed Sabian entries.

---

## 6. Behavioural reference

The matrix the panel implements:

| Action               | Saves content | Sets completed_at      | Runs AI |
|----------------------|---------------|------------------------|---------|
| `SAVE DRAFT`         | ✓             | preserves existing     | ✗       |
| `COMPLETE REVIEW`    | ✓             | sets to `now()`        | ✓       |
| `SAVE CHANGES`       | ✓             | preserves existing     | ✗       |
| `REGENERATE`         | ✗             | preserves existing     | ✓       |

The buttons shown depend on `isCompleted`:
- **Not completed** (`completed_at IS NULL`): `SAVE DRAFT` + `COMPLETE REVIEW`
- **Completed** (`completed_at` set): `SAVE CHANGES` + `REGENERATE`

The status badges in the quarter selector use `quarterStatus()` in
`app/(app)/year/page.tsx`:
- `'completed'` → has `completed_at`
- `'draft'` → has content (wins / challenges / pivots / intentions)
   but no `completed_at`
- `'future'` → quarter > current quarter (today is 2026-05-19 → Q2)
- `'not-started'` → none of the above (current or past quarter,
   no content)

---

## 7. Verification

```bash
git checkout feature/warm-almanac-year
npx tsc --noEmit                       # clean

# /year?view=review
#   Lands on Q2 (current quarter as of 2026-05-19) by default.
#
#   Quarter selector strip shows four cards:
#     Q1 · JAN — MAR    | NOT STARTED   (or DRAFT / COMPLETED if backfilled)
#     Q2 · APR — JUN    | NOT STARTED   (or DRAFT / COMPLETED)  ← active
#     Q3 · JUL — SEP    | FUTURE QUARTER
#     Q4 · OCT — DEC    | FUTURE QUARTER
#
#   Active card has copper border and bg2 fill; others are line-bordered.
#
#   Header shows: Kicker → Q2 · Apr — Jun (italic serif) → blueprint
#   theme (if present) → status badge on the right.
#
#   Right rail: Quarter context Frame with the blueprint's INTENTION
#   and KEY TRANSITS bullets, pulled from blueprint.quarters[i].
#
#   Main form (left):
#     WINS textarea (rows=5) · one bullet per line
#     CHALLENGES textarea (rows=5) · one bullet per line
#     PIVOTS textarea (rows=3)
#     NEXT QUARTER INTENTIONS textarea (rows=3)
#
#   Bottom row: status text on the left, buttons on the right.
#     Not started: [SAVE DRAFT] [COMPLETE REVIEW]
#     After SAVE DRAFT: same buttons, status text shows SAVED.
#     After COMPLETE REVIEW: 10–15s "Reflecting…" → REFLECTION
#       block + ACTIVITY THIS QUARTER stats grid (5 cards).
#       Buttons switch to [SAVE CHANGES] [REGENERATE].
#
#   Click a different quarter pill → server-side reload with that
#   quarter's saved state pre-filled.
#
# Quick programmatic smoke-test (in node REPL or as a temp script):
#   await fetch('/api/quarterly-review', {
#     method: 'POST',
#     headers: { 'Content-Type': 'application/json' },
#     body: JSON.stringify({ year: 2026, quarter: 1, regenSummary: true }),
#   })
#   // → 404 if no Q1 row yet, 400 if Q1 is draft, 200 with new summary
#   //   if Q1 is completed.
```

---

## 8. House rules (from CLAUDE.md, unchanged)

- **Voice:** warm, grounded, anti-hustle. The reflection prompt
  explicitly bans optimise / level up / grind language and the
  "where you think you should be" framing.
- **No service-role Supabase client outside webhooks / system jobs.**
  `quarterly-review-generator.ts` uses `createAdminSupabase` because
  it runs from a route handler that's just done its own Clerk auth
  check and resolved the profile ID — same pattern as
  `month-brief-generator.ts` and `blueprint-generator.ts`.
- **No `any`-shaped type cheats.** `wins` and `challenges` come back
  as `Json` from Supabase and are coerced with type predicates, not
  `as string[]` casts.
- **Migrations get user approval before running.** No migration ran
  this session — the columns all existed since 0001. The previous
  session's 0018 was applied to production by the user before this
  session started.
- **Server Components by default; `'use client'` only when necessary.**
  `QuarterReviewView` is server-rendered. `QuarterReviewPanel` is
  client because of the form state, mutation calls, and busy / error
  status machine.
- **Don't refactor what works unless the refactor is the task.**

---

## 9. Quick links

- Design canon: `Kairos-handoff/kairos/project/kairos/` (year, today,
  self, journal, ambient)
- Phase 1 baseline: `docs/handoff-2026-05-14-warm-almanac.md`
- Phase 2 snapshot: `docs/handoff-2026-05-16-phase2-month-data.md`
- Sabian 360 + month-brief edit: `docs/handoff-2026-05-19-sabian-360.md`
- Open PR: https://github.com/jmelendez2269/kiaros/pull/1
- Working branch: `feature/warm-almanac-year` (this session's commit
  is the latest; **5 commits ahead of origin, unpushed**)
