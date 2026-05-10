---
type: handoff
date: 2026-05-10
branch: feature/human-design
prior:
  - docs/handoff-2026-05-08.md (spike + scope)
  - docs/handoff-2026-05-10-hd-phase-b1.md (B1 plan: true lunar node)
  - docs/architecture-v2.md §8 (Phase 4.5)
---

# Kiaros Handoff — HD Phase B1.6 + B2 + B3

For the next session on `feature/human-design`. Read this first, then
`CLAUDE.md`, then the original Phase B handoff at
`docs/handoff-2026-05-10-hd-phase-b1.md` for the framing.

## What landed in the previous session (commit `493c7d0`)

**Phase B1 — True ascending node.** `lib/ephemeris/human-design/design-chart.ts`
now exports `trueLunarNodeLongitude(jde)` implementing Meeus 47.7's leading
five periodic terms. `meanLunarNodeLongitude` is retained as a private helper.
J2000.0 sanity passes (mean Ω = 125.0445°, |Δ| = 1.118°, well within the
expected ≤1.5° band).

**Phase B1.5 — Canonical Rave Mandala wheel order** (unplanned, surfaced
during B1 cross-check). The Taurus + Gemini segment of `GATE_SEQUENCE` in
`lib/ephemeris/human-design/gate-wheel.ts` was off by one position. Switched
from:

```
Taurus  (idx 16-20): 27, 24, 23, 8, 20
Gemini  (idx 21-26): 16, 35, 45, 12, 15, 2
```

to canonical:

```
Taurus  (idx 16-20): 27, 24, 2, 23, 8
Gemini  (idx 21-26): 20, 16, 35, 45, 12, 15
```

The wheel anchor (`GATE_41_START_LONGITUDE = 302.25°`) was kept; an anchor
scan from 301.95 to 302.30 confirmed 302.25 maximises matches against MBG
*and* preserves Ra Uru Hu's canonical Profile 5/1. The previous calibration
note ("matches Sun, Earth, Mercury, Venus D, Uranus when set to 302.25°")
turned out to be coincidental — it was tuned against the *wrong* wheel order;
under the canonical wheel, 302.25° is still the right anchor for different
reasons (Profile + most slow planets).

**Validation result vs the user-entered MBG chart for Ra Uru Hu
(1948-04-09 22:39 Asia/Beirut):**

- Type / Strategy / Authority / Profile / Signature / Centers — all match
- All 6 activated channels match canonical Ra Uru Hu (10-20, 10-57, 19-49,
  20-57, 23-43, 25-51)
- 19 of 24 individual gate.line activations match MBG exactly
- Moon (P + D) match exactly — the apparent ~7° offset seen against MBG's
  *stored* Ra Uru Hu profile turned out to be different birth data on MBG's
  side; once the user manually entered the same birth time we use, the Moon
  agrees within precision.

## What's still open

Three buckets, in priority order:

### B1.6 — sub-line precision (5 mismatches)

Current state with anchor 302.25 + canonical wheel:

| Activation | Mine | MBG | Δ | Notes |
|---|---|---|---|---|
| P Earth | 57.5 | 57.6 | 1 line | Sun/Earth share `withinGate`; MBG itself shows P Sun line 5 + P Earth line 6 which is mathematically inconsistent under any uniform wheel |
| P Mercury | 25.3 | 25.4 | 1 line | sub-line drift |
| P Uranus | 45.6 | 12.1 | **gate** | longitude is 0.061° before the gate 12 boundary at 82.875° — knife-edge case |
| P Neptune | 48.2 | 48.3 | 1 line | sub-line drift |
| D Earth | 62.1 | 62.2 | 1 line | sub-line drift |

The pattern: most discrepancies are P-side (Personality moment), all on slow
planets, all 1 line off. P Uranus is the only gate-level mismatch and sits
0.061° from the boundary.

**Root-cause hypothesis.** astronomia uses VSOP87B truncated for analytical
performance; MBG presumably uses Swiss Ephemeris (JPL DE431). Differences
between VSOP87 and DE-series ephemerides at 1948 epoch can be 0.05–0.17°
on outer planets — exactly what we see. Aberration / nutation / light-time
corrections are too small (≤0.02°) to explain the 0.17° gap.

**Investigation paths** (in increasing cost / risk):

1. **Check astronomia's `solar.apparentLongitude` and `planetposition`
   carefully.** Does our `getSunLongitude` apply nutation? Does
   `planetGeocentricLon` apply aberration? The function applies the
   equatorial→ecliptic transform via `getObliquity(jde)` which sums mean
   obliquity + nutation in obliquity, but the underlying VSOP coordinates
   may or may not be FK5/J2000. Audit against Meeus chapter 25.b.
2. **Try `solar.apparentEquinoctialCoordinates` or `solar.apparentVSOP87`.**
   astronomia exposes a few solar variants; one of them may match MBG's
   convention more closely.
