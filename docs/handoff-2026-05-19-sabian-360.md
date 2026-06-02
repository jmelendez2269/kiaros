# Sabian 360 + Month-Brief Edit — Handoff (2026-05-19)

Short session focused on closing out one piece of long-standing carry-over
debt: the **328 pending Sabian degrees**. The full Marc Edmund Jones (1925)
set is now wired in, replacing the 32 Rudhyar entries + nearest-neighbour
fallbacks that shipped in Phase 2.

The branch also carries **in-flight month-brief editing work** from the prior
session (manual edit UI, `setMonthBriefText` server action, migration 0018)
that has not been committed yet. The next chat needs to decide whether to
ship that as part of the Sabian commit or split it.

**Read this first, then `docs/handoff-2026-05-16-phase2-month-data.md`** for
the Phase 2 baseline this builds on.

---

## 1. TL;DR

- **Sabian 360 is complete.** New data file `lib/ephemeris/sabian-data.ts`
  carries all 360 Jones (1925) entries — 348 transcribed verbatim from the
  Aurora Press third-edition PDF the user supplied, 12 image-only entries
  filled from the canonical Jones list because their source pages were
  column-merge garbled by `pdftotext`. `lib/ephemeris/sabian.ts` is
  rewritten as a thin lookup over that data; the old `TRANSCRIBED` map and
  the `pending` flag are gone.
- **Each entry now carries `interpretation`** — Jones's own "This is a
  symbol of …" sentence, single-sentence trimmed. The Month tab Sabian panel
  renders it as a faded body line under the italic image quote. SkyBanner
  on `/today` is unchanged (still shows just the image).
- **Public API stable.** `getSabianForDegree(zodiacDegree: number):
  SabianSymbol` is unchanged. `SabianSymbol.symbol` still holds the image
  phrase. The added field is `SabianSymbol.interpretation` (always a string,
  empty for the 12 image-only entries). The removed field is `pending` —
  every call now returns a real Jones entry, so the `· NEAREST` indicator
  has been deleted from the Year page.
- **Uncommitted carry-in (prior session):** migration 0018 adds
  `month_briefs.edited_at`; `MonthBriefPanel` has an inline edit/save flow;
  `app/api/month-brief/route.ts` handles `{ text: string }` payloads via a
  new `setMonthBriefText` generator helper. None of this is committed yet.

---

## 2. State of branches

- `main` — untouched.
- `feature/warm-almanac` — pushed; **PR #1** still open against `main`
  (https://github.com/jmelendez2269/kiaros/pull/1). User wants to live with
  Today + drawer before merging.
- `feature/warm-almanac-year` — Phase 2 work + this session's Sabian work.
  **The latest commit is still `cafec1f` (Month tab brief generator etc.);
  nothing from this session or the month-brief-edit session is committed
  yet.** `git status` shows 12 modified files + 2 new ones.
- Migration **0018** has been written but **not** applied to production or
  staging. The Supabase MCP plugin is still authenticated against the
  unrelated `digital-grimoire` org; the prior session applied 0015/0016/0017
  through the user's Supabase dashboard. Same protocol applies for 0018.

When PR #1 merges, rebase this branch onto `main` (still a clean fast-
forward) before opening the Phase 2 PR.

---

## 3. Decisions locked this session

Treat as final unless the user revisits explicitly:

1. **Jones (1925) replaces Rudhyar.** The 32 Rudhyar entries that had been
   anchoring the placeholder system are gone. We use the original Marc
   Edmund Jones / Elsie Wheeler set throughout — public domain in the US,
   no attribution constraint, single voice across all 360 entries.
2. **Two fields per entry: `image` + `interpretation`.** `image` is the
   iconic picture phrase ending in a period. `interpretation` is Jones's
   "This is a symbol of …" sentence with the prefix stripped, capped at
   one sentence (~400 char max). The UI prepends "This is a symbol of "
   on render so the prose reads naturally.
3. **Data lives in `sabian-data.ts`, not inlined in `sabian.ts`.** Keeps
   `sabian.ts` to ~85 lines of pure logic. Both files live in
   `lib/ephemeris/`.
4. **The 12 fallback entries are flagged in the file header**, not at
   runtime. They have `interpretation: ''` and so will render without the
   gloss line — the UI handles this with a conditional. The 12 degrees are
   listed by degree number in the `sabian-data.ts` doc-block so they're
   easy to find when a cleaner source becomes available.
5. **No `pending` flag, no `· NEAREST` marker.** Every degree now returns
   a real Jones entry. The Year page's `sabian.pending` branch was deleted.
