-- Weekly reflections: allow a 'week' period (Monday to Sunday, ISO weeks) alongside month, quarter and year.
-- Only widens the allowed values; existing rows are untouched.
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.reflection_reports'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%kind%' AND pg_get_constraintdef(oid) LIKE '%quarter%'
  LOOP
    EXECUTE format('ALTER TABLE public.reflection_reports DROP CONSTRAINT %I', c);
  END LOOP;
END $$;
ALTER TABLE public.reflection_reports
  ADD CONSTRAINT reflection_reports_kind_check CHECK (kind IN ('week','month','quarter','year'));
