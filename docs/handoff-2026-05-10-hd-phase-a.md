---
type: handoff
date: 2026-05-10
branch: feature/human-design
prior:
  - docs/handoff-2026-05-08.md (spike + scope)
  - docs/handoff-2026-05-10-hd-phase-b1.md (B1 plan: true lunar node)
  - docs/handoff-2026-05-10-hd-phase-b2.md (B1.6 / B2 / B3 plan)
---

# Kiaros Handoff — HD Phase A (production integration)

For the next session on `feature/human-design`. Read this first, then
`CLAUDE.md`, then `docs/architecture-v2.md` §8 (Phase 4.5), then
`PRODUCT_BIBLE.md` for HD/Gene Keys surface decisions. Skim the prior
B-phase handoffs only if you need methodology context — the math layer
is locked and you should not be touching it.

## What landed this session (commit `d1a337c`)

### Phase B closure

**B2 — true per-day Pluto.** Replaced `lib/ephemeris/pluto-table.ts`
with `getPlutoLongitude(jde)` in `astronomia-adapter.ts`, using
astronomia's `pluto.astrometric(jde, earth)` (Meeus ch.37 analytical
series, valid 1885–2099, ~0.07° longitude accuracy — same regime as the
VSOP87B truncated series for the other outers). Ra Uru Hu's Pluto now
matches MyBodyGraph at gate **and** line on both sides (P 33.6, D 7.2).
Fixed a latent bug at `design-chart.ts:241` — the comment "Pluto moves
<0.1° in 89 days" was wrong by an order of magnitude; design and
personality Pluto can differ by ~1° (one gate). `birthDate` parameter
dropped from `getDailyLongitudes`, `getDailyLongitudesForDate`,
`buildActivationSet`, and `ComputeYearEphemerisOptions`.

**B1.6 — audited and deferred (not pursued).** The 5 sub-line mismatches
against MBG come from VSOP87B-truncated vs JPL-DE431 ephemeris-source
drift at 1948 (≤0.17°). Tried switching `getSunLongitude` to
`solar.apparentVSOP87` (higher precision than the Meeus ch.25
low-precision polynomial we use today) — shift is only **0.0012°**
(4.4 arcsec), three orders of magnitude smaller than the 0.094° gap to
one HD line. Audited the coordinate-frame transforms in
`planetGeocentricLon` and `elliptic.position` — they're internally
consistent (apparent equatorial of date → ecliptic via true obliquity),
no bug. The remaining drift is only closable via `swisseph` /
`sweph-wasm`, which adds a native dep on Vercel Fluid Compute. None of
the mismatches change Ra Uru Hu's user-visible HD (Type / Authority /
Profile / Channels) so we deferred. The audit script lives at
`scripts/hd-sun-precision-probe.ts` as documentation.

**B3 — cross-checked against MBG.**

*Steve Jobs (1955-02-24 19:15 PST, SF):* all 13 P gates ✓, all 13 D
gates ✓, seven 1-line drifts (D Sun, D Earth, P Moon, P Mercury,
D Venus, D Uranus, P Pluto) — all within the expected VSOP87B vs DE431
envelope. Type / Authority / Channels all stable.

*Generic 1990 noon chart (1990-06-15 12:00 EDT, NYC):* **two
gate-level mismatches**, both caught proactively by the new
edge-proximity flag:
- P Mercury: ours 20.6, MBG 16.1 (longitude 65.976°, 0.024° from
  gate-16 boundary)
- P Venus: ours 2.6, MBG 23.1 (longitude 48.973°, 0.152° from
  gate-23 boundary)

The P Venus shift is consequential: our BodyGraph shows channel 2–14
(P Venus = gate 2 + D Moon = gate 14). Under MBG's gate 23, channel
2–14 doesn't form. MBG would show 2 channels (12–22, 13–33) where we
show 3. **This proves the edge flag isn't theoretical — real users
within 0.2° of a boundary can see channel-level disagreements with
MBG.** The Phase A UI nudge is load-bearing for trust, not optional.

### Edge-proximity flag (new data model)

`GateActivation` (in `lib/ephemeris/human-design/gate-wheel.ts`) now
carries `boundaryDistance: number` (degrees to nearest gate boundary).
`GATE_BOUNDARY_PROXIMITY_THRESHOLD = 0.2` matches the documented
VSOP87B-vs-DE431 envelope.

