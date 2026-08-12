---
type: implementation-plan
subject: access-memory-commerce
status: active
owner: founder
execution_model: four-slot-multi-agent
created: 2026-08-06
updated: 2026-08-06
---

# Kairos Access, Memory, and Commerce Roadmap

This is the living implementation plan and canonical tracker for the work discussed on 2026-08-06:

- trustworthy journal consent and relevant Stelloquy memory;
- protection of the paid Blueprint across monthly and annual access;
- an honest personalized-week experience;
- a paid low-cost Stelloquy sampler;
- measurable acquisition and retention;
- Etsy-safe, self-contained artifacts and internal fulfillment.

`PRODUCT_BIBLE.md` remains the source of truth for what is already shipped. This roadmap describes planned changes. When a milestone ships, update the Product Bible to match the code.

## Current recommendation

1. Fix journal consent before expanding memory retrieval.
2. Replace “newest five” with relevance-based retrieval; do not send every journal entry.
3. Use the cancel-anytime monthly product as the genuine paid trial, but protect the full-year Blueprint through the access package.
4. Defer a genuine free in-app week until conversion evidence supports the engineering work.
5. If the existing generated week remains, call it a **Personalized Birth-Chart Week Reading**, not a free product trial.
6. Offer a one-time **$1 / 3-message Stelloquy sampler** with natal-chart and current-sky context only.
7. Sell complete digital artifacts on Etsy. Do not sell Kairos access or use the Etsy order as a required handoff to an off-Etsy purchase or activation.
8. Add first-party funnel events before changing the acquisition path so the decision can be revisited with evidence.

## Next three actions

1. Before any staged schema apply, reconcile the linked Supabase migration-history mismatch read-only and choose a safe staging target; do not repair production history under feature work.
2. Dispatch Wave 2 with at most three active rows: A starts `CONSENT-02`, B starts `ACCESS-02`, and C starts `METRICS-02`; root retains schema/types, Oracle, checkout hooks, app shell, and canonical docs.
3. Close G2 only after private entries cause zero external AI use, monthly Blueprint scope is absent from every raw/client/prompt path, and checkout attribution reconciles without duplicates.

## How this tracker works

- The tracker table below is the single source of task status. Detailed checkboxes are acceptance criteria, not a second status system.
- Allowed statuses are `pending`, `in_progress`, `blocked`, `verification`, `done`, and `parked`.
- Keep no more than three disjoint implementation rows `in_progress` at once: one per specialist. The root integrates under those IDs and may hold rows in `verification`, but does not start a fourth independent feature package.
- Before beginning work, update the row to `in_progress`, assign an owner, update the date, and add a decision-log entry if scope changed.
- Move a row to `verification` only when implementation is complete.
- Move a row to `done` only after its acceptance criteria pass and the evidence column links to a commit, PR, migration, test output, screenshot, or verified analytics query.
- If GitHub Issues are introduced later, start issue titles with the same ID, for example `[MEM-02] Build journal-memory retriever`. Keep this file canonical until an explicit migration to GitHub Projects is recorded.
- At the end of each development session, refresh **Next three actions**, the relevant tracker rows, the risk register, and the dated change log.
- Only the root integrator edits this roadmap, `CLAUDE.md`, or `PRODUCT_BIBLE.md` during parallel execution unless a task explicitly transfers that lock.

## Multi-agent execution model

Kairos work runs with four available execution slots:

| Slot | Default responsibility | May implement | Must not do independently |
|---|---|---|---|
| Root integrator | Decisions, dispatch, shared-file integration, tracker, final verification, release authority | Cross-cutting adapters and integration fixes | Leave shared hotspots concurrently writable; mark work done without evidence |
| Specialist A — Journal | Journal consent, pattern cleanup, retrieval, recall UI | `CONSENT-*`, `MEM-*`, journal-specific tests | Edit commerce core, canonical docs, or shared Stelloquy routes without the Oracle lock |
| Specialist B — Access/Commerce | Entitlements, Blueprint scoping, Stripe sampler, legacy commerce boundaries | `SAFE-01`, `SAFE-03`, `ACCESS-*`, `SAMPLE-*`, commerce-specific tests | Edit analytics internals, journal internals, or canonical docs without reassignment |
| Specialist C — Data/Product/QA | Funnel data, admin metrics, preview/public offer surfaces, artifact operations, independent verification | `METRICS-*`, `SAFE-02`, `PREVIEW-*`, later `ETSY-*` and QA slices | Regenerate shared database types or edit a locked commerce route without coordination |

These are stable responsibility lanes, not permanent agent identities. The root may reassign a specialist between waves after the prior lock is released and its handoff is verified.

### Active dispatch board

Update this small board whenever agents are spawned. The canonical tracker remains the source of task status.

| Slot | Current package | State | Exclusive locks | Integration/handoff |
|---|---|---|---|---|
| Root | G1 complete / Wave 2 ready | idle | `LOCK-SCHEMA`, `LOCK-ORACLE`, `LOCK-PUBLIC`, `LOCK-ADMIN-NAV`, `LOCK-DOCS`, `types/database.ts` | Retains release authority; must reconcile migration history before any staged apply |
| Specialist A | unassigned | idle | none | Recommended next: `CONSENT-02`, then hand back before `CONSENT-03` |
| Specialist B | unassigned | idle | none | Recommended next: `ACCESS-02`; holds the full Blueprint projection/RLS system as one lock |
| Specialist C | unassigned | idle | none | Recommended next: `METRICS-02`; root owns checkout/webhook shared hooks |

### Dispatch readiness rule

A package is ready for a specialist only when all of the following are present in the assignment:

1. Tracker ID(s), objective, and acceptance criteria.
2. Required decisions recorded as `done`.
3. Dependencies completed or a named interface/mock that removes the dependency.
4. Explicit allowed-write paths and read-only reference paths.
5. Exclusive locks reserved and conflicting packages identified.
6. Migration filename/number reserved when SQL is involved.
7. Targeted verification commands and expected evidence.
8. Feature-flag and rollback expectation for customer-facing or access-control changes.

If any item is missing, the specialist may inspect and report but must not begin broad edits.

### Standard specialist task brief

Use this structure when spawning or following up with an agent:

```md
Tracker IDs:
Objective:
Dependencies/decisions already satisfied:
Allowed write paths:
Read-only reference paths:
Exclusive locks held:
Files explicitly owned by another slot:
Required implementation behavior:
Acceptance criteria:
Verification commands:
Expected handoff/evidence:
Stop/escalate conditions:
Do not deploy, run production migrations, change external services, commit, or edit outside scope.
```

### Standard specialist handoff

Every specialist returns:

```md
Tracker IDs and recommended new status:
Files created/changed:
Migration/RPC/schema changes:
Tests and commands run, with result:
Acceptance criteria satisfied:
Shared-hotspot integration still required:
Risks, assumptions, or follow-up:
Suggested evidence text for the tracker:
```

The root then reviews the scoped diff, performs the shared-file integration, runs the gate checks, updates the tracker/change log, and releases the locks. A specialist does not update its own row to `done`.

### Shared-workspace safety rules

- All agents see the same working directory. Separate task names do not create isolated worktrees.
- The root records `git status` and the active lock board before each wave.
- One slot owns a writable path at a time. Other specialists may inspect it read-only.
- Before editing, a specialist checks the current diff in its allowed paths so it can distinguish user/root changes from its own work.
- If an unplanned shared file must change, the specialist sends the root a proposed interface or patch description and waits for the lock; it does not “just make the small edit.”
- Never reset, revert, overwrite, move, or delete another slot's changes to resolve a conflict.
- Only the root reserves migration numbers and coordinates generated `types/database.ts` updates.
- Specialists do not commit, push, deploy, run production migrations, alter Stripe, or change Etsy/external state unless the root explicitly assigns that authorized action.
- Specialists do not run concurrent full Next.js builds, global formatting, or generated-type commands. The root runs the full build/browser suite after writers stop so verification never observes half-integrated code or collides in `.next`.
- Root integration uses the narrowest adapter possible. Domain logic should live in new, testable modules so shared route edits remain small.
- Each specialist ships its targeted tests with the feature package. `QA-01` aggregates and closes coverage gaps; it is not the first moment testing begins.

