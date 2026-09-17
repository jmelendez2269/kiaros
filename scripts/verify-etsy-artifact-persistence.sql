\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  artifact_tables CONSTANT text[] := ARRAY[
    'artifact_products',
    'artifact_admin_roles',
    'artifact_orders',
    'artifact_personalization',
    'artifact_profiles',
    'artifact_files',
    'artifact_qa_reviews',
    'artifact_support_cases',
    'artifact_order_events'
  ];
  artifact_functions CONSTANT text[] := ARRAY[
    'public.artifact_retention_candidates(timestamptz)',
    'public.artifact_create_fixture_order(jsonb,text,timestamptz)',
    'public.artifact_commit_workflow_transition(uuid,timestamptz,jsonb,jsonb,jsonb,jsonb)',
    'public.artifact_begin_file_retention(uuid,uuid,timestamptz)',
    'public.artifact_complete_retention(text,uuid,uuid,text,timestamptz)'
  ];
  table_name text;
  function_name text;
  matching_tables integer;
  protected_tables integer;
  policy_count integer;
BEGIN
  SELECT count(*) INTO matching_tables
  FROM pg_catalog.pg_tables
  WHERE schemaname = 'public'
    AND tablename = ANY (artifact_tables);

  IF matching_tables <> cardinality(artifact_tables) THEN
    RAISE EXCEPTION 'Expected % artifact tables, found %', cardinality(artifact_tables), matching_tables;
  END IF;

  SELECT count(*) INTO protected_tables
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = ANY (artifact_tables)
    AND c.relrowsecurity
    AND c.relforcerowsecurity;

  IF protected_tables <> cardinality(artifact_tables) THEN
    RAISE EXCEPTION 'Expected forced RLS on % artifact tables, found %', cardinality(artifact_tables), protected_tables;
  END IF;

  SELECT count(*) INTO policy_count
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'public'
    AND tablename = ANY (artifact_tables);

  IF policy_count <> 0 THEN
    RAISE EXCEPTION 'Artifact tables must not expose browser policies; found %', policy_count;
  END IF;

  FOREACH table_name IN ARRAY artifact_tables LOOP
    IF has_table_privilege('anon', format('public.%I', table_name), 'SELECT')
      OR has_table_privilege('authenticated', format('public.%I', table_name), 'SELECT')
      OR has_table_privilege('anon', format('public.%I', table_name), 'INSERT')
      OR has_table_privilege('authenticated', format('public.%I', table_name), 'INSERT') THEN
      RAISE EXCEPTION 'Browser role unexpectedly has access to public.%', table_name;
    END IF;

    IF NOT has_table_privilege('service_role', format('public.%I', table_name), 'SELECT')
      OR NOT has_table_privilege('service_role', format('public.%I', table_name), 'INSERT') THEN
      RAISE EXCEPTION 'service_role lacks required access to public.%', table_name;
    END IF;
  END LOOP;

  IF has_table_privilege('service_role', 'public.artifact_order_events', 'UPDATE')
    OR has_table_privilege('service_role', 'public.artifact_order_events', 'DELETE') THEN
    RAISE EXCEPTION 'service_role must not mutate artifact_order_events';
  END IF;

  -- A PUBLIC execute grant would also make these browser-role checks true.
  FOREACH function_name IN ARRAY artifact_functions LOOP
    IF has_function_privilege('anon', function_name, 'EXECUTE')
      OR has_function_privilege('authenticated', function_name, 'EXECUTE')
      OR NOT has_function_privilege('service_role', function_name, 'EXECUTE') THEN
      RAISE EXCEPTION 'Artifact function privileges are not service-role-only: %', function_name;
    END IF;
  END LOOP;
END;
$$;

DO $$
DECLARE
  bucket_record storage.buckets%ROWTYPE;
  product_active boolean;
  migration_count integer;
