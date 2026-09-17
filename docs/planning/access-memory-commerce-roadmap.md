---
type: implementation-plan
subject: access-memory-commerce
status: active
owner: founder
execution_model: four-slot-multi-agent
created: 2026-08-06
updated: 2026-08-23
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

Related plan (2026-09-14): [Memory, Reflections, and Yearly Unwrapped](./reflections-memory-unwrapped-plan.md) defines monthly and quarterly period-end reports, evidence improvements, and the annual retrospective, with goals as a small optional thread. Its REF-* tasks are implemented and verified locally; migration 0047 and deployment remain pending. Question-relevant recall and source links have local implementation and tests. Existing CONSENT-* and MEM-* activation dependencies remain tracked here.

## Progress snapshot — 2026-08-23

- **Full implementation:** 8 of 31 implementation rows are `done` — **26% complete**.
- **Including completed local work awaiting verification:** 14 of 31 implementation rows are `done` or `verification` — **45% delivered to verification**.
- **Whole tracker, including founder decisions:** 15 of 38 rows are `done` — **39%**; 21 of 38 are `done` or `verification` — **55%**.
- The unrelated **3/114 points** figure is not a Kairos metric and must not be used for this roadmap.
- `SAFE-02`, `CONSENT-02`, `CONSENT-03`, `ACCESS-04`, and `METRICS-02` are implemented locally but do not count as complete until their remaining authenticated UI, staging, privacy/access-leakage, lifecycle-delivery, audit, payment-webhook, and idempotency evidence passes. `ACCESS-02` cleared its staging RLS/persona-leakage gate 2026-09-17 and is `done`.

## Current recommendation

1. Fix journal consent before expanding memory retrieval.
2. Replace “newest five” with relevance-based retrieval; do not send every journal entry.
3. Use the cancel-anytime monthly product as the genuine paid trial, but protect the full-year Blueprint through the access package.
4. Defer a genuine free in-app week until conversion evidence supports the engineering work.
5. If the existing generated week remains, call it a **Personalized Birth-Chart Week Reading**, not a free product trial.
6. Offer a one-time **$1 / 3-message Stelloquy sampler** with natal-chart and current-sky context only.
7. Build Etsy into a separate digital-product revenue line and brand-discovery channel. Sell complete artifacts there; do not sell Kairos access or use the Etsy order as a required handoff to an off-Etsy purchase or activation.
8. Add first-party funnel events before changing the acquisition path so the decision can be revisited with evidence.

## Next three actions

1. Start `ACCESS-03` (Blueprint/calendar navigation, locked states, upgrade, cancellation behavior) now that `ACCESS-02` is `done`; decide separately when `KIAROS_MONTHLY_BLUEPRINT_WINDOW` actually turns on in production, since clearing the staging gate is not itself that decision.
2. Complete `docs/etsy-anchor-print-launch-approval-packet.md` (legal/address/market wording, Privacy Policy/Terms/listing review, independent PDF/assistive-technology testing), then continue the fictional Year Ahead / Celestial Connection admin review before any real intake or listing publication.
3. Apply `0040`/`0041` (journal-derived cleanup/rebuild) against the local Docker Supabase staging stack (`supabase init` + `supabase start`, now set up — see 2026-09-17 change log) and run destructive-cleanup/two-user RLS evidence there before either ever touches production.

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
| Root | unassigned | idle | none | Exact-hash `ETSY-03` migrations `0045` and `0046` are applied to production with all three Etsy artifact flags off, an inactive product, empty operational tables, and a private empty bucket; controlled deployment/activation, publication, real intake, and Etsy-native delivery remain separate gates |
| Specialist A | unassigned | idle | none | `ACCESS-04` copy handed back after focused checks and full root verification |
| Specialist B | unassigned | idle | none | `ETSY-01` and `ETSY-02` are complete; `ETSY-03` is locally implemented and remains in verification behind separate external-action gates |
| Specialist C | unassigned | idle | none | Independent access/offer copy contract handed back green; conditional Etsy script correctly omitted until artifact surfaces exist |

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

The worktree was clean at the start of the 2026-08-12 Wave 2 session. Public pricing, preview, onboarding, Oracle, and planner files remain root-owned until a scoped handoff explicitly transfers them.

### Migration reservation register

The latest migration at planning time is `0037`. Reserve deployment order before agents create SQL:

| Reservation | Purpose | Owning package | State |
|---|---|---|---|
| `0038` | First-party funnel analytics | `METRICS-01` | present remotely as `20260812185700`; SQL is byte-for-byte identical; production application was discovered read-only and was not performed or authorized in this session |
| `0039` | Journal consent/audit fields | `CONSENT-01` | present remotely as `20260812185721`; SQL is byte-for-byte identical; production application was discovered read-only and was not performed or authorized in this session |
| `0040` | Consent-aware pattern refresh function | `CONSENT-03` | authored locally; unapplied; blocked on history reconciliation and safe staging |
| `0041` | Approved journal-derived cleanup/rebuild | `CONSENT-03` | authored separately from function change; unapplied; blocked on safe staging |
| `0042` | Journal retrieval index/RPC | `MEM-01` | reserved; blocked on `0041` |
| `0043` | Secure Blueprint access/RLS | `ACCESS-02` | applied to production 2026-09-17 via `supabase db query --linked` (migration-history ledger still unreconciled — see risk register); verified anon/authenticated get 42501 permission denied on `blueprints`, service-role unaffected |
| `0044` | Stelloquy credit ledger | `SAMPLE-02` | reserved for Wave 3; blocked on sampler/metrics predecessors |
| `0045` | Artifact fulfillment tables | `ETSY-03` | exact revision SHA-256 `BAA0DB19FF4E2A00E597001053BB9075B45042142232C1A57CC1F981875C2B29` applied to production as authoritative timestamp `20260821211738` on 2026-08-23 after an encrypted logical backup and exact one-file dry run; both Etsy flags remained absent/off, the product is inactive, operational tables are empty, and the private bucket contains no test fixture |
| `0046` | Natal-report package and persisted manual intake | `ETSY-03` | exact revision SHA-256 `D1988E4A7DC88DDEDD2DFC3E7F842C09CE2567E4D3825E82D86D0D2408589DD0` applied to production as authoritative timestamp `20260826124803` on 2026-08-26 after an EFS-encrypted logical backup and exact one-file dry run; the new intake RPC is service-role-only, the product remains inactive, all eight operational tables remain empty, and all three Etsy artifact flags remain absent/off |

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
| SAFE-02 | P0 | Safety | Make week-reading name, scope, and persistence truthful | verification | DEC-02 | 1–2d | Root-Product | Approved name/scope/persistence, no expiry read/write, one-generation guard, attribution continuity, focused regressions, full TypeScript, 99-page build, and public browser checks pass; authenticated artifact check remains | 2026-08-12 |
| SAFE-03 | P0 | Safety | Verify no free signed-in Stelloquy allowance remains in code or current copy | done | DEC-03 | 0.5d | B-Access + Root | `node scripts/check-stelloquy-access.mjs` passes: 3 generation entrypoints guarded; 337 source files contain no retired free/core allowance | 2026-08-06 |
| METRICS-01 | P0 | Measurement | Define and persist first-party funnel events and attribution | done | — | 2–3d | C-Data + Root | `0038`; runtime/focused TS/migration checks and flags-off build pass; public route permits only 3 low-trust events | 2026-08-06 |
| METRICS-02 | P0 | Measurement | Persist checkout starts, cancellations, completions, and experiment source | verification | METRICS-01 | 1–2d | Root-Data | Trusted server start/cancel/webhook completion hooks, first-touch preservation, replay/privacy contract, focused/full TS, regressions, diff check, and flag-off/on 99-page builds pass; staged Stripe/DB reconciliation remains | 2026-08-12 |
| METRICS-03 | P1 | Measurement | Add admin funnel/retention summary and metric definitions | blocked | METRICS-02 | 1–2d | C-Data | — | 2026-08-06 |
| CONSENT-01 | P0 | Journal trust | Add separate pattern-use, Stelloquy-recall, pin, and importance fields | done | DEC-05 | 1–2d | A-Journal + Root | `0039`; shared create service + private Today path; runtime/wiring/migration/type/build checks pass | 2026-08-06 |
| CONSENT-02 | P0 | Journal trust | Update journal create/edit/history controls and explanations | verification | CONSENT-01 | 2–3d | Root-Journal | Contract/wiring tests, focused/full TypeScript, and flag-off/on builds pass; authenticated browser interaction remains | 2026-08-12 |
| CONSENT-03 | P0 | Journal trust | Enforce consent in synthesis and support revocation/rebuild | verification | CONSENT-01, DEC-07 | 2–3d | Root-Journal | `0040`/`0041`; enforcement tests, SQL parsing, focused/full TypeScript, and flag-off/on builds pass; staging privacy/RLS evidence remains | 2026-08-12 |
| MEM-01 | P1 | Memory | Add full-text search/index and deterministic retrieval RPC | blocked | CONSENT-01 | 1–2d | A-Journal | — | 2026-08-06 |
| MEM-02 | P1 | Memory | Build relevance scorer, excerpts, threshold, and token budget | blocked | MEM-01 | 2–3d | A-Journal | — | 2026-08-06 |
| MEM-03 | P1 | Memory | Integrate selected memories into Stelloquy after the question is known | blocked | MEM-02, CONSENT-03 | 1–2d | A-Journal + Root | — | 2026-08-06 |
| MEM-04 | P1 | Memory | Show recalled-memory count and user-reviewable sources | blocked | MEM-03 | 1–2d | A-Journal | — | 2026-08-06 |
| ACCESS-01 | P0 | Paid access | Replace broad plan checks with explicit capabilities | done | DEC-01 | 1–2d | B-Access + Root | `check-access-capabilities.mts` passes 87 assertions; focused/full TS and flags-off build pass | 2026-08-06 |
| ACCESS-02 | P0 | Paid access | Enforce monthly Blueprint window on the server | done | ACCESS-01 | 2–4d | Root-Access | `0043`; 40 projection/RLS assertions, 87 capability assertions, full TypeScript, diff check, flag-off/on builds pass; `scripts/check-access-02-staging.mts` — 37 assertions against local Docker Supabase, 8 of 10 SAFE-02 personas, 0 failures | 2026-09-17 |
| ACCESS-03 | P0 | Paid access | Update Blueprint/calendar navigation, locked states, upgrade, and cancellation behavior | pending | ACCESS-02 | 2–3d | B-Access | — | 2026-09-17 |
| ACCESS-04 | P0 | Paid access | Align pricing, onboarding, success, billing, and retention copy | verification | ACCESS-01, SAFE-01 | 1–2d | Agent A + Root | Copy/offer contract passes; retention delivery batch-loads entitlements, fails closed on lookup errors, and requires `canUsePlanner` before content/send work; 16 eligibility assertions, all focused regressions, full TypeScript, diff check, 99-page build, and public browser checks pass; authenticated lifecycle personas remain | 2026-08-12 |
| SAMPLE-01 | P1 | Sampler | Add Stripe one-time sampler product and checkout fulfillment | blocked | DEC-03, METRICS-02 | 1–2d | B-Commerce + Root | — | 2026-08-06 |
| SAMPLE-02 | P1 | Sampler | Add append-only credit ledger and idempotent consumption | blocked | SAMPLE-01 | 2–3d | B-Commerce | — | 2026-08-06 |
| SAMPLE-03 | P1 | Sampler | Build limited-context Stelloquy sampler experience and upgrade handoff | blocked | SAMPLE-02 | 2–3d | B-Commerce + Root | — | 2026-08-06 |
| PREVIEW-01 | P1 | Experiment | Compare paid-first versus personalized-reading-first acquisition | blocked | SAFE-02, METRICS-02 | 1–2d + traffic | C-Product | — | 2026-08-06 |
| PREVIEW-02 | P2 | Preview shell | Build a genuine read-only app-shell week only if evidence gate passes | parked | PREVIEW-01 | 3–5d | B-Access + C-Product | — | 2026-08-06 |
| ETSY-01 | P1 | Etsy artifacts | Finalize artifact specs, listing boundaries, disclosures, and fulfillment SLA | done | DEC-04, DEC-06 | 1–2d | Founder + C-Product | Founder approved the complete Anchor-first product, calculation, price/SKU, accessibility, privacy/retention, disclosure, support, correction/refund, ingestion/delivery, and line-item contract on 2026-08-17; Compass defaults are reserved and no external action occurred | 2026-08-17 |
| ETSY-02 | P1 | Etsy artifacts | Build reusable artifact data contract and templates | done | ETSY-01 | 2–4d | Root-Artifact | Added the versioned Anchor contract, strict known/unknown-time validation, traceable narrative facts, deterministic two-page accessible HTML/SVG renderer, and locked fixtures. Verification passed 67 generator assertions plus 206 local PDF checks across known/unknown-time Letter/A4 exports: exact page count/dimensions, selectable complete text, embedded fonts, vector chart, generic metadata, no links, and tagged logical structure. All eight rendered pages passed human visual inspection; focused/full TypeScript, boundary/safety/copy checks, whitespace checks, and the 99-page production build pass. This is PDF/UA structural readiness, not independent conformance certification | 2026-08-18 |
| ETSY-03 | P1 | Etsy artifacts | Adapt admin workflow for order intake, generation, QA, and Etsy delivery | verification | ETSY-02 | 2–4d | Root-Artifact/Admin | Production now has the founder-only natal-report fulfillment console, service-role persistence, manual real-order intake, private PDF storage, QA/state transitions, and bundled serverless PDF export. `0045` and `0046` remain the exact applied persistence/package boundaries at production timestamps `20260821211738` and `20260826124803`. All three production gates are enabled, but the product seed remains inactive, all eight operational tables were empty at activation, no Etsy client exists, and no buyer/order/test fixture was created. Final policy/accessibility sign-off, Etsy listing publication, first buyer fulfillment, and any Etsy-native delivery remain gates | 2026-08-26 |
| ETSY-04 | P2 | Etsy continuity | Allow an independently paying Kairos user to opt in and claim a prior artifact | blocked | ACCESS-01, ETSY-03 | 1–3d | B-Access | — | 2026-08-06 |
| ETSY-05 | P1 | Etsy artifacts | Build the Year Ahead Forecast and standalone Celestial Year Map | verification | ETSY-02, ETSY-03 | 3–5d | Root-Artifact/Admin | Added a local-only two-SKU workflow with exact solar-return timing, birthday-location chart casting, annual profection/Lord of the Year, a full-year transit scan, exactly three ranked traceable activation windows, fact-fenced AI narrative generation, seven-item human QA, a 17-page Letter/A4 report, and five standalone map sizes. Focused TypeScript passes; real Chromium verification passes for both report sizes and all five maps with exact page counts/dimensions, tagged structure, selectable text, and sub-10 MB files. The queue remains in-memory; authenticated admin review, live AI generation review, durable repository/schema support, independent accessibility review, pricing/listing approval, deployment, flags, real intake, and Etsy delivery remain gated | 2026-08-25 |
| ETSY-06 | P1 | Etsy artifacts | Build the Celestial Connection relationship report and standalone double-orbit map | verification | ETSY-02, ETSY-03 | 3–5d | Root-Artifact/Admin | Added a local-only two-SKU workflow for romantic, friendship, family, and creative/business contexts: deterministic two-chart calculation, exactly three ranked traceable synastry signatures, a short-arc composite center, strict unknown-time omissions, fact-fenced AI narrative generation, eight-item human QA, a 15-page Letter/A4 report, and five standalone map sizes. Focused TypeScript passes; real Chromium verification passes both reports and all five maps with exact page counts/dimensions, tagged structure, selectable text, and sub-10 MB files. The listing package records $68 report and $34 map launch hypotheses. Authenticated visual review, live consented AI review, durable persistence/retention, independent accessibility review, pricing/legal approval, deployment, flags, real intake, publication, messaging, upload, and Etsy delivery remain gated | 2026-08-26 |
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

