# Warm Almanac Redesign — Handoff (2026-05-14)

You are picking up a multi-phase UI restructure of Kiaros. The product is being
rebuilt around a design handoff from Claude Design called **Kairos · Warm
Almanac** (the new user-facing product name). The backend is largely
unchanged — this is a presentational + IA restructure on top of the existing
data pipeline.

**Read this first, then `Kairos-handoff/kairos/project/Kairos Redesign.html`
for the design canon. Do not start coding until you have read both.**

---

## 1. Where we are

- **Branch:** `feature/warm-almanac` (branched off `feature/human-design`)
- **Four commits landed:**
  - `d96bb3a` — Warm Almanac foundations (tokens, fonts, brand, primitives)
  - `c5a31d8` — Shell live (`AlmanacSidebar` + `/today` placeholder + dock)
  - `c219946` — Today wired to live ephemeris + `StelloquyShell` drawer + `/dashboard → /today` redirect
  - `0a09b22` — **Phase 1.C polish** (Sabian 360 stub, Active Transits panel, inline LineForToday composer with server action, OracleConversation extraction)
- **Type-clean** (`npx tsc --noEmit` passes after each commit)
- **Old routes still resolve** — `/calendar`, `/human-design`, `/journal`,
  `/tracker`, `/areas`, `/blueprint`, `/curriculum`, `/oracle` — but Year /
  Self / Journal nav links currently point at the legacy routes. They'll
  flip as Phases 2/3/4 land.

### What a signed-in user sees right now

- Lands on `/today` (was `/dashboard`).
- New cocoa/copper Warm Almanac shell. Four nav items (Today / Year / Self /
  Journal). Pinned areas in sidebar. Mobile drawer + desktop collapse.
- `/today` shows a real SkyBanner (sun/moon longitudes, moon illumination,
  Sabian for the Sun degree — exact-degree lookup), three Shape-of-Today
  cards (energy / voice / body, derived deterministically from moon phase +
  moon sign), an **Active Transits panel** stacked below Shape-of-Today
  (rarity, applying/separating state, live orb), a transit-only mini
  ephemeris wheel, a 7-day week ribbon, and an **inline LineForToday
  composer** (textarea + tag chips + ⌘/Ctrl+Enter save + streak bump,
  backed by an `app/(app)/today/actions.ts` server action that mirrors
  `POST /api/journal`).
- A Stelloquy orb pulses bottom-right of every authed page. Click it or press
  **⌘K / Ctrl+K** anywhere → right-side drawer slides in with the streaming
  chat (now `OracleConversation`, the extracted chat body — no backend
  changes). Esc / backdrop / X to close.

---

## 2. Locked product decisions

Earlier in the session the user committed to these. Treat as final:

1. **External rename Kiaros → Kairos.** Only user-facing strings. DB tables,
   `/api/oracle/*`, repo name, env vars, internal code identifiers stay
   `Kiaros` / `Oracle`. Read user-facing strings from `lib/brand.ts`:
   `BRAND.product = 'Kairos'`, `BRAND.oracle = 'Stelloquy'`.
2. **Oracle → Stelloquy** (same rule — user-facing only).
3. **Phased rollout, one PR per screen.** Today first (done). Year → Self →
   Journal → cleanup. Each phase is its own commit on
   `feature/warm-almanac`.
4. **Old routes redirect to new IA, components deleted in Phase 5.** Today's
   redirect (`/dashboard → /today`) is permanent. Future redirects:
   `/calendar`, `/blueprint`, `/curriculum` → `/year`; `/human-design`,
   `/areas` → `/self`; `/tracker` → `/journal?tab=track`; `/oracle` → `/today`
   (last because the drawer needs to be proven first).
5. **Token approach:** parallel `--almanac-*` namespace at `:root` alongside
   existing Obsidian/Celestial/Dawn themes. Phase 5 prunes the old set. Do
   NOT touch existing `--leather/--moss/--ember/--plum` tokens until cleanup.
6. **Sabian source:** Rudhyar's 1953 set (public domain). v1 ships with 30
   sample symbols at nearest-degree resolution; the full 360 list is queued
   as a data-only follow-up.
7. **Drawer over tab.** Stelloquy never gets its own nav item. Drawer is the
   recommended path; `/oracle` survives one more phase as a safety net.
8. **Today data: live, not mocked.** Same for every future phase.

---