BEGIN
  SELECT * INTO STRICT bucket_record
  FROM storage.buckets
  WHERE id = 'etsy-artifacts-private';

  IF bucket_record.public
    OR bucket_record.file_size_limit <> 10485760
    OR bucket_record.allowed_mime_types <> ARRAY['application/pdf']::text[] THEN
    RAISE EXCEPTION 'Private artifact bucket restrictions are incorrect';
  END IF;

  SELECT active INTO STRICT product_active
  FROM public.artifact_products
  WHERE sku = 'KAI-ETSY-ANCHOR-V1';

  IF product_active THEN
    RAISE EXCEPTION 'Artifact product must remain inactive';
  END IF;

  SELECT count(*) INTO migration_count
  FROM supabase_migrations.schema_migrations
  WHERE version = '0045';

  IF migration_count <> 1 THEN
    RAISE EXCEPTION 'Migration 0045 is not recorded exactly once';
  END IF;
END;
$$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'art_fixture_browser_user_a', true);
DO $$
BEGIN
  BEGIN
    PERFORM id FROM public.artifact_orders LIMIT 1;
    RAISE EXCEPTION USING ERRCODE = 'ZX001', MESSAGE = 'browser user A unexpectedly read artifact_orders';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
    WHEN SQLSTATE 'ZX001' THEN RAISE;
  END;
END;
$$;
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'art_fixture_browser_user_b', true);
DO $$
BEGIN
  BEGIN
    INSERT INTO public.artifact_admin_roles (
      clerk_user_id,
      role,
      granted_by_clerk_user_id
    ) VALUES (
      'art_fixture_browser_user_b',
      'operator',
      'art_fixture_browser_user_b'
    );
    RAISE EXCEPTION USING ERRCODE = 'ZX002', MESSAGE = 'browser user B unexpectedly wrote artifact_admin_roles';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
    WHEN SQLSTATE 'ZX002' THEN RAISE;
  END;
END;
$$;
RESET ROLE;

SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claim.sub', 'art_fixture_service', true);

DO $$
DECLARE
  product_uuid uuid;
  order_uuid uuid;
  event_uuid uuid;
  due_count integer;
  duplicate_blocked boolean := false;
  incomplete_qa_blocked boolean := false;