### Interface-first parallelism

Prefer this pattern whenever two workstreams converge on a hotspot:

- Journal builds the proposed `lib/journal/memory-retrieval.ts` module and typed selected-memory output; root wires it into `app/api/oracle/chat/route.ts` and `lib/ai/oracle-system-prompt.ts`.
- Sampler builds the credit service, dedicated limited-context assembler, and route; root integrates fulfillment into shared Stripe/webhook code.
- Metrics builds the event contract and server recorder; root inserts small calls into checkout, webhook, preview, and Blueprint completion hotspots.
- Access builds the capability resolver and scoped Blueprint loader; root coordinates the final app-shell and shared-prompt adoption.
- Etsy builds artifact-specific tables/services/admin screens; root verifies that no path can create `product_entitlements`.

This keeps most specialist work conflict-free while reserving the few cross-domain files for one integration pass.

### Exclusive file-lock register

The root assigns these locks in the dispatch board. A lock covers the listed file and closely related route/components even when they are not exhaustively named.

| Lock | Exclusive paths/hotspot | Default owner | Coordination rule |
|---|---|---|---|
| `LOCK-SCHEMA` | `supabase/migrations/**`, generated `types/database.ts` | Root/schema captain | Root reserves migration order; one type generation after the wave |
| `LOCK-STRIPE` | `lib/commerce/stripe.ts`, checkout/webhook routes, `scripts/sync-stripe-catalog.mjs`, shared commerce config | Access/Commerce specialist, then root | Metrics and sampler agents build adapters first; one owner performs shared hooks |
| `LOCK-ORACLE` | Oracle chat/explain routes, system prompt, usage enforcement, shared conversation UI | Root integrator | Memory and sampler agents deliver modules/contracts; root performs final wiring |
| `LOCK-ACCESS` | entitlement/access modules, `app/(app)/layout.tsx`, `middleware.ts` | Access specialist | No preview or sampler app-shell edits while held |
| `LOCK-BLUEPRINT` | raw Blueprint RLS, `lib/blueprint/load.ts`, all direct Blueprint consumers | Access specialist | Treat projection as one system; do not split page-by-page among agents |
| `LOCK-JOURNAL` | journal route, Today journal action, insight synthesis, composer/history controls | Journal specialist | Consent lands before retrieval integration |
| `LOCK-PUBLIC` | public pricing/home/Stelloquy marketing, preview/onboarding, purchase-success copy | Root or Product specialist | Current worktree already contains edits here; transfer explicitly |
| `LOCK-ADMIN-NAV` | `components/admin/AdminSidebar.tsx` and shared admin commerce shell | Root integrator | Analytics/artifact agents build separate pages; root combines navigation links |
| `LOCK-METRICS` | `lib/analytics/**`, dedicated analytics route/tests, analytics event contract | Data/Product specialist | Other lanes may propose event calls; root wires shared checkout/public hotspots after handoff |
| `LOCK-DOCS` | this roadmap, `CLAUDE.md`, `PRODUCT_BIBLE.md` | Root integrator | One canonical scribe |

The current worktree already contains uncommitted user/root changes in public pricing, preview, onboarding, Oracle, and planner files. Those files remain root-owned until a scoped handoff explicitly transfers them.

### Migration reservation register

The latest migration at planning time is `0037`. Reserve deployment order before agents create SQL:

| Reservation | Purpose | Owning package | State |
|---|---|---|---|
| `0038` | First-party funnel analytics | `METRICS-01` | authored by root; PostgreSQL syntax/invariants pass; not applied |
| `0039` | Journal consent/audit fields | `CONSENT-01` | authored by root; PostgreSQL syntax/invariants pass; not applied |
| `0040` | Journal retrieval index/RPC | `MEM-01` | blocked on `0039` |
| `0041` | Secure Blueprint access/RLS | `ACCESS-02` | reserved for Wave 2; blocked on `ACCESS-01` |
| `0042` | Stelloquy credit ledger | `SAMPLE-02` | reserved for Wave 3; blocked on sampler/metrics predecessors |
| `0043` | Artifact fulfillment tables | `ETSY-02` | reserved for Wave 4; blocked on `ETSY-01` |

Reservation rules:

1. Numbers represent deployment order, not finish order.
2. Specialists never select “the next number” independently and never edit an already-run migration.
3. Schema, data backfill, and destructive cleanup are separate migrations. Consent cleanup remains unnumbered until `DEC-05` and `DEC-07` are approved.
4. A specialist may draft SQL under its allowed new module/test paths, but the schema captain owns the final numbered migration and order review.
5. Only the schema captain regenerates `types/database.ts`, once per integration wave, after approved local/staging schema application.
6. Schema-dependent code starts after the type snapshot lands; pure domain interfaces/UI shells may proceed earlier.
7. No production migration runs without explicit founder confirmation.

### Packages that must be serialized

Do not co-dispatch these pairs to writable agents:

| Package pair | Reason |
|---|---|
| `SAFE-01` / `ACCESS-04` | Same pricing, access, and Etsy messaging surfaces |
| `SAFE-02` / `PREVIEW-01` or `PREVIEW-02` | Same preview/onboarding/routing surfaces |
| `METRICS-02` / `SAMPLE-01` | Same checkout metadata and Stripe/webhook fulfillment |
| `CONSENT-01` / `MEM-01` | Consent schema must settle before retrieval index/RPC |
| `CONSENT-03` / `MEM-03` | Same consent filter and Oracle integration boundary |
| `MEM-03` / `SAMPLE-03` | Same Stelloquy routes, prompt context, and conversation UI |
| `MEM-03` / `ACCESS-02` | Stelloquy must receive already-scoped Blueprint context |
| `ACCESS-01` / `SAMPLE-03` or `ETSY-04` | Sampler/claim consumers depend on the capability contract |
| `ACCESS-02` / `ACCESS-03` | Server projection contract precedes UI adoption |
| `ACCESS-03` / `PREVIEW-02` | Same app shell, navigation, and route gates |
| `SAMPLE-01` / `SAMPLE-02` / `SAMPLE-03` | Catalog/fulfillment, ledger, and experience form a dependency chain |
| `QA-03` / active feature edits | Release flags and rollback wiring are a final integration activity |

Agents may work on non-conflicting modules for a later item early, but the tracker item cannot enter `verification` until its predecessor and shared integration are complete.

### Conflict and failed-integration protocol

- If two packages unexpectedly need the same file or shared contract, both specialists stop editing that path and notify root; root assigns a single owner or defines a new interface.
- Preserve every existing diff. Never resolve overlap with reset, checkout, broad revert, or deletion of another slot's work.
- A failed targeted check leaves the row `in_progress`. A failed root integration returns the affected row from `verification` to `in_progress` with the failing evidence recorded.
- Once a migration has been applied anywhere shared, correct it with a new additive/compensating migration; never rewrite history.
- Payment/credit corrections use append-only compensating ledger entries.
- Privacy and access defects fail closed: disable the feature rather than restore unconsented journal use, full-Blueprint leakage, free Stelloquy access, or new Etsy software sales.
- In a production incident, root disables the server-side flag first. Backfills/rebuilds require a verified backup and founder approval.

## Product constraints already established

- The full Blueprint is paid intellectual value and must not be exposed by a free experience.
- The free/personalized reading uses birth-chart and current-sky information only.
- Upgrade messaging must explain that Life Areas and Goals create deeper customization.
- A signed-in account does not receive a free Stelloquy allowance. Stelloquy requires a qualifying subscription or purchased sampler credits.
- Journal use must be visible, optional, reversible, and narrower than “Kairos can use everything.”
- Etsy listings must deliver complete standalone artifacts on Etsy; Kairos software access is not the Etsy item.
- Existing legitimate Etsy entitlements must continue to work unless handled through a separate, explicit migration and customer-support plan.
- No production database migration is run without the founder's confirmation.

## Decisions required before implementation

### DEC-01 — Protecting the Blueprint in monthly access

Choose the commercial contract before changing gates.

