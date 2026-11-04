-- Reflections are prepared automatically by default, for everyone.
-- Members can still turn it off in Reflections preferences.
ALTER TABLE public.reflection_preferences ALTER COLUMN automatic SET DEFAULT true;

-- Every member gets a preferences row so the scheduler can find them.
INSERT INTO public.reflection_preferences(user_id)
  SELECT id FROM public.user_profiles ON CONFLICT DO NOTHING;

UPDATE public.reflection_preferences SET automatic = true WHERE NOT automatic;

-- Members who never confirmed a timezone get their planner or birth timezone, when it is a real zone name.
UPDATE public.reflection_preferences p
  SET timezone = COALESCE(u.planner_tz, u.birth_tz)
  FROM public.user_profiles u
  WHERE p.user_id = u.id AND p.timezone IS NULL
    AND EXISTS (SELECT 1 FROM pg_timezone_names z WHERE z.name = COALESCE(u.planner_tz, u.birth_tz));