Current-policy review completed 2026-08-17 against Etsy's official policies:

- Etsy permits original seller-designed digital downloads and certain digital creative services/readings that deliver a qualifying file, while app-membership subscriptions are expressly prohibited.
- Seller-prompted AI work is permitted when the listing discloses AI use; the delivered design and interpretive system must remain Kairos-original and human-directed.
- Etsy prohibits encouraging an Etsy-originated purchase through another venue, QR-code redirection off Etsy, and referral codes. The acquisition value of this line is therefore **brand-led discovery and trust**, not an in-artifact off-platform sales CTA, coupon, referral code, or required app handoff.
- Every artifact must deliver its full purchased value through the Etsy order and must not advertise guaranteed metaphysical outcomes.

### `ETSY-01` read-only specification audit — 2026-08-12

The concurrent audit proposed an implementation-ready product boundary but made no file or external-service changes. The founder has confirmed the strategic business direction and the current-policy review is complete; `ETSY-01` remains `pending` until the concrete product, operations, privacy, pricing, visual, and disclosure choices below are approved.

The mandatory fulfillment separation is:

```text
New artifact: Etsy line item → artifact order → guest artifact profile → deterministic calculation → generated narrative → private file → QA → Etsy delivery
Legacy support: marketplace_orders → activation_claims → product_entitlements → loyalty reward / Stripe attempt
```

New artifacts must never enter the legacy support pipeline. The current Etsy CSV/admin path infers software tiers, defaults to yearly access, stores full source rows, and cannot safely identify multiple fulfillment units within one Etsy order. A future artifact importer needs a line-item/fulfillment-unit idempotency key and a privacy-minimized field allowlist.

Proposed artifact contracts for founder review:

- **Personal Natal Chart Anchor Print:** a two-page natal reference delivered in US Letter and A4 PDFs. Page one is a designed chart/placement reference; page two provides concise stable natal anchors. When birth time is unknown, suppress Ascendant/houses and label time-sensitive Moon details instead of presenting proxy calculations as precise.
- **Current Season Compass:** a nine-page, exactly 30-consecutive-day printable delivered in US Letter and A4 PDFs. It includes a dated theme, four compass bearings, deterministic sky map, five six-day sections, 30 dated invitations, and closing reflection prompts. It never becomes an ongoing service or full-year Blueprint.
- Deterministic fields come from recorded birth normalization, versioned natal/ephemeris calculation, chart fingerprint, date range, and traceable sky facts. Generated text is structured, non-prescriptive, versioned, and forbidden from inventing placements, transits, goals, predictions, or guaranteed outcomes.
- Both products exclude accounts, subscriptions, activation, entitlements, loyalty credits, off-Etsy checkout, Blueprint, Goals, Life Areas, journal, Stelloquy, curriculum, and guaranteed metaphysical outcomes.
- Files remain private, use opaque identifiers and clean metadata, record checksums/revisions, and pass calculation, narrative, visual, disclosure, privacy, and file-integrity QA before complete on-Etsy delivery.
- Proposed service policy is delivery within three business days of complete unambiguous inputs, with the Compass delivered at least 48 hours before its agreed start date. Kairos-caused defects receive correction; changed birth/date inputs are new personalization; missed dated usefulness escalates to a replacement range or refund.

Founder-approved contract — 2026-08-17:

1. **Launch and price:** test only the Anchor Print at `$34 USD`, SKU `KAI-ETSY-ANCHOR-V1`, with standard personalization included and no launch bundle/add-ons. This is a launch hypothesis because no external competitive or willingness-to-pay research was authorized. Keep the Compass unpublished until the Anchor workflow is proven.
2. **Anchor pages:** page one contains the optional display name, natal wheel, Sun-through-Pluto placement table, retrograde markers, known-time Ascendant/MC/houses, five strongest major aspects, and calculation-method footer. Page two contains six concise stable anchors, three reflective prompts, and limitations. It excludes forecasts, current transits, Human Design, Blueprint, Goals, journal, Stelloquy, and app access.
3. **Calculation and unknown time:** use the Tropical zodiac, Whole Sign houses for known birth times, and conjunction/opposition/square/trine/sextile aspects. Record timezone provenance, ephemeris/calculation version, and chart fingerprint. For unknown time, require date/place; suppress Ascendant, MC, houses, angle-dependent claims, and Human Design; include Moon details only when stable across the local birth date and otherwise label the possible range and omit unstable interpretations.
4. **Files/accessibility:** deliver separate two-page US Letter and A4 PDFs, each at most 10 MB, with embedded fonts and vector chart where practical. Require selectable text, tagged reading order, language/title metadata, 11-point minimum body text, 4.5:1 contrast, no color-only meaning, and text equivalents for chart data. Target PDF/UA-1-compatible production, but make no public conformance claim until independently validated.
5. **Name/gifting/visual:** display name may be first name, initials, pseudonym, or blank. Launch is self-purchase only; gifting waits for recipient-consent handling. Use the print-first Obsidian Almanac direction: warm bone ground, obsidian text, restrained violet/steel-blue/amber accents, editorial serif headings, clean sans body, precise celestial linework, ink-conscious and grayscale-readable output, and no cliché zodiac imagery or large dark fields.
6. **SLA/corrections/refunds:** deliver within three business days after complete unambiguous inputs; pause the clock for clarification. Allow cancellation/refund and buyer-input correction before generation begins. Correct Kairos-caused calculation, spelling, or file defects within two business days when reported within 14 days. Treat changed birth data or creative preferences after generation begins as new personalization. A materially harmful Kairos-caused missed SLA receives replacement or full refund.
7. **Disclosures:** state that Kairos designed the artifact from buyer-supplied birth details and versioned astronomical calculations; AI-assisted drafting may support interpretive text and every order is structured/reviewed by Kairos. State that the product is reflective astrology, not a prediction/guarantee or medical, mental-health, legal, financial, or other professional advice; identify birth-time uncertainty; and say the purchase includes only the listed PDFs, not a Kairos account, subscription, Blueprint, Stelloquy, activation, or off-Etsy purchase.
8. **Privacy/retention:** delete raw personalization within 30 days after delivery/case closure; retain normalized birth/calculation data and generated files/revisions for 180 days; retain support/correction correspondence for 12 months; retain a birth-data-free minimal order ledger for seven years or the legally required period; honor eligible deletion requests within 30 days. Never create accounts, entitlements, loyalty credits, or marketing subscriptions.
9. **Support/policy gate:** use `support@kairosplanner.xyz` for customer support and `privacy@kairosplanner.xyz` for privacy requests. Substantive privacy and terms pages must precede the first listing; the current contact-only pages are not sufficient for launch.
10. **Ingestion/delivery/idempotency:** initially copy only allowlisted Etsy fields manually into the future isolated artifact-admin workflow; never use the legacy Etsy CSV/entitlement importer. Deliver only through Etsy's native order-delivery surface. Use `etsy:{shop_id}:{receipt_id}:{transaction_id}:{unit_index}` as the canonical fulfillment-unit key and stop for manual review when transaction-level identity or multiple quantities are ambiguous.
11. **Reserved Compass:** price `$64 USD`, SKU `KAI-ETSY-COMPASS-30D-V1`, nine pages covering exactly 30 consecutive days, current-timezone input, start date at least seven calendar days after complete inputs, delivery within three business days and at least 48 hours before the start date, and replacement range or full refund for Kairos-caused late delivery.

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
| Retention-email sender selects lapsed users before resolving capabilities | Capability-neutral templates avoid direct false promises, but lapsed users may still receive paid-looking generated guidance | Sender now batch-loads candidate entitlements, fails closed on query errors, and requires `canUsePlanner` before Blueprint/transit/send work; keep real sends approval-gated and verify authenticated lifecycle personas later | Engineering | locally mitigated — live cron deliberately not invoked |
| New Etsy listing functions as software activation | Marketplace policy exposure | Standalone value, on-Etsy completion, policy checklist | Founder | open |
| Accessible-by-design Anchor output is mistaken for an independently validated PDF/UA deliverable | Customers may receive an inaccessible or misleadingly labeled file | Keep workflow `draft`, `deliveryReady = false`, and public conformance claims false; local structural/tooling and visual checks pass, while independent PDF/UA and assistive-technology validation remain a pre-listing gate | Root + Artifact QA | locally mitigated — four fixture PDFs/eight rendered pages pass; independent conformance remains open |
| Celestial Connection stores two people's birth details when only one may be the buyer | Third-party privacy and consent harm | Keep the workflow local/in-memory, minimize fields, disclose the two-person use, prevent buyer identity from entering AI prompts, and require approved retention/deletion plus durable access controls before real intake | Founder + Artifact Admin | open - real intake and deployment gated |
| Star Origin, Year Ahead, and Celestial Connection local queues are mistaken for durable fulfillment storage | A process restart can discard an in-progress order or its review evidence | Keep real intake and deployment gated; extend the existing artifact repository, private storage, retention jobs, and schema through a separately reviewed additive migration before launch | Root + Artifact Admin | open - local in-memory workflow only |
| Legacy Etsy customers lose access during cleanup | Customer harm | Preserve legacy code/data and test role explicitly | Engineering | open |
| Analytics captures private content | Privacy failure | Strict allowlist, server validation, no raw URLs/content | Engineering | locally mitigated — staged payload audit remains |
| Stale docs reintroduce retired paths | Scope/policy regression | Supersession banners and this linked active roadmap | Engineering | open |
| Two agents edit the same dirty/shared file | Lost or interleaved work | Exclusive lock register, scoped diffs, root integration only | Root | open |
| Parallel migrations or type generation drift | Broken deployment order/types | Central reservations and one schema captain/type-generation pass | Root | open |
| Linked Supabase history contained 17 timestamped versions absent from this checkout | A linked/staging dry run could not establish an apply plan and production history could be mis-repaired | Resolved 2026-09-17: the 17 remote entries were the same 44 local migrations applied under Supabase-generated timestamp versions instead of this repo's `00NN` numbering (3 early entries cover a consolidated `0001`–`0030`-ish squash; 14 later entries map 1:1 by name to `0031`–`0047`). `supabase migration repair --status applied` recorded all 44 local versions against the remote ledger, then `--status reverted` retired the 17 now-redundant timestamped rows. `supabase db push --dry-run --linked` reports "Remote database is up to date"; `check:schema` confirms all 53 tables/44 columns from all 45 migration files present, both before and after. No SQL was replayed — this was ledger metadata only | Root + Founder | resolved 2026-09-17 |
| `0038` and `0039` appeared on production as timestamped versions without an authorized apply in this session | Release controls may be bypassed and the audit trail is incomplete | Resolved as part of the ledger reconciliation above: both were applied under `first_party_funnel_events` (`20260812185700`) and `journal_consent` (`20260812185721`), consistent with their content and the 2026-08-12 evidence dates already recorded against `METRICS-01`/`CONSENT-01`. No unauthorized/unattributed apply found beyond the naming mismatch itself | Founder + Root | resolved 2026-09-17 |
| No dedicated Kairos staging project or preview branch is positively identified | Destructive cleanup and two-user RLS tests cannot be run safely | Resolved 2026-09-17: Supabase cloud branching needs a paid plan upgrade not yet made, so local Docker Supabase (`supabase init` + `supabase start`) is now the staging target — zero cost, schema/RLS-identical (`check:schema` confirms), no production data. Used already for `ACCESS-02`'s persona/RLS evidence. `0040`/`0041` should run there next, same as any other staging use | Founder + Root | resolved 2026-09-17 |
| Root becomes an integration bottleneck | Parallel work waits or merges late | Interface-first modules, small adapters, one gate per wave | Root | open |
| Speed pressure skips privacy/access gates | Customer harm despite faster coding | Fail closed; no dependent wave before its integration gate | Root + Founder | open |

## Baseline audit snapshot — 2026-08-06

- Stelloquy directly loads the newest five `oracle_memory = true` entries, before the current user question is used for retrieval.
- Each direct entry body is clipped to its first 110 characters.
- The live account data had not yet exceeded the five-entry limit per user, so the flaw is architectural rather than a current support incident.
- All saved entries currently trigger journal-pattern refresh/synthesis regardless of `oracle_memory`; those derived patterns can feed Stelloquy, Blueprint generation, month briefs, and quarterly reviews.
- `goal_tags` exists in the journal schema but is not written by the current create route.
- There is no full-text or vector memory index and no pin/importance field.
- The personalized week reading has no observed generation/conversion sample in the database.
- The artifact remains one generation per profile and is now presented as a persistent dated reading. The legacy seven-day access record remains for compatibility but is no longer created by generation or read to gate/count down the artifact.
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
| 2026-08-12 | Opened Wave 2 with `CONSENT-02` under the root journal lock; all customer-facing consent behavior remains behind `KIAROS_JOURNAL_CONSENT_V2` | The live additive schema is present and verified, but no staging target exists and production migration-history reconciliation is still unresolved | CONSENT-02, QA-01 |
| 2026-08-12 | Reserved `0040` for consent-aware pattern enforcement and `0041` for the separate approved cleanup; shifted unwritten later reservations by two | Consent enforcement must precede retrieval, and the roadmap requires destructive cleanup to remain separate from function/schema changes | CONSENT-03, MEM-01, ACCESS-02, SAMPLE-02, ETSY-02 |
| 2026-08-12 | Started local `METRICS-02`; root took `LOCK-METRICS` and only the checkout/webhook integration slice of `LOCK-STRIPE` | Trusted conversion events converge on the existing Stripe routes, and keeping one writer protects the dirty shared worktree while all analytics behavior remains flag-off | METRICS-02, QA-01 |
| 2026-08-17 | Approved the complete `ETSY-01` Anchor-first product and operating contract, with reserved Compass defaults | Fixes the standalone value, calculation, privacy, accessibility, disclosure, support, pricing, correction/refund, fulfillment, and entitlement-isolation boundaries before implementation; substantive privacy/terms remain a pre-listing gate | ETSY-01–03 |
| 2026-08-19 | Authorized `ETSY-03` scope A and B only: local fixture/in-memory UI/service implementation plus migration `0045` authoring, with no apply or external action | Allows safe local workflow proof while preserving separate approval gates for database application, real customer data, and live Etsy delivery | ETSY-03, QA-01–03 |
| 2026-08-20 | Authorized exactly two temporary fictional Clerk test users with admin metadata for separate operator/reviewer sessions, followed by mandatory deletion | Enables authenticated local workflow evidence without retaining test identities or broadening permission to real users, production, Etsy, or remote database state | ETSY-03, QA-01–03 |
| 2026-08-20 | Authorized one disposable fictional Clerk admin to revalidate the local refund control, followed by mandatory deletion | Closes the remaining authenticated local refund evidence gap without authorizing persisted delivery, real users, production, Etsy, or remote database state | ETSY-03, QA-01–03 |
| 2026-08-23 | Authorized a temporary encrypted production logical backup and exact-hash, flag-off application of migration `0045` | Installs only the already-disposable-verified isolated persistence boundary; it does not authorize deployment, flag activation, fixtures, real orders, Etsy actions, publication, messages, uploads, or delivery | ETSY-03, QA-01–03 |
| 2026-08-25 | Approved Year Ahead as the next report, with a separate standalone Celestial Year Map | Creates a renewable birthday-to-birthday product that complements the natal and Star Origin reports; the map is independently valuable while the interpretation remains fact-fenced and human-reviewed | ETSY-05 |
| 2026-08-26 | Approved an isolated three-stage production rollout for natal-report fulfillment: deploy all gates off, enable founder admin plus persistence, then enable manual real intake last | Preserves the dirty worktree, proves fail-closed deployment first, and makes the first-order workflow usable without connecting Etsy, creating buyer data, or adding another paid cloud resource | ETSY-03, QA-01–03 |