`DesignChartResult` (in `design-chart.ts`) now exposes an `edgeCases`
array of `EdgeCase` records:

```ts
interface EdgeCase {
  side: 'personality' | 'design'
  key: ActivationKey
  gate: number
  line: number
  longitude: number
  boundaryDistance: number
}
```

Phase A reads this to render the soft cross-check nudge.
`isNearGateBoundary(activation)` is exported from `gate-wheel.ts` for
ad-hoc checks. The flag is also surfaced in `scripts/hd-spike.ts`
output for debugging.

### Memory notes saved (persist across sessions)

- `feedback_hd_voice.md` — HD copy must admit uncertainty, never assert
  expert authority. The user is **building a tool to live by, not
  professing HD expertise.** Phrase activations as suggestions, not
  identity claims. Translate jargon. Reference MyBodyGraph as the
  cross-check authority, not as a competitor.
- `project_phase3_decisions.md` updated — Pluto is now JDE-based via
  astronomia.pluto, no longer a year-keyed table.

## What's still open — Phase A (per architecture-v2 §8 Phase 4.5)

Phase A is the **production integration** of the math layer. The math
is locked — you should be writing UI, prompt assembly, and DB schema
glue, not editing the HD ephemeris code.

Five buckets, no strict order — pick by which the user wants to feel
first. My recommendation in §"Open decisions" below.

### A1 — Persist HD per user

Store the computed BodyGraph + Gene Keys on the user profile so
downstream code reads it instead of recomputing per request.

- New migration: a `human_design` JSONB column on `profiles`
  (alternative: `human_design_charts` table keyed by user_id, version).
  Schema sketch — store `{ personality, design, bodyGraph,
  activationSequence, edgeCases, computedAt, version }` so future
  methodology corrections force a recompute.
- Populate on first sign-in OR on profile.birth_date update — wire
  into the same place natal chart is currently computed.
- Surface helper: `lib/human-design.ts` (analogous to `lib/areas.ts`)
  that reads from DB and exposes typed accessors.

### A2 — UI surface for the BodyGraph

Where does HD live in the product?

- Option a: dedicated `/human-design` page (one-shot reveal, similar
  to `/blueprint`)
- Option b: section on the existing `/profile` or `/areas` page
- Option c: a tab inside `/oracle` since Oracle is where context lives
- Option d: surface inline in onboarding after the natal-chart step

Whichever — at minimum surface: Type, Strategy, Authority, Profile,
Signature / Not-self, defined Centers, activated Channels (with
names), and the 4 Prime Gifts (Life's Work / Evolution / Radiance /
Purpose with Shadow / Gift / Siddhi).

**Voice principle (load-bearing):** see `feedback_hd_voice.md`.
"This pattern suggests…" not "You are a Manifestor." Translate jargon
in tooltips or footnotes.

### A3 — Edge-proximity nudge (this is the new requirement)

When `edgeCases.length > 0` on a user's chart, surface a small soft
prompt near the affected activations:

> "These placements sit near a gate boundary. Different HD calculators
> may show different gates here — if you've used MyBodyGraph before,
> it's worth a cross-check."

Link out to mybodygraph.com with the user's birth data
prefilled-via-querystring if their HD service supports it (otherwise
just deeplink to their chart entry page).

Don't hide the activations under the nudge — show what we compute and
mark the uncertainty.

### A4 — Blueprint prompt enrichment

Add HD/GK section to `assembleBlueprintUserPrompt` (in
`lib/ai/blueprint-generator.ts` or wherever the prompt assembly lives)
between NATAL CHART and YEAR VISION (~300 tokens, constant per user).

Then add Type-conditional rules to INSTRUCTIONS:
- Manifesting Generators: "respond + inform" framing for `energyType`
  weekly suggestions
- Projectors: "wait for invitation," shorter sustained-effort blocks
- Reflectors: lunar-cycle pacing (28-day rhythm), avoid daily metrics
- Generators: gut-response framing
- Manifestors: "inform before action"

