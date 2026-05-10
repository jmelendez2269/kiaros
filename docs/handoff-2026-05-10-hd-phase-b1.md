---
type: handoff
date: 2026-05-10
branch: feature/human-design
prior: docs/handoff-2026-05-08.md (spike + scope), docs/architecture-v2.md §8 (Phase 4.5)
---

# Kiaros Handoff — HD Phase B1 (True Lunar Node)

For the next session on `feature/human-design`. Read this first, then `CLAUDE.md`, then the prior handoff at `docs/handoff-2026-05-08.md`.

## Why Phase B at all

The 2026-05-08 spike validated the HD/Gene Keys math against MyBodyGraph and GeneticMatrix. Two known methodology gaps were deferred:

1. **Mean → true lunar node.** `astronomia` ships only the mean node. Drift between mean and true reaches ~1.5°. Each HD gate is ~5.6° wide, so a node sitting near a gate boundary will land on the wrong gate ~5–10% of the time.
2. **Per-day Pluto.** `lib/ephemeris/pluto-table.ts` is keyed by birth year. Personality and Design therefore see the same Pluto value. Pluto moves ~3°/year, ~0.7° in 88 days — enough to cross a gate boundary occasionally.

Pre-launch decision: fix both before Phase A (display) ships. If users see a Profile or activation that later silently changes when methodology is corrected, the "evidence-based" promise is broken on first contact.

This handoff covers **B1 — true lunar node only**. B2 (per-day Pluto) and B3 (re-validation) come after.

## Approach: pure-code perturbation series

No new dependencies. Implement Meeus *Astronomical Algorithms* 2nd ed., chapter 47, equation 47.7 — the periodic correction series that converts the mean ascending node Ω̄ to the true ascending node Ω.

### Why this and not the alternatives

- **Pure-code series** (this approach) — ~50 lines, matches the existing astronomia-based architecture, no new deps, accurate to ~0.05°. Way better than HD's ~5.6° gate width needs.
- **Precomputed lookup table** — same accuracy as series at sample dates, but bounded date range and a maintenance burden. Only worth it if compute cost matters; it doesn't.
- **`swisseph` or another C/native library** — highest accuracy, but native deps on Vercel Fluid Compute add deployment risk and the precision is wasted on HD's 5.6° gates.

### The math

