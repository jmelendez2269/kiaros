---
status: SUPERSEDED
superseded_by: docs/architecture-v2.md, PRODUCT_BIBLE.md
superseded_on: 2026-04-12
superseded_reason: MVP-cut scope was too thin; adopted Product Bible as full product vision
type: deliverable
subject: kiaros
status: draft
created: 2026-04-09
updated: 2026-04-10
workflow: active
owner: Jack
tags:
  - deliverable
  - kiaros
  - draft
  - developer
  - handoff
  - build
source_file: kiaros-developer-handoff-v1.md
---

# Kiaros Developer Handoff v1

_Date: 2026-04-09_

## 1. Project Summary

Kiaros is the first planned launch product under the broader Project Parallax brand.

It is a personalized planning system built around a user’s goals, timing, and natural cycles. The core intention is to create a planning experience that feels more personal, reflective, and aligned than generic productivity tools or gimmicky astrology apps.

This first build is intended to support a focused founding beta, not the full long-term product vision.

---

## 2. Product Goal

The goal of Kiaros v1 is to help a user:
- reflect on where they are
- clarify what matters now
- receive a personalized blueprint or guidance layer
- apply that guidance to the current season of their life

The product should feel like a planning system, not just a one-time reading.

---

## 3. Target User

### Primary user
A spiritually curious or self-development-oriented woman who is burned out by generic productivity systems and wants a more personalized, cyclical, and meaningful way to organize her life.

### Important user assumptions
- she wants structure, but not rigidity
- she is open to reflective/symbolic frameworks
- she wants guidance that feels personal, not generic
- she is not looking for a horoscope gimmick
- she wants planning to feel grounding and useful

---

## 4. Core Product Promise

**A personalized planning system built around your goals, timing, and natural cycles.**

This means the first version should create the experience of:
- being understood
- receiving relevant guidance
- reducing overwhelm
- gaining clarity about what to focus on now
- feeling less pressured by one-size-fits-all planning models

---

## 5. Current Build Strategy

This is an MVP / beta-oriented build.

We are intentionally **not** building the entire long-term product bible in v1.

The goal is to build the smallest version that can:
1. capture meaningful user context
2. produce a believable personalized output
3. help the user apply that output in the present
4. be tested with real beta users

---

## 6. Required MVP Scope

The following are the required components for Kiaros beta.

### A. Auth / product shell
- user can enter the app
- user can access onboarding
- user can land in a post-onboarding dashboard / overview

### B. Guided onboarding
Must collect:
- birth data
- birth location
- current goals / life categories
- current year or current-season vision
- optional cycle inputs
- recent-life reflection / rolling-entry context

### C. Personalized blueprint generation
The system must generate a personalized output based on onboarding data.

### D. Dashboard / guidance surface
The user must be able to return and see:
- current week or current season guidance
- what matters now
- energy framing / timing guidance
- a clear overview of their current planning context

### E. Light interpretation layer
At minimum, one of the following:
- lightweight Oracle/chat
- contextual interpretation blocks attached to current guidance

### F. Feedback mechanism
A beta user must have a simple way to submit feedback.

---

## 7. Explicitly Out of Scope for This First Build

These items should not block beta:
- full tracker customization
- full journaling suite
- quarterly reviews
- Year Unwrapped
- advanced analytics
- extensive settings architecture
- full social/share features
- every advanced feature from the original product bible

If implementation tradeoffs are required, protect the onboarding → blueprint → current guidance flow first.

---

## 8. Product Flow

### Primary flow
1. User enters app
2. User completes onboarding
3. System generates personalized blueprint
4. User lands in overview/dashboard
5. User sees current guidance
6. User optionally interacts with interpretation layer
7. User can return later and continue using current guidance
8. User can submit feedback on the experience

### Success condition for this flow
A first-time user should feel:
- this is personal
- this is different
- I understand what it is telling me
- I know what to do next

---

## 9. Recommended MVP Screens / Views

### Required screens
1. Landing / entry point (internal is fine at first)
2. Sign in / access screen
3. Onboarding screens
   - birth data
   - goals / categories
   - vision / current season
   - cycle (optional)
   - recent-life reflection
4. Generating / processing screen
5. Dashboard / overview screen
6. Blueprint output screen or panel
7. Current week / current season guidance screen or module
8. Feedback screen or in-app feedback component

