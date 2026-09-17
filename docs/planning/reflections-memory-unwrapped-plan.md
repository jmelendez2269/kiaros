---
type: implementation-plan
subject: reflections-memory-unwrapped
status: implemented-locally
created: 2026-09-14
updated: 2026-09-14
---

# Memory, Reflections, and Yearly Unwrapped

Create monthly and quarterly reflections that help people understand their lived experience and choose a gentle direction for the next period. Connect those reflections to Yearly Unwrapped through shared evidence, period calculations, and user feedback.

User direction: include goals lightly, without letting them take over the reflection. This document records the implemented feature and its original plan. Local implementation and verification are complete; applying migration 0047 and deployment remain outstanding.

## Product decisions

- Lived experience leads: meaningful moments, emotions the user explicitly recorded, relationships, rest, recurring themes, changes, and discoveries.
- Goals are optional supporting context. Include at most one short goal thread about one or two directly relevant goals. Target no more than 15% of the narrative; enforce a separate optional goal field with a 60-word ceiling. Review the combined rendered report for balance.
- Do not organize the report by goals, lead with completion counts, assign a productivity score, or interpret inactivity as failure. Rest and changed priorities can be meaningful without serving a goal.
- No goals, no relevant goal evidence, or a user choosing to hide goals must produce a complete reflection without an empty goal section.
- Looking ahead means evidence-based invitations and small experiments. Do not predict future emotions, outcomes, or goal success.
- Use calendar months and quarters initially. Keep existing monthly planning briefs and authored quarterly review answers; they serve different purposes from an automatic period-end reflection.
- Generate after a period closes in the user's saved timezone. The report looks back on the completed period and ahead to the following one.
- Start with private in-app reports. Email delivery and annual sharing are separate opt-in experiences.

## Verified local implementation, 2026-09-14

This is a code inspection, not verification of the deployed application or migration ledger. The workspace contains substantial existing uncommitted work; preserve it.

| Existing surface | Evidence | Implication |
| --- | --- | --- |
| Monthly planning brief | `lib/ai/month-brief-generator.ts`, `lib/ai/month-brief-system-prompt.ts`, `components/year/MonthBriefPanel.tsx` | Generated on viewing a month, grounded in its Blueprint. Add a distinct completed-month reflection; do not overwrite edited or pinned briefs. |
| Quarterly review and AI synthesis | `lib/ai/quarterly-review-generator.ts`, `lib/ai/quarterly-review-system-prompt.ts`, `lib/reviews/save-review.ts`, `components/year/QuarterReviewPanel.tsx` | Reuse authored wins, challenges, pivots, intentions, and the review surface. Automated reflection must not require completing the form. |
| Quarterly goal counts | `lib/ai/quarterly-review-generator.ts` | Counts already exist, but completed goals use `updated_at` and completed tasks use `item_date`. These do not establish the actual time of completion. |
| Pattern evidence | `lib/journal/intelligence.ts`, `lib/ai/journal-insight-synthesis.ts`, migration `0040_journal_consent_enforcement.sql` | Existing types group entries by aspects, lunar phase/sign, and retrogrades. Add lived-experience themes alongside them. |
| Pattern certainty | Migration `0040_journal_consent_enforcement.sql` computes confidence as `min(1, sample_size / 5)` | This measures volume, not statistical confidence. Five entries must not imply certainty. |
| Pattern selection for reports | Month and quarter generators select user patterns without period filtering | Historical patterns cannot automatically be described as occurring this month or quarter. Rebuild period evidence from original records. |
| Pattern evidence storage | Migration `0040` retains the three most recent evidence references per pattern | That short list is insufficient to establish coverage across an entire quarter or year. |
| Direct journal recall | `app/api/oracle/chat/route.ts` loads the latest five eligible entries | Implement question-relevant recall under the existing MEM-01 through MEM-04 roadmap items. |
| Consent and invalidation | `lib/journal/consent.ts`, `lib/journal/derived-rebuild.ts`, `lib/feature-flags.ts` | Consent V2 is flag-controlled. New reflections must require explicit Insights eligibility and extend invalidation to all report versions and downstream annual content. |
| Yearly Unwrapped | `PRODUCT_BIBLE.md`, `docs/architecture-v2.md` Phase 7; no implementation found under app/components/lib | Build the annual experience on the shared reflection foundation. Do not describe it as an existing integration. |

