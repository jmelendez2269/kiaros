-- Expand the inactive Anchor product into a full natal report package.
-- Source only: do not apply to any remote target without a separately approved
-- backup, exact migration review, and production apply.

ALTER TABLE public.artifact_files
  DROP CONSTRAINT IF EXISTS artifact_files_file_name_check;

ALTER TABLE public.artifact_files
  DROP CONSTRAINT IF EXISTS artifact_files_order_id_revision_paper_size_key;

ALTER TABLE public.artifact_files
  ADD COLUMN document_kind TEXT GENERATED ALWAYS AS (
    CASE
      WHEN file_name ~ '_natal-report_(letter|a4)\.pdf$' THEN 'report'
      ELSE 'anchor_print'
    END
  ) STORED;

ALTER TABLE public.artifact_files
  ADD CONSTRAINT artifact_files_document_filename_check CHECK (
    (
      document_kind = 'report'
      AND file_name ~ '^art_[A-Za-z0-9_-]+_natal-report_(letter|a4)\.pdf$'
    )
    OR
    (
      document_kind = 'anchor_print'
      AND file_name ~ '^art_[A-Za-z0-9_-]+_anchor-print_(letter|a4)\.pdf$'
    )
  );

ALTER TABLE public.artifact_files
  ADD CONSTRAINT artifact_files_order_revision_document_paper_key
  UNIQUE (order_id, revision, document_kind, paper_size);

UPDATE public.artifact_products
SET
  name = 'Personal Natal Astrology Report + Anchor Print',
  schema_version = 'kairos.natal-report.v2',
  template_version = 'natal-report.obsidian-almanac.v2',
  updated_at = now()
WHERE sku = 'KAI-ETSY-ANCHOR-V1'
  AND active = false;

COMMENT ON COLUMN public.artifact_files.document_kind IS
  'Generated from the privacy-safe filename; distinguishes the full report from the one-page Anchor Print.';