BEGIN
  SELECT id INTO STRICT product_uuid
  FROM public.artifact_products
  WHERE sku = 'KAI-ETSY-ANCHOR-V1';

  INSERT INTO public.artifact_orders (
    fulfillment_unit_key,
    source,
    source_shop_id,
    source_receipt_id,
    source_transaction_id,
    source_unit_index,
    source_quantity,
    source_payload_fingerprint,
    product_id,
    purchased_at,
    due_at,
    closed_at,
    created_by_clerk_user_id
  ) VALUES (
    'etsy:fixture-shop:fixture-receipt:fixture-transaction:1',
    'etsy',
    'fixture-shop',
    'fixture-receipt',
    'fixture-transaction',
    1,
    1,
    repeat('a', 64),
    product_uuid,
    now() - interval '40 days',
    now() - interval '39 days',
    now() - interval '31 days',
    'art_fixture_service'
  ) RETURNING id INTO order_uuid;

  BEGIN
    INSERT INTO public.artifact_orders (
      fulfillment_unit_key,
      source,
      source_shop_id,
      source_receipt_id,
      source_transaction_id,
      source_unit_index,
      source_quantity,
      source_payload_fingerprint,
      product_id,
      purchased_at,
      due_at,
      created_by_clerk_user_id
    ) VALUES (
      'etsy:fixture-shop:fixture-receipt:fixture-transaction:1',
      'etsy',
      'fixture-shop',
      'fixture-receipt',
      'fixture-transaction',
      1,
      1,
      repeat('a', 64),
      product_uuid,
      now(),
      now() + interval '2 days',
      'art_fixture_service'
    );
  EXCEPTION WHEN unique_violation THEN
    duplicate_blocked := true;
  END;

  IF NOT duplicate_blocked THEN
    RAISE EXCEPTION 'Duplicate fulfillment unit was not blocked';
  END IF;

  INSERT INTO public.artifact_personalization (
    order_id,
    support_email,
    display_name,
    birth_date,
    birth_time,
    birth_time_unknown,
    birth_city,
    birth_country,
    allowlisted_source_fields,
    purge_after
  ) VALUES (
    order_uuid,
    'fixture-retention@example.test',
    'Fictional Retention Fixture',
    DATE '1990-01-01',
    NULL,
    true,
    'Fixture City',
    'Fixture Country',
    '{"fixture":true}'::jsonb,
    now() - interval '1 day'
  );

  INSERT INTO public.artifact_profiles (
    order_id,
    artifact_id,
    normalized_birth,
    calculation,
    narrative,
    calculation_version,
    ephemeris_provider,
    ephemeris_version,
    timezone_provenance,
    chart_fingerprint,
    purge_after
  ) VALUES (
    order_uuid,
    'art_fixture_retention',
    '{"fixture":true}'::jsonb,
    '{"fixture":true}'::jsonb,
    '{"fixture":true}'::jsonb,
    'fixture-v1',
    'fixture-provider',
    'fixture-ephemeris-v1',
    'fixture-unknown-time',
    repeat('b', 64),
    now() - interval '1 day'
  );

  INSERT INTO public.artifact_files (
    order_id,
    revision,
    paper_size,
    storage_object_key,
    file_name,
    byte_size,
    sha256,
    purge_after,
    created_by_clerk_user_id
  ) VALUES (
    order_uuid,
    1,
    'letter',
    'artifact-files/' || gen_random_uuid()::text || '.pdf',
    'art_fixture_retention_anchor-print_letter.pdf',
    128,
    repeat('c', 64),
    now() - interval '1 day',
    'art_fixture_service'
  );

  BEGIN
    INSERT INTO public.artifact_qa_reviews (
      order_id,
      revision,
      approved,
      reviewed_by_clerk_user_id
    ) VALUES (
      order_uuid,
      1,
      true,
      'art_fixture_reviewer'
    );
  EXCEPTION WHEN check_violation THEN
    incomplete_qa_blocked := true;
  END;

  IF NOT incomplete_qa_blocked THEN
    RAISE EXCEPTION 'Incomplete QA approval was not blocked';
  END IF;

  INSERT INTO public.artifact_support_cases (
    order_id,
    case_type,
    status,
    support_email,
    case_summary,
    closed_at,
    purge_after,
    created_by_clerk_user_id
  ) VALUES (
    order_uuid,
    'privacy_request',
    'closed',
    'fixture-retention@example.test',
    'Fictional retention fixture.',
    now() - interval '2 days',
    now() - interval '1 day',
    'art_fixture_service'
  );

  INSERT INTO public.artifact_order_events (
    order_id,
    event_type,
    actor_clerk_user_id,
    from_state,
    to_state,
    revision,
    non_sensitive_details
  ) VALUES (
    order_uuid,
    'intake_created',
    'art_fixture_service',
    NULL,
    'intake_draft',
    1,
    '{"fixture":true}'::jsonb
  ) RETURNING id INTO event_uuid;

  SELECT count(*) INTO due_count
  FROM public.artifact_retention_candidates(now())
  WHERE order_id = order_uuid;

  IF due_count <> 4 THEN
    RAISE EXCEPTION 'Expected four retention candidates, found %', due_count;
  END IF;

  UPDATE public.artifact_orders
  SET legal_hold_until = now() + interval '30 days'
  WHERE id = order_uuid;

  SELECT count(*) INTO due_count
  FROM public.artifact_retention_candidates(now())
  WHERE order_id = order_uuid;

  IF due_count <> 0 THEN
    RAISE EXCEPTION 'Legal hold failed to suppress % retention candidates', due_count;
  END IF;
END;
$$;

RESET ROLE;

DO $$
DECLARE
  fixture_event_id uuid;
  append_only_blocked boolean := false;
BEGIN
  SELECT id INTO STRICT fixture_event_id
  FROM public.artifact_order_events
  WHERE actor_clerk_user_id = 'art_fixture_service'
  LIMIT 1;

  BEGIN
    UPDATE public.artifact_order_events
    SET reason_code = 'should-not-update'
    WHERE id = fixture_event_id;
  EXCEPTION WHEN raise_exception THEN
    append_only_blocked := SQLERRM = 'artifact order events are append-only';
  END;

  IF NOT append_only_blocked THEN
    RAISE EXCEPTION 'Append-only event trigger did not block mutation';
  END IF;
END;
$$;

ROLLBACK;

SELECT 'ETSY-03 persistence verification passed' AS result;