| Option | Description | Benefit | Cost/risk |
|---|---|---|---|
| A — Rolling monthly **(recommended)** | Active monthly customers see the current week plus the next four weeks; annual customers see the full year. | Protects the annual artifact while preserving a genuine monthly product. | Requires server-side week projection and careful UX. |
| B — Blueprint setup fee | Charge once for the full Blueprint, then charge monthly for the living planner. | Makes the value exchange explicit. | More catalog, checkout, refund, and messaging complexity. |
| C — Full Blueprint for $14 monthly | Keep current access. | No implementation cost. | Functionally prices the complete Blueprint at one month and conflicts with the stated protection goal. |

The same decision must define:

- whether previously unlocked weeks remain readable while a monthly subscription is active;
- what a canceled monthly customer can still read;
- permanent access/export for the customer's own journal data;
- upgrade behavior from monthly to annual;
- the exact difference between Planner and Planner + Stelloquy.

Recommended default: preserve read/export access to the customer's own journal after cancellation, while paid Blueprint and generation surfaces follow the entitlement contract.

### DEC-02 — Personalized week disposition

Recommended: retain it only as an explicitly limited, persistent **Personalized Birth-Chart Week Reading**, remove the artificial access countdown, and test it against the paid-first path. Do not build the real app-shell week yet.

Alternative: pause the reading completely and lead with the product walkthrough plus “$14 for one month, cancel anytime.”

### DEC-03 — Sampler contract

Recommended defaults:

- $1 one-time purchase;
- three completed assistant replies;
- one starter pack per customer initially;
- account and completed birth profile required;
- natal chart + current sky context only;
- no Blueprint, Goals, Life Areas, journal memory, or subscriber-only tools;
- failed/aborted generations do not spend a credit;
- an upgrade does not erase unused purchased credits.

### DEC-04 — First Etsy artifacts

Recommended first pair:

1. **Personal Natal Chart Anchor Print** — a designed chart plus a concise set of stable natal anchors; no yearly Blueprint.
2. **Current Season Compass** — a complete 30-day personalized printable using natal chart + current sky; valuable on its own but materially narrower than Kairos.

Each artifact must work without an account, app activation, external checkout, or subscription.

### DEC-05 — Consent migration for existing journal data

Recommended privacy-safe default:

- retain `oracle_memory = true` entries as eligible for direct Stelloquy recall because the user selected that behavior;
- do not assume existing entries consented to broader AI pattern/planner use;
- pause or rebuild derived pattern summaries from explicitly approved entries;
- present existing users with a clear review screen rather than silently broadening consent.

### DEC-06 — Existing Etsy path

Recommended:

- stop advertising new Etsy software-access sales;
- preserve claim/entitlement code for already-paid legacy orders;
- remove public activation CTAs from the new-customer path;
- keep legacy support reachable from a direct support URL, not as a promoted offer.

### DEC-07 — Previously generated journal-derived content

Existing pattern summaries, month briefs, quarterly summaries, and Blueprints may contain conclusions derived before the new consent boundary. They do not have enough entry-level lineage for reliable surgical removal.

Recommended privacy-safe policy:

- rebuild pattern rows and AI pattern summaries from explicitly approved entries;
- invalidate/regenerate affected generated briefs and summaries while preserving user-authored fields;
- decide explicitly whether already-purchased Blueprints are regenerated, versioned as historical, or left unchanged with future generation corrected. Replacing a paid Blueprint is a material product change and must not happen silently.

## Canonical tracker

| ID | Priority | Workstream | Deliverable | Status | Depends on | Estimate | Owner | Acceptance evidence | Updated |
|---|---|---|---|---|---|---:|---|---|---|
| DEC-01 | P0 | Decisions | Choose monthly/full-Blueprint contract | done | — | 0.5d | Founder | Recommended rolling monthly window approved in founder instruction; exact outcome in decision log | 2026-08-06 |
| DEC-02 | P0 | Decisions | Choose rename/test versus pause for week reading | done | — | 0.25d | Founder | Recommended persistent Personalized Birth-Chart Week Reading approved | 2026-08-06 |
| DEC-03 | P0 | Decisions | Approve sampler price, pack size, and context | done | — | 0.25d | Founder | Recommended $1 / three-completed-reply limited-context contract approved | 2026-08-06 |
| DEC-04 | P1 | Decisions | Select first two Etsy artifacts | done | — | 0.5d | Founder | Recommended Anchor Print and Current Season Compass approved | 2026-08-06 |
| DEC-05 | P0 | Decisions | Approve existing-journal consent migration | done | — | 0.5d | Founder | Privacy-safe backfill/review default approved | 2026-08-06 |
| DEC-06 | P0 | Decisions | Approve legacy Etsy support boundary | done | — | 0.25d | Founder | Support-only legacy activation boundary approved | 2026-08-06 |
| DEC-07 | P0 | Decisions | Choose cleanup policy for already-generated journal-derived content | done | DEC-05 | 0.5d | Founder | Rebuild patterns; invalidate derived briefs/summaries; preserve existing paid Blueprints as historical and correct future generations | 2026-08-06 |
| SAFE-01 | P0 | Safety | Remove new-sale Etsy software/access promises while preserving legacy support | done | DEC-06 | 0.5–1d | B-Access + Root | `node scripts/check-commerce-safety.mjs` passes: 4 acquisition surfaces clean; 5-file legacy activation contract retained | 2026-08-06 |
| SAFE-02 | P0 | Safety | Make week-reading name, scope, and persistence truthful | pending | DEC-02 | 1–2d | C-Product | — | 2026-08-06 |
| SAFE-03 | P0 | Safety | Verify no free signed-in Stelloquy allowance remains in code or current copy | done | DEC-03 | 0.5d | B-Access + Root | `node scripts/check-stelloquy-access.mjs` passes: 3 generation entrypoints guarded; 337 source files contain no retired free/core allowance | 2026-08-06 |
| METRICS-01 | P0 | Measurement | Define and persist first-party funnel events and attribution | done | — | 2–3d | C-Data + Root | `0038`; runtime/focused TS/migration checks and flags-off build pass; public route permits only 3 low-trust events | 2026-08-06 |
| METRICS-02 | P0 | Measurement | Persist checkout starts, cancellations, completions, and experiment source | blocked | METRICS-01 | 1–2d | C-Data + Root | — | 2026-08-06 |
| METRICS-03 | P1 | Measurement | Add admin funnel/retention summary and metric definitions | blocked | METRICS-02 | 1–2d | C-Data | — | 2026-08-06 |
| CONSENT-01 | P0 | Journal trust | Add separate pattern-use, Stelloquy-recall, pin, and importance fields | done | DEC-05 | 1–2d | A-Journal + Root | `0039`; shared create service + private Today path; runtime/wiring/migration/type/build checks pass | 2026-08-06 |
| CONSENT-02 | P0 | Journal trust | Update journal create/edit/history controls and explanations | blocked | CONSENT-01 | 2–3d | A-Journal | — | 2026-08-06 |
| CONSENT-03 | P0 | Journal trust | Enforce consent in synthesis and support revocation/rebuild | blocked | CONSENT-01, DEC-07 | 2–3d | A-Journal | — | 2026-08-06 |
| MEM-01 | P1 | Memory | Add full-text search/index and deterministic retrieval RPC | blocked | CONSENT-01 | 1–2d | A-Journal | — | 2026-08-06 |
| MEM-02 | P1 | Memory | Build relevance scorer, excerpts, threshold, and token budget | blocked | MEM-01 | 2–3d | A-Journal | — | 2026-08-06 |
| MEM-03 | P1 | Memory | Integrate selected memories into Stelloquy after the question is known | blocked | MEM-02, CONSENT-03 | 1–2d | A-Journal + Root | — | 2026-08-06 |
| MEM-04 | P1 | Memory | Show recalled-memory count and user-reviewable sources | blocked | MEM-03 | 1–2d | A-Journal | — | 2026-08-06 |
| ACCESS-01 | P0 | Paid access | Replace broad plan checks with explicit capabilities | done | DEC-01 | 1–2d | B-Access + Root | `check-access-capabilities.mts` passes 87 assertions; focused/full TS and flags-off build pass | 2026-08-06 |
| ACCESS-02 | P0 | Paid access | Enforce monthly Blueprint window on the server | blocked | ACCESS-01 | 2–4d | B-Access | — | 2026-08-06 |
| ACCESS-03 | P0 | Paid access | Update Blueprint/calendar navigation, locked states, upgrade, and cancellation behavior | blocked | ACCESS-02 | 2–3d | B-Access | — | 2026-08-06 |
| ACCESS-04 | P0 | Paid access | Align pricing, onboarding, success, billing, and retention copy | blocked | ACCESS-01, SAFE-01 | 1–2d | C-Product + B-Access | — | 2026-08-06 |
| SAMPLE-01 | P1 | Sampler | Add Stripe one-time sampler product and checkout fulfillment | blocked | DEC-03, METRICS-02 | 1–2d | B-Commerce + Root | — | 2026-08-06 |
| SAMPLE-02 | P1 | Sampler | Add append-only credit ledger and idempotent consumption | blocked | SAMPLE-01 | 2–3d | B-Commerce | — | 2026-08-06 |
| SAMPLE-03 | P1 | Sampler | Build limited-context Stelloquy sampler experience and upgrade handoff | blocked | SAMPLE-02 | 2–3d | B-Commerce + Root | — | 2026-08-06 |
| PREVIEW-01 | P1 | Experiment | Compare paid-first versus personalized-reading-first acquisition | blocked | SAFE-02, METRICS-02 | 1–2d + traffic | C-Product | — | 2026-08-06 |
| PREVIEW-02 | P2 | Preview shell | Build a genuine read-only app-shell week only if evidence gate passes | parked | PREVIEW-01 | 3–5d | B-Access + C-Product | — | 2026-08-06 |
| ETSY-01 | P1 | Etsy artifacts | Finalize artifact specs, listing boundaries, disclosures, and fulfillment SLA | pending | DEC-04, DEC-06 | 1–2d | C-Product | Decisions complete; held for later wave | 2026-08-06 |
| ETSY-02 | P1 | Etsy artifacts | Build reusable artifact data contract and templates | blocked | ETSY-01 | 2–4d | A-Artifact | — | 2026-08-06 |
| ETSY-03 | P1 | Etsy artifacts | Adapt admin workflow for order intake, generation, QA, and Etsy delivery | blocked | ETSY-02 | 2–4d | B-Artifact/Admin | — | 2026-08-06 |
| ETSY-04 | P2 | Etsy continuity | Allow an independently paying Kairos user to opt in and claim a prior artifact | blocked | ACCESS-01, ETSY-03 | 1–3d | B-Access | — | 2026-08-06 |
| QA-01 | P0 | Quality | Add unit/integration coverage for consent, retrieval, capabilities, and credits | blocked | relevant implementation rows | 2–4d | Root + A/B/C | — | 2026-08-06 |
| QA-02 | P0 | Quality | Run privacy, RLS, payment-webhook, and multi-person access matrix | blocked | QA-01 | 1–2d | Root + A/B/C | — | 2026-08-06 |
| QA-03 | P0 | Release | Feature-flag, stage, monitor, and complete rollback rehearsal | blocked | QA-02, METRICS-03 | 1–2d | Root | — | 2026-08-06 |
| DOC-01 | P1 | Documentation | Update Product Bible and retire superseded commerce/Etsy guidance after shipment | blocked | QA-03 | 0.5–1d | Root | — | 2026-08-06 |