| 2026-08-26 | Approved Celestial Connection as the next Etsy product pair: a full synastry/composite report and a separately sellable double-orbit wall print | Gives buyers a relationship-centered product without compatibility scoring or soulmate promises; the Top 3 structure leads with useful orientation while the report preserves depth and the map remains independently valuable | ETSY-06 |

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

### 2026-08-12 — Wave 2 opened / live schema revalidated

- Started: `CONSENT-02` under the root journal lock; the consent flag remains off.
- Read-only migration inspection found remote versions `20260812185700` and `20260812185721`; their stored SQL is byte-for-byte identical to local migrations `0038` and `0039`.
- No staging project or preview branch was found. The two migrations were already present on the linked production project when this session began; this session performed no database writes, migration repair, deployment, Stripe change, or Etsy change.
- Aggregate verification found 8 journal entries, 4 narrow legacy Stelloquy-recall backfills, 0 Insights consent grants, 0 pins, and 0 importance values. Consent defaults are private, the owner journal policy and consent-audit select policy are present, and funnel storage remains service-role-only.
- The original nine timestamped remote-only migration versions remain unresolved. Local implementation may continue behind disabled flags, but further schema application remains blocked pending authoritative history reconciliation and a safe staging target.
- Implemented `CONSENT-02` create/history permission controls and owner-scoped grant/revoke/pin/importance updates behind `KIAROS_JOURNAL_CONSENT_V2`; lapsed users are not denied the consent-revocation endpoint.
- Implemented the local `CONSENT-03` enforcement path: private creation schedules no pattern/model work, service-role entry loading rechecks Insights consent, Stelloquy recall uses its independent consent field, revocation invalidates derived patterns and machine-generated briefs before returning, and rebuilds use only approved entries.
- Authored but did not apply `0040_journal_consent_enforcement.sql` and the separately destructive `0041_journal_consent_cleanup.sql`. SQL parsing passed with only the parser-unsupported, PostgreSQL-valid `SET search_path` clause omitted in memory.
- Verification passed: consent contract/wiring/enforcement scripts, Wave 1 regression invariants, focused and full TypeScript, `git diff --check`, and production builds with the consent flag both off and on. Local browser loading/overlay checks passed at Clerk sign-in; authenticated interaction, staging apply, two-user RLS, audit/idempotency checks, and external-call isolation remain.
- Final linked listing shows local `0001`–`0041` unmatched against 11 timestamped remote versions (the original nine plus the two verified equivalents of `0038`/`0039`). The linked dry-run made no changes and stopped on that mismatch; its suggested repair/pull commands were deliberately not run.
- `PRODUCT_BIBLE.md` remains unchanged. No database write, migration repair, deployment, feature-flag activation, Stripe change, or Etsy change was performed by this session.

### 2026-08-12 — ACCESS-02 local enforcement completed to verification

- Read-only project inventory confirmed the linked `Kairos` Supabase project has no database branches and no separate Kairos staging project. The unrelated Digital Grimoire staging project was explicitly rejected as a target; the linked Vercel project exposed no environment-scoped variables establishing isolated preview infrastructure.
- Read-only migration-ledger inspection recovered authoritative names, stored statement counts, and hashes for all nine older timestamp versions. Full in-memory comparison found two with no local candidate, six divergent same-named candidates, and one exact candidate (`admin_console`); no files were imported and no history repair was run.
- Implemented `ACCESS-02` locally behind disabled `KIAROS_MONTHLY_BLUEPRINT_WINDOW`: a server-only entitlement loader now projects the canonical Blueprint before pages, RSC payloads, retention helpers, derived generators, or Stelloquy prompts can consume it.
- Windowed payloads retain only intersecting current/four-following weeks, intersecting month context, in-window moon phases, and clipped push/rest arcs; they exclude full-year and quarter narratives. Annual/read-only annual access receives the unchanged canonical artifact, while missing/malformed access fails closed.
- Replaced customer-facing raw Blueprint reads across Blueprint, Areas, Self, Journal metadata, Today intention, month briefs, quarterly reviews, and both Stelloquy routes. The authenticated debug route now returns status metadata only.
- Authored but did not apply `0043_secure_blueprint_access.sql`, which removes the broad authenticated Blueprint policy and revokes browser-role table privileges so raw rows remain service-role only.
- Verification passed: 87 capability assertions, 40 projection/RLS/leakage assertions, journal/Wave 1 regressions, focused/full TypeScript, `git diff --check`, and production builds with the monthly Blueprint flag explicitly off and on.
- `ACCESS-02` remains `verification` until isolated staging applies `0043` after reconciled predecessors and proves two-user RLS plus authenticated HTML/JSON/RSC/prompt leakage behavior. No production write, deployment, feature-flag activation, Stripe change, Etsy change, or `PRODUCT_BIBLE.md` edit occurred.

### 2026-08-12 — METRICS-02 local checkout attribution completed to verification

- Implemented versioned first-touch capture with anonymous/session identity and a narrow allowlist; the same source, campaign, and experiment variant survive sign-up and are copied into Checkout Session metadata without storing full URLs or private content.
- Added trusted `checkout_started` recording only after Stripe creates a session, explicit cancellation recording only after an authenticated owner match against the recorded start, and `checkout_completed` recording only inside the signature-verified Stripe webhook.
- Completion idempotency is keyed to the Checkout Session rather than the webhook event, so webhook replay, the async-success variant, and success-page fulfillment cannot double-count conversion. Cancellation is a separate explicit return event; closing or abandoning Checkout creates no cancellation event.
- Focused checkout attribution and existing funnel checks pass, along with all journal/access regressions, Wave 1 migration invariants, focused/full TypeScript, `git diff --check`, and production builds with `KIAROS_FUNNEL_EVENTS` explicitly false and true (99 pages).
- The dev server compiled and returned the public cancel URL with HTTP 200. Automated browser completion remained blocked by the known local Clerk handshake/key mismatch, so authenticated checkout UI, Stripe test-mode replay, and database reconciliation remain required before `done`.
- Released `LOCK-METRICS` and the narrow checkout/webhook slice of `LOCK-STRIPE`. `KIAROS_FUNNEL_EVENTS` remains off; no database write, migration repair, deployment, Stripe object/configuration change, Etsy change, or `PRODUCT_BIBLE.md` edit occurred.

### 2026-08-12 — SAFE-02 truthful persistent reading completed to verification

- Renamed the customer-facing offer to **Personalized Birth-Chart Week Reading** and stated its exact boundary: natal chart plus current sky for one dated week, without the Blueprint, Life Areas, Goals, journal, Stelloquy, or the Kairos planning workflow.
- Removed the artificial access countdown from the artifact and stopped generation from creating a seven-day `preview_access` record. Existing legacy rows remain untouched; the one-generation-per-profile `week_previews` guard remains the generation boundary.
- Added an idempotent `preview_viewed` adapter that reuses the versioned first-touch browser context consumed by checkout, preserving reading-first source/experiment attribution without storing private content or full URLs.
- Added `check-personalized-week-safety.mjs`; it passes alongside commerce safety, Stelloquy access, funnel-event and checkout-attribution regressions, full TypeScript, `git diff --check`, and the 99-page production build.
- Local browser verification found meaningful homepage content, the approved reading name and CTA, no retired “free week” copy, and no Next.js error overlay. Anonymous `/preview` correctly redirects to Clerk sign-in; the authenticated artifact remains unverified because the known local Clerk keys/handshake do not provide a test session.
- `SAFE-02` remains `verification` until the authenticated artifact is checked. No database write, migration, deployment, feature-flag change, Stripe change, Etsy change, or `PRODUCT_BIBLE.md` edit occurred.

### 2026-08-12 — ACCESS-04 multi-agent copy/spec/QA wave completed to verification