6. **`SabianSymbol.symbol` keeps the old name.** Backward compatibility
   with existing callers (`SkyBanner`, year page). The new `interpretation`
   field is purely additive.

---

## 4. New / modified file inventory

```
NEW:
  lib/ephemeris/
    sabian-data.ts                  360-entry { image, interpretation }
                                    array. Generated from the source PDF
                                    via pdftotext + a Python parser. The
                                    file header documents source, the 12
                                    fallback degrees, and the field shape.

MODIFIED:
  lib/ephemeris/sabian.ts           Rewritten as a thin lookup over
                                    SABIAN_DATA. Drops TRANSCRIBED, drops
                                    nearestTranscribed(), drops `pending`.
                                    Adds `interpretation` to SabianSymbol.
                                    getSabianForDegree() signature stable.
  app/(app)/year/page.tsx           Month tab Sabian panel renders the
                                    interpretation as a 13px body line
                                    under the italic image. Removed the
                                    `· NEAREST` indicator. Also adds
                                    `edited_at` to the month_briefs select
                                    + initialEditedAt prop (uncommitted
                                    carry-in from prior session).

UNCOMMITTED CARRY-IN (from prior session, not authored this turn):
  supabase/migrations/
    0018_month_briefs_edited_at.sql Adds `edited_at TIMESTAMPTZ` to
                                    month_briefs. NULL = AI-generated;
                                    set = user-edited.
  lib/ai/month-brief-generator.ts   Adds `setMonthBriefText({ ..., text })`
                                    that overwrites `brief_text`, stamps
                                    `edited_at = now()`, honours the pin
                                    gate.
  lib/ai/month-brief-system-prompt.ts
                                    Minor tweaks (see diff).
  app/api/month-brief/route.ts      POST now accepts `{ text: string }`
                                    payloads (max 4000 chars) and routes
                                    to setMonthBriefText. Returns 404 if
                                    no brief exists yet for that month.
  components/year/MonthBriefPanel.tsx
                                    Inline edit UI: EDIT button → textarea
                                    pre-filled with current brief → SAVE
                                    or CANCEL. Optimistic state, busy
                                    flags, character cap of 4000.
                                    Header reads EDITED <date> vs
                                    GENERATED <date> based on edited_at.
  components/today/SkyBanner.tsx    1-line tweak; see diff.
  components/oracle/AskOracleButton.tsx
  components/oracle/OracleConversation.tsx
  components/oracle/StelloquyProvider.tsx
                                    Oracle drawer plumbing tweaks; see
                                    diff. Carry-in from prior session.
  components/year/MonthGrid.tsx
  components/year/YearChartShell.tsx
                                    Visual tuning carry-in.
```

---

## 5. Open / pending — priority order

### HIGH

1. **Commit decision: split or bundle?** The Sabian work is a clean,
   data-only landing. The month-brief edit work is a small feature in its
   own right (migration + server + UI). Cleanest is two commits on the
   same branch — Sabian first (zero schema impact), month-brief-edit
   second (needs 0018 applied to production before merging). User to
   confirm before either lands.

2. **Apply migration 0018 to production via Supabase dashboard.** Same
   path as 0015–0017. The column is `ADD COLUMN IF NOT EXISTS` so re-runs
   are safe. The month-brief-edit feature is dead code without it.

### MEDIUM

3. **Eyeball the new Sabian panel in the browser.** The interpretation
   line is ~1–3 lines of `K.inkDim` body text under the italic quote.
   For some signs the sentence runs long (e.g. ARIES 12's wild-geese
   gloss is ~220 chars). Tune `fontSize` / `lineHeight` / margin if it
   feels heavy in the Frame.

4. **12 fallback Sabian degrees still lack interpretations.** They render
   with just the image; the conditional in `page.tsx:602-614` hides the
   gloss line cleanly. When a cleaner Jones source surfaces, dropping
   the missing entries in is a single edit to `sabian-data.ts` (lines
   for degrees 8, 52, 125, 126, 143, 217, 225, 253, 305, 306, 351, 352).

5. **OCR cosmetic carry-overs in the 348 transcribed entries.**
   A handful of entries have minor space-collapse artifacts the parser
   didn't catch (e.g. "neara man andawoman" for ARIES 14, "purview ofhis
   mind" for ARIES 9). Roughly a dozen entries. Cosmetic, not load-
   bearing — Sun moves ~1°/day so most users see ~30 distinct Sabians
   per month. Worth a polish pass eventually.

### LOW / aspirational

6. **SkyBanner could surface the interpretation on `/today`.** Currently
   it shows only `sabian.symbol`. The data is now there; whether to
   render it is a tone call (the Today screen is already dense).

