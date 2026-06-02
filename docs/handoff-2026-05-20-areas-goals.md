# Areas — Goals + Definitions — Handoff (2026-05-20)

First session of 2026-05-20. Follow-on to the Journal Insight Voice
slice handed off in `docs/handoff-2026-05-19-journal-insight-voice.md`.
The prior session's commits were still local-only at session start;
they're pushed now along with this session's work.

The selected next-up was **Areas detail pages**, which CLAUDE.md and
the QR-polish handoff both flagged as "the only HIGH coding gap left."
Turns out the framing was wrong — `/areas/[slug]` was already a fully
implemented detail page. The actual gap was two-layered: missing area
definitions for 5 of 8 onboarding-suggested categories, and a real
goals surface to replace the "Coming next" placeholder at the bottom
of the page.

**Read this first** for state + open work; drop back into the prior
handoffs only if you need branch/PR context.

---

## 1. TL;DR

Everything below is **committed and pushed** on `feature/warm-almanac-year`.
Three new commits this session plus two pushed-but-unmerged from the
prior session. `npx tsc --noEmit` clean throughout.

- **Pushed the prior stack.** `4a4aa0b` (journal-insight synthesis)
  and `100a5ea` (its handoff doc) were local-only at session start —
  pushed at the end of step 1 alongside this session's first commit.
- **Sidebar Insights sub-entry.** Indented "Insights" row appears
  under the Journal door when `/journal*` is the active route and
  the sidebar isn't collapsed. Four-door top-level layout preserved.
- **JournalComposer CTA promoted.** The tertiary "View patterns
  Kiaros has noticed →" text-link became a bordered panel CTA with
  copper glyph, descriptive sub-copy, and a nudging arrow. Promotes
  the destination now that the insights page is actually good.