Tracker estimates are upper-bound package envelopes, not additive budget lines. They deliberately repeat shared schema, integration, and verification effort in the feature row and again in `QA-*`. At the current values, summing every non-decision row would produce roughly 38.5–70.5 person-days; use the deduplicated milestone estimate of 28–44 focused engineering days for capacity planning.

## Dependency map

```text
Decision gates
├── Journal consent → relevant memory → recall transparency
├── Access contract → Blueprint enforcement → pricing and lifecycle UX
├── Sampler contract → checkout → credit ledger → limited Stelloquy
└── Etsy boundary → artifact definition → generation/fulfillment → optional later claim

Measurement begins before the customer-path changes and follows every branch.
All branches converge on privacy/payment QA, staged rollout, and documentation.
```

## Multi-agent execution waves

Each wave uses the root plus up to three specialists. A later wave may begin early for one slot when its own dependency and file lock are clear, but no integration gate is skipped.

| Wave | Root integrator | Specialist A | Specialist B | Specialist C | Exit gate | Target elapsed work |
|---|---|---|---|---|---|---:|
| W0 — Lock decisions | Resolve `DEC-01`–`DEC-07`; reserve locks/migrations; write task briefs | Read-only journal/backfill audit | Read-only access/RLS audit | Read-only analytics/public-surface audit | G0 — decisions, contracts, owners, and rollback expectations recorded | 0.5–1d |
| W1 — Contract foundations | Coordinate schema, shared-surface integration, and one type-generation pass | `CONSENT-01` contract and shared journal-service boundary | `SAFE-01`/`SAFE-03`, then `ACCESS-01` capability contract and Blueprint-scope design | `METRICS-01` event contract, ingestion, and test foundation | G1 — additive schemas dry-run, types compile, flags default off, public safety audit passes | 2–4d |
| W2 — Core enforcement | Integrate schema/types and cross-cutting hooks after locks release | `CONSENT-02`, `CONSENT-03`, then `MEM-01` | `ACCESS-02`, then `ACCESS-03` | `METRICS-02` adapters and `METRICS-03`; root owns shared checkout hook | G2 — private entries cause no AI use, Blueprint scope is server-enforced, funnel attribution reconciles | 4–7d |
| W3 — Conversation and offer proof | Hold `LOCK-ORACLE`/`LOCK-STRIPE`; integrate `MEM-03`, sampler fulfillment, and shared UI | `MEM-02`, retrieval tests, transparency module for `MEM-04` | `SAMPLE-01`, `SAMPLE-02`, then isolated `SAMPLE-03` modules | `SAFE-02`, `ACCESS-04`, `PREVIEW-01`; begin `ETSY-01` when public lock releases | G3 — relevant recall, exactly three paid replies, truthful reading, and measurable upgrade handoff | 4–6d |
| W4 — Etsy artifacts | Verify entitlement isolation; combine admin navigation; protect legacy support | `ETSY-02` artifact contract/generator and deterministic fixtures | `ETSY-03` admin order/fulfillment workflow | Artifact template, policy checklist, visual/file QA; assist `ETSY-01` | G4 — complete test artifact delivered without account/entitlement; legacy activation still passes | 4–7d |
| W5 — Hardening/release | Own `QA-01`–`QA-03`, rollout/rollback, evidence, `DOC-01` | Journal privacy, retrieval, prompt-injection, and two-user RLS verification | Access leakage, Stripe replay/refund, and credit-concurrency verification | Funnel reconciliation, artifact privacy, and browser persona verification | G5 — all release gates pass; flags and rollback rehearsed; Product Bible updated after release | 2–4d |

`PREVIEW-02` remains parked. If its evidence gate later passes, schedule it as a separate wave with `LOCK-ACCESS`, `LOCK-PUBLIC`, and dedicated regression verification; do not squeeze it into an active access/preview wave.

### Integration gate definitions

#### G0 — Decision and contract gate

- `DEC-01` through `DEC-07` have exact recorded outcomes.
- Each active package has allowed paths, exclusive locks, acceptance criteria, and rollback behavior.
- Migration reservations match the intended deployment order.
- No specialist is asked to infer a product or privacy choice from chat history.

#### G1 — Foundation gate

- Additive migrations pass local/staging dry-run review; none are run in production.
- Generated database types are updated once by the schema captain and compile.
- Capability, consent, event, and feature-flag interfaces are stable enough for consumers.
- Public safety copy is internally consistent and legacy Etsy support remains reachable by direct URL.
- `npm run build` passes with all new flags off.

#### G2 — Core enforcement gate

- Private journal creation causes zero external AI calls and revocation excludes future use.
- Monthly Blueprint content is absent from raw client access, RSC payloads, API responses, and AI prompt context outside the allowed window.
- Checkout-start and verified webhook completion reconcile without duplicates.
- Each core workstream has targeted automated coverage before conversation/sampler wiring begins.

#### G3 — Conversation and offer gate