- Root completed the required chain/canonical-document preflight, preserved the intentionally dirty worktree, confirmed the five inherited verification rows, and verified all checked-in feature flags remain false with no local override.
- Dispatched three exact-scope specialists concurrently: Agent A held `LOCK-PUBLIC` plus the assigned lifecycle-copy paths for `ACCESS-04`; Agent B performed a read-only `ETSY-01` artifact specification audit; Agent C exclusively authored the independent access/offer copy check. No child delegation or out-of-scope edits occurred.
- Aligned public pricing/home, paid and limited-reading onboarding, purchase success, billing/settings, renewal, and retention-template copy with the enforced capability contract: monthly is the current Blueprint week plus the next four weeks; annual is the full canonical Blueprint; Stelloquy is Planner + Oracle only; customer-authored journal read/export survives cancellation while writing/paid generation requires active access; the limited reading remains persistent and is not app access; no new Etsy acquisition promise appears.
- Added `scripts/check-access-offer-copy.mjs`. Its pre-integration baseline reported 10 expected claim gaps; after Agent A integration it passes. The conditional Etsy artifact check was correctly omitted because no artifact/listing implementation surface yet supports a stable narrow invariant.
- The read-only Etsy audit specified a separate artifact-order/guest-profile/private-file workflow for the two approved artifact concepts and proved the existing Etsy import/admin path is legacy entitlement-producing infrastructure that must remain isolated. `ETSY-01` remains pending for founder decisions and current-policy review; no extra planning file was created.
- Focused verification passed: access-offer copy, personalized-week safety, commerce safety, Stelloquy access, funnel events, checkout attribution, 87 access-capability assertions, 40 Blueprint enforcement assertions, all journal-consent checks, and Wave 1 migration invariants.
- Full verification passed: `npx.cmd tsc --noEmit --pretty false`, whole-worktree `git diff --check`, and `npm.cmd run build` with 99 generated pages. Public browser checks passed for homepage, pricing, canceled checkout, and the anonymous `/preview` sign-in redirect with meaningful content, expected capability claims, no console errors, and no Next.js overlay.
- Authenticated settings/success/renewal evidence remains unavailable under the known Clerk local-session limitation. The audit also found that `lib/email/send-retention-emails.ts` selects marketing-consented onboarded users before capability filtering; templates are now capability-neutral, but recipient eligibility needs a separate scoped behavior change before lifecycle delivery is complete.
- Released every dispatch lock and returned all specialist slots to idle. `ACCESS-04` moved to `verification`; `ETSY-01` remains `pending`; all production/external actions and flags remain untouched; `PRODUCT_BIBLE.md` remains unchanged.

### 2026-08-12 — ACCESS-04 retention eligibility follow-up completed

- Reopened `ACCESS-04` narrowly under root ownership to close the retention-recipient gap found during the multi-agent copy audit.
- Added a pure `lib/email/retention-eligibility.ts` adapter over the canonical capability resolver. Active monthly and annual entitlements qualify through `canUsePlanner`; expired monthly, read-only annual, revoked, future, and missing entitlements fail closed.
- Updated `lib/email/send-retention-emails.ts` to batch-load the candidate profiles' entitlement fields once, return without delivery when either recipient or eligibility lookup fails, and skip ineligible profiles before Blueprint/transit work or `resend.emails.send`.
- Added `scripts/check-retention-email-eligibility.mts`. The expected initial run failed on the missing eligibility module; the completed contract passes 16 functional and structural assertions, including mixed entitlement history, per-user grouping, batch lookup, and check-before-content/send ordering.
- All 13 focused contracts pass, as do full TypeScript, scoped/whole-worktree diff checks, and the 99-page production build. The real cron was deliberately not invoked because it can send customer email; no email, deployment, migration, feature-flag, database, Stripe, Etsy, Vercel, or other external action occurred.
- Returned `ACCESS-04` to `verification`, marked the sender risk locally mitigated, released root locks, and left `PRODUCT_BIBLE.md` unchanged.

### 2026-08-17 — Etsy digital-product strategy confirmed

- Founder confirmed that the standalone Etsy artifact line is a desired separate income stream and a strategic discovery path toward the Kairos brand; it is not being removed from scope.
- Reviewed Etsy's current official Services, Creativity Standards, and Off-Platform Transactions policies. The roadmap now distinguishes permitted complete digital artifacts and brand-led discovery from prohibited app-membership sales, referral codes, QR-code redirection, or encouragement to move an Etsy-originated transaction elsewhere.
- The founder then approved the complete Anchor-first decision packet: `$34 USD`/`KAI-ETSY-ANCHOR-V1`, exact two-page and unknown-time behavior, Tropical/Whole Sign calculation contract, US Letter/A4 accessible-by-design files, self-purchase-only launch, print-first Obsidian Almanac direction, three-business-day SLA, correction/refund rules, exact disclosure categories, explicit retention/deletion periods, support addresses, substantive-policy launch gate, isolated manual intake/native Etsy delivery, and fulfillment-unit idempotency.
- Reserved the unpublished Compass at `$64 USD`/`KAI-ETSY-COMPASS-30D-V1` with the approved nine-page/30-day/start-date/SLA contract.
- Moved `ETSY-01` to `done` and `ETSY-02` from `blocked` to `pending`. No generator, migration, listing, customer message, deployment, database, Stripe, Etsy, Vercel, or other external state was changed.

### 2026-08-17 — ETSY-02 Anchor contract/generator completed to verification

- Added an isolated `lib/artifacts/anchor-print` package with a versioned data contract, exact known/unknown birth-time rules, Tropical/Whole Sign provenance, generated-narrative model/prompt/token provenance, approved service and retention policy snapshots, and draft-only fulfillment state. The output cannot create an account, entitlement, marketing subscription, or off-marketplace purchase path.
- Added a deterministic two-page HTML/SVG renderer for US Letter and A4. It uses selectable text, semantic reading order, an SVG title/description plus placement-table text equivalent, minimum 11-point body copy, tested 4.5:1 palette contrast, and patterned aspect lines so color is not the only carrier of meaning.
- Added fictional known-time and unknown-time fixtures with locked artifact and HTML hashes. The generator fails closed on invalid geometry, forbidden Moon/angle precision, duplicate placements/aspects, invented narrative fact references, unsafe filenames, and unknown-time proxy values.
- Verification passed: the artifact boundary check, 66 generator assertions, focused artifact TypeScript, full repository TypeScript, whole-worktree and package whitespace checks, and a successful production build marker. The generated HTML is intentionally not represented as an exported PDF or PDF/UA-conforming deliverable.
- Moved `ETSY-02` to `verification` and released the root/package locks. No migration, admin or public route, PDF exporter, listing, order intake, customer message, Etsy delivery, database, Stripe, Vercel, deployment, feature flag, legacy-entitlement write, or other external action occurred.

### 2026-08-18 — ETSY-02 PDF and visual verification completed

- Added a local-only Chrome/PDF.js verification harness and exported fictional known-time and unknown-time Anchor fixtures in both US Letter and A4. All four PDFs passed 206 checks covering exact filenames, two-page dimensions, file size, selectable and complete text, reading order, embedded fonts, vector chart output, generic metadata, absence of links and local paths, and tagged logical structure with document, heading, paragraph, table, and figure roles.
- Human visual inspection covered all eight rendered pages. The verification cycle found and fixed undersized meaningful copy, a three-page overflow, fragmented page-two headers, and excess buyer-visible metadata; the final Letter and A4 layouts are unclipped, readable, and consistent for both birth-time modes.
- Tightened concise narrative fields to a verified 200-character maximum and expanded generator coverage to 67 assertions. Artifact-boundary, commerce-safety, access-copy, focused and full TypeScript, whitespace, and production-build checks pass; the build generated 99 pages.
- Moved `ETSY-02` to `done` and unblocked `ETSY-03` to `pending` without starting it. The exports demonstrate local PDF/UA structural readiness only: independent conformance and assistive-technology validation remain pre-listing gates, and no public conformance claim is authorized.
- All generated fixtures remained fictional and local. No migration, admin or public route, listing, order intake, customer message, Etsy delivery, database, Stripe, Vercel, deployment, feature-flag, legacy-entitlement write, or other external action occurred.

### 2026-08-19 — ETSY-03 local workflow and persistence contract completed to verification

- Founder authorized scope A and B only: a local fixture/in-memory admin workflow and authoring migration `0045`. Applying SQL, using real customer data, connecting Etsy, changing listings, uploading files, messaging buyers, and recording real delivery remained unauthorized.
- Added a dedicated `/admin/artifacts` workflow behind both the disabled server flag and a development-only guard. The legacy `/admin/commerce` importer and activation path remain separate and unchanged.
- Added the canonical fulfillment-unit key, identical-replay idempotency, ambiguity stops, fictional-data enforcement, explicit intake/clarification/generation/QA/revision/export/cancel states, append-only in-memory audit evidence, mandatory six-item QA, and a hard stop at `ready_for_external_delivery`.
- Added local Chrome/Edge Letter and A4 export through task-owned temporary directories with PDF signature/size validation, SHA-256 evidence, privacy-safe filenames, and unconditional cleanup. Both variants passed direct wrapper verification; no export remained on disk.
- Authored but did not apply `0045_artifact_fulfillment.sql`: isolated product/role/order/personalization/profile/file/QA/support/event tables, birth-data-free ledger separation, private bucket, random object-key checks, forced RLS, browser-role revocation, append-only events, operational roles, and legal-hold-aware retention candidates.
- Verification passed: 55 workflow/schema assertions, artifact boundary, commerce safety, access copy, focused and full TypeScript, `git diff --check`, and the 100-page production build. Browser checks found meaningful public content, no console errors or Next.js overlay, and correct Clerk protection for `/admin/artifacts`; authenticated UI interaction remains blocked by the known local Clerk key/handshake mismatch.
- `ETSY-03` moved to `verification` and all locks were released. The feature remains source-default-off and unavailable in production; no database, storage, Etsy, Stripe, Vercel, email, listing, customer, deployment, or other external state changed.

### 2026-08-20 — ETSY-03 disposable persistence and private-storage verification completed

- Founder authorized a disposable local Supabase target, local image startup/download, and local application of `0045`; the configured Kairos Supabase ref was re-confirmed as the sole production project and explicitly excluded.
- Applied `0045` from scratch to a uniquely named system-temp project, then rebuilt it twice while correcting two Supabase-default privilege gaps found by live verification: broad service-role table defaults and explicit browser-role function execution defaults. The migration now revokes inherited/default access before granting its narrow server surface.
- Added a transactional SQL verifier covering all nine tables, forced RLS, zero browser policies, exact ACLs, private bucket restrictions, inactive product state, canonical-unit conflict rejection, complete-QA enforcement, append-only audit events, four retention record classes, and legal-hold suppression.
- Added a localhost-only API verifier. Two fictional authenticated users were denied artifact-table reads and private-file reads/writes through PostgREST and Storage; anonymous private-file access was denied, while the service role created and removed the temporary PDF fixture. All 20 API assertions passed.
- Regression verification passed 65 workflow/schema assertions, artifact boundaries, commerce safety, access copy, focused TypeScript, and whitespace checks. `ETSY-03` remains in `verification` because authenticated Clerk operator/reviewer interaction still requires explicitly authorized temporary test identities.
- All database rows, Auth users, storage fixtures, containers, and temporary project files were removed during teardown, and Docker Desktop was restored to its pre-task stopped state. No production/staging database, remote storage, Etsy, Stripe, Vercel, email, listing, customer, deployment, or feature-flag state changed.

