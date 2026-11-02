# `period_reviews` table (held)

Jack approved the **shape** of this table; applying it is **held indefinitely**. PR #71 ships on the **`quarterly_reviews` vault fallback** only.

- **Proposal SQL (not in migrations):** [`period-reviews-table.sql`](./period-reviews-table.sql)
- **Runtime:** probes `period_reviews`; on missing table (42P01 / PGRST205), reads and writes `stats_snapshot.periodReviewCache` via the legacy vault path.
- **Do not** add this file to `supabase/migrations/` until an explicit apply is approved.

**Undo (DDL only, if ever applied manually):**

```sql
BEGIN;
DROP TRIGGER IF EXISTS period_reviews_set_updated_at ON public.period_reviews;
DROP FUNCTION IF EXISTS public.set_period_reviews_updated_at();
DROP POLICY IF EXISTS "own_period_reviews" ON public.period_reviews;
DROP TABLE IF EXISTS public.period_reviews;
COMMIT;
```