- An older relevant approved memory outranks a newer unrelated one; low relevance recalls nothing.
- Journal excerpts are treated as untrusted evidence and stay within the token budget.
- A $1 sampler grant yields exactly three completed replies; retries/failures/webhook replay do not alter that total.
- Sampler context contains no Blueprint, Goals, Life Areas, journal, capture, or pattern data.
- The personalized reading states its limited scope and has attributable paid upgrade paths.

#### G4 — Artifact gate

- A complete artifact is generated, reviewed, exported, and deliverable through Etsy without an account or off-Etsy activation.
- Artifact orders cannot create `product_entitlements`.
- Private files and guest birth data pass authorization and retention/deletion checks.
- Existing legacy Etsy activation behavior passes a dedicated regression test.

#### G5 — Release gate

- Unit, integration, SQL/RLS, Stripe test-mode, and browser persona checks pass.
- Root reviews the complete diff for cross-lane leakage and stale copy.
- Server-controlled flags can disable each new behavior without broadening consent or access.
- Rollback uses flags/additive migrations/compensating ledger entries; no destructive rollback is required.
- Tracker evidence and the change log are current; `PRODUCT_BIBLE.md` is updated only for behavior actually released.

### Multi-agent elapsed-time target

The roadmap represents roughly **28–44 focused engineering days** of total work. With three productive specialist lanes plus a root integrator, contract-first dispatch, and the lock rules above, the planning target is approximately:

- **12–18 active working days** for the launch-safe core through G3 plus hardening, excluding completed Etsy fulfillment;
- **14–21 active working days** for the complete recommended path through G5, including Etsy fulfillment, when interfaces settle cleanly and waves are pipelined.

These are coordination targets, not calendar promises, and represent an expected 35–50% elapsed-time reduction rather than reduced total person-effort. Founder decisions, policy clarification, design review, production approval, traffic accumulation for `PREVIEW-01`, and unexpected migration/backfill findings are outside the estimate. Multi-agent execution saves elapsed time only when integration gates remain strict; bypassing them creates rework rather than speed.

## Delivery milestones

Estimates are focused engineering days, not calendar promises. They exclude waiting for policy responses, design review, traffic accumulation, or production approval. Work may run in parallel after its decisions and data contracts are settled.

| Milestone | Outcome | Estimated effort |
|---|---|---:|
| M0 — Decisions and safety | Commercial boundaries are explicit; misleading/stale paths are removed | 1–2d |
| M1 — Measurement | Acquisition, checkout, conversion, early return, and cancellation are attributable | 2–4d |
| M2 — Journal trust | Raw and derived journal use follows explicit, reversible consent | 4–6d |
| M3 — Relevant memory | Stelloquy recalls a small set of pertinent, approved memories | 4–6d |
| M4 — Paid access | Monthly/annual capabilities enforce the chosen Blueprint contract | 4–7d |
| M5 — Paid sampler | Non-subscribers can purchase and use a limited Stelloquy pack | 4–6d |
| M6 — Honest preview experiment | The limited reading is truthful and measurable; genuine shell remains evidence-gated | 1–2d + traffic |
| M7 — Etsy artifacts | Two complete artifacts can be generated, checked, and delivered without app activation | 6–10d |
| M8 — Hardening and release | Access, privacy, payment, rollback, and observability gates pass | 2–3d |

Expected recommended-path total: roughly **28–44 focused engineering days**, or approximately 6–10 weeks for one engineer including review and staging. Some milestone estimates share test and integration work, so they should not be summed mechanically. The first launch-safe release does not require all of M7, and parallel work can reduce calendar time. `PREVIEW-02` is excluded unless its evidence gate passes.

## M0 — Decisions and immediate safety

### Implementation

- Record `DEC-01` through `DEC-07` in the decision log.
- Remove or hide public claims that an Etsy purchase grants new Kairos software access.
- Preserve legacy entitlement import/claim code until existing customers are accounted for.
- Remove new-customer Etsy activation links from pricing, banners, onboarding, and purchase messaging.
- Verify whether the current week reading remains, then align its name, scope list, CTA, and persistence policy.
- Verify the current code and current public copy do not grant “20 free messages.” The current live constant is a subscriber limit of 200 messages/month; the 20-free wording appears to be legacy documentation rather than the current entitlement path.
- Preserve checkout intent across sign-up so a ready-to-pay visitor is not silently diverted into the preview path.

### Acceptance criteria

- [ ] No new-sale public surface describes Etsy as a way to purchase or activate Kairos software.
- [ ] Legacy Etsy customers retain their existing entitlement/support path.
- [ ] The limited week reading never calls itself a full product trial or genuine free week.
- [ ] A visitor choosing a paid tier reaches the intended checkout after authentication.
- [ ] No non-paying signed-in user can call subscriber Stelloquy routes without sampler credit.
- [ ] All customer-visible access claims match server enforcement.

## M1 — Measurement and experiment foundation

### Data contract

Create a first-party funnel event table through the next available migration. Keep the schema intentionally narrow:

- `id`, `event_id` for idempotency, `event_name`, `occurred_at`;
- `anonymous_id`, nullable `user_id`, and a short-lived `session_id`;
- `source`, `medium`, `campaign`, `referrer_host`, `entry_path`;
- `experiment_key`, `experiment_variant`;
- `product_tier`, `access_plan`, nullable Stripe checkout/order IDs;
- constrained JSON metadata for non-sensitive dimensions only.

Never store birth data, journal text, Stelloquy prompts, Blueprint text, or full URLs containing private query parameters in analytics.

### Events

- `pricing_viewed`
- `tier_selected`
- `preview_started`
- `preview_completed`
- `preview_viewed`
- `checkout_started`
- `checkout_canceled`
- `checkout_completed` — emitted from the verified Stripe webhook, not the success page
- `blueprint_ready`
- `day_7_return`
- `subscription_canceled`
- `second_invoice_paid`
- `sampler_purchased`
- `sampler_credit_used`
- `paid_upgrade_completed`

### Implementation

- Persist the checkout session when it is created, not only after payment succeeds.
- Put attribution and experiment keys into Stripe metadata and copy them to the fulfilled order.
- Connect anonymous activity to the authenticated profile without overwriting the original acquisition source.
- Populate `converted_entitlement_id` when a preview converts.
- Add an admin summary with exact metric definitions and date filters.

### Primary metrics

- 14-day net first-payment revenue per unique pricing visitor.
- Pricing-to-checkout and checkout-to-paid conversion.
- Preview-to-paid conversion compared with paid-first conversion.
- Blueprint-ready rate and median time to ready.
- Day-7 return.
- Cancellation before the second invoice and second-invoice retention.
- Sampler-to-subscription conversion.

### Acceptance criteria

- [ ] The same checkout is not double-counted after webhook replay.
- [ ] Canceled checkouts are distinguishable from never-started checkouts.
- [ ] Anonymous source/variant survives sign-up and purchase.
- [ ] Funnel metrics can be reproduced from documented SQL or an admin view.
- [ ] Analytics contain no sensitive journal, chart, or conversation content.

## M2 — Journal consent and privacy

### Proposed data model

Add fields through a new migration; do not alter an already-run migration:

- `include_in_insights BOOLEAN NOT NULL DEFAULT false`
- `include_in_stelloquy BOOLEAN NOT NULL DEFAULT false`
- `memory_pinned BOOLEAN NOT NULL DEFAULT false`
- `memory_importance SMALLINT` with a constrained range
- consent timestamps or a small consent-audit table so grant/revoke actions are explainable

`oracle_memory` can remain temporarily as a compatibility field, then be removed only after all code paths and data are migrated.

### Required behavior

- Saving lunar/transit metadata with the private entry remains part of the journal record.
- AI pattern synthesis may use body text only when `include_in_insights = true`.
- Direct Stelloquy recall may use body text only when `include_in_stelloquy = true`.
- The two permissions are independent.
- Edit/history UI allows grant, revoke, pin, and unpin after creation.
- Revocation excludes the entry immediately and queues a rebuild of affected aggregates.
- Derived summaries built from now-disallowed evidence are deleted or rebuilt.
- No raw body text appears in operational logs, analytics, or error reporting.
- Journal creation from the main route and Today quick-entry action uses one shared server-only service so the consent rules cannot drift.
- Goal/Life Area IDs are validated as belonging to the signed-in user before they are stored.