### 2026-08-20 — ETSY-03 local Clerk handshake diagnosis completed

- Both configured Clerk credentials are test-mode, the installed Clerk v7 middleware/provider integration is aligned, and no repository-managed admin test identity exists.
- The earlier handshake failure was caused by testing on port 3703 while `NEXT_PUBLIC_APP_URL` named port 3699. Port 3699 is held by an unrelated older Node process and was left untouched; an isolated port-3703 server with a process-only matching origin loaded the homepage and Clerk sign-in form without a blank state or Next.js overlay.
- Clerk reported loaded with no signed-in user, and the browser/server were closed cleanly with port 3703 released. No credentials were submitted and no Clerk user, metadata, session, dashboard setting, environment file, or other external state changed.
- The next verification slice requires explicit approval to create two temporary fictional test-mode Clerk users, grant only the admin metadata needed for the local workflow, exercise separate operator/reviewer sessions, and delete both users afterward.

### 2026-08-20 — ETSY-03 authenticated admin workflow verification completed

- Founder approved exactly two temporary fictional Clerk test users with admin metadata. A separate operator created, validated, and generated a fixture; a separate reviewer completed all six QA items and approved it; the operator then exported US Letter and A4, reached the explicit external-delivery stop, and canceled a separate pre-generation order.
- The authenticated page rendered cleanly without a Next.js overlay or console errors; expected development-key and local analytics notices were non-error diagnostics. The delivery-ready state exposed no real-delivery control and made no Etsy, email, payment, database, storage, deployment, or production call.
- Both temporary users were signed out, permanently deleted, and queried afterward to verify absence. Their transient credentials were cleared; the browser, task server, downloaded PDF, screenshot, and accidental zero-byte browser-command artifacts were removed, and port 3703 was released. The unrelated process on port 3699 remained untouched.
- Added a local-only `record_refund` action after the original browser session: pre-generation refund evidence is financially distinct from cancellation, stops the order, records an append-only event/timestamp, rejects duplicates and post-generation refunds, and cannot contact Etsy or a payment provider. The focused suite passes 74 assertions.
- Founder then approved one disposable fictional Clerk admin for the remaining refund check. The authenticated browser showed `Canceled`, `Refunded`, two audit events, the no-Etsy/payment boundary message, and no repeat refund control; visual inspection passed with no overlay or console error.
- Two credential-handoff retries each created no more than one verifier at a time; each orphan-risk fixture was immediately matched by its task-only external-ID/name/admin signature and deleted before the next attempt. The successful verifier was signed out, permanently deleted, and queried to verify absence. Its credentials, screenshot, logs, browser, server, and in-memory queue were removed; port 3703 was released.
- `ETSY-03` remains in `verification`. The full build compiled successfully but its repository-wide type phase is currently blocked by unrelated existing `NatalChart` label-map drift in unchanged `lib/areas.ts`; focused artifact TypeScript and all Etsy boundary/safety/copy checks pass.

### 2026-08-21 — ETSY-03 moved from verification loops to launch preparation

- Founder directed the project to stop adding diminishing-return local tests. `ETSY-03` remains `verification` only because persisted staging and real marketplace delivery are release evidence; its local engineering scope is recorded as implementation-complete and launch-gated.
- Replaced the contact-only `/privacy` and `/terms` pages with substantive local drafts covering Kiaros accounts, birth and planner data, journal/Oracle content, AI processing, service providers, payments, subscriptions, standalone artifacts, retention, user rights, reflective-use boundaries, and marketplace fulfillment.
- Added `docs/etsy-anchor-print-listing-package.md` for the standalone `$34` Anchor Print: chosen concise title, ready-to-paste description, required personalization prompt, 13 tags, eight-image plan, FAQ, buyer/delivery messages, privacy/retention language, corrections/refunds, AI disclosure, personal-use license, and an operational launch checklist.
- Rechecked current official Etsy Creativity Standards, Services, Seller, Off-Platform Transactions, title, and keyword guidance on 2026-08-21. The package is a complete seller-designed digital artifact delivered on Etsy; it excludes app access, activation, subscriptions, off-platform payment, gifting, guaranteed outcomes, and invented reviews.
- The prior activation-based `docs/etsy-listing-prep.md` remains preserved as superseded history and now links to the standalone package. Nothing was published, uploaded, messaged, deployed, or changed in Etsy, Supabase, Stripe, Vercel, Clerk, email, or production.

### 2026-08-21 — ETSY-03 persisted adapter authored locally

- Founder approved continuing with the isolated persisted adapter, private file storage, and retention/deletion job as local code only. No migration application, Supabase connection or mutation, deployment, Etsy action, listing publication, message, upload, or delivery was authorized or performed.
- Replaced route-level dependence on the in-memory singleton with one async repository boundary. Memory remains the default; Supabase is selected only when the existing development-only admin gate and the new default-off `KIAROS_ETSY_ARTIFACT_PERSISTENCE` switch are both enabled.
- Added a server-only Supabase repository that rehydrates the canonical Anchor input, uses the existing pure state machine, applies optimistic concurrency, stores immutable revision evidence, uploads PDFs only to the private random-key bucket, and still stops at `ready_for_external_delivery` with no Etsy client or delivery action.
- Revised unapplied migration `0045` with narrative persistence and service-role-only transactional RPCs for fixture intake, workflow/QA/file/audit commits, retryable file-deletion claims, and legal-hold-aware retention completion. Added a callable local retention job; no cron or externally reachable trigger was installed.
- The focused ETSY-03 suite passes 86 assertions and the changed code has no TypeScript diagnostics. The repository-wide compiler still reports only the previously recorded unrelated `lib/areas.ts` `NatalChart` drift. At this point `0045` still required fresh isolated verification; the following updates record its completed disposable apply and production dry-run reconciliation.

### 2026-08-21 — ETSY-03 persisted adapter verified in disposable staging

- Founder approved the isolated-staging gate. Read-only project discovery confirmed the linked `fslowrhswawatdfludqp` project is the sole Kairos remote and is production; the other available projects belong to unrelated products and were rejected as targets.
- Started a uniquely named disposable local Supabase stack, copied revised `0045` with a matching SHA-256, applied it from scratch, and passed the transactional schema/ACL/RLS/idempotency/QA/retention/legal-hold verifier.
- Added and ran a localhost-only persisted-adapter verifier. It exercised real fixture RPC intake, state transitions, canonical artifact rehydration, six-item QA, Letter/A4 private Storage uploads, checksums, the delivery stop, retention claims, physical object deletion, deleted-file evidence, and due/completed audit events; all 20 assertions passed.
- The first adapter run correctly failed on a real persistence defect: JSONB key normalization and equivalent PostgreSQL timestamp formatting changed the byte representation used by the intake fingerprint. Intake hashing now canonicalizes recursively sorted JSON and normalized timestamps; the disposable database was rebuilt and the unchanged verifier then passed.
- Anonymous and two fictional authenticated browser users remained unable to read artifact tables or read/write private files; all 20 isolation assertions passed. The service role retained only the intended server path.
- Stopped and removed every disposable database/Auth/Storage/container resource, deleted the uniquely verified temp directory, and restored Docker Desktop to its original stopped state. A final read-only linked-ledger query confirmed production remains unchanged and still has the known divergent timestamp migration history; local `0045` is absent remotely.

### 2026-08-21 — ETSY-03 production migration path reconciled read-only

- Founder rejected an additional paid/cloud staging project as unnecessary. Disposable local Supabase remains the accepted staging-equivalent evidence; unrelated Supabase projects remain excluded.
- Confirmed through ordinary reads that production has no `artifact_products`/`artifact_profiles` table, no artifact retention RPC, and no `etsy-artifacts-private` bucket. The earlier `HEAD` probe was non-authoritative because PostgREST returned no parseable error body; no production artifact schema exists.
- The repository's ordinary `supabase db push --linked --dry-run` safely refused because eleven authoritative timestamp migrations are absent from the local numeric history. It applied nothing and confirmed that direct use of the dirty migration directory is not an approved deployment method.
- In a uniquely named disposable directory, linked read-only to the confirmed Kairos production ref, fetched all eleven authoritative migration files from the remote ledger. Copied the already-verified `0045` bytes as `20260821211738_artifact_fulfillment.sql`; SHA-256 remained `BAA0DB19FF4E2A00E597001053BB9075B45042142232C1A57CC1F981875C2B29`.
- Supabase's production `db push --dry-run` then selected exactly that one artifact migration and nothing else. No SQL, history repair, schema, bucket, row, flag, secret, deployment, or external service state changed. The disposable directory, including fetched production SQL, was permanently deleted.
- The future production apply must rebuild this authoritative-history directory, confirm the exact hash and one-file dry run again, take a temporary encrypted logical backup, apply with both Etsy flags off, verify empty isolated objects/ACLs, and delete the temporary backup after the agreed retention window. That write remains separately approval-gated.

### 2026-08-23 — ETSY-03 exact-hash production persistence applied flag-off

- Founder explicitly approved the temporary encrypted production backup and flag-off `0045` apply. The dirty worktree was preserved, the linked Vercel production project contained neither Etsy flag, and source defaults remained off.
- Created an EFS-encrypted temporary logical backup containing roles, user schema, and user data; all three dump files were nonempty, encrypted, and SHA-256 verified before any SQL apply.
- Rebuilt a uniquely named authoritative-history directory, fetched and exactly matched all eleven pre-apply production ledger entries, copied the verified migration as `20260821211738_artifact_fulfillment.sql`, confirmed SHA-256 `BAA0DB19FF4E2A00E597001053BB9075B45042142232C1A57CC1F981875C2B29`, and required a dry run that listed only that file.
- Applied exactly that migration to production. The post-apply ledger matched through `20260821211738`; no history repair, unrelated migration, deployment, flag change, fixture, Auth user, order, uploaded artifact, Etsy action, message, listing, or delivery occurred.
- Read-only verification confirmed the seeded Anchor product exists with `active = false`; all eight operational tables and the retention-candidate RPC are empty; `etsy-artifacts-private` is private, PDF-only, limited to 10 MB, and contains no fixture; anonymous PostgREST table access returns a permission error and anonymous Storage listing exposes zero objects. Existing disposable verification remains the authenticated browser-role/RLS evidence because creating production test identities was not authorized.
- After successful verification, all encrypted backup bytes were overwritten, both uniquely validated temporary directories were permanently removed, no matching task temp artifacts remained, and Docker Desktop was restored to its original stopped state.

