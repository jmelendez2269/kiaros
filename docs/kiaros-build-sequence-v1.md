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
  - build
  - roadmap
source_file: kiaros-build-sequence-v1.md
---

# Kiaros Build Sequence v1

_Date: 2026-04-09_

## 1. Purpose of This Document

This document translates the Kiaros MVP cut into a practical build sequence.

Its job is to answer:
- what gets built first
- what can be mocked or faked first
- what should be tested before beta
- what must exist before charging users

This is intentionally more execution-focused than the product bible.

---

## 2. Build Philosophy

The goal is **not** to build the whole Kiaros vision in one pass.

The goal is to build the smallest version that can:
1. create a believable personalized experience
2. produce a meaningful blueprint
3. help a user apply it to the present
4. be tested with real humans quickly

### Guiding principle
**Build the first room people can walk into, not the entire cathedral.**

---

## 3. Definition of “Beta-Ready”

Kiaros is beta-ready when a user can:
- sign up or access the product
- complete onboarding without confusion
- receive a personalized output that feels specific and useful
- understand what matters right now
- interact with the product enough to feel ongoing value
- give feedback on the experience

Kiaros is **not** required to have every planned retention and delight feature before beta.

---

## 4. Build Stages Overview

### Stage 0 — Strategic Lock
Before building, lock these decisions:
- Kiaros is the first launch product
- Kiaros is being built as an MVP, not full vision
- target user for beta
- what counts as beta-ready
- what is explicitly cut from v1

### Stage 1 — Experience Skeleton
Build the minimum product shell and routing.

### Stage 2 — Onboarding and data capture
Build the intake experience that collects meaningful context.

### Stage 3 — Personalized output generation
Create the first believable blueprint output.

### Stage 4 — Guided application layer
Give users a place to use the blueprint in the present.

### Stage 5 — Beta support layer
Add the minimal pieces needed to learn from real users.

### Stage 6 — Pre-beta hardening
Polish the essentials, remove confusion, and prepare for founding users.

---

## 5. Stage 0 — Strategic Lock

### Must decide before active build
- product name for v1: Kiaros
- primary audience for beta
- core promise
- MVP boundaries
- pricing direction (not necessarily final, but directional)

### Already established enough to proceed
- Kiaros is first
- core promise exists
- MVP cut exists
- pricing framework exists
- beta offer draft exists

### Output of Stage 0
The current docs already cover this stage well enough.

---

## 6. Stage 1 — Experience Skeleton

### Goal
Create the simplest possible app shell and product flow so Kiaros has a body before it has intelligence.

### Must build
- base app scaffold
- auth / access flow
- onboarding route structure
- dashboard / overview route structure
- placeholder state for blueprint generation and viewing

### This stage does not need
- complete visual polish
- advanced features
- full AI logic

### Deliverable
A user can move through the product shell and see where each major experience will live.

### Why this matters
It reduces abstraction fast and makes scope visible.

---

## 7. Stage 2 — Onboarding and Context Capture

### Goal
Build the onboarding that makes personalization believable.

### Must build
#### Core onboarding inputs
- birth data
- location
- goals / life categories
- year/current season vision
- optional cycle inputs

#### Rolling-entry additions
- recent-life reflection prompts
- current emotional / energetic state prompts
- current areas of pressure, change, or desire

### Strong recommendation
Do not make onboarding feel like paperwork.
It should feel like entering a reflective system.

### What can be simplified at first
- icon selection could be basic
- advanced customization can wait
- copy can be iterated after testing

### Deliverable
A user completes onboarding and the system has enough structured information to generate a meaningful output.

### Manual test for this stage
Ask: does the onboarding itself already feel personal and differentiated?

If not, improve before moving on.

---

## 8. Stage 3 — Personalized Blueprint Generation

### Goal
Create the hero output.

### Must build
- logic that transforms onboarding data into a personalized blueprint
- blueprint structure that feels coherent and useful
- language that ties guidance to the user’s own goals and season
- ability to regenerate or revise later if needed

### MVP standard for the blueprint
The user should feel:
- seen
- surprised in a good way
- guided
- less overwhelmed

### It does not need yet
- every advanced astrological nuance
- extreme visual polish
- complete year-long sophistication across all future features

### Suggestion for speed
Start with a narrower but strong blueprint structure:
- current season theme
- next 30–90 days guidance
- goal-specific focus areas
- what to lean into
- what not to force
- energy framing

This may be stronger for rolling entry than pretending everyone needs a January-to-December artifact on day one.

### Deliverable
A real personalized output exists and is stored/rendered.

### Manual test for this stage
Give it to 3–5 humans and ask:
- does this feel specific?
- does this feel useful?
- does this feel different from generic astrology copy?
- what part feels most valuable?
- what part feels vague?

---

## 9. Stage 4 — Guided Application Layer

### Goal
Help the user apply the blueprint in real life now.