### Migration sequence

1. Add nullable/new fields and consent audit support.
2. Backfill according to `DEC-05` without broadening consent.
3. Deploy dual-read compatibility.
4. Deploy UI and dual-write behavior.
5. Rebuild or remove unapproved derived summaries.
6. Switch readers to the new fields.
7. Remove compatibility behavior only after verification.

### Key code areas

- `app/api/journal/route.ts`
- `app/(app)/today/actions.ts`
- `components/journal/JournalComposer.tsx`
- `components/insights/JournalHistoryList.tsx`
- `lib/ai/journal-insight-synthesis.ts`
- `lib/ai/blueprint-generator.ts`
- `lib/ai/month-brief-generator.ts`
- `lib/ai/quarterly-review-generator.ts`
- `app/api/oracle/chat/route.ts`
- `types/database.ts`

### Acceptance criteria

- [ ] A private entry never reaches an external AI request or derived pattern summary.
- [ ] Pattern consent does not automatically enable Stelloquy recall, or vice versa.
- [ ] A user can revoke either permission after saving.
- [ ] Revocation removes the entry from future prompts and refreshes affected derived summaries.
- [ ] Existing data follows the approved migration policy and no consent is silently broadened.
- [ ] Two-user RLS tests prove one user cannot read or modify another user's journal permissions.
- [ ] Today's quick journal entry defaults to private and causes no external AI request.

## M3 — Relevant journal memory

### Retrieval strategy

Phase 1 uses PostgreSQL full-text search and deterministic ranking. Do not add a second AI call solely to select memories.

Use a generated search-vector column plus a partial GIN index limited to approved Stelloquy memories. Enforce the two-pin maximum atomically in the database so concurrent requests cannot create extra pins.

Candidate pool:

- only `include_in_stelloquy = true` entries;
- bounded candidate count before prompt assembly;
- query derived after the latest user message is available, using at most the latest two user turns;
- optional structured filters for requested dates/seasons, Life Areas, Goals, natal/transit factors, and lunar context.

Recommended score:

- 50% question/text relevance;
- 20% requested-time fit;
- 15% Life Area/Goal/sky fit;
- 15% importance, ritual, pin, and recency signals.

Selection rules:

- maximum two “always remember” pins;
- maximum six recalled entries;
- relevant excerpts around the matching passage, not the first 110 characters;
- 900–1,200-token hard ceiling for all journal memory;
- no memory below the relevance threshold;
- deterministic tie-breaking and no duplicate entry excerpts.

Populate `goal_tags` when an entry is explicitly associated with a Goal or Life Area; the column exists today but the journal create route does not populate it.

### Transparency

- Show “Stelloquy recalled N memories.”
- Allow the user to inspect dates/titles used without exposing hidden chain-of-thought or internal scoring.
- Provide a direct route to remove an entry from recall.
- Log only entry IDs, scores, token count, and retrieval version for debugging — never body text.

### Later semantic phase

Consider `pgvector` and chunk embeddings only after typical consenting users have enough history that full-text retrieval demonstrably misses useful memories. This is not part of the first release.

### Acceptance scenarios

- [ ] A recent but unrelated entry loses to an older clearly relevant entry.
- [ ] A date-specific question retrieves entries from that period when approved.
- [ ] Goal and Life Area matches influence ranking.
- [ ] A pinned entry does not crowd out every relevant result.
- [ ] No result is returned when all approved entries are below threshold.
- [ ] The token ceiling holds with long entries.
- [ ] Revoked/private entries never appear in retrieval results or prompt traces.
- [ ] Journal excerpts are delimited as untrusted evidence and cannot override system instructions.
- [ ] Retrieval remains within the agreed latency budget with at least 1,000 entries for one test user.

## M4 — Paid access and Blueprint protection

### Capability model

Move from scattered tier-name checks to a resolved server-side capability object, for example:

- `canUsePlanner`
- `canReadFullBlueprint`
- `blueprintWindowStart` / `blueprintWindowEnd`
- `canWriteJournal`
- `canUseStelloquySubscription`
- `canGenerateMonthBrief`
- `accessState`

The UI may render from these capabilities, but the server must enforce them. Hiding a tab is not access control.

### Implementation for recommended Option A

- Annual: return the full Blueprint while active; preserve the chosen post-expiry read policy.
- Monthly: project only the entitled date/week window on the server before returning Blueprint data.
- Prevent direct API, page-source, or preloaded JSON access to locked weeks.
- Replace the current broad authenticated Blueprint RLS access with service/server-only raw-row access; otherwise a monthly user can bypass UI projection and select the complete JSON directly.
- Hard-gate lapsed monthly accounts instead of rendering paid child pages beneath an upgrade banner.
- Ensure Today, week, month, planner, and Stelloquy receive only permitted Blueprint context.
- Add clear locked-future states without implying those weeks do not exist.
- Define upgrades without regenerating a conflicting Blueprint: annual unlocks the same canonical Blueprint.
- Preserve the same calculation/version identifiers so a later artifact claim or annual upgrade uses a consistent foundation.

### Messaging contract

The limited experience may say:

> Your reading is shaped by your birth chart and the current sky. Upgrade to add your Life Areas and Goals so Kairos can shape the planner around what you are actively building.

Do not promise that the limited experience contains the Blueprint, calendar workflow, journal grounding, or ongoing context.

### Key code areas

- `lib/commerce/config.ts`
- `lib/commerce/entitlements.ts`
- `lib/commerce/access.ts`
- `lib/commerce/get-access-window.ts`
- `lib/blueprint/load.ts`
- `lib/ai/blueprint-generator.ts`
- `lib/ai/oracle-system-prompt.ts`
- `app/(app)/layout.tsx`
- planner/year/Blueprint server pages and APIs
- `components/commerce/PublicPricingPage.tsx`

### Acceptance criteria

- [ ] Anonymous, sampler, monthly, annual, expired monthly, expired annual, legacy Etsy, and admin roles resolve to explicit capabilities.
- [ ] Monthly customers cannot obtain locked weeks through HTML, JSON, route handlers, Stelloquy context, or client caches.
- [ ] Annual upgrade reveals the existing canonical Blueprint without an unnecessary conflicting regeneration.
- [ ] Customer-owned journal access/export follows the approved cancellation policy.
- [ ] Pricing and billing copy exactly match the enforced capabilities.

## M5 — $1 Stelloquy sampler

### Commerce and ledger

- Add a one-time Stripe catalog item separate from subscriptions.
- Update `scripts/sync-stripe-catalog.mjs` before running it: the current synchronization behavior can archive unmanaged active products/prices, so the sampler must be part of the managed catalog or archival must be explicitly scoped.
- Fulfill credits only from a verified, idempotent Stripe webhook.
- Use an append-only credit ledger rather than a mutable counter as the source of truth.
- Ledger reasons include `purchase`, `assistant_reply`, `refund`, `support_adjustment`, and `migration`.
- Store the Stripe event/payment identifier as the idempotency key.
- Derive balance transactionally; never allow a negative balance.

### Conversation contract

- The sampler is a real Stelloquy conversation, but context is deliberately limited to natal chart and current sky.
- It does not load Blueprint, Goals, Life Areas, journals, captures, patterns, curriculum, or quarterly reviews.
- Decrement one credit only after a completed assistant reply.
- Retries with the same request ID cannot double-charge.
- Network/model failures and safety refusals follow an explicit no-charge/refund rule.
- The UI always shows remaining replies before the next message.
- After the final reply, preserve the transcript read-only and show the paid upgrade difference.

### Abuse and support

- One starter sampler purchase per account initially, enforced server-side and in Stripe metadata.
- Rate-limit creation and chat routes independently from credit balance.
- Add admin credit history and a support adjustment with mandatory reason.
- Refund handling removes unused credits and flags overspent/refunded edge cases for review rather than silently creating a negative balance.

### Acceptance criteria

- [ ] A non-paying account with no credits cannot call any Stelloquy generation route.
- [ ] A successful three-reply pack permits exactly three completed replies.
- [ ] Failure, refresh, webhook replay, and request retry do not double-spend.
- [ ] Sampler prompts contain only the promised context.
- [ ] Upgrade attribution and conversion are measurable.
- [ ] Subscription allowances and purchased-credit accounting cannot accidentally consume each other.

