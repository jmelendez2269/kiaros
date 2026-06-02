---
type: handoff
date: 2026-05-12
branch: feature/human-design
prior:
  - docs/handoff-2026-05-08.md (HD spike + scope)
  - docs/handoff-2026-05-10-hd-phase-b1.md
  - docs/handoff-2026-05-10-hd-phase-b2.md
  - docs/handoff-2026-05-10-hd-phase-a.md (Phase A production integration)
---

# Kiaros Handoff — Oracle deep-links + public homepage rework

For the next session on `feature/human-design`. Read this first, then
`CLAUDE.md`, then `feedback_hd_voice.md` and `feedback_dashboard_voice.md`
in auto-memory. **The math layer is still locked** — don't touch
`lib/ephemeris/human-design/*`.

## What landed this session

### HD Phase A (A1–A4 + partial A5) — production integration shipped

- **A1 (persist):** migration `0014_human_design.sql` adds `human_design JSONB`
  on `user_profiles`. `lib/human-design.ts` is the service layer:
  `computeHumanDesign`, `parseStoredHumanDesign`, `isHumanDesignStale`,
  `HUMAN_DESIGN_METHODOLOGY_VERSION = 1`. Profile API recomputes whenever
  birth data changes. Blueprint generator backfills on read.
- **A2 (UI surface):** `/human-design` page with Type / Strategy / Authority /
  Profile / Signature / Centers / Channels / Prime Gifts. Lives at
  `app/(app)/human-design/page.tsx` + `components/human-design/HumanDesignView.tsx`.
- **A3 (edge-proximity nudge):** amber banner on the HD page surfaces any
  activation within 0.2° of a gate boundary with a soft "double-check on
  MyBodyGraph" link.
- **A4 (blueprint prompt enrichment):** HD section sits between NATAL CHART
  and YEAR VISION in `assembleBlueprintUserPrompt`. New Rules 14 + 15 add
  Type-conditional weekly pacing and the 4 Prime Gifts as quarterly
  contemplation threads. **Calibration matters here:** initial rule 14 was
  too verbose and Claude blew past `maxOutputTokens: 16000`; current rule
  caps HD mentions at "once per quarter + ~3-4 weeks." `maxOutputTokens`
  reverted to 16000 with per-field ceilings in the OUTPUT BUDGET block.
- **A5 (unknown-time handling, partial):** `/human-design` page hides the
  chart entirely with a "needs birth time" stub for `birth_time_unknown`
  users. The onboarding-step UX nudge (asking users to find their birth
  time) is still **not done**.

### Dashboard restructure — driven by user feedback in three rounds

Round 1 (jargon hero): added `Sun 21° Taurus · Moon waning gibbous in
Scorpio (78%) · Mercury square Saturn 0.4° applying` + Type-conditional HD
lens. **Rejected:** "This is Chinese to someone who doesn't understand
astrology and human design."

Round 2 (plain English): rewrote with `buildPlainDailySummary` and
`buildDailySignals` — every technical concept paired with a layman's
translation. Moon phase → mood + verb. Sign → element vibe. Aspect →
tense/easy/neutral plus a plain reading. Authority → plain decision rule.
**Accepted.** "Longer arcs" 4-card row moved out of the hero, down below
the card grid.

Round 3 (rarity + duration): new `buildSkyTimeline` builds transit
*windows* (start/peak/end/duration) from per-day data at orb ≤ 3°. Each
window gets a rarity label derived from the transit planet's orbital
period — Pluto/Neptune/Uranus = "Once in a lifetime", Saturn = "Rare",
Jupiter/Mars = "Uncommon", Mercury/Venus/Sun = "Frequent." Cards show a
3-column micro-grid (STARTS / PEAK / ENDS) with bolded dates, plus timing
("ends in 178 days"), duration ("6 months total"), and period label
("roughly every 29 years"). First 2 visible per bucket, rest in a native
`<details>` "show all" expander.

### Sky Portrait — circular natal+transit chart with click-to-explain