## 3. The new file inventory (orient yourself here)

```
lib/
  brand.ts                    BRAND.product / BRAND.oracle constants
  ephemeris/
    sabian.ts                 360-degree direct lookup. 32 transcribed Rudhyar
                              entries + 328 pending (nearest-real fallback).
                              Adding a real symbol = single edit to TRANSCRIBED.
  today/
    get-today-context.ts      Server helper: longitudes → snapshot + week ribbon
    shape-of-today.ts         Deterministic energy/voice/body derivation
    get-active-transits.ts    Joins buildSkyTimeline windows to today's per-day
                              Transit for live orb + applying state. Returns
                              `{ status: 'no-chart' }` when natal chart absent.
    get-journal-streak.ts     Consecutive-day streak count, lookback 90 days.

components/
  almanac/
    tokens.ts                 K palette + GLYPH map (mirrors --almanac-* CSS vars)
    Frame.tsx                 Bordered panel, tone variants, optional starfield
    Kicker.tsx                Mono eyebrow text
    Stat.tsx                  Two-line label/value primitive
    Seal.tsx                  Circular etched glyph (nav, dates, brand mark)
    Divider.tsx               Etched rule with a centered glyph
    StarField.tsx             Deterministic LCG-seeded star scatter, SSR-safe
    MoonGlyph.tsx             Filled SVG terminator, phase 0..1
    EphemerisWheel.tsx        Concentric rings, signs, houses, aspects, planets
    AlmanacSidebar.tsx        4-item nav + ChromeMark + pinned areas + mobile drawer
    index.ts                  Barrel export
  today/
    SkyBanner.tsx             Gradient banner — sun/moon/Sabian
    ShapeOfToday.tsx          3-up energy/voice/body cards
    ActiveTransits.tsx        Stacked rows below Shape-of-Today: glyphs,
                              technical name, rarity label, orb, applying state.
                              Empty / no-orb / no-chart states all styled.
    MiniEphemeris.tsx         Wraps EphemerisWheel for the Today layout
    WeekRibbon.tsx            7-day strip with moon glyphs + phase hints
    LineForToday.tsx          Stateful composer: textarea + multi-select tag
                              chips + useTransition save (server action) +
                              optimistic streak bump + saved flash.
  oracle/
    StelloquyOrb.tsx          (pre-existing) Three-state animated orb
    OracleConversation.tsx    Chat body (useChat + messages + capture handling).
                              Owns streaming state; takes className + showStatusOrb.
                              Both /oracle and the Stelloquy drawer render this.
    OracleChat.tsx            Thin /oracle-page wrapper — header chrome only.
    StelloquyShell.tsx        Drawer + dock + ⌘K. Renders OracleConversation
                              directly (no nested max-w-4xl/h-calc constraints).

app/
  layout.tsx                  Loads Cormorant, DM Sans, JetBrains Mono, Cinzel
  globals.css                 --almanac-* tokens at :root
  (app)/
    layout.tsx                Uses AlmanacSidebar + StelloquyShell
    today/
      page.tsx                Server Component composing the Today layout
      actions.ts              'use server' saveLineForToday — mirrors POST
                              /api/journal for sky context + aspect inserts +
                              pattern refresh. Phase 4 should converge these
                              onto a shared lib/journal/create-entry.ts.

tailwind.config.ts            colors.almanac.* + fontFamily.almanac-*
next.config.js                /dashboard → /today
```

### What's still on disk that will be deleted in Phase 5

- `components/dashboard/Sidebar.tsx` (old leather/plum 8-item nav)
- `components/dashboard/DashboardOverview.tsx` (old dashboard composition)
- `app/(app)/dashboard/page.tsx` (route, redirect bypass)
- After their migrations: `app/(app)/calendar`, `/blueprint`, `/curriculum`,
  `/human-design`, `/areas`, `/tracker` and any of their dashboard-only
  components

Do NOT delete these until each replacement screen ships and is verified.

---

## 4. Data wiring map (carried forward — keep in sync)