## M6 — Honest personalized-week experiment

### Current baseline

The current feature is one generated seven-day artifact, not a renewable app experience. Its modeled marginal AI cost is approximately 1–2 cents and under roughly 4 cents at the present output cap. The database contained no generated preview rows at the 2026-08-06 audit, so this is modeled rather than observed cost.

A secure read-only app-shell preview is estimated at 3–5 focused engineering days. Its ongoing AI cost could be near zero if it uses deterministic chart/current-sky data. Engineering opportunity cost, representation, and conversion quality — not inference cost — determine whether it is worthwhile.

### Required corrections if the reading remains

- Rename it everywhere.
- State exactly what it includes and omits.
- Remove the artificial access countdown/expiry claim and keep the one-time dated reading viewable, unless `DEC-02` explicitly chooses a different archival policy.
- Keep one generation per profile so a persistent artifact does not become an unlimited free-generation path.
- Ensure paid-first visitors are not forced through it.
- Attribute the entry path and downstream checkout.

### Experiment

Compare:

- **Paid-first:** real product walkthrough → $14 monthly option.
- **Reading-first:** personalized birth-chart week reading → $14 monthly option.

Primary metric: 14-day net first-payment revenue per unique pricing visitor. Also compare early cancellation and day-7 return so free-reading demand is not mistaken for qualified demand.

### Evidence gate for a genuine shell

Only unpark `PREVIEW-02` when:

1. the reading-first route improves paid conversion by at least roughly 20% relative or one percentage point absolute;
2. buyer interviews identify “I need to see the real workflow” as a repeated blocker;
3. early retention is not worse than paid-first customers;
4. the team can name the exact shell surfaces and mutations allowed without exposing the Blueprint.

Treat early results as directional until there is enough qualified traffic; do not make a permanent product decision from a handful of visitors.

## M7 — Etsy-safe artifact fulfillment

### Policy boundary

Before publishing, re-check Etsy's current official [Services Policy](https://www.etsy.com/legal/policy/services/242665313101), [Creativity Standards](https://www.etsy.com/legal/creativity/), and [Off-Platform Transactions Policy](https://www.etsy.com/legal/policy/off-platform-transactions/1254654515806). Policies can change.

For every new listing:

- the Etsy item is a complete original digital artifact;
- payment and delivery complete on Etsy;
- no Kairos account is required;
- no external purchase, subscription, or activation is required;
- no QR code, coupon, or message directs the buyer elsewhere to complete the transaction;
- AI assistance is disclosed where the current policy requires it;
- copy makes no guaranteed metaphysical outcome claim.

Kairos may be an internal production tool. That does not make app access part of the Etsy sale.

### Artifact data contract

Create one canonical input/output contract shared by the admin generator and any later account claim:

- normalized birth data and timezone provenance;
- natal calculation version and stable chart fingerprint;
- artifact type and template version;
- sky calculation date/range and ephemeris version;
- generated narrative model/prompt version and token usage;
- QA status, revision, generated file checksum, and delivery timestamp;
- Etsy order reference stored only for fulfillment/support.

Do not auto-create a Kairos account or subscribe the buyer to marketing from an Etsy order.

Suggested storage boundaries:

- `artifact_products` — Etsy SKU/listing mapping, required inputs, template/generator version, and active state;
- `artifact_orders` — marketplace reference, product, personalization payload, fulfillment state, due date, and delivery date;
- `artifact_profiles` — an internal guest calculation record with normalized birth data, natal chart, and version/hash; this is not a Clerk/Kairos account;
- `artifact_files` — private storage path, checksum, revision, and generation/delivery state;
- `artifact_order_events` — append-only audit trail for import, validation, generation, approval, revision, delivery, refund, and cancellation.

Document a retention/deletion policy for birth data, source order data, generated files, refunds, and support corrections before the first live order.

### Admin workflow

1. Create/import an Etsy artifact order.
2. Enter or validate the personalization data supplied for the Etsy item.
3. Generate a draft using the artifact-specific template.
4. Review calculations, spelling, layout, disclosure, and file integrity.
5. Approve and export the final PDF/image.
6. Deliver the complete artifact through Etsy.
7. Record delivery/support status without granting software entitlement.

Reuse the existing admin commerce foundation where practical, but separate `artifact_order` from `product_entitlement` so fulfillment cannot accidentally grant app access.

### Optional later continuity

If the buyer later discovers and independently purchases Kairos:

- they explicitly opt in to claiming the prior artifact;
- order ownership is verified;
- Kairos reuses the chart fingerprint/calculation foundation where compatible;
- the claim does not retroactively convert the Etsy sale into a software transaction;
- marketing consent remains a separate choice.

### Acceptance criteria

- [ ] The Etsy buyer receives the complete purchased value without leaving Etsy or creating an account.
- [ ] Artifact generation cannot create `product_entitlements`.
- [ ] Existing legacy entitlement imports remain isolated and supportable.
- [ ] Admin records distinguish draft, QA, approved, delivered, revised, refunded, and canceled.
- [ ] Files are reproducible from recorded versions and protected from cross-customer access.
- [ ] Listing copy and delivered files pass the policy checklist recorded on the order.
- [ ] Refunds/cancellations stop pending generation and remain auditable.
- [ ] A later artifact claim imports only the approved foundation and never creates a product entitlement.
- [ ] Birth data and generated files follow the documented retention/deletion policy.

## M8 — Verification, rollout, and rollback

### Test foundation

The repository currently lacks a general automated test suite. Add focused coverage rather than relying only on manual browser checks:

- unit tests for capability resolution, score ordering, token budgeting, and credit-ledger arithmetic;
- integration tests for consent filtering, retrieval RPC behavior, checkout/webhook idempotency, and Blueprint projection;
- browser tests for the principal access roles;
- SQL/RLS tests using two distinct users;
- Stripe test-mode webhook replay and refund scenarios.

### Access test matrix

Verify at minimum:

- anonymous visitor;
- signed-in profile with no purchase;
- sampler with 3, 1, and 0 credits;
- active monthly Planner;
- active monthly Planner + Stelloquy;
- active annual Planner;
- active annual Planner + Stelloquy;
- expired/canceled monthly;
- expired annual/read-only;
- legacy Etsy entitlement;
- admin.

### Release flags

Use server-controlled flags for:

- new journal consent model;
- relevance-based memory;
- monthly Blueprint window;
- paid sampler;
- personalized-week experiment;
- Etsy artifact admin workflow.

Avoid client-only flags for security boundaries.

### Release order

1. Deploy additive schema and dual-read compatibility.
2. Enable internal/admin test accounts.
3. Validate production-shaped data without exposing customer content in logs.
4. Enable a small cohort.
5. Monitor errors, denials, credit drift, prompt context, conversion, and support contacts.
6. Expand only after the milestone's acceptance criteria pass.
7. Update `PRODUCT_BIBLE.md` after shipped behavior is stable.

### Rollback rules

- Prefer additive migrations; do not drop legacy columns in the same release that introduces replacements.
- Turning off a flag must restore the last safe behavior without broadening access or consent.
- Never roll back by re-enabling Etsy software sales or unconsented journal use.
- Credit and payment ledgers remain append-only; corrections use compensating entries.
- Take a database backup before any production backfill or derived-pattern rebuild.

## Risk register