`components/dashboard/SkyPortrait.tsx` is a 600-line Client Component
adapted from a user-supplied HTML mock, ported to Kiaros's palette
(leather diamonds for natal, full-color orbs for transit, stone-deep
background). Real ephemeris data: `getDailyLongitudesForDate(today)` for
transit positions, `natal_chart.{planet}.longitude` for natal positions,
`todayEphemeris.transits` filtered to orb ≤ 3° for aspect lines.

Hover dims everything except aspects touching that planet, with a tooltip.
**Click a planet** → opens `PlacementPanel` below the canvas with three
plain-English rows (planet meaning · sign meaning · house meaning) plus
all active aspects on that point coloured tense/easy/neutral. Closes via
X button.

The placement explanation content lives in `lib/human-design.ts`:
`PLANET_MEANING`, `HOUSE_MEANING`, `SIGN_PLAIN`, `ASPECT_PLAIN`, plus
`buildNatalPlacementExplanation` and `buildTransitPlacementExplanation`.

## Key principle that emerged this session

**The deterministic vs. synthesis split.** This is a project-wide rule
worth carrying forward:

- **Dashboard surfaces are *claim surfaces*.** Every visible string is the
  product asserting "this is true about you." Synthesis on a claim surface
  is dangerous — the user can't push back, can't see alternatives, can't
  argue with a static card. So the dashboard stays compositional:
  *here's what Venus means, here's what Taurus is, here's what the 5th
  House covers.* Facts + definitions, no forced "therefore *you* are X."
- **Oracle is a *conversation surface*.** A conversation is collaborative.
  The Oracle offers one reading, the user pushes back, synthesis emerges
  through dialogue. Opinion is fine here because **nothing is locked in.**
- **The rule:** any time we feel the pull toward "let me synthesize this
  into a personalized interpretation" on a static surface, that's actually
  a job for Oracle. Hand the structured context to a conversation, don't
  freeze it onto a card.

This rule resolves the long-running tension between the product's "warm,
grounded, mystical-but-practical" tone and the user's repeated feedback
that we were too poetic / not deterministic enough. Saved as a memory in
`feedback_dashboard_voice.md`.

## What's open — pick by priority

### P0 — Oracle deep-links from every dashboard surface (the agreed next move)

Wire `→ Ask Oracle about this …` buttons from three places:

1. **`PlacementPanel`** (in `SkyPortrait.tsx`) — `→ Ask Oracle about this
   placement`. Most important. The button passes the placement (planet,
   sign, degree, house, retrograde flag, active aspects) to the Oracle
   chat, which opens with a pre-seeded first turn like:

   > Tell me about my natal Venus in Taurus in the 5th House —
   > particularly with Pluto opposition active right now (orb 0.2°,
   > applying).

