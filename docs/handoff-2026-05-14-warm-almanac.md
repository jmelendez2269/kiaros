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
- **Three commits landed:**
  - `d96bb3a` — Warm Almanac foundations (tokens, fonts, brand, primitives)
  - `c5a31d8` — Shell live (`AlmanacSidebar` + `/today` placeholder + dock)
  - `c219946` — Today wired to live ephemeris + `StelloquyShell` drawer + `/dashboard → /today` redirect
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
  Sabian for the Sun degree), three Shape-of-Today cards (energy / voice /
  body, derived deterministically from moon phase + moon sign), a transit-only
  mini ephemeris wheel, a 7-day week ribbon, and a Line-for-Today card that
  routes to `/journal`.
- A Stelloquy orb pulses bottom-right of every authed page. Click it or press
  **⌘K / Ctrl+K** anywhere → right-side drawer slides in with the existing
  streaming chat (`OracleChat`, no backend changes). Esc / backdrop / X to
  close.

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
    sabian.ts                 ⚠ stub (30 samples). Fill to 360 in Phase 1.C
  today/
    get-today-context.ts      Server helper: longitudes → snapshot + week ribbon
    shape-of-today.ts         Deterministic energy/voice/body derivation

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
    MiniEphemeris.tsx         Wraps EphemerisWheel for the Today layout
    WeekRibbon.tsx            7-day strip with moon glyphs + phase hints
    LineForToday.tsx          Composer entry point (client) — currently links to /journal
  oracle/
    StelloquyOrb.tsx          (pre-existing) Three-state animated orb
    StelloquyShell.tsx        Drawer + dock + ⌘K — replaces old StelloquyDock

app/
  layout.tsx                  Loads Cormorant, DM Sans, JetBrains Mono, Cinzel
  globals.css                 --almanac-* tokens at :root
  (app)/
    layout.tsx                Uses AlmanacSidebar + StelloquyShell
    today/page.tsx            Server Component composing the Today layout

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
| Sky banner (Today) | `getDailyLongitudesForDate`, `getMoonIllumination`, `getLunarPhaseLabel`, `lonToSign`, `lonToDegreeInSign` ✓ wired | Full Sabian list (Phase 1.C) |
| Shape of today (Today) | `lib/today/shape-of-today.ts` ✓ deterministic | None |
| Mini ephemeris (Today) | `getDailyLongitudesForDate` ✓ transit only | Natal layer needs `birth_charts` join — wires in alongside Self screen, Phase 3 |
| Active transits (Today) | DashboardOverview's `buildSkyTimeline` + `buildDailySignals` | **Phase 1.C**: extract shared helper, render Today's active transits panel |
| Week ribbon (Today) | `getDailyLongitudesForDate` per day ✓ | None |
| Line-for-today (Today) | Links to `/journal` | **Phase 1.C**: inline composer save |
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

### Phase 1.C — Polish (do these before Phase 2 if time allows)

1. **Fill Rudhyar's full 360 symbols** in `lib/ephemeris/sabian.ts`.
   - Data-only, no architecture change.
   - Replace the `SAMPLES` array with 360 entries, one per degree.
   - The `getSabianForDegree()` contract stays the same — callers don't change.
   - Use Rudhyar's *An Astrological Mandala* (1973) wording (PD-1953-elsewhere
     edition); credit in a header comment.

2. **Active transits panel on Today.**
   - DashboardOverview at `components/dashboard/DashboardOverview.tsx` already
     uses `buildSkyTimeline` from `lib/human-design.ts`.
   - Extract a shared helper, e.g. `lib/today/get-active-transits.ts`, that
     takes a userId + date and returns the top 3–5 transits with applying/
     separating state, orb, rarity, and a one-line description.
   - Render via a new `components/today/ActiveTransits.tsx` modelled on the
     prototype's "ACTIVE TRANSITS" block in
     `Kairos-handoff/kairos/project/kairos/today.jsx` around lines 210–225.
   - Insert in the Today layout between Shape-of-Today and MiniEphemeris,
     or as a third column.
   - **Requires a natal chart.** Render an empty state ("Complete your
     birth chart on the Self screen to see today's transits") if missing.

3. **Inline LineForToday composer.**
   - Today's `LineForToday` is a styled prompt that links to `/journal`. The
     prototype shows a textarea + save button in place.
   - Add a small server action (`app/(app)/today/actions.ts`) that wraps
     the existing journal-entry insert logic. Reuse `JournalComposer`'s
     `saveEntry` path if it's already a server action.
   - Update `components/today/LineForToday.tsx`:
     - Add `useState` for draft text + tag chips.
     - Submit calls the server action.
     - On success: optimistic clear + small success toast + bump streak
       count.
   - Pre-fill the journal_entry's sky context (already auto-stamped server-
     side) — no changes needed there.

4. **Drawer width + scroll polish for OracleChat inside the drawer.**
   - `OracleChat`'s outer container is `h-[calc(100vh-8rem)] max-w-4xl` —
     designed for the legacy `/oracle` page. It works in the 560px drawer
     but is constrained.
   - Either: thread a `containerClassName` prop into `OracleChat` so the
     drawer can pass its own height/width, or extract the chat body from
     OracleChat into a `<OracleConversation>` shell that both `/oracle`
     and the drawer wrap.
   - Recommend the second — cleaner long-term, and Phase 5 will likely
     delete the `/oracle` page anyway.

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

## 6. Open decisions for the next session

These haven't been answered yet:

1. **Phase 1.C scope** — do all four polish items, just Sabian + active
   transits, or skip to Phase 2 entirely?
2. **Inline composer authentication** — server action or API route? Server
   action is the App Router idiom; check whether existing `JournalComposer`
   uses a route handler for legacy reasons.
3. **`/oracle` deprecation timing** — keep the legacy chat page accessible
   through Phase 2 and 3 as a safety net, or redirect it the moment Phase
   1.C polish lands?
4. **Migration 0014 timing** — generate it during Phase 2 implementation
   (run on dev DB, get approval before prod), or as a separate prep PR
   beforehand?

---

## 7. How to verify the current state

```bash
git checkout feature/warm-almanac
npm install            # if pulling fresh
npm run dev            # opens on :3699
# sign in, land on /today
# click each nav item, verify no 404s
# press ⌘K from /today, the drawer opens
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