### Optional if easy
- lightweight chat / Oracle view
- simple notes/check-in area

---

## 10. Blueprint Output Expectations

This is one of the most important areas to define clearly.

### The MVP blueprint must include
- a core theme for the user’s current season / planning period
- guidance tied to the user’s stated goals
- energy framing (example: push / build / maintain / rest / integrate)
- what to lean into
- what not to force
- practical focus guidance for near-term use

### Recommended output shape for MVP
The output does **not** need to be an enormous year-long artifact initially.

A strong MVP version could focus on:
- current season summary
- next 30–90 days outlook
- category-specific focus guidance
- support / caution guidance
- current energy framing

### Important product note
The output must feel grounded and individualized, not like generic astrology text with inserted user data.

---

## 11. Rolling Entry Requirement

Kiaros should not behave as a January-only planner.

Users must be able to join at any point in the year and still receive a meaningful experience.

### Implication for build
The onboarding and generation logic should account for:
- recent months / recent-life reflection
- current season of life
- not just forward-looking annual planning

This is strategically important and should not be treated as a small cosmetic add-on.

---

## 12. UX / Design Direction

### Desired feel
- dark mode first
- thoughtful, calm, reflective
- modern and intelligent
- mystical-but-practical
- not cluttered
- not cheesy
- not overwhelming

### UI priorities
- clarity over ornament
- strong hierarchy
- breathing room
- ceremonial onboarding feel
- grounded trustworthiness

### Product should not feel like
- a generic dashboard template
- a horoscope gimmick
- an overly academic philosophy tool
- a chaotic startup prototype with spiritual wallpaper

---

## 13. Technical Direction (Current Preference, Subject to Dev Input)

Current preferred stack direction from product docs:
- web app first
- Next.js
- TypeScript
- Supabase
- Clerk or equivalent auth
- AI-powered generation / interpretation layer

### Important note
The developer can suggest better technical choices if they preserve:
- speed to beta
- maintainability
- personalization quality
- a believable path to scaling later

### Priority
Optimize for getting a strong beta product into real users’ hands, not for prematurely architecting the entire long-term platform.

---

## 14. What Can Be Simplified in the First Build

To move faster, the developer should feel permission to simplify:
- some generation logic can be narrower before expansion
- some output formatting can be constrained
- some interactive features can begin as pre-generated modules instead of full conversational systems
- some onboarding customization can start basic
- some visual layers can be polished later

### Key rule
Simplify in ways that preserve the core experience.
Do not simplify the product into genericity.

---

## 15. Beta-Ready Definition

Before Kiaros is opened to founding beta users, the following should be true:
- onboarding works clearly
- onboarding collects meaningful context
- blueprint generation works reliably
- blueprint feels personalized
- dashboard / overview is usable
- current-week or current-season guidance is visible and understandable
- there is enough ongoing value for repeat use
- users can submit feedback

If these conditions are met, Kiaros can enter beta even if many long-term features are still absent.

---

## 16. Questions the Developer Should Help Answer

The developer should help pressure-test and answer:
- what exact blueprint structure is best for MVP?
- should the first version focus on current season + 30–90 day planning rather than a full year artifact?
- what can be template-assisted vs fully generated?
- what is the fastest credible route to a usable beta?
- what must be real now versus what can be upgraded after real user feedback?

---

## 17. Useful Supporting Documents

The developer should also be given these docs:
- `project-parallax-strategic-draft-v1.md`
- `kiaros-mvp-cut-v1.md`
- `kiaros-beta-pricing-framework-v1.md`
- `kiaros-beta-offer-draft-v1.md`
- `kiaros-build-sequence-v1.md`
- `kiaros-beta-readiness-checklist-v1.md`
- `kiaros-landing-page-copy-v1.md`

These provide additional context on positioning, scope, launch logic, and product boundaries.

---

## 18. Working Summary

Kiaros v1 should be built as a focused beta product centered on onboarding, personalized output, and practical current guidance.

The developer’s goal is not to implement the entire grand vision immediately. The goal is to create a first version that feels personal, useful, differentiated, and stable enough to put in front of real users.

If a tradeoff must be made, protect the core flow:
**context capture → personalized blueprint → present-time guidance.**