2. **Timeline cards** (in `DashboardOverview.tsx`'s `TimelineCard`) —
   `→ Ask Oracle about this transit`. Pre-seed:

   > Tell me about Saturn sextile my natal Venus — what does this 6-month
   > window mean given my chart and what I'm working on?

3. **Signal chips** (in `DashboardOverview.tsx`'s `dailySignals.map`) —
   `→ Ask Oracle why this matters today` (only on the Moon, Sky, and Your
   Design chips; not Lunar Day).

**Implementation plan:**

- Two transport options for the pre-seed:
  - **(a)** Query param: `/oracle?prompt=<encoded>`. Oracle route reads on
    mount, dispatches as the first user message. Stateless, shareable URLs.
  - **(b)** Session storage handoff: write `kiaros.oracle.preseed` from
    the dashboard click, read on `/oracle` mount, delete after use.
    Avoids URL-length limits and keeps prompts off the address bar.

  **Recommendation: (b).** Some placements will produce long prompts with
  aspect lists, and we don't want them in browser history. Query param can
  be a small `?from=placement&id=…` for analytics if needed.

- Existing Oracle entry point: `app/(app)/oracle/page.tsx`. The chat
  component already accepts a list of messages; we'd inject the pre-seed
  as the first `user` turn before opening the stream.

- The Oracle's 4-layer system prompt (`lib/ai/oracle-system-prompt.ts`)
  already has the user's chart + HD + transits + goals. The pre-seed only
  needs to identify *which* placement to focus on, not re-state the chart.

**Files to touch:**

- `components/dashboard/SkyPortrait.tsx` — add the button + handoff helper
- `components/dashboard/DashboardOverview.tsx` — add buttons on TimelineCard
  and signal chips
- `app/(app)/oracle/page.tsx` and its Oracle chat component — read the
  pre-seed from session storage on mount, dispatch as first message
- New: `lib/oracle/preseed.ts` — shared helpers `writeOraclePreseed(text)`
  and `consumeOraclePreseed()` for the session-storage transport

**Voice rule:** the pre-seed should phrase the user's question naturally
("Tell me about…", not "Generate an interpretation of…"). And the Oracle's
response is conversational — if the user pushes back, the Oracle revises.

### P1 — Public homepage rework

The pre-login homepage at `app/page.tsx` (or wherever the public landing
lives — check `app/(app)/layout.tsx` is auth-gated and the unauthenticated
flow). It should now communicate **why** Kiaros is different — and the
Sky Portrait is the visual hero feature that proves it.

**Goal:** convert visitors who land cold by showing them, in this order:

1. **Plain-English value prop** (under 20 words). Something like:
   *"Real astronomy and your actual chart, made readable. A planning tool
   for people who want signal, not horoscopes."*
2. **The Sky Portrait as the hero visual** — either a real interactive
   demo with a sample chart (Steve Jobs, Ra Uru Hu, or a generic 1990
   noon chart) or a high-quality screenshot. Captioned so a non-astrology
   person understands what they're looking at.
3. **The contrast section** — "What Kiaros is not" beside "What it is."
   Lean into the deterministic positioning. Generic horoscope language on
   the left (greyed out), Kiaros's actual output on the right.
4. **The three things that make it different:**
   - **Real ephemeris**: every transit shown is computed from your birth
     moment and the actual sky, not an algorithm's guess.
   - **Rarity matters**: a Pluto transit happens once in your lifetime;
     a Mercury one happens four times a year. Kiaros tells you which.
   - **HD + astrology, woven together**: your design shapes how the sky
     lands on you — not the same advice for everyone with your sun sign.
5. **A walkthrough** of what they get: dashboard, blueprint, journal,
   Oracle, Sky Portrait — short captioned screenshots, no dense feature
   lists.
6. **Pricing + CTA**: existing Stripe flow stays. Soft CTA at the top
   ("See your free chart in 3 minutes"), harder CTA at the bottom.

**What NOT to do on the homepage:**

- No "manifest your best year" or hustle-adjacent copy
- No generic mysticism — every claim should be backed by a specific
  feature or computation
- No promises of outcomes ("transform your life," "10x your growth")
- No fortune-cookie sample text — show the real plain-English summary
  format we landed on this session
- Don't lead with HD jargon (Type, Authority, Profile) — those terms
  come *after* the user understands the value prop

**Tone:** match the project voice rules. "Your chart suggests…" not
"You are a Manifestor." Anti-ambiguity, helpful, specific. The same
tone the dashboard finally settled on this session.

**Files to touch:**

- `app/page.tsx` (or wherever the public homepage is)
- New `components/landing/` directory for the new sections
- Possibly a static or lightly-interactive embedded SkyPortrait demo —
  either feed it a hardcoded sample chart's data or expose a
  `<SkyPortraitDemo>` wrapper that ships with sample data baked in

### P2 — Multi-year occurrence lookup (timeline v2)

The footnote on the Sky Timeline section currently reads: *"Last/next
occurrences across years aren't shown yet — slow planets like Saturn and
Pluto can take decades to repeat, and we only compute the current year
right now."*

Plan to close this:

- `previousOccurrence(transit, natalChart, fromDate)` — walks backwards
  year by year, computing `computeYearEphemeris` for each, until it finds
  the same `(planet, natalPlanet, aspect)` triple within orb. Caches the
  per-year ephemeris.
- Symmetric `nextOccurrence`.
- Outer-planet results may be 5–30 years out — surface as
  *"Last: March 2003 (when you were 11)"* and *"Next: November 2055
  (you'll be ~63)."*
- Cache per user: the natal chart is stable, so we can pre-compute the
  last/next for the user's most relevant aspects once and store on the
  profile or in a new `transit_occurrences` table.

Heavy work but high signal — it's the difference between "this transit
is happening" and "this transit has *never* happened to you before."

### P3 — Remaining Phase A bits

- **A5 onboarding nudge.** Detect imprecise birth times during onboarding
  and either gate HD entirely or ask the user to look it up
  (vitalrecords.gov for US users). Currently only the `/human-design`
  page handles unknown-time; the onboarding flow doesn't ask.
- **A6 transit-to-gate map.** In `lib/ephemeris/transit-calculator.ts`,
  add a per-day map of which natal HD gates are being activated by
  transiting planets. Feeds into weekly Oracle context: *"Saturn is
  currently transiting your Gate 49 — Revolution."*

## Files NOT to touch

Math layer is **locked**. Editing these reopens Phase B:

- `lib/ephemeris/human-design/gate-wheel.ts`
- `lib/ephemeris/human-design/design-chart.ts`
- `lib/ephemeris/human-design/bodygraph.ts`
- `lib/ephemeris/human-design/gene-keys.ts`
- `lib/ephemeris/astronomia-adapter.ts` (Pluto + Sun/Moon code)
- `lib/ephemeris/transit-calculator.ts` (transit core)
- `scripts/hd-spike.ts` (validation harness)
- `scripts/hd-sun-precision-probe.ts` (B1.6 audit record)

Touching `lib/ephemeris/index.ts` to add new exports is fine — already
expanded this session to expose `getDailyLongitudesForDate`,
`isPlanetRetrograde`, `lonToSign`, `lonToDegreeInSign`,
`DailyPlanetLongitudes`.

## Voice principle — carried forward

From `feedback_hd_voice.md` and reinforced this session:

- The dashboard says *"Your chart suggests…"* / *"Your Lunar authority
  asks you to wait."* / *"This 6-month window pressures your natal Sun."*
  It does **not** say *"You are X"* or *"You will Y."*
- HD jargon (Type, Authority, Profile, Center, Channel, Gate) is always
  paired with a plain-English translation in the same paragraph.
- Outer-planet rarity is the load-bearing astrological hook. Lead with
  "Once in a lifetime" or "Rare" labels rather than "this is significant."
- Edge cases are surfaced, not hidden. When math is uncertain, say so.
- Oracle is where opinion lives. Static surfaces stay compositional.

## Open decisions for the next session

1. **Pre-seed transport: query param vs. session storage?** Recommendation
   above is session storage. Confirm before building.
2. **Homepage URL shape.** Is the public page at `app/page.tsx` or split
   into a route group? Check `app/(app)/layout.tsx`'s auth guard and what
   currently renders for logged-out users.
3. **Sky Portrait demo on the homepage — interactive or static screenshot?**
   Interactive is more compelling but adds bundle weight to the
   first-paint public page. Lean static screenshot for v1, interactive
   later.
4. **A5 vs. P1 priority.** If the homepage rework is what closes the
   product story, it might outrank A5. Your call.

## Quick-start commands

```bash
# Re-orient
git log --oneline -10
cat docs/handoff-2026-05-12-dashboard-oracle-deeplinks.md   # this file
cat CLAUDE.md

# Local dev
npm run dev      # check /dashboard and /human-design land cleanly

# Type-check + production build
npx tsc --noEmit
npm run build

# If HMR cache gets weird after structural changes, clear and restart:
#   Ctrl+C the dev server
#   Remove-Item -Recurse -Force .next
#   npm run dev
```

## References

- Prior Phase A handoff: `docs/handoff-2026-05-10-hd-phase-a.md`
- Math-layer handoffs: `docs/handoff-2026-05-10-hd-phase-b{1,2}.md`
- Validation harness: `scripts/hd-spike.ts`
- Memory:
  - `feedback_hd_voice.md` — HD copy as suggestion, not declaration
  - `feedback_dashboard_voice.md` — deterministic facts on dashboard,
    synthesis in Oracle (new this session)
- MyBodyGraph (`https://www.mybodygraph.com/`) — re-enter birth data
  manually for cross-checks; don't click public profiles.
