# `period_reviews` table

Jack approved adding this table; **do not apply the migration until explicitly approved for production.**

- **Migration (not applied):** [`supabase/migrations/0052_period_reviews.sql`](../supabase/migrations/0052_period_reviews.sql)
- **Runtime:** REVIEW-01 reads/writes `period_reviews` when the table exists; otherwise it quietly falls back to `quarterly_reviews.stats_snapshot.periodReviewCache` (vault path).
- **No backfill** in the migration; optional data move is a separate job.

**Undo (DDL only):**

```sql
BEGIN;
DROP TRIGGER IF EXISTS period_reviews_set_updated_at ON public.period_reviews;
DROP FUNCTION IF EXISTS public.set_period_reviews_updated_at();
DROP POLICY IF EXISTS "own_period_reviews" ON public.period_reviews;
DROP TABLE IF EXISTS public.period_reviews;
COMMIT;
```
