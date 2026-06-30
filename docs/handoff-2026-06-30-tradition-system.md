# Handoff: Tradition System, House System Toggle & Feedback Module
**Date:** 2026-06-30 (updated same day — third session)
**Status:** Phase 1 ✅ + Phase 2 ✅ + Phase 3 ✅ shipped — Phase 4 (Synthesis) is next  
**Next migration:** 0027

---

## What triggered this session

User `hereiambeingme@gmail.com` reported that her profection year shows **5th house Sagittarius** when her Porphyry 5th house cusp sits at **18° Gemini 25'**. She uses Evolutionary Astrology and selected Porphyry as her house system.

**Root cause diagnosed and fixed:** `lib/astrology/year-word.ts` was hardcoding Whole Sign logic for all profection sign calculations regardless of the user's house system. Fixed in Phase 1. `hereiambeingme` was sent instructions to go to Settings → select Evolutionary → her chart recomputes with Porphyry cusps.

---

## Architectural decisions (confirmed)

### 1. Tradition as the primary preference
House system is not a standalone toggle — it is a **default derived from the user's chosen tradition**. Users can override it.

| Tradition | Default house system |
|---|---|
| Evolutionary | Porphyry |
| Karmic | Porphyry |
| Psychological / Modern | Placidus |
| Traditional / Hellenistic | Whole Sign |
| Synthesis ("a bit of everything") | Placidus |

### 2. Changing tradition triggers natal chart recompute
`PlanetPosition.house` is now computed with the user's house system (Porphyry or Placidus). The recompute path in `app/api/profile/route.ts` now triggers on `house_system` changes in addition to birth data changes.

### 3. Oracle 4-tab feature (confirmed: Option A — separate threads)
Each tradition gets its own **separate conversation instance** with its own in-memory history. The tab switcher lives in the Oracle chat header. Instances are lazy-mounted on first visit and kept alive so history survives tab switches. **4 tabs only: Evolutionary / Karmic / Psychological / Traditional** (Synthesis is Phase 4).

- Each tab = independent `useChat` instance, sends `tradition` in the POST body
- System prompt switches per tab via `TRADITION_LENSES` map in `lib/ai/oracle-system-prompt.ts`
- Tradition lens is in the **cached** prompt block so Anthropic prompt caching still works
- No persistent conversation table — history is in-memory (existing architecture, by design)

### 4. Tradition-aware blueprint prompts — PENDING RESEARCH (Phase 3)
User is researching Evolutionary Astrology source material (Jeff Green, Steven Forrest lineage). Do **not** implement blueprint prompt variants until the research is complete and the prompts are drafted and reviewed.

**Copyright note:** Do not upload copyrighted books to a RAG system for commercial use. Write synthesized notes from reading them.

### 5. Blueprint regeneration for tradition changes
When a user changes their tradition, show a banner on the Blueprint page:
> *"Your tradition has changed. Regenerate your blueprint to reflect your [Tradition] path."*

Use the existing blueprint generation + polling flow — no new infrastructure needed. Not yet built.

---

## What shipped

### Phase 1 ✅ — House system fix + tradition infrastructure

**Migration 0026** applied to prod:
- Added `tradition TEXT DEFAULT 'evolutionary'` to `user_profiles`
- Added `house_system TEXT DEFAULT 'porphyry'` to `user_profiles`
- Created `feedback` table (see Feedback Module section)

**`types/blueprint.ts`**
- Added `HouseSystem = 'whole_sign' | 'porphyry' | 'placidus'`
- Added `Tradition = 'evolutionary' | 'karmic' | 'psychological' | 'traditional' | 'synthesis'`
- Added `TRADITION_HOUSE_DEFAULTS` map
- Updated `NatalChart`: added `houseSystem: HouseSystem`, `ascendantLongitude?: number`, `houseCusps?: number[]`

**`lib/ephemeris/astronomia-adapter.ts`**
- Added `computePorphyryCusps(ascLon, mcLon): number[]`
- Added `computePlacidusCusps(lastRad, eps, lat): number[]` — fixed-point iteration, 30 iterations
- Added `houseFromCusps(lon, cusps): number` — handles 360° wrap
- Updated `computeNatalChart(birth, houseSystem = 'whole_sign')` — accepts optional house system, stores `ascendantLongitude` and `houseCusps` on returned chart

**`lib/astrology/year-word.ts`**
- `profectionSign()` now reads `houseCusps[house-1]` when available (Porphyry/Placidus), falls back to whole-sign counting. **This is the hereiambeingme fix.**