-- Manually entered Etsy fulfillment units are committed atomically through the
-- server-only repository. This function does not contact Etsy, grant software
-- access, deliver files, or activate the product.
CREATE OR REPLACE FUNCTION public.artifact_create_manual_order(
  p_intake JSONB,
  p_actor_clerk_user_id TEXT,
  p_now TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_existing public.artifact_orders%ROWTYPE;
  v_order_id UUID := gen_random_uuid();
  v_product_id UUID;
  v_source JSONB := p_intake->'source';
  v_input JSONB := p_intake->'generatorInput';
  v_normalized_birth JSONB := p_intake->'generatorInput'->'normalizedBirth';
  v_calculation JSONB := p_intake->'generatorInput'->'calculation';
  v_provenance JSONB := p_intake->'generatorInput'->'calculation'->'provenance';
  v_unit_key TEXT;
  v_purchased_at TIMESTAMPTZ;
  v_due_at TIMESTAMPTZ;
BEGIN
  IF jsonb_typeof(p_intake) IS DISTINCT FROM 'object'
    OR jsonb_typeof(v_source) IS DISTINCT FROM 'object'
    OR jsonb_typeof(v_input) IS DISTINCT FROM 'object'
    OR jsonb_typeof(v_normalized_birth) IS DISTINCT FROM 'object'
    OR jsonb_typeof(v_calculation) IS DISTINCT FROM 'object'
    OR jsonb_typeof(v_provenance) IS DISTINCT FROM 'object'
    OR p_intake->>'fictional' IS DISTINCT FROM 'false'
    OR p_intake->>'sku' IS DISTINCT FROM 'KAI-ETSY-ANCHOR-V1'
    OR char_length(btrim(COALESCE(p_actor_clerk_user_id, ''))) < 1
    OR char_length(COALESCE(p_intake->>'supportEmail', '')) NOT BETWEEN 3 AND 254
    OR COALESCE(p_intake->>'supportEmail', '') !~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    OR COALESCE(p_intake->>'supportEmail', '') ~* '[.]test$'
    OR char_length(btrim(COALESCE(p_intake->>'displayName', ''))) NOT BETWEEN 1 AND 80
    OR COALESCE(v_input->>'artifactId', '') !~ '^art_[A-Za-z0-9_-]{8,80}$'
    OR COALESCE(v_input->>'artifactId', '') LIKE 'art_fixture_%'
    OR COALESCE(v_source->>'shopId', '') !~ '^[^:[:space:]]+$'
    OR COALESCE(v_source->>'receiptId', '') !~ '^[^:[:space:]]+$'
    OR COALESCE(v_source->>'transactionId', '') !~ '^[^:[:space:]]+$'
    OR COALESCE(v_source->>'unitIndex', '') !~ '^[1-9][0-9]*$'
    OR (v_source->>'unitIndex')::integer < 1
    OR v_source->>'quantity' IS DISTINCT FROM '1'
    OR COALESCE(p_intake->>'sourcePayloadFingerprint', '') !~ '^[a-f0-9]{64}$'
    OR v_source->>'purchasedAt' IS NULL
    OR v_normalized_birth->>'date' IS NULL
    OR COALESCE(v_normalized_birth->>'timeUnknown', '') NOT IN ('true', 'false')
    OR (
      v_normalized_birth->>'timeUnknown' = 'true'
      AND v_normalized_birth->>'time' IS NOT NULL
    )
    OR (
      v_normalized_birth->>'timeUnknown' = 'false'
      AND COALESCE(v_normalized_birth->>'time', '') = ''
    )
    OR char_length(btrim(COALESCE(v_normalized_birth->>'city', ''))) < 1
    OR char_length(btrim(COALESCE(v_normalized_birth->>'country', ''))) < 1
    OR jsonb_typeof(v_input->'narrative') IS DISTINCT FROM 'object'
    OR COALESCE(v_provenance->>'calculationVersion', '') = ''
    OR COALESCE(v_provenance->>'ephemerisProvider', '') = ''
    OR COALESCE(v_provenance->>'ephemerisVersion', '') = ''
    OR COALESCE(v_provenance->>'timezoneProvenance', '') = ''
    OR COALESCE(v_provenance->>'chartFingerprint', '') !~ '^[a-f0-9]{64}$'
  THEN
    RAISE EXCEPTION 'artifact_manual_data_required';
  END IF;

  BEGIN
    v_purchased_at := (v_source->>'purchasedAt')::timestamptz;
    PERFORM (v_normalized_birth->>'date')::date;
    IF v_normalized_birth->>'timeUnknown' = 'false' THEN
      PERFORM (v_normalized_birth->>'time')::time;
    END IF;
  EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
    RAISE EXCEPTION 'artifact_manual_data_required';
  END;

  v_unit_key := concat(
    'etsy:',
    v_source->>'shopId', ':',
    v_source->>'receiptId', ':',
    v_source->>'transactionId', ':',
    v_source->>'unitIndex'
  );

  -- Serialize the same fulfillment-unit key so concurrent replays cannot race
  -- between the lookup and unique insert.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_unit_key, 0));

  SELECT * INTO v_existing
  FROM public.artifact_orders
  WHERE fulfillment_unit_key = v_unit_key
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing.source_payload_fingerprint <> p_intake->>'sourcePayloadFingerprint' THEN
      RAISE EXCEPTION 'artifact_idempotency_conflict';
    END IF;
    INSERT INTO public.artifact_order_events (
      order_id, event_type, actor_clerk_user_id, occurred_at,
      from_state, to_state, revision, reason_code
    ) VALUES (
      v_existing.id, 'intake_replayed', p_actor_clerk_user_id, p_now,
      v_existing.fulfillment_status, v_existing.fulfillment_status,
      v_existing.current_revision, 'identical_payload'
    );
    RETURN v_existing.id;
  END IF;

  SELECT id INTO v_product_id
  FROM public.artifact_products
  WHERE sku = 'KAI-ETSY-ANCHOR-V1';
  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'artifact_product_missing';
  END IF;

  SELECT business_day + (v_purchased_at - date_trunc('day', v_purchased_at))
  INTO v_due_at
  FROM generate_series(
    date_trunc('day', v_purchased_at) + interval '1 day',
    date_trunc('day', v_purchased_at) + interval '10 days',
    interval '1 day'
  ) AS business_day
  WHERE extract(isodow FROM business_day) BETWEEN 1 AND 5
  ORDER BY business_day
  OFFSET 2 LIMIT 1;

  INSERT INTO public.artifact_orders (
    id, fulfillment_unit_key, source, source_shop_id, source_receipt_id,
    source_transaction_id, source_unit_index, source_quantity,
    source_listing_id, source_payload_fingerprint, product_id,
    purchased_at, due_at, created_by_clerk_user_id, created_at, updated_at
  ) VALUES (
    v_order_id, v_unit_key, 'etsy', v_source->>'shopId', v_source->>'receiptId',
    v_source->>'transactionId', (v_source->>'unitIndex')::integer,
    1, NULLIF(v_source->>'listingId', ''),
    p_intake->>'sourcePayloadFingerprint', v_product_id,
    v_purchased_at, v_due_at,
    p_actor_clerk_user_id, p_now, p_now
  );

  INSERT INTO public.artifact_personalization (
    order_id, support_email, display_name, birth_date, birth_time,
    birth_time_unknown, birth_city, birth_country, allowlisted_source_fields,
    purge_after, created_at, updated_at
  ) VALUES (
    v_order_id, p_intake->>'supportEmail', p_intake->>'displayName',
    (v_normalized_birth->>'date')::date,
    NULLIF(v_normalized_birth->>'time', '')::time,
    (v_normalized_birth->>'timeUnknown')::boolean,
    v_normalized_birth->>'city', v_normalized_birth->>'country',
    jsonb_build_object('listingId', v_source->>'listingId', 'fixture', false),
    'infinity'::timestamptz, p_now, p_now
  );

  INSERT INTO public.artifact_profiles (
    order_id, artifact_id, normalized_birth, calculation, narrative,
    calculation_version, ephemeris_provider, ephemeris_version,
    timezone_provenance, chart_fingerprint, purge_after, created_at, updated_at
  ) VALUES (
    v_order_id, v_input->>'artifactId', v_normalized_birth,
    v_calculation, v_input->'narrative', v_provenance->>'calculationVersion',
    v_provenance->>'ephemerisProvider', v_provenance->>'ephemerisVersion',
    v_provenance->>'timezoneProvenance', v_provenance->>'chartFingerprint',
    'infinity'::timestamptz, p_now, p_now
  );

  INSERT INTO public.artifact_order_events (
    order_id, event_type, actor_clerk_user_id, occurred_at,
    from_state, to_state, revision
  ) VALUES (
    v_order_id, 'intake_created', p_actor_clerk_user_id, p_now,
    NULL, 'intake_draft', 1
  );
  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.artifact_create_manual_order(JSONB, TEXT, TIMESTAMPTZ)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.artifact_create_manual_order(JSONB, TEXT, TIMESTAMPTZ)
TO service_role;

COMMENT ON FUNCTION public.artifact_create_manual_order(JSONB, TEXT, TIMESTAMPTZ) IS
  'Creates or idempotently replays one manually entered Etsy fulfillment unit; server service role only.';
