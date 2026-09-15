BEGIN;
-- Reflections, source revisions, goal history, atomic generation leases and journal recall.
-- Authoring only: apply after review. Existing source tables/consent migration are prerequisites.
CREATE TABLE public.reflection_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  timezone text, automatic boolean NOT NULL DEFAULT false, include_goals boolean NOT NULL DEFAULT true,
  evidence_revision bigint NOT NULL DEFAULT 0, seen_at timestamptz,
  checked_at timestamptz NOT NULL DEFAULT '1970-01-01'
);
CREATE TABLE public.reflection_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('month','quarter','year')),
  period_start date NOT NULL, period_end date NOT NULL CHECK(period_end > period_start),
  timezone text NOT NULL, status text NOT NULL DEFAULT 'stale' CHECK(status IN ('generating','ready','empty','stale','failed')),
  revision bigint NOT NULL DEFAULT 0, version integer NOT NULL DEFAULT 0,
  content jsonb, analysis jsonb, sources jsonb NOT NULL DEFAULT '[]',
  generated_at timestamptz, first_generated_at timestamptz, lease_token uuid, lease_until timestamptz,
  next_attempt_at timestamptz, attempts integer NOT NULL DEFAULT 0,
  UNIQUE(user_id,kind,period_start,period_end), UNIQUE(id,user_id)
);
CREATE TABLE public.reflection_report_versions (
  report_id uuid NOT NULL REFERENCES public.reflection_reports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  version integer NOT NULL, revision bigint NOT NULL, content jsonb, timezone text NOT NULL,
  analysis_version integer NOT NULL DEFAULT 1, prompt_version integer NOT NULL DEFAULT 1,
  generated_at timestamptz NOT NULL DEFAULT now(), model text,
  PRIMARY KEY(report_id,version),
  FOREIGN KEY(report_id,user_id) REFERENCES public.reflection_reports(id,user_id) ON DELETE CASCADE
);
CREATE TABLE public.reflection_feedback (
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  report_id uuid NOT NULL, claim_key text NOT NULL CHECK(length(claim_key) BETWEEN 1 AND 80),
  verdict text NOT NULL CHECK(verdict IN ('confirmed','corrected','dismissed')),
  note text NOT NULL DEFAULT '' CHECK(length(note)<=1000), updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,report_id,claim_key),
  FOREIGN KEY(report_id,user_id) REFERENCES public.reflection_reports(id,user_id) ON DELETE CASCADE
);
CREATE TABLE public.reflection_intentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  report_id uuid NOT NULL, suggestion_index integer NOT NULL CHECK(suggestion_index BETWEEN 0 AND 2),
  text text NOT NULL CHECK(length(text) BETWEEN 1 AND 1000), outcome text CHECK(length(outcome)<=1000),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,report_id,suggestion_index),
  FOREIGN KEY(report_id,user_id) REFERENCES public.reflection_reports(id,user_id) ON DELETE CASCADE
);
CREATE TABLE public.reflection_goal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  goal_id uuid NOT NULL REFERENCES public.area_goals(id) ON DELETE CASCADE,
  title text NOT NULL, old_status text, new_status text NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.reflection_generation_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reflection_reports_owner_date ON public.reflection_reports(user_id,period_start DESC);