3. **Heavy option: switch to swisseph (or sweph-wasm).** A native dep on
   Vercel Fluid Compute is feasible but adds deployment risk. The handoff
   for Phase B1 originally rejected this for HD's 5.6° gates — but if we
   want to *also* match MBG line-by-line, the calculus changes. Probably
   not worth it; the value is in the gate not the line.
4. **Live with it.** The 5 mismatches don't affect any HD output that drives
   the prompt or the user-facing summary (Type, Authority, Profile, Centers,
   Channels). Document as "known sub-line precision drift, ≤0.17°,
   attributable to ephemeris source differences."

**Recommended:** option 4 unless option 1 or 2 surfaces a quick win in <1 hour.
The user-visible output already matches Ra Uru Hu's canonical chart
descriptions where it matters.

### B2 — Per-day Pluto

Still pending from the original B handoff. `lib/ephemeris/pluto-table.ts` is
year-keyed, so:

- Ra Uru Hu's Personality (April 1948) and Design (January 1948, 88 days
  earlier) both currently see Pluto 7.1 from the year 1948 lookup.
- MBG correctly shows them as different: P 33.6 (gate 33 line 6) and
  D 7.2 (gate 7 line 2). Pluto was retrograde in April 1948 by ~1° relative
  to January.

**Plan** (unchanged from original handoff):

- Extend `pluto-table.ts` to be date-keyed at monthly granularity. Each row
  is `{ year_month: '1948-04', longitude_deg: 134.5 }` or similar.
- `getPlutoLongitude(birthDateStr)` becomes `getPlutoLongitude(date)` and
  takes a YYYY-MM-DD or JDE.
- Linear interpolation between adjacent month entries is sufficient — Pluto
  moves ~1.5°/year, monthly samples give ~0.13°/sample → linear interp gets
  us within ~0.05° even at the steepest part of the orbit. Safely inside
  HD's 0.94° line resolution.
- Source: JPL HORIZONS (export Pluto geocentric ecliptic longitude monthly,
  1900–2050). Save as a TS data file and import as a frozen array.
- Estimated effort: 1 day.

**Acceptance:** P Pluto and D Pluto for Ra Uru Hu match MBG within 1 line
(gate-level match required, line-level acceptable within 1).

**Files to touch:** `lib/ephemeris/pluto-table.ts` (rewrite), and the call
sites in `lib/ephemeris/astronomia-adapter.ts` lines 230 and 303 (signature
change). Adjust `getDailyLongitudes` accordingly. Existing transit code may
also call `getPlutoLongitude(birthDateStr)` — audit before changing the
signature.

### B3 — Re-validation

After B1.6 (if pursued) and B2 land, re-run `npx tsx scripts/hd-spike.ts`
against MyBodyGraph for all three reference charts (Ra Uru Hu, Steve Jobs,
the 1990 generic). Document any surviving discrepancies. Estimated: half a
day. Ra Uru Hu is the only chart we've cross-checked in detail so far —
Jobs and the synthetic 1990 chart need their own MBG comparisons.

## Files NOT to touch in B1.6 / B2 / B3

Same as the prior handoff:

- `lib/ephemeris/human-design/bodygraph.ts`
- `lib/ephemeris/human-design/gene-keys.ts`
- Anything under `app/`, `components/`, `supabase/migrations/` — that's still
  Phase A territory and should not be opened until methodology is locked.

## Pre-launch reminder

Same as before: HD math must be locked before Phase A ships, because users
who see a Profile or activation that later silently changes when methodology
is corrected lose the "evidence-based" trust on first contact. So:

- B1 ✓ landed
- B1.5 ✓ landed (unplanned discovery)
- **B1.6 — decide whether to pursue or document-and-defer**
- **B2 — must land before Phase A**
- B3 — must land before Phase A

## Quick-start commands for the next session

```bash
# Re-orient
git log --oneline -10
cat docs/handoff-2026-05-10-hd-phase-b2.md   # this file

# Run the spike to see current state
npx tsx scripts/hd-spike.ts | head -40

# Type-check
npx tsc --noEmit

# Production build (sanity)
npm run build
```

## References

- Meeus J., *Astronomical Algorithms* 2nd ed. (1998), §22, §47.2–47.7
- Prior handoff: `docs/handoff-2026-05-10-hd-phase-b1.md`
- Spike entry point: `scripts/hd-spike.ts`
- Commit: `493c7d0` — "HD Phase B1 + B1.5: true lunar node + canonical Rave
  Mandala wheel"
- MyBodyGraph (`https://www.mybodygraph.com/`) — for cross-checking. Note:
  the *stored* Ra Uru Hu profile on MBG appears to use different birth data
  than the canonical 22:39 Beirut value — re-enter the chart manually for
  any cross-check rather than clicking the public profile.