| UI surface | Source | Net-new work |
|---|---|---|
| Sky banner (Today) | `getDailyLongitudesForDate`, `getMoonIllumination`, `getLunarPhaseLabel`, `lonToSign`, `lonToDegreeInSign` ✓ wired; `getSabianForDegree` exact-degree lookup ✓ wired | Transcribe remaining 328 Sabian symbols into `TRANSCRIBED` (data-only, single edits) |
| Shape of today (Today) | `lib/today/shape-of-today.ts` ✓ deterministic | None |
| Mini ephemeris (Today) | `getDailyLongitudesForDate` ✓ transit only | Natal layer needs `birth_charts` join — wires in alongside Self screen, Phase 3 |
| Active transits (Today) | `lib/today/get-active-transits.ts` joins `buildSkyTimeline` windows + per-day Transit ✓ wired | Empty-state copy points users at the Self screen — re-look once Phase 3 ships |
| Week ribbon (Today) | `getDailyLongitudesForDate` per day ✓ | None |
| Line-for-today (Today) | `app/(app)/today/actions.ts` server action ✓ wired (sky + aspects + pattern refresh) | Phase 4 should converge the action and `POST /api/journal` onto a shared helper |
| Year heatmap (Year) | `blueprints` + ephemeris days | Phase 2 |
| Month grid events (Year) | calendar + transits | Phase 2 |
| Push/rest ribbon (Year) | Blueprint | **Migration 0014**: `push_rest_arc` JSON column on `blueprints` — write a fallback if missing so existing blueprints still render |
| Month brief + Sabian-of-week (Year) | Blueprint + Sabian | Phase 2 |
| Curriculum tracks (Year) | `curriculum_*` tables | Phase 2 |
| Natal wheel (Self) | `birth_charts` | Phase 3 |
| Body graph (Self) | `lib/ephemeris/human-design/` | Phase 3: `BodyGraph` TSX component |
| Gene Keys cards (Self) | HD prime gates | Phase 3: `lib/gene-keys/keys.ts` content (64 keys × {shadow, gift, siddhi}) |
| Areas grid (Self) | `goal_categories` + `lib/areas.ts` | Phase 3: Areas detail pages (`/self/areas/[slug]`) — closes existing 404 stub |
| Composer + sky line (Journal) | `JournalComposer` + `journal_entry_sky` | Phase 4: restyle in Warm Almanac |
| Tracker check-ins (Journal) | `tracker_*` tables | Phase 4 |
| 30-day strip (Journal) | Tracker daily logs | Phase 4: stacked bar |
| Recent entries (Journal) | `journal_entries` | Phase 4: `EntryCard` |
| Pattern memory (Journal) | `user_pattern_insights` (already populated) | **Phase 4 — closes HIGH-priority CLAUDE.md gap** + new `include_in_daily_focus` boolean column |

---

## 5. Remaining work — every optional

### Phase 1.C — Polish ✓ SHIPPED (`0a09b22`, 2026-05-14)

All four items landed. Carried-forward notes on what's still imperfect:

1. **Sabian 360 — structured stub.**
   - `lib/ephemeris/sabian.ts` now exports a 360-degree direct lookup. 32
     transcribed Rudhyar entries are preserved at their exact degrees; the
     other 328 carry `pending: true` and serve the nearest-real prose as a
     readable placeholder.
   - **Decision recorded:** the handoff's original "Rudhyar 1973 PD-1953-
     elsewhere" framing was contradictory — Marc Edmund Jones / Elsie
     Wheeler 1925 is the genuinely-PD set; Rudhyar 1973 is derivative.
     Treat Rudhyar text as quotable in small numbers with attribution, not
     bulk-reproduced. Replace pending entries with vetted text via single
     edits to the `TRANSCRIBED` map. `getSabianForDegree()` contract
     unchanged.

2. **Active Transits panel.**
   - Helper: `lib/today/get-active-transits.ts` joins `buildSkyTimeline`
     windows (rarity + plain prose) to today's per-day `Transit` (live orb
     + applying state). Returns `{ status: 'no-chart' }` when natal chart
     or year-cache is missing.
   - Component: `components/today/ActiveTransits.tsx`. Inserted as a
     stacked frame below Shape-of-Today inside the left column; MiniEphemeris
     keeps its right column.
   - **Carried debt:** the no-chart empty-state copy points users at the
     Self screen — re-look once Phase 3 ships and `/self` exists.

