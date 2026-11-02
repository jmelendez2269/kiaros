# Proposal: `period_reviews` table

**Status:** Draft for founder review — **not applied**, **not in `supabase/migrations/`**.  
**SQL:** [`period-reviews-table.sql`](./period-reviews-table.sql)

## Why a dedicated table

REVIEW-01 stores on-demand **month and quarter look-back** summaries (structured sections, source chips, generation metadata). Form-based **quarterly reviews** live in `quarterly_reviews` (wins, challenges, pivots, AI synthesis tied to user-authored QR content).

Borrowing `quarterly_reviews` rows for cache-only storage caused real problems:

- Only four `(user_id, plan_year, quarter)` slots exist per year, with `quarter` constrained to 1–4.
- Period-review cache was stored under `stats_snapshot.periodReviewCache`, which could collide with authored QR rows and with QoQ `stats_snapshot` / Oracle context.
- Mitigation on PR #71 (`b344422`) uses **vault quarter slots** and strips cache from authored rows — workable but fragile when all four quarters have authored content (`migration_required`).

A first-class **`period_reviews`** table gives:

- One row per `(user, plan_year, month|quarter, index)` without competing with QR.
- Explicit **`quotes_journal`** for consent-driven deletion without scanning JSON.
- Clear separation for RLS, backups, and future analytics.

## Schema summary

| Column | Purpose |
|--------|---------|
| `period_kind` | `'month'` or `'quarter'` |
| `period_index` | 1–12 (month) or 1–4 (quarter) |
| `payload` | JSONB cache (sections, chips, summary, timestamps, model) |
| `quotes_journal` | Whether the saved review includes journal-derived content |

Unique: `(user_id, plan_year, period_kind, period_index)`.

RLS matches `quarterly_reviews`: users may access only rows where `user_id` resolves from `app_current_clerk_user_id()`.

## Data impact if this is applied later

- **Applying this DDL alone:** no change to existing `quarterly_reviews` rows or any other table. Empty new table.
- **No automatic backfill** is defined in the proposal SQL. A separate migration job would copy `stats_snapshot.periodReviewCache` entries into `period_reviews` and then remove cache keys from `quarterly_reviews` — out of scope for this doc.
- Until application code switches, **runtime behavior stays on the vault/cache-in-`quarterly_reviews` path** (`b344422`).

## Rollback

If the table is created from the proposal SQL and must be removed:

1. Run the **ROLLBACK** block at the bottom of [`period-reviews-table.sql`](./period-reviews-table.sql) (drops policy, trigger, function, table).
2. Restore application storage to the quarterly_reviews vault strategy, or restore from backup if a data migration had already moved cache rows.

Rollback of DDL does not restore dropped cache data unless a backup or backfill reversal exists.

## Next steps (not in this commit)

1. Founder sign-off on this shape.
2. Numbered migration in `supabase/migrations/` (separate PR) — still **do not run** until approved.
3. Application change to read/write `period_reviews` instead of `stats_snapshot.periodReviewCache`.
4. Optional one-time backfill from existing cache-only QR rows.