### 2026-08-23 — Anchor Print legal/accessibility approval packet prepared

- Rechecked the listing package against current official Etsy Creativity, Services, and Seller policies. The finished seller-designed PDF, AI disclosure, human QA, no-outcome promise, no software membership, no off-platform transaction, and buyer-data boundaries remain aligned.
- Added `docs/etsy-anchor-print-launch-approval-packet.md` with the exact founder identity/jurisdiction inputs, legal-review brief, independent PDF/assistive-technology protocol, measured contrast evidence, conservative public wording, sign-off record, and the next separately approval-gated deployment statement.
- Softened the listing's pre-review accessibility wording to `Designed with accessibility features`; PDF/UA or WCAG conformance remains unclaimed until independent review. No application code, production state, deployment, flag, Etsy account, listing, message, buyer, or delivery state changed.

### 2026-08-24 — Founder legal identity and jurisdiction supplied

- Founder identified Jeanine Melendez as the Kiaros seller/data controller operating in North Carolina, United States, and confirmed that the published privacy, legal, and support email addresses are monitored.
- Updated the local Privacy Policy and Terms with the operator identity, North Carolina jurisdiction, and a draft governing-law/venue clause that remains subject to legal review. Founder then confirmed she operates as an individual with no separate business entity; no public mailing address was inferred or exposed.
- The founder is open to a US-only start if it is materially easier but does not require that product restriction. Current Etsy guidance confirms marketplace handling for many digital-item taxes but does not remove buyer-country consumer/privacy obligations; this review found no official native country restriction for the made-to-order workflow. Supported launch markets therefore remain a legal/operational sign-off item, not a public listing promise.
- No deployment, flag activation, production mutation, Etsy account/listing action, message, buyer data, upload, publication, or delivery occurred.

### 2026-08-24 — Independent accessibility review bundle prepared

- Generated a frozen fictional-data review bundle at `docs/review/etsy-anchor-print-accessibility-2026-08-24/` containing known/unknown-time Letter/A4 PDFs, page images, source HTML, SHA-256 evidence, and the structural report. The four PDFs passed the existing 206 assertions.
- Added a reviewer worksheet that requires a named PDF reader, screen reader, operating system, accessibility checker, manual tag/reading-order/table/figure review, small-label redundancy review, findings, and a signed limited-public-wording decision.
- This packages the actual outside-review material without claiming independence or conformance internally. No production data, deployment, flag, Etsy action, listing, message, upload, publication, or delivery was involved.

### 2026-08-24 — Full natal report redesign approved and implemented locally

- Founder rejected the original two-page artifact as materially too shallow for an astrology report and explicitly approved rebuilding it as a substantive personalized natal report.
- Replaced the v1 content contract with `kairos.natal-report.v2`, initially as a 20-page report and then expanded it to a 26-page natal report and Kairos Planner product tour plus a separate one-page Anchor Print, delivered in both US Letter and A4 as four personalized PDFs. The final report contains a chart reference, pattern synthesis, fourteen developed interpretation chapters, three practical anchors per chapter, eight reflection prompts, a full-page Planner advertisement, and six real-interface/fictional-data product-tour pages.
- Added depth validation to require two substantial paragraphs, a focused summary, three practical anchors, and source-fact traceability for every chapter. Known-time reports may interpret angles and houses; unknown-time reports suppress angles, houses, and unstable Moon claims instead of manufacturing precision.
- Updated the local fulfillment contract, export API, admin console, repositories, and focused checks for the four-file package. Added additive migration source `0046_natal_report_package.sql`; it remains unapplied locally and remotely, and no production flag was enabled.
- Generated the frozen fictional-data v2 review bundle, then replaced page 20 with a founder-directed full-page Kairos Planner advertisement and added six real browser screenshots on pages 21–26: Today, week timing, quarter context, goals/life areas, journal, and optional Planner + Oracle. The images use the public fictional Alex demo rather than personal or production account data. The ad contains a visible, clickable `https://kairosplanner.xyz` link. The final candidate bundle is `docs/review/etsy-natal-report-accessibility-2026-08-24-planner-tour/`; preceding bundles are preserved as superseded history. The content contract passed 61 focused assertions, and eight Letter/A4 report and keepsake PDFs passed 1,132 PDF assertions, including six embedded screenshots, exactly one report link on page 20, no tour/Anchor Print links, and report sizes near 1 MB—well below the 10 MB limit. Representative cover, chapter, reflection, Planner-ad, all six product-tour pages, and keepsake pages were visually inspected. Because the current Etsy off-platform policy may treat the external promotional link as prohibited redirection, retaining it is recorded as a founder-directed launch-risk decision requiring final policy approval rather than as cleared compliance.
- The earlier `docs/review/etsy-anchor-print-accessibility-2026-08-24/` two-page bundle is preserved as superseded history and must not be used for launch review. The listing package and launch approval packet now describe the v2 product accurately.
- Remaining launch gates are independent accessibility review, founder/legal operational sign-off, final v2 listing-image approval, and a separately authorized deployment/migration/flag sequence. Nothing was deployed, applied to production, uploaded, published, messaged, sold, or delivered during this redesign.

### 2026-08-25 — Year Ahead Forecast and Celestial Year Map implemented locally

- Founder approved Year Ahead as the next report and the standalone Celestial Year Map as its companion product. Added SKUs `KAI-ETSY-YEAR-AHEAD-REPORT-V1` and `KAI-ETSY-CELESTIAL-YEAR-MAP-V1` to a new local-only admin workflow at `/admin/artifacts/year-ahead`.
- Implemented deterministic tropical/Whole Sign calculations for the exact solar-return moment, solar-return angles and placements cast for the entered birthday location, age-based annual profection and Lord of the Year, a birthday-to-birthday transit scan, and exactly three distinct ranked activation windows. Every interpretation source is exposed as a versioned fact id.
- Added a fact-fenced Claude Sonnet 4.6 narrative contract: two opening paragraphs, a developed annual theme, three developed activation chapters, four developed life-area chapters, four quarter compasses, practical anchors, and eight reflection prompts. Sending calculated facts to the model requires explicit operator confirmation, and report export remains blocked until all seven human-QA items are approved.
- Added a celestial 17-page Letter/A4 report and a standalone orbit-style Year Map in 8x10, 11x14, 16x20, A4, and A3. The map repeats rank, dates, labels, and a written legend so color is never the only carrier of meaning.
- Focused TypeScript passes. The local runtime suite verifies calculation precision, a 12th-house profection for the founder fixture's 2026 birthday year, three unique traceable windows, idempotent intake, SKU-specific export boundaries, blocked unconsented AI use, and export completeness. Chromium produced both reports and all five map sizes; all seven PDFs passed page-count, exact-dimension, tagged-structure, selectable-text, and size checks, then temporary files were removed.
- `ETSY-05` remains in `verification`: the new queue is intentionally in-memory and local/flag-gated. Authenticated admin/browser review, a real consented AI generation review, durable repository/schema/retention support, independent accessibility review, pricing/listing/legal approval, deployment, flag activation, real buyer intake, Etsy publication, messaging, upload, and delivery were not performed or authorized.

### 2026-08-26 — Natal-report package and persisted manual intake applied flag-off

- Founder approved reviewing and applying additive migration `0046` to the already-linked Kairos production Supabase project. The dirty worktree was preserved and no ordinary push from its divergent numeric migration directory was used.
- Rebuilt production's authoritative timestamped history in a unique temporary directory, copied exact local SHA-256 `D1988E4A7DC88DDEDD2DFC3E7F842C09CE2567E4D3825E82D86D0D2408589DD0` as `20260826124803_natal_report_package.sql`, and required a dry run that selected only that file.
- Created and verified nonempty EFS-encrypted logical dumps of roles, schema, and data before applying exactly `20260826124803`. The post-apply ledger matches; the schema contains the new package constraints and manual-order RPC, and the RPC is revoked from PUBLIC/browser roles and granted to `service_role`.
- Encrypted post-apply inspection confirmed the product metadata is `kairos.natal-report.v2` / `natal-report.obsidian-almanac.v2`, the product remains inactive, and all eight operational artifact tables remain empty. All three Vercel production flags—admin, persistence, and real intake—remain absent/off.
- Removed both backup attempts and the authoritative-history directory after verification, then restored Docker Desktop to its original stopped state. No deployment, feature activation, Etsy connection, buyer data, test order, AI generation, file upload, message, listing, publication, or delivery occurred.

### 2026-08-26 — Founder-only natal-report fulfillment activated in production

- Founder approved the controlled production rollout. To preserve the dirty worktree, deployment source was built from exact live commit `663c4a8` in an isolated temporary snapshot with only the approved natal-report fulfillment, admin, feature-flag, dependency, and report-tour asset overlays.
- Added an environment-aware PDF exporter: local development retains installed-Chrome export, while Vercel uses bundled `@sparticuz/chromium` plus `puppeteer-core` inside the existing Node function. Next output tracing includes the four compressed Chromium payloads and the six fictional-data Kairos Planner tour screenshots; no browser SaaS or new paid cloud resource was introduced.
- Production rollout was deliberately staged: all flags off at `dpl_HdgSBeCj5QNqcnnNhmuCCxvgR2Pf`; founder admin plus service-role persistence at `dpl_Gc767XU2JixT2RYUXvXWhLpau6T2`; and manual real intake last at final READY deployment `dpl_H7jMQ5eNVk2nxAtgPdmybDB5SR1J`. Both `kairosplanner.xyz` aliases point to the final deployment.
- The final production environment contains `KIAROS_ETSY_ARTIFACT_ADMIN`, `KIAROS_ETSY_ARTIFACT_PERSISTENCE`, and `KIAROS_ETSY_ARTIFACT_REAL_INTAKE`. Main Anchor routes use the production gate; Star Origin, Year Ahead, and all fictional fixture controls remain development-only. Production fixture intake fails closed.
- Verification passed focused artifact TypeScript, 116 admin assertions, 15 real-intake assertions, the 99-page Linux production build on Next.js `15.5.24`, READY inspection, and signed-out denial for both `/admin/artifacts` and `/api/admin/artifacts` through Clerk redirects. The main dependency audit still has pre-existing unrelated advisories that require a separate dependency-maintenance pass; no forced audit rewrite was performed.
- No Etsy API/account connection, buyer data, test order, Auth user, AI generation, PDF upload, message, listing publication, refund, payment mutation, or delivery was created during activation. The first authorized real order can now be entered manually by the founder at `/admin/artifacts`; fulfillment still stops before any Etsy-native delivery action.