CREATE INDEX reflection_goal_events_owner_date ON public.reflection_goal_events(user_id,occurred_at);
CREATE INDEX reflection_attempts_owner_date ON public.reflection_generation_attempts(user_id,created_at);
CREATE INDEX reflection_preferences_schedule ON public.reflection_preferences(checked_at,user_id) WHERE automatic AND timezone IS NOT NULL;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['reflection_preferences','reflection_reports','reflection_report_versions','reflection_feedback','reflection_intentions','reflection_goal_events','reflection_generation_attempts'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated',t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['reflection_preferences','reflection_feedback','reflection_intentions','reflection_goal_events'] LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
    EXECUTE format('CREATE POLICY own_read ON public.%I FOR SELECT TO authenticated USING (user_id IN (SELECT id FROM public.user_profiles WHERE clerk_user_id = public.app_current_clerk_user_id()))',t);
  END LOOP;
END $$;
GRANT USAGE,SELECT ON SEQUENCE public.reflection_generation_attempts_id_seq TO service_role;
-- Report content is served only by authenticated application routes, after revision checks.
-- Versions are not exposed to browser roles, including superseded or revoked versions.

CREATE OR REPLACE FUNCTION public.invalidate_reflections(p_user_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM user_profiles WHERE id=p_user_id) THEN RETURN; END IF;
  INSERT INTO reflection_preferences(user_id) VALUES(p_user_id) ON CONFLICT DO NOTHING;
  UPDATE reflection_preferences SET evidence_revision=evidence_revision+1 WHERE user_id=p_user_id;
  UPDATE reflection_reports SET status='stale',content=NULL,analysis=NULL,sources='[]',
    lease_token=NULL,lease_until=NULL,next_attempt_at=NULL,attempts=0 WHERE user_id=p_user_id;
  UPDATE reflection_report_versions SET content=NULL WHERE user_id=p_user_id;
END $$;
REVOKE ALL ON FUNCTION public.invalidate_reflections(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invalidate_reflections(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.reflection_source_changed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    PERFORM invalidate_reflections(OLD.user_id); RETURN OLD;
  END IF;
  PERFORM invalidate_reflections(NEW.user_id);
  IF TG_OP='UPDATE' AND OLD.user_id IS DISTINCT FROM NEW.user_id THEN PERFORM invalidate_reflections(OLD.user_id); END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.reflection_source_changed() FROM PUBLIC;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['journal_entries','daily_logs','oracle_captures','curriculum_sessions','plan_items','area_goals','reflection_intentions'] LOOP
    EXECUTE format('CREATE TRIGGER reflection_source_changed AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.reflection_source_changed()',t);
  END LOOP;
END $$;
CREATE TRIGGER reflection_review_changed AFTER INSERT OR DELETE OR UPDATE OF wins,challenges,pivots,next_quarter_intentions,completed_at
  ON public.quarterly_reviews FOR EACH ROW EXECUTE FUNCTION public.reflection_source_changed();
CREATE TRIGGER reflection_feedback_changed AFTER INSERT OR UPDATE OR DELETE
  ON public.reflection_feedback FOR EACH ROW EXECUTE FUNCTION public.reflection_source_changed();

CREATE OR REPLACE FUNCTION public.reflection_goal_changed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    INSERT INTO reflection_goal_events(user_id,goal_id,title,new_status) VALUES(NEW.user_id,NEW.id,NEW.title,NEW.status);
  ELSIF OLD.status IS DISTINCT FROM NEW.status OR OLD.title IS DISTINCT FROM NEW.title THEN
    INSERT INTO reflection_goal_events(user_id,goal_id,title,old_status,new_status) VALUES(NEW.user_id,NEW.id,NEW.title,OLD.status,NEW.status);
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.reflection_goal_changed() FROM PUBLIC;
CREATE TRIGGER reflection_goal_changed AFTER INSERT OR UPDATE ON public.area_goals FOR EACH ROW EXECUTE FUNCTION public.reflection_goal_changed();
-- No historical completion dates are invented by backfill.

CREATE OR REPLACE FUNCTION public.claim_reflection(
  p_user_id uuid,p_kind text,p_start date,p_end date,p_timezone text,p_force boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE pref reflection_preferences; r reflection_reports; token uuid;
BEGIN
  INSERT INTO reflection_preferences(user_id) VALUES(p_user_id) ON CONFLICT DO NOTHING;
  SELECT * INTO pref FROM reflection_preferences WHERE user_id=p_user_id FOR UPDATE;
  IF pref.timezone IS NULL OR pref.timezone<>p_timezone THEN RAISE EXCEPTION 'timezone_required'; END IF;
  IF p_end > (now() AT TIME ZONE p_timezone)::date THEN RAISE EXCEPTION 'period_not_closed'; END IF;
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
REVOKE ALL ON FUNCTION public.claim_reflection(uuid,text,date,date,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_reflection(uuid,text,date,date,text,boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.finish_reflection(
  p_user_id uuid,p_report_id uuid,p_token uuid,p_revision bigint,p_content jsonb,p_analysis jsonb,p_sources jsonb,p_model text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE rev bigint; version_no integer;
BEGIN
  SELECT evidence_revision INTO rev FROM reflection_preferences WHERE user_id=p_user_id FOR UPDATE;
  IF rev IS DISTINCT FROM p_revision THEN RETURN false; END IF;
  UPDATE reflection_reports SET status=CASE WHEN p_content IS NULL THEN 'empty' ELSE 'ready' END,
    content=p_content,analysis=p_analysis,sources=p_sources,version=version+1,generated_at=now(),first_generated_at=coalesce(first_generated_at,now()),
    lease_token=NULL,lease_until=NULL,next_attempt_at=NULL
    WHERE id=p_report_id AND user_id=p_user_id AND lease_token=p_token AND lease_until>now() AND revision=p_revision
    RETURNING version INTO version_no;
  IF version_no IS NULL THEN RETURN false; END IF;
  INSERT INTO reflection_report_versions(report_id,user_id,version,revision,content,model,timezone)
    VALUES(p_report_id,p_user_id,version_no,p_revision,p_content,p_model,(SELECT timezone FROM reflection_reports WHERE id=p_report_id));
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.finish_reflection(uuid,uuid,uuid,bigint,jsonb,jsonb,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finish_reflection(uuid,uuid,uuid,bigint,jsonb,jsonb,jsonb,text) TO service_role;

-- Question-relevant direct recall, restricted to explicit Stelloquy permission.
CREATE INDEX IF NOT EXISTS journal_recall_search ON public.journal_entries USING gin(to_tsvector('english',coalesce(title,'')||' '||body)) WHERE include_in_stelloquy=true;
CREATE OR REPLACE FUNCTION public.recall_journal_memories(p_user_id uuid,p_query text)
RETURNS TABLE(id uuid,entry_date date,title text,body text,score real)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT j.id,j.entry_date,j.title,left(j.body,900),
    (ts_rank_cd(to_tsvector('english',coalesce(j.title,'')||' '||j.body),websearch_to_tsquery('english',left(p_query,1000)))
      + CASE WHEN j.memory_pinned THEN 0.05 ELSE 0 END + coalesce(j.memory_importance,0)*0.005)::real
  FROM journal_entries j
  WHERE j.user_id=p_user_id AND j.include_in_stelloquy=true AND j.entry_date<=(now() AT TIME ZONE coalesce((SELECT timezone FROM reflection_preferences WHERE user_id=p_user_id),'UTC'))::date
    AND to_tsvector('english',coalesce(j.title,'')||' '||j.body) @@ websearch_to_tsquery('english',left(p_query,1000))
  ORDER BY 5 DESC,j.entry_date DESC,j.id LIMIT 8;
$$;
REVOKE ALL ON FUNCTION public.recall_journal_memories(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recall_journal_memories(uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.save_reflection_preferences(p_user_id uuid,p_timezone text,p_automatic boolean,p_include_goals boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE pref reflection_preferences;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=p_timezone) THEN RAISE EXCEPTION 'invalid_timezone'; END IF;
  INSERT INTO reflection_preferences(user_id) VALUES(p_user_id) ON CONFLICT DO NOTHING;
  SELECT * INTO pref FROM reflection_preferences WHERE user_id=p_user_id FOR UPDATE;
  IF pref.timezone IS DISTINCT FROM p_timezone OR pref.include_goals IS DISTINCT FROM p_include_goals THEN
    PERFORM invalidate_reflections(p_user_id);
  END IF;
  UPDATE reflection_preferences SET timezone=p_timezone,automatic=p_automatic,include_goals=p_include_goals WHERE user_id=p_user_id;
END $$;
REVOKE ALL ON FUNCTION public.save_reflection_preferences(uuid,text,boolean,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_reflection_preferences(uuid,text,boolean,boolean) TO service_role;


-- Date-scoped source invalidation preserves unrelated closed-period reports.
CREATE OR REPLACE FUNCTION public.invalidate_reflections_for_dates(p_user_id uuid,p_dates date[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE rev bigint;
BEGIN
  IF p_dates IS NULL OR cardinality(p_dates)=0 OR array_position(p_dates,NULL) IS NOT NULL THEN
    PERFORM invalidate_reflections(p_user_id); RETURN;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM user_profiles WHERE id=p_user_id) THEN RETURN; END IF;
  INSERT INTO reflection_preferences(user_id) VALUES(p_user_id) ON CONFLICT DO NOTHING;
  UPDATE reflection_preferences SET evidence_revision=evidence_revision+1 WHERE user_id=p_user_id RETURNING evidence_revision INTO rev;
  UPDATE reflection_reports r SET status='stale',content=NULL,analysis=NULL,sources='[]',
    lease_token=NULL,lease_until=NULL,next_attempt_at=NULL,attempts=0
    WHERE user_id=p_user_id AND (status='generating' OR EXISTS(SELECT 1 FROM unnest(p_dates) d WHERE d>=r.period_start AND d<r.period_end));
  UPDATE reflection_report_versions v SET content=NULL WHERE user_id=p_user_id
    AND EXISTS(SELECT 1 FROM reflection_reports r WHERE r.id=v.report_id AND r.status='stale');
  UPDATE reflection_reports SET revision=rev WHERE user_id=p_user_id AND status IN ('ready','empty');
END $$;
REVOKE ALL ON FUNCTION public.invalidate_reflections_for_dates(uuid,date[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invalidate_reflections_for_dates(uuid,date[]) TO service_role;
CREATE OR REPLACE FUNCTION public.reflection_source_changed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE owner_id uuid; tz text; old_json jsonb; new_json jsonb; j jsonb; dates date[]:='{}'; d date;
BEGIN
  IF TG_OP<>'INSERT' THEN old_json:=to_jsonb(OLD); END IF;
  IF TG_OP<>'DELETE' THEN new_json:=to_jsonb(NEW); END IF;
  owner_id:=coalesce((new_json->>'user_id')::uuid,(old_json->>'user_id')::uuid);
  SELECT timezone INTO tz FROM reflection_preferences WHERE user_id=owner_id;
  tz:=coalesce(tz,'UTC');
  IF TG_TABLE_NAME IN ('area_goals','reflection_feedback') THEN
    PERFORM invalidate_reflections(owner_id);
  ELSE
    FOREACH j IN ARRAY ARRAY[old_json,new_json] LOOP
      IF j IS NULL THEN CONTINUE; END IF;
      d:=CASE TG_TABLE_NAME
        WHEN 'journal_entries' THEN (j->>'entry_date')::date
        WHEN 'daily_logs' THEN (j->>'log_date')::date
        WHEN 'curriculum_sessions' THEN (j->>'scheduled_for')::date
        WHEN 'plan_items' THEN ((j->>'completed_at')::timestamptz AT TIME ZONE tz)::date
        WHEN 'oracle_captures' THEN ((j->>'created_at')::timestamptz AT TIME ZONE tz)::date
        WHEN 'reflection_intentions' THEN ((j->>'updated_at')::timestamptz AT TIME ZONE tz)::date
        WHEN 'quarterly_reviews' THEN (make_date((j->>'plan_year')::int,(j->>'quarter')::int*3,1)+interval '1 month'-interval '1 day')::date
        ELSE NULL END;
      dates:=array_append(dates,d);
    END LOOP;
    PERFORM invalidate_reflections_for_dates(owner_id,dates);
  END IF;
  IF TG_OP='UPDATE' AND OLD.user_id IS DISTINCT FROM NEW.user_id THEN PERFORM invalidate_reflections(OLD.user_id); END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;

COMMIT;