The existing [access, memory, and commerce roadmap](./access-memory-commerce-roadmap.md) remains authoritative for CONSENT-* and MEM-* work. Do not duplicate or mark those tasks complete here.

## Report experience

| Part | Monthly Reflection | Quarterly Reflection |
| --- | --- | --- |
| Opening | What this month held, in a short personal narrative | The larger story across the quarter |
| Meaningful moments | Up to three moments backed by original records | Milestones and turning points across months |
| Patterns and changes | Up to three supported observations | What persisted, shifted, or was contradicted |
| Goal thread, optional | A short connection to something the person cares about | A short connection to a continuing or changed priority |
| Looking ahead | One focus and up to two small experiments | One direction and up to three gentle adjustments |
| User response | Confirm/correct an insight; accept/edit/dismiss a suggestion | Reflect on earlier intentions and choose what to carry forward |

Monthly narrative target: 300-450 words, including the goal thread and invitations. Quarterly target: 450-650 words. These are ceilings for rich evidence, not minimums to fill when information is sparse.

Each factual insight exposes a plain-language “Why am I seeing this?” view with original source dates and links. Show “Based on 8 recorded days” rather than implying complete knowledge of a month.

Illustrative goal-light passage, using fictional evidence:

> You wrote about feeling more settled after a few evenings with room to yourself. That space also gave you a little time for the writing project you care about. Next month, you might protect one quiet evening and notice what it gives you.

The project is one supporting sentence. The reflection remains about the person's experience.

## Memory and evidence foundation

1. Represent source records, extracted observations, and generated interpretations separately. An AI summary is not a new independent observation.
2. Record source type/ID, owner, occurred date, recorded timestamp, source revision, consent purpose, and extraction version. Preserve the difference between late entry and late event.
3. Store inferred themes with supporting source IDs and optional user-confirmed labels. Keep contradictions and corrections; do not silently replace a person's history.
4. Use deterministic filters before retrieval: owner, consent, requested period, deletion state, and source freshness. Rank relevant eligible records using text relevance, context, importance, and recency within a hard context budget.
5. Keep direct Stelloquy recall and Insights/report eligibility separate. Pinning is a retrieval preference, not permission to use a memory everywhere.
6. Summarize bounded source batches with references, then combine evidence across the whole period. Do not use only the newest entries or send all raw history into one prompt.
7. Deduplicate by source ID and revision, and identify repeated mentions of the same event before counting recurrence. Cross-month summaries must not multiply the underlying evidence.
8. Treat text in journals, captures, goals, and prior reports as user data, never as instructions to the generator. Validate every returned source reference against the authorized evidence bundle.

## Pattern improvements

- Add recurring themes, explicit emotional changes, routines, and user-described turning points. Avoid diagnoses and inferred sensitive traits.
- Separate “something you recorded” from “a recurring observation” and “a possible connection.” A single important event can be included without being called a pattern.
- Initial recurrence gate: at least three distinct recorded days across at least two weeks, after event deduplication. Treat this as a conservative product heuristic to evaluate, not a statistical guarantee.
- Show evidence count, temporal spread, contradictory observations, and data coverage instead of a percentage confidence label.
- Compare rates only with defined denominators and comparable coverage. Fewer journal entries alone says nothing about wellbeing, effort, or goal progress.
- Use within-period evidence for period claims. Older evidence may provide explicitly dated context but cannot prove current recurrence.
- Keep astronomical context optional and clearly interpretive. A transit occurring alongside an event does not establish causation.
- Do not manufacture seasonal patterns from one year or associate every experience with a chart placement.
- When evidence conflicts, describe the mixed picture or omit the claim. Dismissed interpretations must not reappear unchanged next month.

## Goals without domination

Retrieve at most two relevant goals, prioritizing explicit links to period records or user-authored reflection. Do not infer goal relevance from a broad theme alone.