| Risk | Impact | Mitigation | Trigger/owner | Status |
|---|---|---|---|---|
| Monthly users can extract the full Blueprint in one month | Undermines annual value | Resolve `DEC-01`; enforce projection server-side | Product + Engineering | open |
| Consent UI says one thing while derived AI uses more | Trust/privacy failure | Ship M2 before M3; audit every journal consumer | Engineering | open |
| Retrieval finds recent rather than relevant memories | Low-quality or unsettling guidance | Deterministic scoring, threshold, excerpts, visible recall | Engineering | open |
| $1 pack is double-spent or fulfilled twice | Payment/support loss | Append-only ledger and idempotency keys | Engineering | open |
| Stripe catalog sync archives the sampler or unrelated active prices | Checkout outage | Scope archival and add the sampler to the managed catalog before sync | Engineering | open |
| Preview attracts free-reading demand | Poor conversion and wasted support | Paid-first control and retention-aware metric | Product | open |
| Locked Blueprint leaks through another API/prompt | Commercial access failure | Capability audit and role matrix | Engineering | open |
| New Etsy listing functions as software activation | Marketplace policy exposure | Standalone value, on-Etsy completion, policy checklist | Founder | open |
| Legacy Etsy customers lose access during cleanup | Customer harm | Preserve legacy code/data and test role explicitly | Engineering | open |
| Analytics captures private content | Privacy failure | Strict allowlist, server validation, no raw URLs/content | Engineering | open |
| Stale docs reintroduce retired paths | Scope/policy regression | Supersession banners and this linked active roadmap | Engineering | open |
| Two agents edit the same dirty/shared file | Lost or interleaved work | Exclusive lock register, scoped diffs, root integration only | Root | open |
| Parallel migrations or type generation drift | Broken deployment order/types | Central reservations and one schema captain/type-generation pass | Root | open |
| Linked Supabase history contains nine timestamped versions absent from this checkout | A linked/staging dry run cannot establish an apply plan and production history could be mis-repaired | Reconcile from authoritative migration sources or a dedicated staging project before any apply; never create placeholder migrations or repair production history during feature work | Root + Founder | open — discovered at G1 |
| Root becomes an integration bottleneck | Parallel work waits or merges late | Interface-first modules, small adapters, one gate per wave | Root | open |
| Speed pressure skips privacy/access gates | Customer harm despite faster coding | Fail closed; no dependent wave before its integration gate | Root + Founder | open |

## Baseline audit snapshot — 2026-08-06

- Stelloquy directly loads the newest five `oracle_memory = true` entries, before the current user question is used for retrieval.
- Each direct entry body is clipped to its first 110 characters.
- The live account data had not yet exceeded the five-entry limit per user, so the flaw is architectural rather than a current support incident.
- All saved entries currently trigger journal-pattern refresh/synthesis regardless of `oracle_memory`; those derived patterns can feed Stelloquy, Blueprint generation, month briefs, and quarterly reviews.
- `goal_tags` exists in the journal schema but is not written by the current create route.
- There is no full-text or vector memory index and no pin/importance field.
- The current preview has no observed generation/conversion sample in the database.
- The preview artifact is generated once per user; the seven-day access record exists, but the reading page does not enforce a true expiry boundary.
- Current paid checkout has monthly and annual subscriptions with no free Stripe trial.
- Current authenticated Blueprint RLS exposes the raw row, so UI-only filtering would not protect locked future content.
- The app layout can show a lapsed/no-access banner while still rendering child routes; paid access needs a true server gate.
- Current public pricing and legacy docs still contain Etsy software-access language.
- Page-level Vercel Analytics exists, but there are no complete first-party funnel events or reliable checkout-start attribution.

## Decision log

| Date | Decision | Rationale | Affected IDs |
|---|---|---|---|
| 2026-08-06 | Created one repository-backed roadmap and canonical tracker | Prevent decisions from being lost across chats and keep implementation evidence attached to durable IDs | all |
| 2026-08-06 | Journal consent must be separated from memory relevance | Relevance cannot repair an unclear permission boundary | CONSENT-01–03, MEM-01–04 |
| 2026-08-06 | Genuine free-week shell remains evidence-gated | Marginal inference is inexpensive, but secure implementation is 3–5 focused days and there is no conversion sample | PREVIEW-01–02 |
| 2026-08-06 | New Etsy direction is standalone artifacts, not software access | Align the offer with the current cautious reading of Etsy's published policies | SAFE-01, ETSY-01–04 |
| 2026-08-06 | Adopted a four-slot multi-agent execution model | Three disjoint specialist lanes plus one root integrator reduce elapsed time while keeping schema, Stripe, Oracle, access, and public-surface hotspots single-writer | all implementation IDs |
| 2026-08-06 | Approved `DEC-01`: active monthly access is the current week plus the next four weeks; active annual access is the full Blueprint | Protects the annual artifact while preserving a useful cancel-anytime monthly product; customer-authored journals remain readable/exportable after cancellation | ACCESS-01–04, QA-02 |
| 2026-08-06 | Approved `DEC-02`: retain a persistent Personalized Birth-Chart Week Reading without an artificial countdown | Keeps the limited artifact truthful and measurable without representing it as a genuine app trial | SAFE-02, PREVIEW-01–02 |
| 2026-08-06 | Approved `DEC-03`: one $1 starter pack per customer with three completed replies and natal/current-sky-only context | Provides a low-cost authentic sample while keeping failures free and subscriber context protected; unused purchased credits survive upgrade | SAMPLE-01–03, SAFE-03 |
| 2026-08-06 | Approved `DEC-04`: first artifacts are the Personal Natal Chart Anchor Print and Current Season Compass | Both can be complete Etsy-delivered products without app activation or a yearly Blueprint | ETSY-01–03 |
| 2026-08-06 | Approved `DEC-05`: preserve existing `oracle_memory = true` only for direct recall; default broader pattern/planner consent off and require review | Avoids silently broadening historical journal consent | CONSENT-01–03, MEM-01–04 |
| 2026-08-06 | Approved `DEC-06`: stop new Etsy software-access promotion while preserving a direct support-only legacy claim path | Protects existing legitimate customers without using Etsy as a new software entitlement channel | SAFE-01, ETSY-01–04 |
| 2026-08-06 | Approved `DEC-07`: rebuild pattern data from approved entries, invalidate/regenerate affected derived briefs and summaries while preserving authored fields, and leave existing paid Blueprints as historical artifacts | Existing derived content lacks surgical lineage; this fails closed for future use without silently replacing a purchased annual artifact | CONSENT-03, DOC-01, QA-02 |

## Session update template

Append one row to the change log and update the tracker rather than creating a separate handoff for routine progress.

```md
### YYYY-MM-DD — Session summary

- Started/completed: ID(s)
- Decisions made: DEC-ID and exact choice
- Files/migrations changed:
- Verification evidence:
- Risks or blockers:
- Next three actions:
```

## Change log

### 2026-08-06 — Roadmap created

- Consolidated the journal-memory, consent, preview, access packaging, sampler, analytics, and Etsy-artifact work.
- Recorded current code/data findings and the decisions still requiring founder approval.
- No production migrations, pricing changes, or external marketplace changes were performed.

### 2026-08-06 — Multi-agent optimization added

- Added a root-plus-three-specialist operating model, active dispatch board, standard task/handoff templates, exclusive file locks, migration reservations, serialized conflict pairs, parallel waves, and G0–G5 integration gates.
- Assigned default lanes in the canonical tracker and separated total person-effort from the multi-agent elapsed-time target.
- No feature implementation, production migration, deployment, Stripe mutation, or Etsy change was performed.

### 2026-08-06 — Wave 1 / G1 completed

- Recorded founder approval of `DEC-01` through `DEC-07` and the exact privacy, access, sampler, preview, and legacy Etsy outcomes.
- Completed `SAFE-01`, `SAFE-03`, `CONSENT-01`, `ACCESS-01`, and `METRICS-01` through three locked specialist lanes plus root integration.
- Added reserved migrations `0038` and `0039`, updated the shared database type snapshot once, and kept every new server-controlled flag off by default. Neither migration was applied anywhere.
- Closed the unauthenticated capture-tagging AI bypass, removed the retired Planner-only/20-question Stelloquy promise, removed new-sale Etsy software promotion, and preserved the direct legacy claim route.
- Verification passed: journal consent/wiring checks, funnel contract checks, 87 access-capability assertions, commerce/Stelloquy safety audits, PostgreSQL syntax parsing, additive migration invariants, full `tsc`, flags-off `npm run build`, and browser checks for home, pricing, and legacy activation.
- The linked Supabase dry run made no changes and stopped on a pre-existing migration-history mismatch: nine remote timestamped versions are absent locally. This must be reconciled before any staged or production apply; no repair/pull/placeholder migration was attempted.
- G1 is complete for the code foundation. G2 remains unopened until Wave 2 is explicitly dispatched under fresh locks.
