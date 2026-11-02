# `period_reviews` table

**Applied to production:** November 2, 2026, ~10:10 AM ET (ledger entries `0051`, `0052` recorded on the Kairos database).

- **Migration file:** [`supabase/migrations/0052_period_reviews.sql`](../../supabase/migrations/0052_period_reviews.sql)
- **Runtime:** REVIEW-01 reads/writes `period_reviews` when the table is present; falls back to `quarterly_reviews.stats_snapshot.periodReviewCache` if the relation is missing.

**Undo (DDL only):**

```sql
BEGIN;
DROP TRIGGER IF EXISTS period_reviews_set_updated_at ON public.period_reviews;
DROP FUNCTION IF EXISTS public.set_period_reviews_updated_at();
DROP POLICY IF EXISTS "own_period_reviews" ON public.period_reviews;
DROP TABLE IF EXISTS public.period_reviews;
COMMIT;
```