Store goal status changes prospectively as dated events, including completion, pausing, reopening, and changed intention. Existing `updated_at` values must not be backfilled as invented completion dates. Until historical events exist, describe current status with its limitation or omit retrospective progress claims.

Goal context is optional in the structured report contract. The main narrative must not repeat the goal paragraph or list other goals. Validate the goal field's size and count in code; evaluate narrative dominance with fixtures and human review. Prompt instructions alone cannot guarantee balance.

Accepting a suggested experiment stores an intention for later reflection; it does not silently change a goal or create planner tasks. Offer a separate explicit action if the user wants to add it to their planner.

## Shared architecture and proposed contracts

Proposed modules under `lib/reflections/`: `periods.ts`, `load-evidence.ts`, `analyze-period.ts`, `goal-context.ts`, `report-schema.ts`, `repository.ts`, `invalidate.ts`, and `schedule.ts`. Prompts and model calls belong in separate `lib/ai/reflection-system-prompt.ts` and `lib/ai/reflection-generator.ts` modules, following existing conventions.

Proposed structured report:

```text
period: kind, local start, exclusive local end, timezone, evidence cutoff
coverage: observed days, eligible source counts, missing/unavailable sources
opening: narrative with source references
moments[]: text, source references
observations[]: claim, kind, supporting/contradicting references, coverage
goalThread?: text, goal IDs, source references
lookingAhead: focus, experiments[] with rationale and source references
provenance: source revision, analysis/prompt/model version, generated timestamp
```

Use a common analyzer for month, quarter, and year. A quarter can reuse monthly analysis artifacts only if their source revisions and consent remain valid; annual generation follows the same rule. Always resolve original evidence rather than simply combining generated prose.

Proposed additive storage, names subject to schema inspection:

- `reflection_reports`: owner, period key, timezone, status, active version, coverage, source revision, generation metadata. Unique owner/kind/local-start/local-end key.
- `reflection_report_versions`: immutable generation outputs and provenance; superseded or invalidated versions are not publicly readable.
- `reflection_report_sources`: report-version/source relationships for ownership checks, source navigation, and invalidation.
- `reflection_feedback`: user corrections, dismissed claims, and goal visibility preference.
- `reflection_intentions`: accepted/edited suggestions with optional later outcome and optional explicit goal link.
- Goal status event storage and a monotonic evidence revision per user to invalidate in-flight generations safely.

All report, feedback, intention, and source reads must enforce owner isolation. Browser requests derive user identity from auth, not a supplied user ID. System jobs require authenticated server credentials and explicit owner filters. Generate types from the approved schema; do not hand-edit generated database types.

Proposed API: authenticated list/detail routes, explicit generate/retry action, feedback action, and intention action under `/api/reflections`. Put the shared report UI in `components/reflections/` and expose monthly/quarterly history from `/year`; use the existing quarterly panel for authored reflection alongside its report.

## Period closure, jobs, and failures

- Store an IANA timezone preference and freeze it on each period report. If none is known, ask for a timezone before automatic scheduling rather than silently relying on the server timezone.
- Compare instants using half-open ranges `[start, nextPeriodStart)` converted from local calendar boundaries. For date-only journal/log fields, filter the equivalent local dates directly.
- A recurring scheduler enqueues newly closed periods in bounded batches. Claim work atomically with an expiring lease, retry with limits, and store generation status so duplicate job invocations cannot create duplicate reports.
- Recheck eligibility and evidence revision before generation, before saving, and when serving. Discard or invalidate an output if consent changed while its model call was running.
- Late entries and corrections mark a report stale and permit a new version. Preserve user-authored answers and feedback separately; never overwrite them with regenerated prose.
- Query errors mean data unavailable, not zero activity. Retry or return a clearly partial report; suppress comparisons whose source queries failed.
- No eligible evidence yields a useful empty state and optional self-reflection prompts, without fabricated narrative or an unnecessary model call.
- Monthly and quarterly reports closing together share analysis and one in-app notification. Annual closure should also avoid three competing alerts.
- Require entitlement checks, generation limits, token budgets, usage accounting, and a bounded catch-up policy. Initial automatic catch-up covers the latest closed month and quarter; older periods generate on explicit request.