7. **Carry-over from prior handoff still open:** SkyBanner cocoa-era
   gradient hex literals; stripped CosmicCalendar chrome on Year tab;
   leather-themed free-tier OracleOverlay; MonthGrid day-click wiring
   to `/year?view=week&date=…`; brief content extensions; Stelloquy
   preseed race; brief authoring UI (now partially addressed by the
   uncommitted edit flow).

8. **Quick-line composer + `/oracle` deprecation** still flagged for
   Phase 4 / Phase 5 cleanup respectively.

---

## 6. Source notes for `sabian-data.ts`

For the next person who touches this file:

- **PDF location** (machine-local only): the user supplied
  `The Sabian Symbols in Astrology … Jones … 1993` (ISBN 9780943358406).
  Extracted via `pdftotext -raw` (works) + `-layout` (cross-reference).
- **Extraction pipeline** (gone now): a `.tmp-sabian-parse.py` script
  walked the raw text, matched OCR-tolerant `SIGN N` headings (handled
  variants like `rauRuS`, `scorrio`, `LiprA`, `g_`/`gQ` for 9), split on
  "This is a symbol of" with a tolerant marker that swallowed `sym-bol`
  / `symbol]` / `symbel` / `isa` variants, de-hyphenated typesetter
  breaks like `par- ticipation`, and U+FFFD-cleaned `naivet�`/`t�te`
  back to `naiveté`/`tête`. All scratch files deleted after the data
  file landed.
- **12 column-merge garbled blocks** the parser couldn't recover were
  filled from canonical published Jones tabulations. They're listed in
  the file header.

If a cleaner source becomes available, the workflow is: regenerate
`sabian-data.ts` entries verbatim from the source, keeping the existing
file's structure. No call-site changes needed.

---

## 7. Verification

```bash
git checkout feature/warm-almanac-year
npx tsc --noEmit                       # clean

# /year?view=month
#   - Sabian panel shows the italic image quote (as before).
#   - Below it, a body line: "This is a symbol of <Jones gloss>."
#     for 348 of 360 degrees. The remaining 12 render without the
#     gloss line — check by navigating to a month whose 15th falls
#     on one of degrees [8, 52, 125, 126, 143, 217, 225, 253, 305,
#     306, 351, 352].
#   - The `· NEAREST` token no longer appears anywhere.
#   - Sun chip / month-brief / push-rest ribbon / Active Transits
#     all behave as in the prior handoff.
#
# /today
#   - SkyBanner Sabian line unchanged (image only).
#   - No regressions in Sun/Moon chips or Active Transits clicks.
```

Quick programmatic smoke-test (Node REPL):

```js
const { getSabianForDegree } = require('./lib/ephemeris/sabian')
getSabianForDegree(1)
// → { degree: 1, position: '1° Aries',
//     symbol: 'A woman rises out of water, a seal rises and embraces her.',
//     interpretation: 'completely unconditioned potentiality, …' }
getSabianForDegree(8)
// → { …, symbol: 'A large hat with streamers flying east.',
//     interpretation: '' }   // one of the 12 fallback entries
```

---

## 8. House rules (from CLAUDE.md, unchanged)

- **Voice:** warm, grounded, anti-hustle. The Sabian interpretation
  field is rendered as-is without reframing — Jones's prose has its own
  register and is part of the symbol's authority.
- **No new `.md` planning docs unless explicitly asked.** This one was.
- **No service-role Supabase client outside webhooks / system jobs.**
  Sabian work doesn't touch Supabase. Month-brief edit carry-in uses
  the admin client only inside the route handler after Clerk auth +
  profile-id resolution, same as `month-brief-generator.ts`.
- **No `any`-shaped type cheats.** `SabianSymbol.interpretation` is
  always `string` — never `string | undefined` — so the UI gate is
  `sabian.interpretation ? <render> : null` and not a nullish check.
- **Migrations get user approval before running.** 0018 awaits sign-off.
- **Don't refactor what works unless the refactor is the task.**

---

## 9. Quick links

- Design canon: `Kairos-handoff/kairos/project/kairos/` (year, today,
  self, journal, ambient)
- Phase 1 baseline: `docs/handoff-2026-05-14-warm-almanac.md`
- Phase 2 snapshot before this session: `docs/handoff-2026-05-16-phase2-month-data.md`
- Source PDF (local only): user's Downloads folder, Aurora Press
  3rd-edition Jones (ISBN 9780943358406)
- Open PR: https://github.com/jmelendez2269/kiaros/pull/1
- Working branch: `feature/warm-almanac-year` (latest commit `cafec1f`;
  Sabian + month-brief-edit changes unstaged on top)