**`app/api/profile/route.ts`**
- GET now returns `tradition` and `house_system`
- PATCH triggers natal chart recompute when `house_system` changes (not just birth fields)
- Passes stored `house_system` into `computeNatalChart`

**Settings UI (`app/(app)/settings/page.tsx`)**
- New "Astrological tradition" section with 5 radio cards
- Changing tradition auto-sets house system to tradition default
- House system pills for independent override with a note when diverging

**Onboarding (`lib/constants.ts`, new `app/(onboarding)/onboarding/tradition/page.tsx`)**
- Tradition is now step 2 of 7 (was 6 steps, now 7)
- Birth data → Tradition → Goals → Study → Year focus → Energy → Aesthetic
- Tradition step saves `tradition` + `house_system` to profile, navigates to goals

---

### Phase 2 ✅ — Oracle 4-tab tradition feature

**`lib/ai/oracle-system-prompt.ts`**
- Added `TRADITION_LENSES` map with full interpretive lenses for all 4 traditions
- Added `buildTraditionLayer()` in the **cached** prompt block
- Added `tradition?: string | null` to `OraclePromptContext`

**`app/api/oracle/chat/route.ts`**
- Reads `tradition` from request body, falls back to `profile.tradition`
- Passes to `buildOracleSystemPromptSegments`
- Fixed model ID: `claude-sonnet-4.6`

**`components/oracle/OracleConversation.tsx`**
- Accepts `tradition?: string` prop, sends it in `DefaultChatTransport` body

**`components/oracle/OracleChat.tsx`**
- 4-tab bar with user's stored tradition as default active
- Lazy-mount + stay-alive per tab (history preserved on tab switch)

**`app/(app)/oracle/page.tsx`**
- Fetches `tradition` from profile, passes to `OracleChat`

---

## What's left

### Phase 3 ✅ — Tradition-Aware Blueprint Prompts

**Shipped in this session.** `lib/ai/blueprint-system-prompt.ts` now accepts `tradition` and branches into one of 4 lenses.

**Key implementation decisions:**
- `buildBlueprintTraditionLens(tradition)` returns `null` when `tradition` is `null`, `undefined`, or unrecognized (e.g., `'synthesis'`). **No default lens. No fallback to Evolutionary.**
- `assembleBlueprintSystemPrompt(tradition?)` only appends the lens block when it's non-null. Users who haven't chosen a tradition get the same generic base prompt as before.
- This means `'synthesis'` also falls through to no lens (correct: Synthesis lens is Phase 4).
- The DB column `user_profiles.tradition` has `DEFAULT 'evolutionary'` from migration 0026. The code-level fallback was deliberately decoupled from the DB default — a user who never visits onboarding/settings will have `tradition = 'evolutionary'` in DB and will get the Evolutionary lens, which is fine. The concern was users who explicitly have `NULL` somehow, which now correctly get no lens.
- Oracle's `buildTraditionLayer` still defaults to `'evolutionary'` for null — intentional; Oracle is interactive and can be pushed back on. Blueprint is a one-shot generation that should not assume a tradition the user hasn't chosen.
- `blueprint-generator.ts` passes `profile.tradition ?? null` to the prompt builder.

**All 4 traditions implemented:**

| Tradition | House System | Diagnostic Spine | "Good Year" Definition |
|---|---|---|---|
| Evolutionary | Porphyry (Green) / Placidus (Forrest) | Pluto + nodal axis + PPP | Conscious evolutionary choice made at a threshold |
| Karmic | Placidus (interceptions = collective karma) | Lunar nodes + Saturn as Lord of Karma + Draconic overlay | Dharma alignment; South Node habit dismantled |
| Psychological | Placidus (Koch alt) | MC-IC parental axis + water house trinity | Individuation advanced; shadow integrated |
| Traditional | Whole Sign (topical) | Sect (hairesis) + time-lord stack (profections → firdaria → solar return) | Eupoia biou — fate fulfilling smoothly |

**Remaining Phase 3 items (not yet built):**
- [ ] **Blueprint page** — show regeneration banner when `natal_chart.houseSystem` differs from `user_profiles.house_system` OR when tradition changed since last blueprint generation.
- [ ] Add `tradition` and `house_system` to `blueprint_plans` table so we know which tradition a given blueprint was generated under. (Migration 0027)

### Phase 4 — Synthesis Tradition

- [ ] Fifth tradition option in settings and onboarding: "A bit of everything"
- [ ] Add `synthesis` to `ORACLE_TRADITIONS` in `OracleChat.tsx` (currently 4 tabs, Phase 4 adds the 5th)
- [ ] System prompt weaves all four lenses — Pluto/Node spine (Evolutionary), Saturn themes (Karmic), archetypal/shadow (Psychological), essential dignities + timing (Traditional)
- [ ] Must avoid a muddy blend — Claude needs clear rules about which lens applies to which section
- [ ] Default house system: Placidus