## Correction, exclusion, and deletion

Extend `lib/journal/derived-rebuild.ts` to invalidate affected reports, source excerpts, caches, derived observations, and downstream annual artifacts. Use source lineage for targeted rebuilding; use broad invalidation when lineage is unavailable.

Historical report versions must not provide a way to recover excluded/deleted journal text. Remove or redact affected stored generated content according to the source deletion policy, preserving only non-content audit metadata. User-authored review answers remain separate, consistent with existing behavior.

User feedback that an interpretation is wrong is different from deleting a source. Keep the source eligible if consent remains, but suppress the dismissed claim and carry the correction into later analysis.

## Yearly Unwrapped connection

Preserve the planned eight-part annual experience with a proposed sequence: opening story, meaningful moments, rhythms and rest, recurring themes, turning points, connections and discoveries, optional goal thread, and the year-end letter/what to carry forward. If the goal section is omitted, use an evidence-supported personal lesson or simply shorten the experience.

Monthly and quarterly reports become navigable chapters in the year. Reuse original evidence, accepted intentions, and user corrections. Share cards contain only deliberately selected content and never include private excerpts by default. Charts need meaningful denominators and partial-year labels; chart library installation is not a dependency for the evidence engine or monthly release.

## Delivery sequence and acceptance

REF-01 through REF-07 are implemented and verified locally. They are not yet activated in the configured database; existing consent/memory deployment gates remain separate.

| ID | Deliverable | Depends on | Acceptance |
| --- | --- | --- | --- |
| REF-01 | Evidence contract, source lineage, period boundaries, failure handling | Verified consent foundation from CONSENT-* | Owner/consent filtering, timezone boundaries, no future evidence, unavailable != zero, and revision invalidation pass. |
| REF-02 | Pattern quality and period analyzer | REF-01 | Deduplication, mixed evidence, recurrence thresholds, coverage, and date-scoped claims pass fixtures. No count-derived confidence percentages. |
| REF-03 | Monthly report generation, persistence, history UI | REF-02 | Report works without goals or Blueprint; linked evidence is reviewable; empty/partial/error states work; goal thread is optional and bounded. |
| REF-04 | Period-end scheduling and report lifecycle | REF-03 | Duplicate jobs, retries, timezone closure, late entries, and mid-generation revocation are tested; one notification per closure event. |
| REF-05 | Corrections, accepted intentions, and outcome follow-up | REF-03 | User can correct/dismiss/accept/edit; previous suggestions remain hypotheses until outcomes are recorded. |
| REF-06 | Automatic quarterly reflection and authored review integration | REF-04, REF-05 | Three-month synthesis validates original evidence and preserves authored wins/challenges/pivots. No form completion required for automatic report. |
| REF-07 | Yearly Unwrapped | REF-06 | Annual chapters/letter use valid sources, reflect corrections, label partial years, and pass intentional-sharing checks. |

Proceed with existing MEM-01 through MEM-04 alongside the shared evidence foundation when dependencies permit; do not require a vector database to ship the first reflection.

Required meaningful verification: two-user RLS isolation; excluded and deleted sources; sparse and absent records; many goals and no goals; unrelated completed goals; a corrected pattern; quarter/year rollover; leap February; daylight-saving boundaries; future entries; late/backdated records; goal edits after completion; duplicate jobs; interrupted generation; query failure; and source revocation during generation. Browser acceptance covers a completed monthly report plus one empty or partial period, source navigation, keyboard/mobile use, and feedback persistence.

Track factual support, correction rate, perceived personal relevance, goal dominance, and whether users find next-period suggestions useful. Avoid optimizing reflection quality around task completion or engagement streaks.

## Implementation and verification — 2026-09-14