### 2026-08-26 — Production artifact route restored after Git auto-deploy overwrite

- Runtime logs confirmed that `/admin/artifacts` returned `404` after GitHub `main` commit `aaa75be096e4edbc062eeb19022d65b35a57e5eb` automatically deployed as `dpl_Ar63e3meYhoTJ1tw7S2DZwQpZEpq`, superseding the earlier artifact deployment. The failure was deployment-source drift, not a Clerk role or feature-flag failure.
- Restored production from that exact newer `main` commit plus only the approved artifact/admin overlays, preserving the journal-entry editing and Stelloquy continuation work introduced by the newer commit. Deployment `dpl_9mTZ65bjcEmHqLWoXwfq3XgMPJME` is `READY` and owns `kairosplanner.xyz`, `www.kairosplanner.xyz`, and the project aliases.
- The restored Linux build contains `/admin/artifacts`, `/api/admin/artifacts`, order actions, and PDF export routes. A live signed-out request to `https://www.kairosplanner.xyz/admin/artifacts` now returns the expected Clerk `307` sign-in redirect instead of `404`.
- The artifact overlay is still absent from GitHub `main`; a later automatic Git deployment can replace it again until a separate, explicitly approved clean commit or pull request makes the source durable. No Git push, Etsy connection, buyer data, test order, or delivery action was performed during restoration.

### 2026-08-26 — Celestial Connection report and wall-print workflow implemented locally

- Founder approved Celestial Connection as the next product pair: a personalized synastry/composite relationship report and a standalone double-orbit wall print. Added SKUs `KAI-ETSY-CELESTIAL-CONNECTION-REPORT-V1` and `KAI-ETSY-CELESTIAL-CONNECTION-MAP-V1` to a local-only admin workflow at `/admin/artifacts/celestial-connection`.
- Implemented deterministic tropical/Whole Sign calculations for two natal charts, major synastry aspects with controlled orbs, exactly three ranked and traceable signatures, supporting aspects, short-arc composite midpoints, calculation facts, and a SHA-256 chart fingerprint. Romantic, friendship, family, and creative/business contexts are explicit. If either birth time is unknown, angles and both house-overlay directions are omitted; that person's noon-reference Moon is excluded from ranked aspects and the composite.
- Added a fact-fenced Claude Sonnet 4.6 narrative contract with two opening paragraphs, a relationship essence, three developed Top 3 chapters, five relationship domains, a composite-core chapter, practices, and eight reflection prompts. External AI use requires explicit operator consent; buyer order identity and support email are excluded from the prompt; report export remains blocked for eight-item human QA.
- Added a 15-page high-contrast celestial report in US Letter and A4 plus a standalone self-explanatory map in 8x10, 11x14, 16x20, A4, and A3. The map combines terracotta/lavender orbits with numbered and patterned lines, written planet/aspect/orb legends, and a composite-center motif so color is not the only cue.
- Focused TypeScript passes. Chromium produced both reports and all five maps; all seven PDFs passed exact page-count/dimension, tagged-structure, selectable-text, and sub-10 MB checks. Runtime checks also pass Top 3 uniqueness, unknown-time omissions, provenance, idempotent intake, consent gating, complete QA, SKU-specific exports, and delivery completeness.
- Added `docs/etsy-celestial-connection-listing-package.md` with separate report/map listings, personalization, descriptions, search tags, image plan, FAQ, disclosures, and initial $68/$34 price hypotheses. An $89 bundle is deferred until five successful fulfillments and does not add a third delivery workflow.
- `ETSY-06` remains in `verification`. The queue is intentionally in-memory and local-only. Authenticated visual review, one separately consented fictional-data AI generation review, durable repository/schema/retention support, independent accessibility review, legal/pricing approval, deployment, production flags, real buyer intake, Etsy publication, messaging, upload, and delivery were not performed or authorized.

### 2026-09-17 — Merged `star-origin-engine`; applied `0043`

- Reconciled six weeks of drift: `reflections-default-on` (this repo's HEAD) and `star-origin-engine` (pushed, unmerged, 16 commits: Star Origin, Year Unwrapped, `CONSENT-02/03`, `ACCESS-02` code, `ETSY-02/03`, relevance memory) had diverged and conflicted in the journal/Today surfaces. Merged into `main` after resolving 8 conflicts; `tsc`, production build, `check:schema`, and HD transit checks all pass on the merged tree.
- Read-only verification before merging found `0038`/`0039`/`0045`/`0047` tables already present in production, contradicting this file's prior "neither migration was applied anywhere" note — the migration-history ledger mismatch is a naming/ledger problem (local `00NN_*.sql` vs remote timestamped versions), not evidence the schema itself is missing. Still unreconciled; still blocks `supabase db push` (would attempt to replay all 45 local files against a ledger that shows none of them applied).
- Applied `0043` directly to production via `supabase db query --linked -f supabase/migrations/0043_secure_blueprint_access.sql`, bypassing the broken `db push` path for this one narrow, idempotent, two-statement migration (`DROP POLICY IF EXISTS`, `REVOKE ALL PRIVILEGES`). Before applying, confirmed all 12 code paths touching `blueprints` already use `createAdminSupabase()` (service-role, unaffected by the revoke) and that `isMonthlyBlueprintWindowEnabled()` defaults off, so the change is pure plumbing hardening with no user-visible effect today. Verified after: anon-shaped key gets `42501 permission denied` on `blueprints`; service-role key unaffected; `check:schema` still reports all 53 tables/44 columns present.
- `ACCESS-02`'s remaining gap is unchanged by this: staging RLS/persona-leakage evidence across the persona matrix (SAFE-02 checklist) has not been produced, and the actual monthly-window projection is still flag-gated off. Turning `KIAROS_MONTHLY_BLUEPRINT_WINDOW` on is a separate decision, not part of this session.
- No other production migrations, Stripe changes, or Etsy changes were performed.

### 2026-09-17 — Migration-history ledger reconciled

- Diagnosed the mismatch precisely with `SELECT version, name FROM supabase_migrations.schema_migrations`: 17 remote entries, all Supabase-generated timestamp versions rather than this repo's `00NN` numbering. Three early entries (`kiaros_initial_schema`, `add_location_coordinates`, `product_bible_schema`) correspond to a consolidated squash of roughly `0001`–`0030`; the other 14 map 1:1 by name to `0031` onward (`first_party_funnel_events`→`0038`, `journal_consent`→`0039`, `artifact_fulfillment`→`0045`, `natal_report_package`→`0046`, `reflections`→`0047`, etc.). This resolves both open risk-register rows on the mismatch and the unattributed-`0038`/`0039` question below.
- Ran `supabase migration repair --status applied` for all 44 local versions (`0001`–`0041`, `0043`, `0045`–`0047`; `0042`/`0044` never existed as files), then `--status reverted` for the 17 now-redundant remote-only timestamped rows, both via `--linked`. Ledger metadata only — no SQL executed, no schema touched.
- Verified: `supabase migration list` shows all 44 local versions matched (Local/Remote/Time aligned); `supabase db push --dry-run --linked` reports "Remote database is up to date"; `check:schema` unchanged at 53 tables/44 columns from 45 migration files, both before and after.
- `supabase db push` is now safe to use for future migrations without risk of replaying already-applied files. No staging project is still identified for `0040`/`0041`'s destructive cleanup/two-user RLS testing — that risk remains open and is now `Next three actions` item 3.

### 2026-09-17 — Local Docker staging stood up; `ACCESS-02` cleared to `done`

- Cloud Supabase branching requires a paid plan the org does not currently have (`402 entitlement_required`). Used local Docker Supabase instead: `supabase init` (no `config.toml` existed before) then `supabase start`, applying all 44 local migrations fresh. `check:schema` on the local stack matches production exactly: 53 tables, 44 columns. Anon/authenticated get `42501` on `blueprints` locally too, matching `0043`'s effect in production.
- Credentials for the local stack live in `.env.staging.local` (gitignored via the existing `.env.*.local` pattern), never `.env.local`.
- Wrote `scripts/check-access-02-staging.mts`, a reusable staging check (refuses to run against any non-`127.0.0.1`/`localhost` URL). It seeds 8 of the 10 SAFE-02 personas — sampler-credit personas are skipped because `SAMPLE-01`/`SAMPLE-02` have no schema yet; `admin` is skipped because it's a Clerk `publicMetadata` flag, not a DB row, and is already covered by the 87 local capability assertions — then verifies two things against real rows through real code, not mocks: (1) `blueprints` stays `42501`-denied for every persona's minted session, and `journal_entries`/`product_entitlements` RLS never leaks one persona's rows to another's session; (2) `loadCurrentBlueprint()`, called exactly as app code calls it, returns `null` for personas with no access, a `windowed` capability with a redacted `yearTheme` and fewer than 52 weeks for monthly personas, and `full` with all 52 weeks for annual/read-only-annual/legacy-Etsy personas. 37 assertions, 0 failures. Cleans up its own seeded rows before and after every run.
- Updated the `ACCESS-02` tracker row to `done` and `ACCESS-03` to `pending` (its blocker is cleared). Turning `KIAROS_MONTHLY_BLUEPRINT_WINDOW` on in production is a separate decision this session did not make.
- Resolved the "no staging project identified" risk-register row: local Docker Supabase is now the designated staging target for this and future work, including `0040`/`0041`.