3. **Inline LineForToday composer.**
   - Server action: `app/(app)/today/actions.ts` (`'use server'`) mirrors
     `POST /api/journal` — sky context, aspect inserts, pattern refresh —
     scoped to the quick-line shape (no ritual flag, no Stelloquy memory
     toggle). Streak helper: `lib/today/get-journal-streak.ts`.
   - Composer is stateful: textarea + multi-select tag chips +
     `useTransition` save + ⌘/Ctrl+Enter submit + optimistic streak bump +
     saved flash + inline error. `/journal` link kept as escape hatch.
   - **Carried debt:** ~50 lines duplicated with `app/api/journal/route.ts`.
     Phase 4's journal rebuild should converge both call sites onto a
     shared `lib/journal/create-entry.ts` helper.

4. **OracleConversation extraction.**
   - `components/oracle/OracleConversation.tsx` owns `useChat`, messages,
     suggested prompts, capture handling. Accepts `className` and
     `showStatusOrb` props.
   - `OracleChat.tsx` is now a thin legacy /oracle wrapper around it.
   - `StelloquyShell` renders `OracleConversation` directly — drawer no
     longer pays for nested `max-w-4xl`/`h-[calc(100vh-8rem)]` constraints.

### Phase 2 — Year (replaces Calendar + Blueprint + Curriculum)

- Branch: `feature/warm-almanac-year` off `main` (after merging
  `feature/warm-almanac`).
- New route `app/(app)/year/page.tsx`. Layout in
  `Kairos-handoff/kairos/project/kairos/year.jsx`:
  - Year-strip heatmap (12 months × ~30 days)
  - View switcher pill (Year / Month / Week / Day) — Month is the default
  - Month grid (6 weeks × 7 days) with event chips
  - Side panel: month brief, Sabian-of-week, Curriculum tracks
  - Push/Rest/Edit ribbon along the bottom
- **Migration 0014 — `push_rest_arc` JSON on `blueprints`.**
  - Shape: `Array<{ kind: 'push' | 'rest' | 'edit'; startPct: number; endPct: number; label: string }>`
  - Write a fallback derivation in `lib/year/push-rest-arc.ts` so existing
    blueprints without the column still render a deterministic arc from
    quarter themes.
- Redirects in `next.config.js`:
  - `/calendar` → `/year`
  - `/blueprint` → `/year`
  - `/curriculum` → `/year?view=curriculum` (or a `tab=curriculum` query —
    pick one)
- Flip `AlmanacSidebar`'s `year` nav href from `/calendar` to `/year`.
- Delete `app/(app)/calendar`, `/blueprint`, `/curriculum` route folders
  (their data is consumed by the new screen).

### Phase 3 — Self (replaces Human Design + Areas + natal display)

- Branch: `feature/warm-almanac-self`.
- New route `app/(app)/self/page.tsx` with lens-switcher pill: Natal | Human
  Design | Gene Keys | Areas. Layout in
  `Kairos-handoff/kairos/project/kairos/self.jsx`.
- Net-new components in `components/self/`:
  - `BodyGraph.tsx` — port the SVG from `self.jsx:7–70`. Reads from the
    existing `lib/ephemeris/human-design/` math layer.
  - `ChannelChip.tsx` — defined/open channel row.
  - `GeneKeyCard.tsx` — Shadow / Gift / Siddhi for one of the four prime
    gates.
- Net-new content:
  - `lib/gene-keys/keys.ts` — 64 keys × { shadow, gift, siddhi } strings.
    Source: public Gene Keys glossary; credit in header.
- **Closes the `/areas/[slug]` 404 stub** — flagged HIGH in CLAUDE.md gaps.
  Move to `app/(app)/self/areas/[slug]/page.tsx` reading `goal_categories`
  + `lib/areas.ts` house interpretations.
- Redirects:
  - `/human-design` → `/self`
  - `/areas` → `/self?lens=areas`
  - `/areas/[slug]` → `/self/areas/[slug]`
- Flip `AlmanacSidebar`'s `self` nav href from `/human-design` to `/self`.

### Phase 4 — Journal (replaces Journal + Tracker + surfaces Pattern Insights)

**This is the highest-impact phase** — closes the HIGH-priority Journal
Intelligence UI gap from CLAUDE.md.

- Branch: `feature/warm-almanac-journal`.
- Rewrite `app/(app)/journal/page.tsx` with tabs: Write | Entries | Track |
  Patterns. Layout in `Kairos-handoff/kairos/project/kairos/journal.jsx`.