- **CLAUDE.md current-state refresh.** Schema reference 0013→0019,
  Journal Insights + Quarterly Reviews moved to Shipped, HIGH gap
  updated to Areas detail pages (since corrected to "filling
  area-template gaps + itemised goals UI").
- **Areas template-data gap closed.** Added 5 area definitions to
  `lib/areas.ts`: Health & Wellness (6/1/12), Creative Projects
  (5/3/11), Personal Growth (9/12/1), Family (4/5/3), Spirituality
  (12/9/8). Same shape as the existing 3 entries; tone matches
  CLAUDE.md house rules.
- **Itemised goals per area.** New `area_goals` table (migration
  0020), CRUD API at `/api/areas/[slug]/goals` (list+create) and
  `/api/areas/goals/[id]` (patch+delete), `AreaGoalsPanel` client
  component with inline add/edit forms, status cycle dropdown,
  optional linked-week selector, archived toggle. Page replaces
  the "Coming next" placeholder with the new panel.

---

## 2. State of branches and PRs

- `main` — unchanged.
- `feature/warm-almanac` — **PR #1** open against `main`. Untouched
  this session. Still mergeable, parked.
- `feature/warm-almanac-year` — **PR #2** open against
  `feature/warm-almanac`. **Pushed** to origin. Stack is now 7
  commits ahead of `feature/warm-almanac`:
  - `b72ccbf` Areas: itemised goals per area, linked to timing windows
  - `274c002` Areas: define the 5 missing onboarding categories
  - `30138ea` Sidebar + composer: promote Journal Insights surface
  - `100a5ea` Handoff doc: Journal Insight Voice slice
  - `4a4aa0b` Journal Insights: AI synthesis layer + voice control + bulk regen
  - `6acef20` Handoff doc: Quarterly Reviews polish + PR #2 stack
  - `aad0032` SkyBanner: replace cocoa-era hex literals with Obsidian K tokens

Stacked-PR rationale unchanged. CodeRabbit auto-reviews still skipped
(non-default base + free-tier author).

---

## 3. Decisions locked this session

1. **CLAUDE.md "404 stub" claim was wrong.** `/areas/[slug]` has
   been a real detail page for some time — hero, current window,
   year narrative, chart anchors, upcoming windows, supporting
   practices, best months. The doc rotted because the gap was
   never properly diagnosed. The real gap was always two slices:
   missing area templates and missing itemised goals UI.
2. **Slice 1 = pure data, no schema.** Adding 5 entries to the
   `AREA_DEFINITIONS` array was enough to restore the chart-
   anchoring layer for the majority of real onboarded users.
   No migration, no UI changes, no API. Half-day at most;
   actually closer to 15 minutes once the houses were chosen.
3. **House assignments for the 5 new areas** are defensible
   standards, not invented:
   - Health & Wellness → 6 (daily work, health), 1 (body), 12 (rest)
   - Creative Projects → 5 (creativity), 3 (expression), 11 (audience)
   - Personal Growth → 9 (meaning, learning), 12 (inner work), 1 (becoming)
   - Family → 4 (roots, home), 5 (children), 3 (siblings)
   - Spirituality → 12 (transcendence), 9 (philosophy), 8 (depth)
4. **Goals live on a new table, not a JSONB column.** Considered
   `goals JSONB DEFAULT '[]'` on `goal_categories` (smaller migration,
   no join). Picked the table because Oracle and quarterly reviews
   will both want to query across goals (e.g. "what goals shifted
   from active to paused this quarter?"). JSONB would have meant
   rewriting those queries when the time came.
5. **Goal status enum is 4-state, not 2.** active / paused /
   completed / archived. Paused is the soft "still mine, just not
   now" state; archived is the soft delete (kept for history, hidden
   from default view). Considered a single `is_active` boolean and
   dropped it — paused vs. completed vs. archived all serve different
   UI/query needs.
6. **`linked_week_number` is optional and free of FK.** A goal can
   exist without a window tie-in. The week number is just an integer
   (1–53); we don't FK into `blueprints.weeks` because that JSON
   shape changes per generation and the user can have multiple
   blueprint versions. The UI resolves the number to a window theme
   client-side from the page's `upcomingWindows` prop.
7. **No usage gate on goals.** Cheap rows, user-driven, low blast
   radius. Skip the cap.
8. **Boundary cast `as any` on the Supabase client.** Same pattern
   as the journal-insights page used for `ai_summary` and
   `user_settings` columns. `supabase gen types` won't include
   `area_goals` until 0020 is applied and types are regen'd. After
   that, the cast becomes a no-op and the `AreaGoal` type from
   `AreaGoalsPanel.tsx` matches the row shape.
9. **No new Oracle / quarterly-review wiring yet.** Goals exist as
   a standalone surface this session. Pulling them into Oracle's
   system prompt and into quarterly-review activity stats is a
   follow-up — not bundled here because both touch shared prompt /
   review code that should land in its own slice.

---

## 4. New / modified file inventory

```
NEW:
  supabase/migrations/
    0020_area_goals.sql                area_goals table. RLS via
                                       own_area_goals (clerk-mapped),
                                       trg_updated_at trigger.
                                       Indexes: user_id, category_id,
                                       (category_id, sort_order).

  app/api/areas/
    [slug]/goals/route.ts              GET list (per area), POST create.
                                       Resolves slug -> category_id via
                                       a goal_categories scan (RLS limits
                                       to own rows, max 7 anyway).
                                       Validates title <= 200,
                                       description <= 1000, target_label
                                       <= 60, linked_week 1-53.
    goals/[id]/route.ts                PATCH update (title, description,
                                       status, target_label,
                                       linked_week_number, sort_order),
                                       DELETE. RLS enforces ownership.

  components/areas/
    AreaGoalsPanel.tsx                 Client. Inline add form,
                                       per-row edit form (replaces the
                                       row when active), status cycle
                                       dropdown with colored tones,
                                       linked-week select from upcoming
                                       windows, archived toggle.
                                       Optimistic local state + a
                                       router.refresh() echo so server
                                       components downstream pick up
                                       changes.

MODIFIED:
  lib/areas.ts                         + 5 new AREA_DEFINITIONS entries
                                         matching the onboarding
                                         suggested-categories list.

  app/(app)/areas/[slug]/page.tsx      + Loads area_goals for the
                                         resolved category via a
                                         boundary `as any` cast (see
                                         §5 HIGH #2).
                                       + Replaces the dashed "Coming
                                         next" placeholder section
                                         with <AreaGoalsPanel/>.

  components/journal/JournalComposer.tsx
                                       + Tertiary text-link promoted
                                         to bordered CTA panel with
                                         copper glyph + descriptive
                                         sub-copy + nudging arrow.
                                       + Moved out of the panel header
                                         flex row so it has room to
                                         breathe.

  components/almanac/AlmanacSidebar.tsx
                                       + NAV typed with optional
                                         subItems; only Journal has
                                         one (Insights -> /journal/insights).
                                       + Renders indented under the
                                         Journal door when active,
                                         with left border in the door's
                                         tone. Collapsed sidebar hides
                                         sub-items.

  CLAUDE.md                            + Current-state date refresh.
                                       + Schema reference 0013 -> 0019.
                                       + Journal Insights + Quarterly
                                         Reviews moved into Shipped.
                                       + HIGH gap rewritten (was the
                                         "404 stub" claim; corrected
                                         later in the session — see
                                         §5 LOW #9).
```

---

## 5. Open / pending — priority order

### HIGH

1. **Apply migration 0020 to production Supabase.** Path same as
   0015–0019: copy the SQL into the Supabase dashboard SQL editor and
   run. The table uses `CREATE TABLE IF NOT EXISTS` and all indexes /
   the trigger guard against re-runs. Until this runs, every load
   of `/areas/[slug]` crashes on the `from('area_goals')` query.
2. **Regenerate types** — `supabase gen types`. The boundary cast at
   [app/(app)/areas/[slug]/page.tsx:108-109](app/(app)/areas/[slug]/page.tsx#L108-L109)
   becomes a no-op once `area_goals` lands in `types/database.ts`.
   Worth removing the cast for cleanliness; the `AreaGoal` interface
   in `AreaGoalsPanel.tsx` should match the generated row shape.
3. **Browser walkthrough on `/areas/[slug]`** for each category
   bucket. Untested in browser this session:
   - **A pre-existing area** (e.g. `/areas/relationships`) — confirm
     houses + natal placements still render, year narrative is
     unchanged, current window panel works
   - **A newly-defined area** (e.g. `/areas/health-wellness` if the
     user has it onboarded) — confirm houses 6/1/12 render with the
     user's signs, natal placements are filtered correctly, year
     narrative pulls from the new template
   - **A custom-named area** — confirm fallback definition still
     renders (empty houses, generic narrative, but no crash)
   - **Goals panel** end-to-end:
     - "Add a goal" reveals the form; saving creates a row that
       appears in the list and persists on refresh
     - Edit pencil swaps the row for an edit form; saving updates
       in place
     - Status dropdown cycles active/paused/completed/archived;
       UI tones change
     - Linked-week select shows the upcoming windows from the
       page; selecting one renders the theme on the goal row
     - Delete button confirms then removes
     - "Show archived" toggle reveals archived rows; counts line
       updates correctly
     - Empty state ("No goals yet for this area") renders for a
       user with zero goals
4. **Update PR #2 description.** The PR title and body still reflect
   the QR polish + journal insights slices. Worth a quick edit to
   mention the Areas work so reviewers (or future-you) can find
   it without scrolling commits.

### MEDIUM

5. **Pull goals into Oracle's system prompt.** Today Oracle reads
   `oracle_captures`, quarterly reviews, and journal insights —
   not area goals. Worth surfacing active goals as context so
   Stelloquy can reference "you said your relationship goal was
   X" without the user having to retype it. Touch point:
   `lib/ai/oracle-system-prompt.ts`.
6. **Pull goals into quarterly-review activity stats.** The Q2
   review deltas could include "X goals moved from active to
   completed this quarter, Y were paused." Touch point:
   `lib/ai/quarterly-review-*` and the activity stats query.
7. **Promote the inline Areas link.** AlmanacSidebar's Self door
   (`/human-design`) — but Areas live under it conceptually. There's
   no top-level Areas entry. Worth either making Self a sub-grouping
   like Journal now is, or adding a top-level Areas entry. Will
   need a design call.
8. **Update CLAUDE.md again.** This session's commit moved Areas
   detail pages into Shipped (since the page itself was already
   real). But the doc still lists "JournalComposer CTA + sidebar
   entry for /journal/insights" as a follow-up — that's done now
   too. Plus the new follow-ups in this list belong in CLAUDE.md.

### LOW

9. **Goal reordering UI.** `sort_order` is in the schema but the
   panel doesn't expose drag-and-drop yet. `@dnd-kit/sortable` is
   already a project dependency (per CLAUDE.md). Drop-in if anyone
   complains.
10. **Goal -> journal entry handoff.** Today the JournalComposer
    accepts area + theme + intention via query string from a
    timing window. Could accept `goal_id` too and stamp the goal
    onto the entry. Small follow-up.
11. **Goal completion celebration.** Completing a goal is silent.
    A subtle confirmation (toast? card highlight?) would be nice
    but not load-bearing.
12. **Areas page list — show goal count per card.** `/areas`
    currently shows "Current timing" per card; adding "3 active
    goals" would give the list more weight.

---

## 6. Quick smoke-tests

### Goals API (browser console, signed-in)

```js
// List goals for an area (assumes /areas/relationships exists for this user)
const slug = 'relationships'
const list = await fetch(`/api/areas/${slug}/goals`).then(r => r.json())
console.log(list)
// Expected: { goals: [...] } or { goals: [] }

// Create a goal
const created = await fetch(`/api/areas/${slug}/goals`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Reach out to one person I have been avoiding',
    description: 'The conversation I keep postponing.',
    target_label: 'this month',
    linked_week_number: 24,
  }),
})
console.log(created.status, await created.json())
// Expected: 201 { goal: { id, title, ... } }

// Patch status
const id = '...'
const patched = await fetch(`/api/areas/goals/${id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'completed' }),
})
console.log(patched.status, await patched.json())
// Expected: 200 { goal: { ..., status: 'completed' } }

