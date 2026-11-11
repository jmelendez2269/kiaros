BEGIN;
-- Yearly Unwrapped can be prepared while its year is still under way ("so far").
-- Only a year that has already begun is let through; every other period must still have ended.
-- The row keeps the whole year's dates, so the same report is written again once the year closes.
CREATE OR REPLACE FUNCTION public.claim_reflection(
  p_user_id uuid,p_kind text,p_start date,p_end date,p_timezone text,p_force boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE pref reflection_preferences; r reflection_reports; token uuid; today date;
BEGIN
  INSERT INTO reflection_preferences(user_id) VALUES(p_user_id) ON CONFLICT DO NOTHING;
  SELECT * INTO pref FROM reflection_preferences WHERE user_id=p_user_id FOR UPDATE;
  IF pref.timezone IS NULL OR pref.timezone<>p_timezone THEN RAISE EXCEPTION 'timezone_required'; END IF;
  today:=(now() AT TIME ZONE p_timezone)::date;
  IF p_end > today AND NOT (p_kind='year' AND p_start <= today) THEN RAISE EXCEPTION 'period_not_closed'; END IF;
  INSERT INTO reflection_reports(user_id,kind,period_start,period_end,timezone)
    VALUES(p_user_id,p_kind,p_start,p_end,p_timezone) ON CONFLICT DO NOTHING;
  SELECT * INTO r FROM reflection_reports WHERE user_id=p_user_id AND kind=p_kind AND period_start=p_start AND period_end=p_end FOR UPDATE;
  IF r.status IN ('ready','empty') AND r.revision=pref.evidence_revision AND NOT p_force THEN RETURN jsonb_build_object('cached',true,'id',r.id); END IF;
  IF r.status='generating' AND r.lease_until>now() THEN RAISE EXCEPTION 'generation_in_progress'; END IF;
  IF r.next_attempt_at>now() THEN RAISE EXCEPTION 'retry_later'; END IF;
  IF (SELECT count(*) FROM reflection_generation_attempts WHERE user_id=p_user_id AND created_at>now()-interval '24 hours')>=12 THEN RAISE EXCEPTION 'generation_limit'; END IF;
  INSERT INTO reflection_generation_attempts(user_id) VALUES(p_user_id);
  token:=gen_random_uuid();
  UPDATE reflection_reports SET status='generating',timezone=p_timezone,lease_token=token,lease_until=now()+interval '5 minutes',
    revision=pref.evidence_revision,attempts=attempts+1,content=NULL,analysis=NULL,sources='[]' WHERE id=r.id;
  RETURN jsonb_build_object('cached',false,'id',r.id,'token',token,'revision',pref.evidence_revision);
END $$;
REVOKE ALL ON FUNCTION public.claim_reflection(uuid,text,date,date,text,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_reflection(uuid,text,date,date,text,boolean) TO service_role;
COMMIT;