Implemented:
- Shared month/quarter/year periods, timezone boundaries, consented evidence loading, source provenance, coverage, deduplication, thematic candidates, and structured reports in lib/reflections/.
- Full-period batch synthesis and a separate optional goal passage in lib/ai/reflection-generator.ts. Goal context cannot steer the main generation; the optional passage is limited to two linked goals, 60 words, and 15% of rendered prose.
- Monthly and quarterly reports at /reflections; Yearly Unwrapped at /year/unwrapped, including a letter, monthly coverage, chapter navigation, and a downloadable PNG card containing only text the user deliberately chooses.
- Authenticated generation, settings, feedback, intention and outcome actions at /api/reflections.
- Atomic leases, rate limits, retries, versions, goal status events, consent/source invalidation, and source search in migration 0047_reflections.sql.
- Hourly generation at /api/cron/reflections; users opt in and confirm their timezone. Subsequent regeneration does not re-announce the same period.
- Question-relevant journal retrieval in lib/journal/memory-retrieval.ts, wired into Stelloquy behind the existing KIAROS_RELEVANCE_MEMORY flag, with source links and a bounded context.
- Removed misleading percentage confidence from pattern cards and the month, quarter, and Stelloquy prompts.
- Fixed a narrow pre-existing lib/areas.ts type error by restricting its planet map to planet keys, allowing full compilation.

Verification:
- npm run test:reflections: period boundaries, DST, leap February, coverage, deduplication, recurrence, source checks, goal bounds, share-card escaping, and execution of the actual migration in isolated PostgreSQL.
- Database tests cover two-user isolation, inaccessible historic content, revoked/deleted sources, unaffected-period preservation, stale-generation rejection, lease recovery, limits, goal history, and memory relevance.
- npm run test:reflections:integration: actual UI, API routes, services, Supabase client and migration against isolated PostgreSQL. Fictional identity and deterministic model responses replace live authentication and paid generation in this suite.
- Integration tests cover monthly/quarterly/annual reports, evidence, excluded records, corrections, intention/outcome persistence, empty periods, future/wrong-report rejection, mobile overflow, a valid 1080-pixel PNG download, cron authorization, idempotency, source outage, and notification deduplication.
- npm run test:reflections:ai and node scripts/check-reflections-ai.mjs --annual: real Anthropic generation with fictional records and database writes disabled. Monthly goal inclusion and annual batch generation with goals disabled passed schema/provenance checks and were reviewed.
- Full TypeScript check and production build passed. The built app redirects unauthenticated reflection requests to sign-in.
- Read-only database probes confirmed required source fields. Reflection tables are absent; no live migration or deployment was performed.

Operational limits:
- Loading is paginated and fails visibly on source errors or oversized periods. Initial generation supports up to 1,200 eligible records per report; source text is excerpted to 1,200 characters per record. Larger archives need a resumable batch pipeline.
- Theme candidates use a small keyword vocabulary. They guide evidence-based synthesis; they are not statistical or diagnostic assessments.
- Recurrence requires three recorded days spanning seven days. Semantic independence also depends on synthesis and user correction. Identical source text is counted once.
- Corrected/dismissed observation keys are conservatively suppressed in subsequent reports.
- Invalidation redacts generated content. User-authored answers and accepted intentions remain separate.
- PGlite and esbuild are development dependencies. Browser tests use local Chrome (override CHROME_PATH). Generated assets stay under ignored node_modules/.cache/reflections-tests/.
- Optional paid AI smoke tests use the existing Anthropic key and fictional records only.
- Hourly cron requires a hosting plan supporting hourly jobs. Missing or incorrect CRON_SECRET is rejected.
- Production authenticated end-to-end verification remains part of activation; fixture tests do not claim a live-user flow.

## Activation steps

1. Review and apply supabase/migrations/0047_reflections.sql. It creates the store, functions, triggers, RLS boundaries and search index without rewriting journal content or inventing historical goal completion dates.
2. Verify the existing consent rollout and enable KIAROS_RELEVANCE_MEMORY after its RPC is installed. Insights participation uses include_in_insights; direct recall uses include_in_stelloquy.
3. Deploy with the hourly cron, verify an authenticated real-user flow, then let users confirm timezone and automatic generation in Reflection preferences.

CLAUDE.md requires separate confirmation: “Don't run the schema migration without confirming with the user first.” No migration or deployment has been performed by this implementation session.