### Feedback Module — DB is live, UI not built

DB table `feedback` was created in migration 0026. Still needed:

- [ ] **Floating feedback button** — bottom-right corner, available on all pages
- [ ] **Modal** — category selector + free text + confirmation message
- [ ] **Categories:**
  ```
  ○ General feedback
  ○ Feature request  
  ○ Something feels off with my reading
  ○ Bug or technical issue
  ```
  For "Something feels off with my reading", show sub-selector:
  ```
  ○ Feels generic — not specific to my chart
  ○ Factually inaccurate  
  ○ Doesn't match my tradition / house system
  ○ Other
  ```
- [ ] **Framing copy:**
  > **"Help us improve"**  
  > *Kiaros is built on real ephemeris data and AI synthesis. If a reading feels generic, inaccurate, or just off — we want to know. Your feedback directly shapes how we improve the generations.*
- [ ] **Admin console** — Feedback tab listing by category/date/user, filterable by "Something feels off"
- [ ] **Email notification** to `jmelendez2269@gmail.com` on each "Something feels off" submission

---

## Key files reference

| File | What it does |
|---|---|
| `lib/astrology/year-word.ts` | Cusp-aware profection sign (Phase 1 fix) |
| `lib/ephemeris/astronomia-adapter.ts` | Porphyry + Placidus cusp calculators |
| `types/blueprint.ts` | HouseSystem, Tradition types; NatalChart with houseCusps |
| `lib/ai/oracle-system-prompt.ts` | TRADITION_LENSES + buildTraditionLayer |
| `components/oracle/OracleChat.tsx` | 4-tab Oracle UI |
| `components/oracle/OracleConversation.tsx` | Sends tradition in chat body |
| `app/api/oracle/chat/route.ts` | Reads tradition from body, passes to prompt |
| `app/api/profile/route.ts` | Triggers recompute on house_system change |
| `app/(app)/settings/page.tsx` | Tradition + house system UI |
| `app/(onboarding)/onboarding/tradition/page.tsx` | Onboarding step 2 |
| `lib/constants.ts` | ONBOARDING_STEPS updated (now 7 steps) |
| `supabase/migrations/0026_tradition_house_system_feedback.sql` | Applied ✅ |
| `lib/ai/blueprint-system-prompt.ts` | `BLUEPRINT_TRADITION_LENSES` map + `assembleBlueprintSystemPrompt(tradition?)` — Phase 3 ✅ |
| `lib/ai/blueprint-generator.ts` | Passes `profile.tradition ?? null` to system prompt builder — Phase 3 ✅ |

---

## Open questions resolved

- ✅ Oracle tabs: **Option A confirmed** — separate threads per tradition, not a voice switcher
- ✅ Onboarding: tradition is step 2 (after birth data, before goals)
- ✅ Synthesis house system: Placidus confirmed
- ⏳ Feedback notifications: email on "feels off" category only (not every submission)
- ⏳ RAG / deep Oracle knowledge: parked until copyright approach resolved and base tradition system shipped

---

## Next session instructions

**Tell Claude at the start of the next session:**

> "We're continuing the tradition system. Phase 3 is complete. Read `docs/handoff-2026-06-30-tradition-system.md` for full context. The remaining work is: (1) regeneration banner on the Blueprint page, (2) Migration 0027 to add `tradition` + `house_system` to `blueprint_plans`, and/or (3) Phase 4 Synthesis tradition."

**The implementation order for that session:**
1. Read this handoff
2. Decide which remaining item to tackle (regeneration banner, Migration 0027, or Phase 4 Synthesis)
3. For the regeneration banner: compare `blueprint.astrological_context.natalChart.houseSystem` vs `profile.house_system` and `blueprint_plans.tradition` vs `profile.tradition` — show banner if either differs
4. For Migration 0027: add `tradition TEXT` and `house_system TEXT` columns to `blueprint_plans`; populate them at write time in `blueprint-generator.ts`
5. For Phase 4 Synthesis: design the blended lens that draws from all 4 traditions without muddying them

---

## Current user action needed

`hereiambeingme@gmail.com` — Phase 1 is live:
1. Settings → select **Evolutionary Astrology**
2. House system auto-sets to Porphyry, natal chart recomputes
3. Profection year now reflects Porphyry cusps

Blueprint regeneration banner (Phase 3) not yet built — she'll need to manually regenerate once tradition-aware blueprint prompts are ready.