### Must build
- overview/dashboard
- current week or current season focus view
- visible energy framing
- practical “what matters now” section

### Optional but helpful
- lightweight current-month context
- light interpretation prompts
- small note/check-in module

### Strong note
This stage matters because without application, the blueprint risks becoming a beautiful one-time reading.

Kiaros needs to feel like a planning system, not just an interpretation event.

### Deliverable
A returning user can log in and understand what their current guidance is.

### Manual test for this stage
Ask:
- if I came back a week later, would I know what to do with this?
- does the system help me act differently, or just admire the insight?

---

## 10. Stage 5 — Light Interpretation + Feedback Loop

### Goal
Make the product feel alive enough for beta learning.

### Must build
Choose at least one:
- lightweight Oracle / chat support
- contextual interpretation blocks connected to current timing

And also include:
- a simple feedback mechanism
- a way to capture user reactions / confusion points

### Feedback capture options
- in-app feedback form
- post-onboarding prompt
- post-blueprint rating questions
- manual beta check-in form

### Why this matters
Beta is not just about launching.
Beta is about learning where the magic actually lands.

### Deliverable
Users can respond to what they experience, and you can learn from it.

---

## 11. Stage 6 — Pre-Beta Hardening

### Goal
Make the core flow clean, trustworthy, and stable enough to invite real users.

### Must harden before beta
- onboarding clarity
- blueprint quality
- dashboard usability
- obvious broken states
- feedback capture
- basic trust language / product framing

### Must exist before charging
- the core promise can actually be experienced
- the output feels intentional, not chaotic
- the user knows what to do after onboarding
- there is enough value for a repeat interaction

### Nice but not required before beta
- full tracker
- full journal
- quarterly reviews
- Year Unwrapped
- advanced settings panels
- polished share features

### Deliverable
Kiaros can be shown to founding beta users without embarrassment or confusion.

---

## 12. Suggested Build Order by Component

### Build first
1. app shell / routing / auth
2. onboarding flow
3. data model for inputs
4. blueprint generator
5. blueprint display
6. overview/dashboard
7. current-week/current-season guidance
8. simple feedback capture
9. light interpretation layer
10. beta invite / access layer

### Build later
- deep tracker
- journaling
- reviews
- year-end experience
- advanced analytics
- advanced customization

---

## 13. What Can Be Mocked or Faked Early

To move faster, some parts can start semi-manual or simplified.

### Can be simplified or faked early
- some blueprint logic can begin with constrained templates + AI filling
- some interpretation layers can be pre-generated instead of fully conversational
- some calendar depth can be reduced to current-week/current-season focus
- some feedback collection can happen manually outside the app at first
- some onboarding options can be narrower before expanding

### Why this matters
The first goal is not full automation purity.
The first goal is proving that the experience is wanted.

---

## 14. What Must Be Tested Before Beta Opens

### Required human tests
#### Test 1 — Onboarding clarity
Can someone complete onboarding without confusion or fatigue?

#### Test 2 — Blueprint resonance
Does the output feel personal and useful?

#### Test 3 — Differentiation
Does it feel meaningfully different from generic astrology apps or generic planners?

#### Test 4 — Ongoing usefulness
After receiving the blueprint, does the user understand how to return and use the product again?

#### Test 5 — Value perception
Do users feel this is worth paying for in beta?

---

## 15. Minimum Feature Set Before Public Beta Invite

### Required before a real paid beta
- functioning onboarding
- recent-life context capture
- personalized blueprint
- usable overview/dashboard
- current week/current season guidance
- basic feedback capture
- coherent beta framing and pricing page / invite language

### Not required before paid beta
- advanced tracker
- journaling suite
- year-end reflection features
- complete full-calendar sophistication
- deep settings architecture

---

## 16. What to Protect Against During Build

### The major risks
- adding features to soothe pricing anxiety
- trying to make Kiaros validate the whole philosophy at once
- overcommitting to January-planner expectations
- building depth before proving clarity
- spending too long polishing things users have not yet said they care about

### Core guardrail question
Before building something new, ask:

> Does this make the first promise stronger, clearer, or more usable?

If not, it probably waits.

---

## 17. Suggested Immediate Next Build Doc

After this document, the best next execution artifact is:

### Kiaros Beta Readiness Checklist
This should include:
- exact features required before inviting users
- exact tests to run
- copy/assets needed
- who beta users are
- feedback questions to ask them

That would turn strategy into pre-launch operations.

---

## 18. Working Summary

Kiaros should be built in stages that prioritize personalization, meaningful output, and present-time usefulness over feature breadth.

The correct sequence is:
- create the shell
- capture real context
- generate a believable personalized blueprint
- make that blueprint usable in the present
- add light interpretation and feedback
- harden the essentials before beta

The goal is not completeness. The goal is a strong enough experience that real users can enter it, feel the value, and help shape what comes next.