- Net-new components in `components/journal/almanac/`:
  - Restyled composer wrapping existing save logic
  - Check-ins panel reading from `tracker_*` tables
  - 30-day stacked-bar strip
  - `EntryCard.tsx` — entry preview with optional `RITUAL` badge
  - **`PatternRow.tsx` — reads `user_pattern_insights` (already populated by
    `refresh_user_pattern_insight` RPC). FINALLY surfaces it.**
- **Migration 0015 — `include_in_daily_focus boolean` on
  `user_pattern_insights`.** Lets users flag a pattern to be folded into
  Today's shape-of-today logic. The Today derivation reads this flag and
  optionally augments the energy/voice/body cards.
- Redirect: `/tracker` → `/journal?tab=track`.

### Phase 5 — Cleanup

- Branch: `feature/warm-almanac-cleanup`.
- Delete:
  - `components/dashboard/*` (legacy)
  - `components/calendar/*` if separable
  - `app/(app)/dashboard`, `/calendar`, `/blueprint`, `/human-design`,
    `/curriculum`, `/tracker`, `/areas`, `/oracle` route folders
  - **Keep `/api/oracle/*` — internal API, unchanged.**
- Add redirect `/oracle` → `/today` (last redirect to land).
- Remove unused Tailwind tokens from `tailwind.config.ts`: leather, moss,
  ember, plum families if not referenced by `/admin` or `/(public)/*`.
- Prune obsidian/celestial/dawn theme blocks from `globals.css` if no
  longer needed (check `/admin` first).
- Update `PRODUCT_BIBLE.md` and `CLAUDE.md` Current-state block.

---

## 6. Open decisions

Resolved during Phase 1.C session (2026-05-14):

1. **Phase 1.C scope** ✓ All four polish items shipped in `0a09b22`.
2. **Inline composer authentication** ✓ Server action (`'use server'`).
   `JournalComposer` still uses the route handler; the action duplicates
   ~50 lines of intelligence pipeline. Phase 4 converges them.

Still open going into Phase 2:

3. **`/oracle` deprecation timing** — recommend keeping the legacy page
   reachable through Phase 2 and 3, then redirecting in Phase 5 cleanup.
   The drawer is proven; `/oracle` survives as a safety net.
4. **Migration 0014 timing** — recommend generating during Phase 2
   implementation. Run on dev DB, get user approval before prod. Write the
   `lib/year/push-rest-arc.ts` fallback derivation in the same PR so
   existing blueprints render even without the column populated.

---

## 7. How to verify the current state

```bash
git checkout feature/warm-almanac
npm install            # if pulling fresh
npm run dev            # opens on :3699
# sign in, land on /today
# click each nav item, verify no 404s
# /today: SkyBanner renders a Sabian symbol for the Sun's exact degree
# /today: Active Transits frame shows either rows, "no transits in orb"
#         empty state, or "complete your birth chart" if no natal chart
# /today: write a line in the composer, hit Cmd/Ctrl+Enter or Save,
#         see saved flash + streak bump (no full-page refresh required)
# press ⌘K from /today, the drawer opens with OracleConversation inside
# /oracle still renders its own header chrome + the same conversation
# press Esc, drawer closes
# /dashboard should 308 redirect to /today
```

`npx tsc --noEmit` should pass clean.

---

## 8. House rules (carried forward from CLAUDE.md, don't violate)

- **Voice:** warm, grounded, anti-hustle. Never "where you should be," never
  "level up." Reference the user's actual chart, transits, goals.
- **No new `.md` planning docs** unless explicitly asked (this one was).
- **No service-role Supabase client outside webhooks / system jobs.**
- **No `any`-shaped type cheats.**
- **Migrations get user approval before running.**
- **Don't refactor what works unless the refactor is the task.**

---

## 9. Quick links into the design canon

- IA + foundations: `Kairos-handoff/kairos/project/kairos/system.jsx`
- Today: `Kairos-handoff/kairos/project/kairos/today.jsx`
- Year: `Kairos-handoff/kairos/project/kairos/year.jsx`
- Self: `Kairos-handoff/kairos/project/kairos/self.jsx`
- Journal: `Kairos-handoff/kairos/project/kairos/journal.jsx`
- Stelloquy: `Kairos-handoff/kairos/project/kairos/ambient.jsx`
- Tokens: `Kairos-handoff/kairos/project/kairos/tokens.jsx` (already ported)

Designs were authored in HTML/CSS/JS as prototypes. Match the visual output;
don't copy the prototype's internal structure unless it happens to fit.