Distribute the 4 Prime Gifts across the year as contemplation threads
(e.g. one per quarter — Life's Work in Q1, Evolution in Q2, …).

### A5 — Onboarding tweak

Detect imprecise birth times (`time_unknown = true` or rounded to 5min)
and degrade HD output gracefully:
- HD gates change every ~16 minutes, so an unknown time makes HD output
  unreliable
- Either hide HD entirely for unknown-time users, or show with a much
  louder uncertainty banner than the edge-proximity one
- Onboarding could ask "do you know your birth time?" with a soft path
  to look it up (US users: vitalrecords.gov; non-US: depends)

### A6 — Transit-to-gate map (lower priority)

In `transit-calculator.ts`, add a per-day map of which natal gates are
being activated by transiting planets. Feeds into weekly Oracle
context: "Saturn is currently transiting your Gate 49 — Revolution."

## Files NOT to touch

The math layer is **locked**. Editing these will reopen Phase B and
should require explicit user agreement first:

- `lib/ephemeris/human-design/gate-wheel.ts`
- `lib/ephemeris/human-design/design-chart.ts`
- `lib/ephemeris/human-design/bodygraph.ts`
- `lib/ephemeris/human-design/gene-keys.ts`
- `lib/ephemeris/astronomia-adapter.ts` (the Pluto + Sun/Moon code)
- `lib/ephemeris/transit-calculator.ts` (transit core)
- `scripts/hd-spike.ts` (validation harness)
- `scripts/hd-sun-precision-probe.ts` (B1.6 audit record)

Touching `lib/ephemeris/index.ts` for new exports is fine.

## Voice principle

Carrying forward from `feedback_hd_voice.md` — repeated here because
Phase A is where this gets baked into copy that ships to users:

- Prefer "Your chart suggests…" / "This pattern points to…" over
  "You are a Manifestor."
- When activations sit within 0.2° of a gate boundary, surface that
  to the user with a "double-check on MyBodyGraph" link rather than
  hiding the uncertainty.
- Avoid HD jargon dropped without explanation (it sounds gatekeeping).
  Translate or footnote.
- In Oracle / blueprint prompts: include HD data as one input among
  many (chart, transits, goals), not as the deterministic answer.
- Don't claim parity with Jovian Archive / MyBodyGraph. We're a
  different tool with a different purpose.

## Quick-start commands

```bash
# Re-orient
git log --oneline -10
cat docs/handoff-2026-05-10-hd-phase-a.md   # this file
cat docs/architecture-v2.md                  # §8 Phase 4.5
cat PRODUCT_BIBLE.md                         # HD/GK product voice

# See the current spike output (including edge cases)
npx tsx scripts/hd-spike.ts | head -60

# Type-check & build (sanity)
npx tsc --noEmit
npm run build
```

## Open decisions for the next session

The handoff doesn't make these for you — read PRODUCT_BIBLE first, then:

1. **Where does HD live?** Dedicated `/human-design` page vs section
   on existing pages vs onboarding-inline. PRODUCT_BIBLE may already
   answer this. (My read: dedicated page, reachable from onboarding
   completion + persistent nav — but check the product voice.)

2. **What lands first — UI surface or prompt enrichment?** Both are
   in scope for Phase A. UI surface gets the user something visible.
   Prompt enrichment quietly improves blueprint quality. My read:
   UI first (visible value, faster validation loop with real users),
   prompt enrichment second.

3. **DB shape — JSONB column on profiles vs separate table?** Likely
   JSONB column for simplicity (matches existing `natal_chart` JSONB
   pattern). Separate table only if we expect to version HD methodology
   often or query gates across users (unlikely).

4. **Blueprint regeneration trigger.** When HD methodology changes
   (B1.6 if we ever revisit, or a swisseph migration), should existing
   blueprints regenerate? Probably not auto — flag and let user opt
   in. Defer this question until it's relevant.

5. **Onboarding for users without birth times.** Hide HD entirely or
   show with heavy uncertainty banner? Pure product call.

## References

- Meeus J., *Astronomical Algorithms* 2nd ed. (1998), §22, §25, §47.2–47.7
- Phase B handoffs:
  - `docs/handoff-2026-05-10-hd-phase-b1.md`
  - `docs/handoff-2026-05-10-hd-phase-b2.md`
- Phase 4.5 plan: `docs/architecture-v2.md` §8 (lines 263–286)
- Validation harness: `scripts/hd-spike.ts`
- B1.6 audit record: `scripts/hd-sun-precision-probe.ts`
- Voice memory: `feedback_hd_voice.md` (in auto-memory)
- Phase B commit: `d1a337c` — "HD Phase B2 + B1.6 audit: true Pluto,
  edge-proximity flag"
- MyBodyGraph (`https://www.mybodygraph.com/`) — for cross-checking.
  Re-enter birth data manually for any cross-check; don't click public
  profiles, which may use different birth times than canonical.