Mean elongation of the Moon (D), Sun's mean anomaly (M), Moon's mean anomaly (M'), and Moon's argument of latitude (F) are computed from T = (JDE − 2451545.0) / 36525:

```
D  = 297.8501921 + 445267.1114034·T − 0.0018819·T² + T³/545868 − T⁴/113065000
M  = 357.5291092 + 35999.0502909·T − 0.0001536·T² + T³/24490000
M' = 134.9633964 + 477198.8675055·T + 0.0087414·T² + T³/69699 − T⁴/14712000
F  = 93.2720950 + 483202.0175233·T − 0.0036539·T² − T³/3526000 + T⁴/863310000
```

The leading correction terms (degrees) for true Ω relative to mean Ω̄:

```
ΔΩ = −1.4979 sin(2D − 2F)
     − 0.1500 sin(M)
     − 0.1226 sin(2D)
     + 0.1176 sin(2F)
     − 0.0801 sin(2M' − 2F)
     + … remaining smaller terms (Meeus 47.7 has the full table)
```

Sum the series; add to Ω̄; normalize to [0, 360). That's the true ascending node.

### Files to touch

| File | Change |
|---|---|
| `lib/ephemeris/human-design/design-chart.ts` | Replace `meanLunarNodeLongitude(jde)` with `trueLunarNodeLongitude(jde)`. The mean-node calculation stays internal as a helper; the exported call site at line 140 (`buildActivationSet`) switches to the true value. |
| `lib/ephemeris/human-design/design-chart.ts` (header doc) | Update the comment block at lines 23–25 from "uses *mean* node" to "uses *true* node, mean → true correction via Meeus 47.7." |
| `scripts/hd-spike.ts` | No change — it already prints the node activations, just verify the new gates against published HD calculators in the validation step below. |

### Suggested implementation sketch

```ts
// lib/ephemeris/human-design/design-chart.ts

const DEG = Math.PI / 180

function meanLunarNodeLongitude(jde: number): number {
  const T = (jde - 2451545.0) / 36525
  const omega =
    125.04452 -
    1934.136261 * T +
    0.0020708 * T * T +
    (T * T * T) / 450000
  return normalizeDeg(omega)
}

function trueLunarNodeLongitude(jde: number): number {
  const T = (jde - 2451545.0) / 36525
  const Omega = meanLunarNodeLongitude(jde)

  // Mean anomalies and elongation (Meeus 47.2–47.5)
  const D  = 297.8501921 + 445267.1114034 * T - 0.0018819 * T*T
           + (T*T*T) / 545868 - (T*T*T*T) / 113065000
  const M  = 357.5291092 + 35999.0502909 * T - 0.0001536 * T*T
           + (T*T*T) / 24490000
  const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T*T
           + (T*T*T) / 69699 - (T*T*T*T) / 14712000
  const F  = 93.2720950 + 483202.0175233 * T - 0.0036539 * T*T
           - (T*T*T) / 3526000 + (T*T*T*T) / 863310000

  // Periodic correction terms (Meeus 47.7, leading entries)
  // Argument expressed in degrees; convert to radians inside sin().
  const corr =
    -1.4979 * Math.sin((2*D - 2*F) * DEG)
    -0.1500 * Math.sin(M * DEG)
    -0.1226 * Math.sin(2*D * DEG)
    +0.1176 * Math.sin(2*F * DEG)
    -0.0801 * Math.sin((2*Mp - 2*F) * DEG)
    // Add remaining Meeus 47.7 terms; total ~14 terms.

  return normalizeDeg(Omega + corr)
}
```

The full Meeus 47.7 table has roughly 14 terms. The 5 above already get within ~0.1° in most epochs; including all 14 brings it under ~0.05°. Either is fine for HD's 5.6° gates. Implementer's call.

## Validation

Two independent checks. **Both must pass before merging.**

1. **Numerical sanity.** For JDE = 2451545.0 (J2000.0, 2000-01-01 12:00 UTC):
   - Mean Ω ≈ 125.04°
   - True Ω at this epoch is documented in Meeus' worked examples (chapter 47 or 22). Confirm the function returns within 0.1° of the published true-node value.

2. **HD chart cross-check.** Run `npx tsx scripts/hd-spike.ts`. The Ra Uru Hu chart's North Node activation must match MyBodyGraph (`https://www.mybodygraph.com/`). The current mean-node value gives `northNode` activation that's already close — true-node should match exactly to gate.line, or be within 1 line of MBG's value (MBG sometimes uses true, sometimes mean — note which when you check). Document MBG's reported gate.line in the commit message so future debugging is easy.

If the spike output drifts on charts that previously matched (Sun, Earth, slow planets), something is off — the node fix should not affect those activations.

## Acceptance criteria

A focused PR/commit on `feature/human-design` that:

- [ ] Replaces `meanLunarNodeLongitude` calls with `trueLunarNodeLongitude` in `buildActivationSet`.
- [ ] Keeps `meanLunarNodeLongitude` private as a helper inside `trueLunarNodeLongitude`.
- [ ] Updates the header comment in `design-chart.ts`.
- [ ] Confirms numerical sanity at J2000.0 (note in commit message).
- [ ] Confirms Ra Uru Hu's North Node still matches MyBodyGraph (note MBG value in commit message).
- [ ] No changes outside `lib/ephemeris/human-design/design-chart.ts` and (optionally) the spike output comments.
- [ ] `npx tsc --noEmit` passes.

## What comes next (do not start in this session)

- **B2 — Per-day Pluto.** Extend `lib/ephemeris/pluto-table.ts` from year-keyed to date-keyed (likely monthly granularity). Personality and Design then see different Pluto values when the 88° Design moment lands months before birth. Estimated: 1 day.
- **B3 — Re-validation.** Re-run spike against MBG and GeneticMatrix for all three reference charts after both B1 and B2 land. Document any surviving discrepancies. Estimated: half a day.
- **Phase A** — Storage + display. New `user_human_design` table (migration `0014_user_human_design.sql`), compute-and-store service, onboarding hook, backfill script, `app/(app)/human-design/page.tsx`, `app/(app)/gene-keys/page.tsx`, sidebar nav, time-unknown banner.
- **Phase C** — Prompt integration into blueprint + Oracle, transit-to-gate map.

Locked decisions from the planning session (2026-05-10):
- Storage: separate `user_human_design` table with `methodology_version SMALLINT` so corrections can recompute cleanly.
- Time-unknown UX: compute at noon, mark approximate, suppress Profile (1 line per 2.4h is too lossy to guess), banner offering settings link.
- Gene Keys depth: Activation Sequence (4 Prime Gifts) only. Venus + Pearl deferred.
- Backfill: idempotent script, trivial population today (essentially the dev account).

## Files NOT to touch in B1

To keep the diff focused and reviewable:

- `lib/ephemeris/human-design/bodygraph.ts`
- `lib/ephemeris/human-design/gate-wheel.ts`
- `lib/ephemeris/human-design/gene-keys.ts`
- `lib/ephemeris/pluto-table.ts` (that's B2)
- Anything under `app/`, `components/`, `supabase/migrations/` (that's Phase A)

## References

- Meeus, *Astronomical Algorithms*, 2nd edition, chapter 47 (especially 47.2–47.7 for the perturbation series, and the worked example near §22 if available).
- Existing implementation at `lib/ephemeris/human-design/design-chart.ts:81–89` for the mean-node baseline.
- MyBodyGraph (`https://www.mybodygraph.com/`) for cross-checking the Ra Uru Hu chart.
