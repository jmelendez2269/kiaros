# Quarterly Reviews Polish + PR Stack — Handoff (2026-05-19)

Follow-on to `docs/handoff-2026-05-19-quarterly-reviews.md`. This
session closed out the MEDIUM / LOW punch list from that handoff and
pushed everything to GitHub as a stacked PR (PR #2 on top of PR #1).

**Read this first**, then drop back into the prior handoff only for
the design decisions still locked there (Slice 1–3, the SAVE / COMPLETE
/ REGENERATE matrix, the prior-quarter continuity load, etc.).

---

## 1. TL;DR

Six commits, all on `feature/warm-almanac-year`, all pushed:

- **Q1 backfill nudge.** When today's quarter is past Q1 and Q1 has no
  content, a copper-bordered banner above the quarter selector links
  back to the unfinished past quarter. Generalises: if multiple past
  quarters are untouched, the banner surfaces the most recent one.
- **GET `/api/quarterly-review?year=&quarter=`.** Returns the row's
  current state (`exists`, `wins`, `challenges`, `completedAt`,
  `aiSummary`, `statsSnapshot`, etc.) or `{ exists: false }`. Primitive
  used by the panel.
- **Panel refetch on tab focus.** `QuarterReviewPanel` watches
  `document.visibilitychange`. When the tab becomes visible *and* the
  form is clean *and* nothing is in-flight, it silently pulls the GET
  endpoint and refreshes local state. Dirty form = no refetch, so
  unsaved edits are never clobbered.
- **Streaming reflection.** New `POST /api/quarterly-review/stream`
  uses `streamText` from `ai` SDK + the existing AI Gateway pattern
  to stream the AI synthesis token-by-token. The bare save endpoint
  gains a `skipAi: true` flag so the client can save first, then
  stream. `onFinish` persists `ai_summary` + `stats_snapshot` and
  records usage; if the stream errors mid-way nothing is written.
- **Stats deltas vs prior quarter.** Server loads the prior quarter's
  `stats_snapshot` (Q1 → prior-year Q4 lookup with separate query)
  and passes it to the panel. Each activity stat now shows a delta
  beneath the number: `+12 vs Q1` (sage), `-4 vs Q1` (copperHi), or
  `±0 vs Q1` (inkSoft).
- **SkyBanner palette.** Replaced the leftover Warm Almanac cocoa
  hex literals (`#fff5e0`, `#e8dcc4`, `#f0e0c8`, `#1a0e08`) with the
  Obsidian `K` palette tokens. `/today` now feels of-a-piece with
  the rest of the app.

`npx tsc --noEmit` clean after every commit.

---

## 2. State of branches and PRs

- `main` — untouched (production deploys on push, so this stays
  unmerged until everything's verified).
- `feature/warm-almanac` — **PR #1** open against `main`. 13 commits.
  Status: `mergeable: MERGEABLE`, `mergeStateStatus: CLEAN`, all
  checks SUCCESS, zero reviews. Nothing blocking merge — just
  parked awaiting decision to ship.
- `feature/warm-almanac-year` — **PR #2** open against
  `feature/warm-almanac` (stacked, not against main). 12 commits
  on top of PR #1. Pushed to origin this session. URL:
  `https://github.com/jmelendez2269/kiaros/pull/2`.

**Why stacked instead of two parallel PRs against main**: Vercel uses
defaults (no `vercel.json` / `vercel.ts`), so pushing to `main`
deploys to production. Stacking keeps both PRs reviewable via Vercel
preview URLs without shipping either to users. When ready: merge
PR #1 → main first (Warm Almanac ships), PR #2 auto-retargets to
main, merge PR #2 → main (Phase 2 + Quarterly Reviews ships).

---

## 3. Decisions locked this session

1. **Stream uses raw text stream, not UI message stream.** Oracle
   uses `result.toUIMessageStreamResponse()` because it has tool calls
   and message structure. Quarterly review is a single text blob —
   `result.toTextStreamResponse()` is the right tool. Client reads
   the response body, decodes deltas, appends to `aiSummary`.
2. **Save → stream is a two-step flow, not one combined endpoint.**
   The client `POST`s with `skipAi: true` first (returns immediately),
   then `POST`s to `/api/quarterly-review/stream`. Reasons: keeps the
   save guarantee untouched if the stream fails, lets the panel show
   "SAVING…" then "REFLECTING…" as distinct phases, and means the
   stream endpoint can be reused for `REGENERATE` (no save step).
3. **Refetch is suppressed when the form is dirty.** The panel keeps
   a `cleanFormRef` ref of the four user-content fields. Any
   divergence makes it dirty, which blocks the focus-change refetch.
   On successful save the ref is updated to the just-saved values so
   the next refocus is allowed.
4. **Prior-year Q4 lookup is a separate query.** The page's main
   `reviewsByQuarter` map only covers the current `plan_year`. For
   Q1, the prior-quarter coordinate is `(planYear - 1, 4)` so we
   issue an extra `maybeSingle()` for the prior year row. Cheap, and
   keeps the regular query simple.
5. **Year Unwrapped is *not* the next task.** Recharts isn't
   installed (`CLAUDE.md`), the route is a 404 stub, and the carry-
   over note specifically tags it as Q4 seasonal. A polish session
   shouldn't take on feature scope.
6. **Don't invent Sabian interpretations.** The 12 OCR-blocked
   entries stay empty. CLAUDE.md forbids "generic astrology
   fortune-cookie copy"; without the source PDF, anything I'd write
   would be invented.
7. **Stacked PRs > one big PR.** Two reviewable diffs (~13 + ~12
   commits) instead of one 25-commit monster; the Warm Almanac
   foundation ships independently; Phase 2 rebases as a clean fast-
   forward after the foundation merges.

---

## 4. New / modified file inventory

```
NEW:
  app/api/quarterly-review/stream/
    route.ts                            POST handler. Validates row
                                        exists + completed + has
                                        content. Loads prompt bundle
                                        via the shared helper, calls
                                        streamText, returns
                                        result.toTextStreamResponse().
                                        onFinish persists ai_summary
                                        + stats_snapshot and records
                                        usage (best-effort; logged on
                                        failure).

MODIFIED:
  app/(app)/year/page.tsx               + QUARTER_END_LABEL map.
                                        + backfillQuarter scan (newest
                                          past not-started quarter).
                                        + showBackfillNudge banner JSX.
                                        + priorCoords lookup +
                                          priorStatsSnapshot load
                                          (with prior-year Q4 branch).
                                        + priorQuarterLabel.
                                        + new QuarterReviewPanel props.
  app/api/quarterly-review/
    route.ts                            + GET handler returning row
                                          state for client refetches.
                                        + skipAi: true in RequestBody
                                          and the save path's
                                          if (markComplete && !skipAi)
                                          guard.
  lib/ai/
    quarterly-review-generator.ts       Refactored. Extracted
                                        loadQuarterlyReviewPromptBundle()
                                        (everything up to the LLM
                                        call). generateQuarterlyReviewSummary
                                        now uses the bundle helper.
                                        Exports
                                          QUARTERLY_REVIEW_MODEL_ID
                                          QUARTERLY_REVIEW_MAX_OUTPUT_TOKENS
                                          quarterlyReviewModel()
                                          loadQuarterlyReviewPromptBundle()
  components/year/
    QuarterReviewPanel.tsx              + useEffect / useRef imports.
                                        + cleanFormRef + isDirty.
                                        + visibility-change refetch.
                                        + streamReflection() helper.
                                        + submit() does save (skipAi)
                                          then calls streamReflection.
                                        + regenerate() calls
                                          streamReflection directly.
                                        + status: 'streaming'.
                                        + status label switches
                                          ("SAVING…" / "REFLECTING…").
                                        + priorStatsSnapshot +
                                          priorQuarterLabel props.
                                        + stats grid renders a delta
                                          cell beneath each counter.
  components/today/
    SkyBanner.tsx                       Replaced 7 cocoa hex literals
                                        (#fff5e0, #e8dcc4, #f0e0c8,
                                        #1a0e08, rgba(255,245,224,*))
                                        with K.midnight / K.ink /
                                        K.inkDim / K.lineHi /
                                        rgba(227,226,237,*).

UNCHANGED but worth knowing:
  lib/reviews/save-review.ts            Untouched. The streaming flow
                                        re-uses updateQuarterlyReviewSynthesis
                                        as-is.
  supabase/migrations/                  No new migrations this session.
```

---

## 5. Open / pending — priority order

### HIGH

1. **Walk PR #2's Vercel preview.** The test plan is in the PR body
   (https://github.com/jmelendez2269/kiaros/pull/2). Untested in the
   browser:
   - Q1 backfill nudge appears on Q2/Q3/Q4 view when Q1 is unstarted
   - Streaming flow (COMPLETE REVIEW): tokens land live, stats grid
     populates after the stream ends
   - REGENERATE on a completed quarter streams fresh text
   - Prior-quarter delta cells render under each activity stat
   - SkyBanner on `/today` looks right against the Obsidian palette
   - Multi-tab: regen in tab 1, focus tab 2 with clean form → tab 2
     refreshes silently
2. **Read CodeRabbit's notes on PR #2.** Some signal, some noise;
   skim and address the ones that matter.
3. **Decide on PR #1.** Nothing's blocking it. If the Warm Almanac
   redesign is ready to go live, merge it — PR #2 will auto-retarget
   to `main`. If it's not ready, name what's missing.

### MEDIUM

4. **Journal Intelligence UI** (per `CLAUDE.md`, the documented next
   priority). `user_pattern_insights` is populated by
   `refresh_user_pattern_insight` on every journal save but never
   shown. Needs a surface — probably `/journal` or a new tab.
5. **Areas detail pages.** `/areas/[slug]` is a 404 stub. ~3 days
   per CLAUDE.md.
6. **CosmicCalendar chrome decision.** Prior handoff says the user
   was going to look at the simpler Year tab and decide which (if
   any) of the stripped chrome (kicker, SIGNALS legend, Today pill,
   breadcrumb) to bring back. Still pending.

### LOW / aspirational

7. **Free-tier OracleOverlay leather theming.** Resolves to violet
   under Obsidian, may benefit from a deliberate pass.
8. **Stelloquy preseed race when drawer already open.** Documented
   workaround: modal backdrop blocks click-through in practice.
9. **Year Unwrapped.** Q4 seasonal. Needs Recharts installed +
   route built. Drafts can pull from completed `ai_summary` strings.
10. **12 Sabian fallback interpretations.** Requires the source PDF
    to fill cleanly. Anything else would be invented.
11. **OCR cosmetic carry-overs.** Same — needs the source PDF.
12. **`/oracle` deprecation.** Phase 4 / 5 cleanup.
13. **HD + Gene Keys blueprint integration.** Math validated under
    `lib/ephemeris/human-design/`; blueprint integration deferred
    (Phase 4.5 in `docs/architecture-v2.md` §8).

---

## 6. Quick smoke-test for the streaming endpoint

Paste in your signed-in browser console on
`/year?view=review&quarter=N` where N is a completed quarter:

```js
const r = await fetch('/api/quarterly-review/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ year: 2026, quarter: 2 }),
})
const reader = r.body.getReader()
const td = new TextDecoder()
let out = ''
while (true) {
  const { done, value } = await reader.read()
  if (done) break
  const chunk = td.decode(value, { stream: true })
  out += chunk
  console.log(chunk)
}
console.log('---FULL---\n' + out)
```

Expected: chunks log incrementally; final text matches the
`ai_summary` written to the row (check via the GET endpoint).

---

## 7. House rules (from CLAUDE.md, unchanged)

- **Hyphenated model slug `claude-sonnet-4-6` is canonical.** The
  Vercel plugin's `posttooluse-validate` hook flags it asking for
  dots — ignore (documented in
  `docs/handoff-2026-05-19-quarterly-reviews.md` §3.8).
- **Production deploys on push to main.** Treat any `git push` to
  main as a live deploy. Stack PRs against feature branches when
  shipping a multi-step rollout.
- **No service-role Supabase client outside webhooks / system jobs.**
  Streaming endpoint uses `createAdminSupabase` because the route
  has done its own Clerk + profile resolution first — same pattern
  as the bare POST and the generator.
- **No invented copy.** Sabian fallbacks, voice templates, etc. —
  if we don't have the source material we don't write it.
- **No new migrations without user approval.** No migrations were
  added this session.

---

## 8. Quick links

- Open PRs:
  - PR #1: https://github.com/jmelendez2269/kiaros/pull/1
    (`feature/warm-almanac` → `main`, unmerged)
  - PR #2: https://github.com/jmelendez2269/kiaros/pull/2
    (`feature/warm-almanac-year` → `feature/warm-almanac`, this stack)
- Prior session handoffs:
  - `docs/handoff-2026-05-19-quarterly-reviews.md` (the QR UI ship)
  - `docs/handoff-2026-05-19-sabian-360.md` (Sabian + month edit)
  - `docs/handoff-2026-05-16-phase2-month-data.md` (Phase 2 / month)
- Working branch: `feature/warm-almanac-year` (in sync with origin).