// Delete
const del = await fetch(`/api/areas/goals/${id}`, { method: 'DELETE' })
console.log(del.status, await del.json())
// Expected: 200 { success: true }
```

### Area-definition coverage

```js
// In the browser, no auth needed — just walks each suggested category
const suggested = [
  'Work & Career', 'Relationships', 'Health & Wellness',
  'Creative Projects', 'Personal Growth', 'Family',
  'Financial', 'Spirituality',
]
// For each, /areas/<slug> should render houses + a non-generic year narrative.
// Custom-named areas still hit the fallback (empty houses, generic prose),
// which is correct behaviour.
```

---

## 7. House rules (from CLAUDE.md, unchanged)

- **Hyphenated model slugs are canonical** (e.g. `claude-haiku-4-5`).
  The Vercel plugin's `posttooluse-validate` hook flags them asking
  for dots — ignore. Not relevant this session; no model calls added.
- **Production deploys on push to main.** This branch is the stacked
  PR #2 branch; pushing here is safe (Vercel preview only). Don't
  push to main without a deliberate decision.
- **No service-role Supabase client outside webhooks / system jobs.**
  All four new routes follow the existing pattern: Clerk `auth()`
  first, then `createServerSupabase()` (anon, RLS-aware). RLS does
  the ownership enforcement.
- **No new migrations without user approval.** User approved 0020
  this session before any SQL was written.
- **Tone: warm, grounded, anti-hustle.** The new area definitions
  and the AreaGoalsPanel copy follow this — no "level up," no
  "optimise," no fortune-cookie astrology. The placeholder copy
  ("Small enough to track, specific enough to mean something")
  is on-voice.

---

## 8. Quick links

- Open PRs:
  - PR #1: https://github.com/jmelendez2269/kiaros/pull/1
    (`feature/warm-almanac` → `main`, unmerged)
  - PR #2: https://github.com/jmelendez2269/kiaros/pull/2
    (`feature/warm-almanac-year` → `feature/warm-almanac`, this stack)
- This session's commits on `feature/warm-almanac-year`:
  - `b72ccbf` Areas: itemised goals per area, linked to timing windows
  - `274c002` Areas: define the 5 missing onboarding categories
  - `30138ea` Sidebar + composer: promote Journal Insights surface
- Prior session handoffs:
  - `docs/handoff-2026-05-19-journal-insight-voice.md` (synthesis + voice)
  - `docs/handoff-2026-05-19-quarterly-reviews-polish.md` (QR polish + PR #2)
  - `docs/handoff-2026-05-19-quarterly-reviews.md` (the QR UI ship)
  - `docs/handoff-2026-05-19-sabian-360.md` (Sabian + month edit)
- Files added this session:
  - [supabase/migrations/0020_area_goals.sql](supabase/migrations/0020_area_goals.sql)
  - [app/api/areas/[slug]/goals/route.ts](app/api/areas/[slug]/goals/route.ts)
  - [app/api/areas/goals/[id]/route.ts](app/api/areas/goals/[id]/route.ts)
  - [components/areas/AreaGoalsPanel.tsx](components/areas/AreaGoalsPanel.tsx)
- Files modified this session:
  - [lib/areas.ts](lib/areas.ts)
  - [app/(app)/areas/[slug]/page.tsx](app/(app)/areas/[slug]/page.tsx)
  - [components/journal/JournalComposer.tsx](components/journal/JournalComposer.tsx)
  - [components/almanac/AlmanacSidebar.tsx](components/almanac/AlmanacSidebar.tsx)
  - [CLAUDE.md](CLAUDE.md)
