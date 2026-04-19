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
  - ai
  - build
source_file: kiaros-ai-dev-starter-pack-v1.md
---

# Kiaros AI Dev Starter Pack v1

_Date: 2026-04-09_

## 1. Purpose

This document is the AI coding brief for building Kiaros with an AI assistant (for example Claude in VS Code).

Its job is to give the coding agent enough context to build effectively without accidentally trying to implement the entire long-term product vision in one pass.

This document should be used as the top-level briefing before beginning implementation.

---

## 2. What Kiaros Is

Kiaros is a personalized planning system built around a user’s goals, timing, and natural cycles.

It is the first planned launch product under the broader Project Parallax brand.

Kiaros is intended to help users:
- understand the season they are in
- reduce overwhelm
- receive personalized planning guidance
- work with timing and cycles instead of generic one-size-fits-all productivity structures

It should feel:
- personal
- grounding
- intelligent
- reflective
- modern
- mystical-but-practical

It should **not** feel like:
- a generic planner
- a generic productivity dashboard
- a gimmicky astrology app
- a giant philosophy engine pretending to be an MVP

---

## 3. Build Goal

Build the smallest credible beta version of Kiaros.

This version must allow a user to:
1. enter meaningful personal context
2. receive a believable personalized planning output
3. understand what matters now
4. return to a useful dashboard/guidance experience

The goal is **not** to build the full product bible in one shot.

---

## 4. MVP Boundaries

### Must build
- app shell
- auth / access flow
- guided onboarding
- recent-life reflection / rolling-entry onboarding support
- personalized blueprint generation or mocked equivalent
- dashboard / overview
- current week or current season guidance
- basic feedback capture

### Can be lightweight in v1
- interpretation layer / Oracle
- generation sophistication
- visual polish beyond trust/coherence

### Do not build yet
- full tracker system
- deep journaling system
- quarterly reviews
- Year Unwrapped
- advanced analytics
- extensive settings systems
- full long-term ecosystem features
- anything that exists only to prove worth through scope

---

## 5. Product Principles

### Principle 1 — Preserve the core promise
If a feature does not strengthen the core promise, it should probably wait.

### Principle 2 — Avoid scope inflation
Do not expand v1 into the full long-term product vision.

### Principle 3 — Prioritize flow over feature count
The onboarding → blueprint → current guidance loop matters more than having lots of extra surfaces.

### Principle 4 — Make the product feel personal
Even if the first implementation is simplified, it must not feel generic.

### Principle 5 — Rolling entry matters
Users must be able to join at any point in the year and still receive meaningful output.

---

## 6. Recommended Technical Direction

Use sensible modern web app defaults optimized for speed to beta and maintainability.

### Preferred stack
- Next.js
- TypeScript
- Tailwind CSS
- Supabase
- Clerk (or equivalent auth if there is a strong reason)

### AI / generation layer
Use a practical generation strategy that gets to believable output quickly.
It is acceptable to start with:
- structured templates
- mocked generation
- constrained output schemas
- progressively smarter generation later

Do not block the product on achieving maximum generation sophistication immediately.

---

## 7. Recommended Build Order

### Phase 1
Scaffold the app and create the shell.

Build:
- project setup
- auth structure
- route structure
- onboarding shell
- dashboard shell
- placeholder states

### Phase 2
Build onboarding and data capture.

Must include:
- birth data
- location
- goals/categories
- current season/year vision
- optional cycle input
- recent-life reflection

### Phase 3
Define and implement blueprint output structure.

Build:
- output schema
- generation pipeline (real or mocked first)
- blueprint rendering

### Phase 4
Build the present-time application layer.

Build:
- overview/dashboard
- current guidance module
- energy framing
- practical “what matters now” section

### Phase 5
Add support for beta learning.

Build:
- lightweight interpretation layer OR contextual explanation blocks
- feedback capture
- basic polish for core trust flow

---

## 8. Blueprint Expectations for v1

The blueprint does not need to be a giant perfect annual artifact in the first implementation.

A strong v1 blueprint can be centered on:
- current season summary
- next 30–90 day outlook
- guidance tied to the user’s own goals
- what to lean into
- what not to force
- energy framing

### The blueprint must feel
- individualized
- coherent
- useful
- distinct from generic astrology copy

---

## 9. UX Expectations

### Desired feel
- dark mode first
- calm
- spacious
- reflective
- modern
- trustworthy

### Onboarding feel
- guided
- intentional
- reflective, not bureaucratic

### Dashboard feel
- clear
- useful
- not overloaded
- focused on helping the user understand their current season

---

## 10. How to Work with the AI Coding Assistant

### Good prompting style
Work in phases.
Do not ask for the whole platform at once.

Use prompts like:
- “Scaffold the app shell and route structure only.”
- “Now implement onboarding step 1 and 2.”
- “Now define the blueprint schema and render mocked blueprint output.”
- “Do not build tracker, journaling, or reviews yet.”

### Bad prompting style
Avoid prompts like:
- “Build the full Kiaros app from these docs.”
- “Implement everything in the product bible.”
- “Make this production-ready with all planned features.”

That invites scope explosion and messy output.

---

## 11. Constraints for the AI Coding Assistant

The coding assistant should:
- ask for clarification when needed
- preserve MVP boundaries
- prefer simpler implementations that keep the core experience strong
- not invent large additional feature sets
- keep code maintainable and readable
- document assumptions when making tradeoffs

The coding assistant should **not**:
- turn this into the entire Project Parallax ecosystem
- expand features just because they are mentioned in reference docs
- overengineer before the beta loop exists

---

## 12. Definition of Success for Early Build Sessions

A build session is successful if it meaningfully advances the core loop.

Examples:
- onboarding works end to end
- blueprint schema is defined and renders cleanly
- dashboard shows believable current guidance
- user can move through the app without getting lost

A build session is **not** successful just because a lot of code was generated.

---

## 13. Supporting Docs to Provide the AI

Use these alongside this starter pack:
- `kiaros-developer-handoff-v1.md`
- `kiaros-mvp-cut-v1.md`
- `kiaros-build-sequence-v1.md`
- `kiaros-beta-readiness-checklist-v1.md`
- `project-parallax-strategic-draft-v1.md`

Optional supporting context:
- `kiaros-beta-offer-draft-v1.md`
- `kiaros-landing-page-copy-v1.md`

---

## 14. First Prompt Recommendation

A strong first prompt for Claude in VS Code could look like this:

---

You are helping build Kiaros, a personalized planning web app built around a user’s goals, timing, and natural cycles.

Read these docs first:
- `kiaros-ai-dev-starter-pack-v1.md`
- `kiaros-developer-handoff-v1.md`
- `kiaros-mvp-cut-v1.md`
- `kiaros-build-sequence-v1.md`

Important constraints:
- Build only the MVP/beta version.
- Do not implement tracker, journaling, quarterly reviews, Year Unwrapped, or advanced analytics yet.
- Preserve the core flow: onboarding → personalized blueprint → current guidance.
- Optimize for a strong, believable beta product, not the full long-term vision.

Task for this session:
Set up the project skeleton for the Kiaros web app using a sensible modern stack. Create the app shell, route structure, onboarding shell, and dashboard shell. Stub the core screens and clearly separate implemented vs placeholder areas. Keep the code maintainable and explain key architecture decisions.

---

## 15. Working Summary

Kiaros can be built effectively with an AI coding assistant if the work is constrained, phased, and grounded in a clear MVP.

This starter pack exists to keep the coding process aligned with the actual product goal: a strong first beta experience, not an overbuilt simulation of the full future product.
