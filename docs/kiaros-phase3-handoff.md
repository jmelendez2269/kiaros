---
status: SUPERSEDED
superseded_by: docs/architecture-v2.md, PRODUCT_BIBLE.md
superseded_on: 2026-04-12
type: handoff
subject: kiaros
phase: 3
created: 2026-04-12
updated: 2026-04-12
status: in-progress
---

# Kiaros — Phase 3 Handoff

**Continue from this document at the start of the next chat.**
**Phase 2 (onboarding implementation) is complete. Phase 3 (blueprint generation + rendering) is partially complete.**

---

## What Was Built in Phase 3 (So Far)

### AI Blueprint Generation — Done
- `lib/services/blueprint.ts` — `generateBlueprintContent()` calls `claude-sonnet-4-6` with a structured prompt, parses JSON response, returns a `Partial<DbBlueprint>` ready to insert
- `buildMockBlueprint()` — warm fallback if AI generation fails
- `POST /api/blueprint` — now calls real AI generation, falls back to mock on error, sets `generated_with: "claude-sonnet-4-6-template-v1"`
- Anthropic SDK installed (`@anthropic-ai/sdk`), `ANTHROPIC_API_KEY` set in `.env.local`

### Blueprint Page — Done
- `app/(app)/blueprint/page.tsx` — fully built, fetches from `GET /api/blueprint`, renders all sections
- Energy framing displayed as a colour-coded badge (Push / Build / Maintain / Rest / Integrate)
- Season theme as hero headline, all 6 sections rendered, category guidance per area
- Loading skeleton, error state, and empty state all handled

### Tone & Voice — Updated
- Prompt system instructions rewritten: warm, sovereign, natural cycles language
- Explicitly excludes hustle culture, judgemental framing, performative assumptions
- Mock fallback copy updated to match the same voice

---

## Product Direction Change — Important

**The core onboarding flow has been redesigned in principle. This has NOT been built yet.**

### Old flow
```
Sign Up → 5-step onboarding (birth, location, goals, vision, reflection) → Blueprint → Dashboard
```

### New intended flow
```
Sign Up → Quick onboarding (birth info only) → Birth-based Blueprint → Dashboard
                                    ↓ optional
                         Deep onboarding (goals, vision, reflection)
                                    ↓
                         Personalised AI-enhanced Blueprint
```

**Why:** 5-step onboarding before any value is a conversion barrier. The quick path shows people the product's magic first — a real blueprint from birth data and natural cycles — then invites them to go deeper.

**What this means for Phase 4:**
- The quick onboarding path needs to be built (birth info only — steps 1 + 2)
- The AI generation prompt needs a "birth-only" variant (no goals/vision fields)
- The deep onboarding remains as-is for users who want it
- Dashboard should surface an "enrich your blueprint" prompt for quick-path users

**This is a product decision that needs discussion with Jack before building.** The current 5-step onboarding still works and is live — don't break it while building the quick path.

---

## Dev Setup

```bash
cd g:/Projects/Kiaros
npm install
npm run dev
# runs on http://localhost:3699
```

All env vars in `.env.local` (gitignored):
- Clerk: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` ✅
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` ✅
- Anthropic: `ANTHROPIC_API_KEY` ✅

---

## Database State

Supabase project: **Kairos** (`fslowrhswawatdfludqp`, region: us-west-2)

All tables live:
- `users` — one row per Clerk user
- `onboarding_data` — one row per user (UNIQUE on `user_id`)
- `blueprints` — versioned blueprint rows per user
- `feedback` — beta feedback submissions

---

## What Still Needs Doing in Phase 3

### Must-have before Phase 3 is complete
- [ ] **Test with real data end-to-end** — go through full onboarding with realistic inputs, verify the AI output feels personal and specific (not generic)
- [ ] **Verify `generated_with` field** in Supabase is `"claude-sonnet-4-6-template-v1"` for real generations
- [ ] **Check all blueprint sections render** — energy framing badge, category guidance, all 6 sections

### Nice-to-have before moving to Phase 4
- [ ] Decide on quick-path vs deep-path onboarding split (product discussion first)
- [ ] Consider adding a "regenerate" flow for when users want a fresh blueprint

---

## Phase 4 Preview (Don't Build Yet)

After Phase 3 is validated:
1. Dashboard populated with real data from the blueprint
2. Derive "current week" guidance from the blueprint
3. Energy framing surfaced on the dashboard
4. "Enrich your blueprint" prompt for quick-path users (if quick path is built)

---

## Key Files Reference

| Purpose | File |
|---------|------|
| Blueprint generation service | `lib/services/blueprint.ts` |
| Blueprint API | `app/api/blueprint/route.ts` |
| Blueprint page | `app/(app)/blueprint/page.tsx` |
| Type definitions | `lib/types.ts` |
| DB row types + Supabase client | `lib/supabase.ts` |
| User service | `lib/services/user.ts` |
| Onboarding service | `lib/services/onboarding.ts` |

---

## Reading Order for Next Session

1. This document
2. [CLAUDE.md](../CLAUDE.md) — Conventions, architecture, product direction
3. [lib/services/blueprint.ts](../lib/services/blueprint.ts) — Generation logic and tone
4. [app/(app)/blueprint/page.tsx](../app/(app)/blueprint/page.tsx) — Current rendering

---

## Tone & Voice Principles (Do Not Violate)

Kiaros users are **sovereign**. The product exists to support them in aligning with their natural rhythms — not to prescribe, correct, or push.

**Never write:**
- "where you think you should be" (judgemental)
- "what it actually is" / "face reality" (harsh)
- "optimise", "level up", "grind", hustle-adjacent language
- Anything that implies the user isn't being honest with themselves

**Always write:**
- Warm, grounded, spacious
- Connected to natural cycles and seasonal energy
- Empowering — the user already has what they need
- Like a trusted friend who deeply respects their autonomy

---

**Handoff updated**: April 12, 2026
**Phase 3 status**: Partially complete — generation live, rendering live, testing pending
**Next decision**: Quick-path onboarding split (discuss with Jack before building)
